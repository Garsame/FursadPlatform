const Job = require('../models/Job');
const Company = require('../models/Company');
const CV = require('../models/CV');
const Application = require('../models/Application');
const JobseekerProfile = require('../models/JobseekerProfile');
const { MATCH_WEIGHTS } = require('../../../shared/constants');
const { MIN_COMPLETENESS_TO_APPLY } = require('../config/applyRules');

/**
 * The public assistant.
 *
 * The security model is deliberately not "we told the model not to". A prompt
 * instruction is a request; anyone can argue with it. Instead the model is
 * only ever handed data this module chose to fetch, and this module can only
 * fetch two kinds of thing:
 *
 *   1. Information already public on the site — published vacancies, employer
 *      profiles, how matching works.
 *   2. The signed-in user's own records, and only when they are signed in.
 *
 * There is no code path here that reads another person's profile, any
 * application that is not the caller's, moderation state, audit history,
 * platform totals, configuration or anything under /admin. The model cannot
 * disclose what it was never given, whatever it is asked.
 */

/** Subjects that get a fixed answer instead of reaching the model at all. */
const REFUSED_PATTERNS = [
  /\badmin(istrator)?\b.*(access|login|password|panel|portal|secret|dashboard)/i,
  /(how|can|help).*(get|become|make me).*(admin|administrator)/i,
  /\b(admin_secret|jwt_secret|api[_ ]?key|env|environment variable|database|mongo|connection string)\b/i,
  /\b(other|another|someone else'?s?|all)\b.*\b(user|candidate|applicant|profile|cv|email|phone|salary)s?\b/i,
  /\b(list|show|give|tell).*(all|every)\b.*\b(user|candidate|applicant|employer|email)s?\b/i,
  /\b(moderation|audit log|suspend|ban|delete a user|flagged)\b/i,
  /(bypass|get around|skip|avoid).*(verification|approval|review|profile|cv|requirement)/i,
  /\b(hack|exploit|sql injection|scrape)\b/i
];

const REFUSAL =
  'I can only help with using Fursad — finding work, applying, and how hiring works here. ' +
  'I do not have access to administration, other people\'s information, or anything behind the scenes. ' +
  'If you need to reach the team, use the Contact page and someone will reply.';

const isRefused = (question) => REFUSED_PATTERNS.some((re) => re.test(question));

/** How the platform works. Static, public, and true. */
const PLATFORM_FACTS = `
Fursad is an AI-assisted job matching platform for Somalia and East Africa. It is
bilingual: Somali and English.

How a jobseeker uses it:
1. Sign up on the public site and confirm the six-digit code emailed to them.
2. Upload one or more CVs (PDF, Word or text, up to 8 MB). Each is read by AI
   into its own structured snapshot — skills, education, experience, languages.
3. Optionally answer an eight-question AI profile interview, which feeds the
   same matching engine and produces a suggested job specification.
4. Browse jobs, or open "AI matched for me" to see roles ranked for them with a
   breakdown of which factor earned what.
5. Apply, choosing which CV to send. The match score and an AI summary of their
   suitability travel with the application.
6. Track it: applied, reviewed, shortlisted, interview, offer, hired or
   rejected. Each change emails them. They can message the employer.

Before applying, a candidate needs a profile at least ${MIN_COMPLETENESS_TO_APPLY}%
complete and at least one uploaded CV. This is because an application with an
empty profile behind it scores near zero and tells the employer nothing.

How matching is scored — the AI extracts and judges, the scoring is fixed
arithmetic, which is why the breakdown can be shown:
  Skills ${MATCH_WEIGHTS.SKILLS * 100}% (compared by meaning, so "Node.js" and "NodeJS" count as the same)
  Location ${MATCH_WEIGHTS.LOCATION * 100}%  Salary ${MATCH_WEIGHTS.SALARY * 100}%
  Education ${MATCH_WEIGHTS.EDUCATION * 100}%  Experience ${MATCH_WEIGHTS.EXPERIENCE * 100}%

Becoming an employer: employers use a separate portal at /provider/signup —
it is not linked from the public site. After signing up they complete a company
profile (name, industry, description, city and a contact email are required)
before they can post. Every vacancy is reviewed by an administrator before it
goes live; the employer is emailed the decision.

Messaging: a candidate may send one introduction to an employer. After that the
employer must accept before the conversation continues both ways.

Privacy: employers only ever see candidates who applied to their own jobs.
There is no browsable pool of CVs.

To contact the Fursad team, use the Contact page on the public site.
`.trim();

/**
 * Everything the public site already shows, with the links to reach it.
 *
 * The links matter as much as the facts. Without them the assistant knows a
 * company exists but has nowhere to send anyone, so it falls back to "ask the
 * team" — which is a deflection, not an answer, when the page it should have
 * pointed at is right there.
 */
const fetchPublicContext = async () => {
  const jobs = await Job.find({ status: 'published' })
    .select('title description location employmentType salaryRange skillsRequired educationLevel experienceLevel publishedAt company')
    .populate('company', 'name industry')
    .sort({ publishedAt: -1 })
    .limit(30);

  // Only employers who are actually hiring — that is exactly what the public
  // employer wall lists, so it is the honest answer to "who is on Fursad".
  const hiringIds = [...new Set(jobs.map((j) => String(j.company?._id)).filter(Boolean))];
  const companies = await Company.find({ _id: { $in: hiringIds } })
    .select('name tagline description about industry location headquarters companySize foundedYear benefits values website isVerified profileCompleteness');

  const rolesByCompany = jobs.reduce((acc, j) => {
    const k = String(j.company?._id);
    (acc[k] = acc[k] || []).push(j.title);
    return acc;
  }, {});

  return {
    totalEmployersHiring: companies.length,
    totalOpenJobs: jobs.length,

    employers: companies.map((c) => ({
      name: c.name,
      profileLink: `/companies/${c._id}`,
      tagline: c.tagline || undefined,
      whatTheyDo: c.description || undefined,
      moreAboutThem: c.about ? c.about.slice(0, 400) : undefined,
      industry: c.industry || undefined,
      city: c.location?.city || c.headquarters || undefined,
      size: c.companySize || undefined,
      founded: c.foundedYear || undefined,
      benefits: c.benefits?.length ? c.benefits : undefined,
      values: c.values?.length ? c.values : undefined,
      website: c.website || undefined,
      verified: c.isVerified,
      openRoles: rolesByCompany[String(c._id)] || []
    })),

    openJobs: jobs.map((j) => ({
      title: j.title,
      jobLink: `/jobs/${j._id}`,
      company: j.company?.name,
      companyLink: j.company?._id ? `/companies/${j.company._id}` : undefined,
      industry: j.company?.industry,
      city: j.location?.city,
      type: j.employmentType,
      salary: j.salaryRange?.max ? `$${j.salaryRange.min}-${j.salaryRange.max} per month` : 'not stated',
      skills: (j.skillsRequired || []).slice(0, 8),
      education: j.educationLevel || undefined,
      experience: j.experienceLevel || undefined,
      summary: (j.description || '').slice(0, 220)
    }))
  };
};

/** The caller's own records. Only ever reached with their own id. */
const fetchOwnContext = async (user) => {
  if (!user || user.role !== 'jobseeker') return null;

  const [profile, cvs, applications] = await Promise.all([
    JobseekerProfile.findOne({ user: user._id }),
    CV.find({ user: user._id }).select('label parseStatus parsed.skills'),
    Application.find({ jobseeker: user._id }).populate('job', 'title').select('status matchScore job')
  ]);

  return {
    name: user.name,
    profileCompleteness: profile?.profileCompletenessScore ?? 0,
    stillMissing: profile ? profile.missingForApplying().map((m) => m.label) : [],
    canApply: (profile?.profileCompletenessScore ?? 0) >= MIN_COMPLETENESS_TO_APPLY && cvs.length > 0,
    cvCount: cvs.length,
    cvs: cvs.map((c) => ({ label: c.label, analysed: c.parseStatus === 'parsed', skills: (c.parsed?.skills || []).length })),
    applications: applications.map((a) => ({ job: a.job?.title, status: a.status, matchScore: a.matchScore }))
  };
};

const buildPrompt = (question, publicCtx, ownCtx) => `
You are the Fursad assistant, helping visitors and jobseekers use the platform.

RULES
- Answer from the information below, and answer it fully. Never guess or
  invent a job, employer, salary or figure.

- SEND THEM SOMEWHERE. Every employer below has a profileLink and every job a
  jobLink. When you mention one, give the link so they can go and read it.
  Write links as markdown, for example [Iftin Digital](/companies/abc123).
  Naming something without linking to it leaves the person exactly where they
  started.

- The Contact page is a LAST RESORT, not a sign-off. Only mention it when the
  question is genuinely outside everything below — a complaint, a partnership,
  a bug, a billing question. Never end an answer with it out of habit, and
  never suggest it for something a page on this site already answers. If you
  find yourself about to write "visit the Contact page" for a question about
  jobs, employers, applying or matching, you have not looked hard enough at
  the data above.

- If you genuinely lack a figure, say what you DO have and point at the page
  that shows it. "There are 2 employers hiring right now" is a real answer;
  "I don't have access to that" when the number is in front of you is not.

- You have no access to administration, moderation, other users, or platform
  internals. If asked, say so plainly and offer what you can help with instead.
  That refusal is the one place a deflection is correct.

- Never claim to perform an action. You cannot apply on someone's behalf, edit
  a profile, or message an employer. Tell them where to do it themselves.

- Be brief and concrete: two or three short paragraphs, plain language over
  jargon. Somali or English, matching the question.

- You are talking to a jobseeker or a visitor, never an employer's private
  data and never an administrator.

HOW FURSAD WORKS
${PLATFORM_FACTS}

EMPLOYERS HIRING RIGHT NOW — ${publicCtx.totalEmployersHiring} of them, all public
Each has a profileLink. Use it whenever you mention them.
${JSON.stringify(publicCtx.employers)}

CURRENTLY OPEN JOBS — ${publicCtx.totalOpenJobs} of them, all public
Each has a jobLink and a companyLink.
${JSON.stringify(publicCtx.openJobs)}

Pages you can send people to:
  /jobs                browse every open vacancy
  /companies/:id       an employer's full public profile
  /jobs/:id            one vacancy in full
  /signup              create a jobseeker account
  /dashboard/cvs       upload and manage CVs (signed in)
  /dashboard/jobs      AI-matched jobs with score breakdowns (signed in)
  /provider/signup     register as an employer
  /contact             reach the Fursad team — last resort only

${ownCtx ? `THE PERSON ASKING — their own record, they are signed in
${JSON.stringify(ownCtx)}
You may discuss the above with them because it is theirs.` : 'The person asking is not signed in. Do not imply you know anything about them.'}

QUESTION
${question}
`.trim();

/**
 * Answers a question. `user` is null for anonymous visitors.
 * Never throws — a broken assistant should degrade to a useful sentence.
 */
const ask = async (question, user, aiService) => {
  const trimmed = String(question || '').trim();
  if (!trimmed) return { answer: 'Ask me anything about finding work on Fursad.', refused: false };
  if (trimmed.length > 500) {
    return { answer: 'That question is a little long — could you shorten it?', refused: false };
  }

  if (isRefused(trimmed)) {
    return { answer: REFUSAL, refused: true };
  }

  if (!aiService.isLive()) {
    return {
      answer: 'The assistant is not available right now. The Contact page will reach the team, ' +
        'and the How it works section on the home page covers most questions.',
      refused: false
    };
  }

  try {
    const [publicCtx, ownCtx] = await Promise.all([
      fetchPublicContext(),
      fetchOwnContext(user)
    ]);

    const answer = await aiService.answerAssistant(buildPrompt(trimmed, publicCtx, ownCtx));
    return { answer, refused: false, personalised: !!ownCtx };
  } catch (error) {
    console.error('Assistant error:', error.message);
    return {
      answer: 'Something went wrong answering that. Please try again, or use the Contact page.',
      refused: false
    };
  }
};

module.exports = { ask, isRefused, REFUSAL, PLATFORM_FACTS };
