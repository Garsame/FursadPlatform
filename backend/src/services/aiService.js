const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Model IDs are env-driven so they can be bumped without a code change as
 * Google ships newer Flash releases — check Google AI Studio for the current id.
 */
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const EMBED_MODEL_ID = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

let genAI = null;
let model = null;
let embedModel = null;

if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_ID });
    embedModel = genAI.getGenerativeModel({ model: EMBED_MODEL_ID });
    console.log(`Gemini AI initialised — chat: ${MODEL_ID}, embeddings: ${EMBED_MODEL_ID}`);
  } catch (error) {
    console.error('Failed to initialize Gemini AI Engine:', error.message);
  }
} else {
  console.log('Gemini API key missing. AI service running in Mock Mode.');
}

/** True when a real key is configured — lets callers tell live output from fallbacks. */
const isLive = () => !!model;

/** Strips ```json fences that models often wrap JSON in. */
const parseJson = (text) => JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());

/**
 * Embeds a batch of short strings (skill names). Returns null when the AI is
 * unavailable so callers can fall back to string comparison.
 */
const embedTexts = async (texts) => {
  if (!embedModel || !texts?.length) return null;
  try {
    const res = await embedModel.batchEmbedContents({
      requests: texts.map((t) => ({
        content: { parts: [{ text: t }] },
        taskType: 'SEMANTIC_SIMILARITY'
      }))
    });
    return res.embeddings.map((e) => e.values);
  } catch (error) {
    console.error('AI Embed Error:', error.message);
    return null;
  }
};

/**
 * 1. Parse Resume
 * Extracts profile fields from CV text or questionnaire answers.
 */
const parseResume = async (rawText, language = 'en') => {
  const defaultFallback = {
    headline: 'Software Engineer',
    bio: 'Experienced engineering professional focused on web technologies and high-performance APIs.',
    skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
    location: { city: 'Mogadishu', country: 'Somalia' },
    education: [
      {
        institution: 'Somali National University',
        level: 'Bachelor',
        fieldOfStudy: 'Computer Science',
        startYear: 2019,
        endYear: 2023
      }
    ],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'East Africa Tech Solutions',
        startDate: new Date('2023-08-01'),
        endDate: null,
        description: 'Developing core features for the business portal and client management system.'
      }
    ],
    experienceLevel: 'mid',
    highestEducationLevel: 'Bachelor',
    languages: [{ name: 'Somali', proficiency: 'native' }, { name: 'English', proficiency: 'fluent' }],
    certifications: [],
    profileCompletenessScore: 85,
    aiImprovementTips: 'Consider adding details about certifications or side projects.'
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      You are an AI resume parser. Extract professional profile data from the raw text provided below.
      Respond ONLY with a valid JSON object matching this structure:
      {
        "headline": "Brief professional headline",
        "bio": "Professional summary paragraph",
        "skills": ["Skill1", "Skill2"],
        "location": { "city": "City name", "country": "Country name" },
        "education": [{ "institution": "Name", "level": "Bachelor/Master/etc", "fieldOfStudy": "Major", "startYear": 2019, "endYear": 2023 }],
        "experience": [{ "title": "Job title", "company": "Company Name", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD or null for present", "description": "Responsibilities" }],
        "experienceLevel": "entry or mid or senior or lead or executive",
        "highestEducationLevel": "Highest level completed",
        "languages": [{ "name": "Somali", "proficiency": "native or fluent or professional or intermediate or basic" }],
        "certifications": ["Certificate or licence name, issuer if stated"],
        "profileCompletenessScore": 85,
        "aiImprovementTips": "Suggestions to complete profile"
      }

      Notes on the harder fields:
      - languages: include every language the CV mentions the person speaks,
        reads or writes. In this region Somali, English and Arabic are common
        and are frequently listed only in a header line or a one-word list.
        Where no proficiency is stated, infer a conservative one rather than
        omitting the language. Return [] if the CV genuinely names none.
      - certifications: professional certificates, licences and formal training
        only. Do not repeat degrees already in "education". Return [] if none.
      - skills: list the skill itself, not a sentence. Split things joined by
        "and" or "&" into separate entries.

      Raw CV Text:
      "${rawText}"
    `;

    const result = await model.generateContent(prompt);
    return normaliseParsedResume(parseJson(result.response.text()));
  } catch (error) {
    console.error('AI Parse Resume Error:', error.message);
    return defaultFallback;
  }
};

const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'lead', 'executive'];

/**
 * Models answer with human casing ("Senior", "Bachelor's Degree"). The profile
 * schema enums are lowercase, so an un-normalised value fails validation on
 * save. Coerce here, once, rather than at every call site.
 */
const normaliseParsedResume = (parsed) => {
  if (!parsed || typeof parsed !== 'object') return parsed;

  const lvl = String(parsed.experienceLevel || '').toLowerCase().trim();
  parsed.experienceLevel = EXPERIENCE_LEVELS.find((l) => lvl.includes(l)) || 'entry';

  if (Array.isArray(parsed.skills)) {
    // A model asked for skills sometimes answers with "React and Node js" as a
    // single entry, which then matches nothing. Split the joins it uses --
    // "and" needs word boundaries or it tears "Android" and "Command" apart.
    parsed.skills = [...new Set(
      parsed.skills
        .filter((s) => typeof s === 'string')
        .flatMap((s) => s.split(/\s*(?:,|;|\/|\||&|\band\b)\s*/i))
        .map((s) => s.trim().replace(/^[-•*\s]+/, ''))
        .filter((s) => s.length > 1)
    )];
  }

  const PROFICIENCY = ['native', 'fluent', 'professional', 'intermediate', 'basic'];
  if (Array.isArray(parsed.languages)) {
    parsed.languages = parsed.languages
      .map((l) => (typeof l === 'string' ? { name: l, proficiency: '' } : l))
      .filter((l) => l && typeof l.name === 'string' && l.name.trim())
      .map((l) => {
        const p = String(l.proficiency || '').toLowerCase().trim();
        return {
          name: l.name.trim(),
          proficiency: PROFICIENCY.find((x) => p.includes(x)) || 'intermediate'
        };
      });
  } else {
    parsed.languages = [];
  }

  if (Array.isArray(parsed.certifications)) {
    parsed.certifications = [...new Set(
      parsed.certifications
        .map((c) => (typeof c === 'string' ? c : c?.name))
        .filter((c) => typeof c === 'string' && c.trim().length > 2)
        .map((c) => c.trim())
    )];
  } else {
    parsed.certifications = [];
  }

  // Dates arrive as strings; Mongoose casts them, but "present"/null must not
  // become Invalid Date.
  if (Array.isArray(parsed.experience)) {
    parsed.experience = parsed.experience.map((e) => ({
      ...e,
      endDate: !e.endDate || /present|current/i.test(String(e.endDate)) ? null : e.endDate
    }));
  }

  return parsed;
};

/**
 * 2. Review Job Post
 * Reviews job before publish for quality and fraud signals.
 */
const reviewJobPost = async (jobData) => {
  const defaultFallback = {
    qualityScore: 90,
    flags: [],
    suggestions: ['Include specific salary expectations if possible to attract top candidates.'],
    requiresManualReview: false
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      You screen job postings on a Somali job platform.

      Separate two very different judgements:

      1. fraudRisk — is this posting DANGEROUS or DECEPTIVE? Raise fraudFlags ONLY for
         genuine scam signals, such as: asking applicants for money or a registration
         fee, promising unrealistic earnings, no identifiable employer, pushing people
         to contact a personal WhatsApp/Telegram instead of applying, requests for
         bank details or documents up front, or trafficking-style wording.

      2. qualityScore — how POLISHED is the listing? This is advice for the employer.
         A short but honest job post is legitimate; it is simply less attractive.
         Never treat "could be more detailed" as a fraud signal.

      Most real job postings are legitimate but imperfect. Those must publish.

      Job Details:
      Title: ${jobData.title}
      Description: ${jobData.description}
      Skills Required: ${JSON.stringify(jobData.skillsRequired)}
      Location: ${JSON.stringify(jobData.location)}
      Salary: ${JSON.stringify(jobData.salaryRange || {})}

      Respond ONLY with valid JSON:
      {
        "qualityScore": 0-100 (polish only),
        "fraudFlags": ["only genuine fraud or safety concerns, empty array if none"],
        "suggestions": ["how the employer could improve the listing"],
        "fraudRisk": "none" | "low" | "medium" | "high"
      }
    `;

    const result = await model.generateContent(prompt);
    const out = parseJson(result.response.text());

    // The publish gate is fraud, not polish. A legitimate-but-thin post goes
    // live with suggestions attached; only real risk goes to a human.
    const fraudFlags = Array.isArray(out.fraudFlags) ? out.fraudFlags : [];
    const risky = ['medium', 'high'].includes(String(out.fraudRisk || '').toLowerCase());

    return {
      qualityScore: typeof out.qualityScore === 'number' ? out.qualityScore : 75,
      flags: fraudFlags,
      suggestions: out.suggestions || [],
      requiresManualReview: risky || fraudFlags.length > 0
    };
  } catch (error) {
    console.error('AI Review Job Post Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 3. Generate Job Description
 * Generates full job description from 5 employer answers.
 */
const generateJobDescription = async (answers, language = 'en') => {
  const defaultFallback = {
    title: answers.title || 'Senior Software Engineer',
    description: `We are looking for a skilled professional to join our team. Key duties include managing product development, collaborating with cross-functional partners, and implementing scalable features.\n\nRequirements:\n- Strong problem-solving abilities\n- Communication skills\n- Experience in the field.`,
    skillsRequired: answers.keySkills ? answers.keySkills.split(',').map(s => s.trim()) : ['Project Management', 'Communication']
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      You are a recruiter. Generate a professional job posting based on the following answers provided by the employer:
      1. What is the job title? ${answers.title}
      2. What is the core responsibility? ${answers.responsibilities}
      3. What are the key skills? ${answers.keySkills}
      4. What is the work environment? ${answers.environment || 'Hybrid/Office'}
      5. What experience or qualifications are required? ${answers.experience}
      
      Language requested: ${language}
      
      Respond ONLY with a valid JSON object matching this structure:
      {
        "title": "Formatted Job Title",
        "description": "Rich job description text (use markdown headings or lists for formatting)",
        "skillsRequired": ["extracted", "required", "skills"]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('AI Generate Job Description Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 4. Generate Candidate Summary
 * 2-4 sentence natural language summary of candidate for employer.
 */
const generateCandidateSummary = async (profile, job, matchResult) => {
  const defaultFallback = `${profile.user?.name || 'The candidate'} is a strong match for the ${job.title} position, showing an overall score of ${matchResult?.score || 80}%. They possess key skills in ${profile.skills?.slice(0, 3).join(', ')} and have relevant work experience in similar roles. They fit the location requirements and demonstrate solid credentials.`;

  if (!model) return defaultFallback;

  try {
    const prompt = `
      Write a short, professional 2-to-4 sentence summary of candidate suitability for the employer.
      Candidate profile skills: ${JSON.stringify(profile.skills)}
      Candidate bio: ${profile.bio}
      Job requirement: ${job.title} - ${job.description.slice(0, 200)}
      Match score results: ${JSON.stringify(matchResult)}
      
      Return ONLY a plain text string summary.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('AI Generate Candidate Summary Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 5. Generate Interview Questions
 * audience "employer": questions to ask candidate.
 * audience "candidate": questions to prepare for + tip.
 */
const generateInterviewQuestions = async (job, audience = 'candidate') => {
  const defaultFallback = {
    questions: [
      'Can you describe your experience implementing scalable backend architectures?',
      'How do you manage cross-functional communication when planning sprint priorities?',
      'Tell us about a time you had to resolve a performance bottleneck in production.'
    ],
    tip: 'Review the main technologies mentioned in the job description and prepare architectural design scenarios.'
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      Generate interview questions based on the job posting below.
      Job Title: ${job.title}
      Description summary: ${job.description.slice(0, 300)}
      Audience: ${audience} (If "employer", generate questions to ask. If "candidate", generate questions to prepare for)
      
      Respond ONLY with a valid JSON object matching this structure:
      {
        "questions": ["Question 1", "Question 2", "Question 3"],
        "tip": "Short prep/evaluation tip string"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('AI Generate Interview Questions Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 6. Generate Status Update Message
 * Short professional message to candidate about status change.
 */
const generateStatusUpdateMessage = async (status, jobTitle, language = 'en') => {
  let fallbackMessage = `Dear Applicant, the status of your application for ${jobTitle} has been updated to "${status}". We will keep you updated.`;
  if (status === 'shortlisted') {
    fallbackMessage = `Congratulations! You have been shortlisted for the ${jobTitle} position. The hiring team will reach out shortly.`;
  } else if (status === 'interview') {
    fallbackMessage = `We would like to invite you for an interview for the ${jobTitle} position. Please check your inbox for details.`;
  } else if (status === 'rejected') {
    fallbackMessage = `Thank you for your application for the ${jobTitle} role. Unfortunately, we are not moving forward with your application at this time.`;
  }

  if (!model) return fallbackMessage;

  try {
    const prompt = `
      Write a short, professional, 1-to-2 sentence message to a candidate informing them their application status for the job "${jobTitle}" has changed to "${status}".
      Language: ${language}
      Return ONLY a plain text string. No other characters.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('AI Generate Status Update Message Error:', error.message);
    return fallbackMessage;
  }
};

/**
 * 7. Profile Builder — asks ONE question at a time.
 * Given who the user is and what they have already answered, returns the next
 * question, or signals that enough has been gathered.
 */
const PROFILE_TOPICS = [
  { field: 'technicalSkills', q: 'What are the main technical skills or tools you work with day to day?' },
  { field: 'enjoys',          q: 'What kind of work do you most enjoy doing?' },
  { field: 'preferredRole',   q: 'What job title or role are you aiming for next?' },
  { field: 'workStyle',       q: 'Do you prefer working on site, remotely, or a mix of both?' },
  { field: 'salary',          q: 'What monthly salary range are you hoping for, in USD?' },
  { field: 'industries',      q: 'Are there particular industries you want to work in, or avoid?' },
  { field: 'hobby',           q: 'Outside work, what do you enjoy doing? It helps us understand your strengths.' },
  { field: 'goal',            q: 'Where would you like your career to be in three years?' }
];

const nextProfileQuestion = async (context, history = []) => {
  const answered = new Set(history.map((h) => h.field));
  const remaining = PROFILE_TOPICS.filter((topic) => !answered.has(topic.field));

  // Deterministic finish condition — never let the model loop forever.
  if (!remaining.length) {
    return { done: true, question: null, field: null };
  }

  const fallback = { done: false, question: remaining[0].q, field: remaining[0].field };
  if (!model) return fallback;

  try {
    const prompt = `
      You are interviewing a jobseeker to build their career profile, one question at a time.
      Ask a single, short, warm question. Never ask more than one thing at once.
      Never repeat a topic that has already been answered.

      What we already know about them:
      ${JSON.stringify(context)}

      Answers so far:
      ${history.map((h) => `- ${h.field}: ${h.answer}`).join('\n') || '(none yet)'}

      The next topic to cover is "${remaining[0].field}". Suggested wording: "${remaining[0].q}"
      Rewrite that question so it follows naturally from what they have already told you.
      If they mentioned something specific, refer to it.

      Respond ONLY with valid JSON:
      { "question": "your question", "field": "${remaining[0].field}" }
    `;

    const result = await model.generateContent(prompt);
    const out = parseJson(result.response.text());
    return { done: false, question: out.question || fallback.question, field: remaining[0].field };
  } catch (error) {
    console.error('AI Next Profile Question Error:', error.message);
    return fallback;
  }
};

/**
 * 8. Derive the candidate's "main job specification" from everything known:
 * their identity data, their answers, and their parsed CVs.
 */
const deriveJobSpecification = async (context, history = [], cvSnapshots = []) => {
  const fallback = {
    title: context.jobSpecification || 'General Professional',
    summary: 'Profile captured. Add a Gemini API key to generate a tailored specification.',
    strengths: [],
    suggestedRoles: [],
    skillGaps: [],
    idealSalary: { min: 0, max: 0, currency: 'USD' }
  };

  if (!model) return fallback;

  try {
    const prompt = `
      Build a career specification for this jobseeker.

      Identity: ${JSON.stringify(context)}
      Interview answers: ${JSON.stringify(history)}
      Skills extracted from their uploaded CVs: ${JSON.stringify(cvSnapshots)}

      Respond ONLY with valid JSON matching:
      {
        "title": "the single job specification that best fits them, e.g. Backend Engineer",
        "summary": "2-3 sentence description of who they are professionally",
        "strengths": ["their strongest 3-5 selling points"],
        "suggestedRoles": ["3-5 job titles they should search for"],
        "skillGaps": ["2-4 skills worth learning for their target role"],
        "idealSalary": { "min": 0, "max": 0, "currency": "USD" }
      }
    `;

    const result = await model.generateContent(prompt);
    return parseJson(result.response.text());
  } catch (error) {
    console.error('AI Derive Job Specification Error:', error.message);
    return fallback;
  }
};

/**
 * 9. Draft an employer profile from a handful of facts, so businesses are not
 * staring at an empty "about us" box.
 */
const generateCompanyProfile = async (facts) => {
  const fallback = {
    tagline: `${facts.industry || 'Business'} in ${facts.city || 'Somalia'}`,
    description: `${facts.name} operates in the ${facts.industry || 'business'} sector.`,
    about: '',
    benefits: ['Competitive salary', 'Training and development'],
    values: ['Integrity', 'Customer focus']
  };
  if (!model) return fallback;

  try {
    // The strongest evidence of what a company actually does is what it hires
    // for. A firm advertising "Mobile Money Backend Developer" and "Network
    // Operations Engineer" is describable from those two facts alone, even if
    // the employer has typed almost nothing about themselves.
    const roleEvidence = (facts.jobTitles || []).length
      ? `Roles they are currently hiring for: ${facts.jobTitles.join('; ')}
         Skills those roles ask for: ${(facts.jobSkills || []).slice(0, 15).join(', ') || 'none listed'}`
      : 'They have not posted any vacancies yet.';

    const existing = [
      facts.tagline && `Existing tagline: ${facts.tagline}`,
      facts.description && `Existing description: ${facts.description}`,
      facts.about && `Existing about text: ${facts.about}`,
      facts.benefits?.length && `Benefits already listed: ${facts.benefits.join(', ')}`,
      facts.values?.length && `Values already listed: ${facts.values.join(', ')}`,
      facts.website && `Website: ${facts.website}`
    ].filter(Boolean).join('\n      ') || 'Nothing written yet.';

    const prompt = `
      You are writing the public profile of an employer on Fursad, a job
      platform for Somalia and East Africa. A jobseeker reads this to decide
      whether to trust this company with their CV.

      RULES
      - Ground every sentence in the facts below. Do not invent awards, client
        names, revenue, headcount, offices or history that is not given.
      - Where a fact is missing, write around it rather than guessing. Never
        write "unspecified" or leave a placeholder in the output.
      - Infer sensibly from the roles they hire for: those reveal what the
        company does, how technical it is, and who would fit there.
      - Plain, concrete language. No marketing superlatives — no "leading",
        "world-class", "cutting-edge", "passionate about excellence".
      - Somali context: salaries in USD, a workforce that is young and often
        self-taught, and employers who compete on trust rather than brand.
      - Write for a reader who has never heard of this company.

      WHAT WE KNOW
      Company name: ${facts.name}
      Industry: ${facts.industry || 'not stated — infer it from the roles below'}
      Location: ${[facts.city, facts.country].filter(Boolean).join(', ') || 'Somalia'}
      Founded: ${facts.foundedYear || 'not stated'}
      Size: ${facts.companySize || 'not stated'}

      ${roleEvidence}

      ALREADY ON THE PROFILE (improve on it; do not contradict it)
      ${existing}

      IN THE EMPLOYER'S OWN WORDS
      ${facts.notes || 'They have not added notes.'}

      Respond ONLY with valid JSON:
      {
        "tagline": "under 90 characters, says what they do, not how great they are",
        "description": "2-3 sentences shown on the job card and employer wall",
        "about": "two paragraphs: what the company does and who it serves, then what working there is actually like",
        "benefits": ["4-6 benefits that are plausible for a company of this size and sector in Somalia"],
        "values": ["3-5 values, phrased as how they behave rather than abstract nouns"],
        "reasoning": "one sentence naming which facts you built this from"
      }
    `;
    const result = await model.generateContent(prompt);
    return parseJson(result.response.text());
  } catch (error) {
    console.error('AI Generate Company Profile Error:', error.message);
    return fallback;
  }
};

/**
 * 10. Rank the people who applied to one job, and say why.
 * Deliberately scoped to actual applicants — employers never browse the pool.
 */
const rankApplicants = async (job, applicants) => {
  const fallback = {
    ranking: applicants.map((a, i) => ({
      applicationId: a.applicationId,
      rank: i + 1,
      verdict: 'consider',
      reason: 'Ranked by match score. Add a Gemini API key for AI reasoning.'
    })),
    summary: ''
  };
  if (!model || !applicants.length) return fallback;

  try {
    const prompt = `
      You are helping a recruiter triage applicants for one role.

      The role:
      Title: ${job.title}
      Required skills: ${JSON.stringify(job.skillsRequired)}
      Experience level: ${job.experienceLevel || 'unspecified'}
      Education: ${job.educationLevel || 'unspecified'}
      Description: ${(job.description || '').slice(0, 600)}

      The applicants:
      ${JSON.stringify(applicants)}

      Rank them best-first. Judge on evidence in their profile, not on
      demographics. Be honest when someone is a weak fit.

      Respond ONLY with valid JSON:
      {
        "ranking": [
          {
            "applicationId": "the id given",
            "rank": 1,
            "verdict": "strong" | "consider" | "weak",
            "reason": "one sentence citing specific evidence"
          }
        ],
        "summary": "one sentence on the shape of this applicant pool"
      }
    `;
    const result = await model.generateContent(prompt);
    const out = parseJson(result.response.text());
    if (!Array.isArray(out.ranking)) return fallback;
    return out;
  } catch (error) {
    console.error('AI Rank Applicants Error:', error.message);
    return fallback;
  }
};

module.exports = {
  parseResume,
  reviewJobPost,
  generateCompanyProfile,
  rankApplicants,
  generateJobDescription,
  generateCandidateSummary,
  generateInterviewQuestions,
  generateStatusUpdateMessage,
  nextProfileQuestion,
  deriveJobSpecification,
  embedTexts,
  isLive,
  PROFILE_TOPICS
};
