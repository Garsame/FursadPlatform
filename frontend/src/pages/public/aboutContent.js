import {
  Sparkles, Target, Eye, Heart, FileText, Brain, ClipboardCheck, Radar,
  UserCheck, Send, MessageSquare, ShieldCheck, Lock, KeyRound, Database,
  Scale, Bell, Building2, Users, GraduationCap, BadgeDollarSign, MapPin,
  Briefcase, LineChart, Languages, Clock, Wrench, ListChecks, Layers, Globe, Zap,
} from 'lucide-react';
import { MATCH_WEIGHTS } from '../../shared/constants';

/**
 * Every word the About page says about JobAssistAI lives here.
 *
 * It is separated from the markup for one reason: the page is long by design —
 * it is the only place that explains the whole platform — and mixing this much
 * prose into JSX makes both halves hard to edit. Sections read from this file,
 * so adding an AI function or a rule is a one-line change.
 *
 * Facts here are drawn from the running system: the AI functions are the real
 * exports of aiService, and the matching weights are imported rather than
 * retyped, so the page cannot drift away from the engine it describes.
 */

export const SECTIONS = [
  { id: 'overview', label: 'What JobAssistAI is' },
  { id: 'how',      label: 'How it works' },
  { id: 'ai',       label: 'The AI chain' },
  { id: 'matching', label: 'Matching' },
  { id: 'value',    label: 'What you get' },
  { id: 'trust',    label: 'Trust & rules' },
];

export const PILLARS = [
  {
    icon: Target,
    title: 'Mission',
    body: 'To make hiring in Somalia turn on evidence rather than proximity — so a candidate is judged on what they can actually do, and an employer reads the six people worth calling instead of the two hundred who applied.',
  },
  {
    icon: Eye,
    title: 'Vision',
    body: 'A single employment corridor for the region: one place where a vacancy is published once, reaches everyone qualified to see it, and where Somali talent is legible to employers at home and abroad.',
  },
  {
    icon: Heart,
    title: 'Values',
    body: 'Transparency before convenience. Every match score can be broken down and checked. Every vacancy is approved by a person. Everything the platform cannot yet do is written down — including further down this page.',
  },
];

export const AT_A_GLANCE = [
  ['Purpose',   'AI-assisted job matching and hiring for Somalia and East Africa'],
  ['Languages', 'Somali and English, switchable at any point'],
  ['Portals',   'Three, fully separate: candidate, employer, moderator'],
  ['Screens',   '35 pages across 38 routes'],
  ['API',       '66 endpoints across 10 routers'],
  ['Data',      '11 collections — the application is the only place the two sides meet'],
  ['AI',        '11 functions, each with a working fallback'],
  ['Matching',  'Semantic skills over cached embeddings, then fixed, showable arithmetic'],
];

/* ------------------------------------------------------------------ */
/*  How it works — one journey per portal                              */
/* ------------------------------------------------------------------ */

export const JOURNEYS = [
  {
    key: 'candidate',
    icon: Users,
    label: 'Job seekers',
    lede: 'The most complete journey on the platform, and the one everything else exists to serve.',
    replaces: 'Replaces: sending the same CV into silence, and never learning why.',
    cta: { to: '/signup', label: 'Create a profile' },
    steps: [
      {
        icon: KeyRound,
        title: 'Create an account',
        body: 'A two-step form, then a six-digit code by email that expires in ten minutes. If it is slow or lost, a resend button sends another. Forget the password later and a separate code brings you back in.',
      },
      {
        icon: FileText,
        title: 'Upload your CVs',
        body: 'PDF, Word or plain text up to 8 MB. Each CV is read separately into its own snapshot — skills, education, experience, languages, certifications — so you can keep one version per direction rather than one compromise.',
      },
      {
        icon: Brain,
        title: 'Build your profile with AI',
        body: 'Eight questions, each written in response to your last answer rather than read off a fixed list. It fills what the CV left out, and ends by stating the job specification you are actually looking for.',
      },
      {
        icon: Radar,
        title: 'See what fits',
        body: 'Vacancies ranked against you, each with a breakdown showing which factor earned what. With several CVs uploaded, a grid shows which CV wins on which vacancy, and by how many points.',
      },
      {
        icon: Send,
        title: 'Apply with the CV you choose',
        body: 'A 70% complete profile and at least one CV are required. Not a gate for its own sake: an empty profile scores near zero and tells an employer nothing about you.',
      },
      {
        icon: MessageSquare,
        title: 'Track it, and talk',
        body: 'Applied, reviewed, shortlisted, interview, offer, hired — every change emails you. Employer messages arrive live in an inbox with unread counts, and automated updates are labelled as automated.',
      },
    ],
  },
  {
    key: 'employer',
    icon: Building2,
    label: 'Employers',
    lede: 'A separate portal with its own login, never linked from the public site.',
    replaces: 'Replaces: a folder of two hundred attachments and no time to open them.',
    cta: { to: '/provider/signup', label: 'Register your company' },
    steps: [
      {
        icon: Building2,
        title: 'Register and build your company page',
        body: 'The page is public, and candidates read it before applying. AI can draft it by reasoning from the roles you actually hire for, rather than from five typed facts. It must be complete before you post.',
      },
      {
        icon: FileText,
        title: 'Post a vacancy',
        body: 'Answer a few questions and AI drafts the title, description and required skills. The post is screened automatically for quality and fraud, then reviewed by a moderator before the public sees it.',
      },
      {
        icon: Wrench,
        title: 'Edit, close or reopen it',
        body: 'A typo in the salary is not permanent, and a filled role does not stay advertised forever. Closing removes a vacancy from search while keeping every application already received.',
      },
      {
        icon: ListChecks,
        title: 'Read applicants already ranked',
        body: 'Sorted by match score, each with an AI-written summary of why this person suits this role. CVs are authorised per record — there is no browsable pool, and an unrelated employer is refused.',
      },
      {
        icon: UserCheck,
        title: 'Run an AI shortlist',
        body: 'A verdict and a specific reason for each candidate, in one pass. It argues its case; the decision stays with you.',
      },
      {
        icon: LineChart,
        title: 'Move the pipeline, read your numbers',
        body: 'Each status change emails the candidate automatically, so nobody is left waiting. Alongside it: your funnel, match distribution, per-job performance, and where your applicants and their skills come from.',
      },
    ],
  },
  {
    key: 'admin',
    icon: ShieldCheck,
    label: 'Moderators',
    lede: 'The reason a vacancy on JobAssistAI means something.',
    replaces: 'Protects: the credibility of every listing on the site.',
    cta: null,
    steps: [
      {
        icon: ClipboardCheck,
        title: 'Approve every publication',
        body: 'No vacancy reaches the public site without a person approving it — the first time and every time. Editing a live job returns it for review, because the copy approved is no longer the copy that would be published.',
      },
      {
        icon: Layers,
        title: 'Full control of a job status',
        body: 'Approve, reject, withdraw a live job for review, close it, or return it to draft. Withdrawing puts it back in the employer queue rather than deleting it, and the employer is emailed the reviewer note.',
      },
      {
        icon: Users,
        title: 'Manage accounts',
        body: 'Edit, suspend, reactivate, or delete with a preview of exactly what will be removed and a typed confirmation. Never passwords — only the owner of an account can set one.',
      },
      {
        icon: MessageSquare,
        title: 'Work the enquiry queue',
        body: 'Public contact messages arrive as a queue that can be taken, resolved, reopened and annotated, so nothing sits unanswered without somebody owning it.',
      },
      {
        icon: LineChart,
        title: 'Read numbers that are true',
        body: 'Growth, funnel, match distribution, top cities, employers and skills — every figure counted from real records. Where there is nothing to average, it shows a dash rather than inventing a number.',
      },
      {
        icon: Lock,
        title: 'Audit everything',
        body: 'Every moderation action is recorded: who did it, what they did, which record it touched, and when.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  The AI chain — seven stages a single hire passes through           */
/* ------------------------------------------------------------------ */

export const AI_CHAIN = [
  {
    key: 'read',
    icon: FileText,
    stage: 'Read',
    tagline: 'A file becomes structured evidence',
    functions: ['parseResume', 'embedTexts'],
    input: 'A CV as PDF, Word or plain text',
    output: 'Skills, education, experience, languages and certifications as fields — plus a vector for every distinct skill',
    body: 'The CV is read once and turned into a snapshot the rest of the platform can reason about. Every distinct skill string is embedded and cached permanently, so a skill like React is paid for once across the whole platform, ever.',
    gain: 'Nobody retypes their own history into a form, and no candidate is lost because a recruiter never opened the attachment.',
  },
  {
    key: 'understand',
    icon: Brain,
    stage: 'Understand',
    tagline: 'The gaps a CV always leaves',
    functions: ['nextProfileQuestion', 'deriveJobSpecification'],
    input: 'Everything already known about the candidate, plus the conversation so far',
    output: 'The next question worth asking — and, at the end, a stated job specification',
    body: 'Eight questions, each written in response to the last rather than read from a fixed list. It closes by deriving what the candidate is actually looking for, which is rarely what their last job title says.',
    gain: 'A profile complete enough to be matched honestly, built by talking rather than by filling in twenty fields.',
  },
  {
    key: 'publish',
    icon: ClipboardCheck,
    stage: 'Publish',
    tagline: 'Drafted by AI, approved by a person',
    functions: ['generateJobDescription', 'generateCompanyProfile', 'reviewJobPost'],
    input: 'A handful of answers from an employer, and the roles they already hire for',
    output: 'A drafted vacancy and company page, plus a quality and fraud score with flags',
    body: 'AI writes the first draft and then screens the result. The screen is advisory only — it gives a moderator a reason to look closely, it does not decide. Publication is always a human decision.',
    gain: 'An employer posts in minutes instead of an afternoon, and a candidate never reads a listing nobody checked.',
  },
  {
    key: 'match',
    icon: Radar,
    stage: 'Match',
    tagline: 'Meaning, not spelling',
    functions: ['embedTexts', 'fixed arithmetic'],
    input: 'A candidate profile and a vacancy',
    output: 'A score out of 100, and the breakdown that produced it',
    body: 'Skills are compared by meaning over the cached vectors, so Node.js, NodeJS and Node are one skill rather than three. Everything after that is weighted arithmetic — which is exactly why the number can be shown and checked.',
    gain: 'A qualified candidate no longer scores zero on the heaviest factor over a spelling difference.',
  },
  {
    key: 'judge',
    icon: UserCheck,
    stage: 'Judge',
    tagline: 'Reasons, not just rankings',
    functions: ['generateCandidateSummary', 'rankApplicants'],
    input: 'The application, the CV that was actually sent, the vacancy, and the match breakdown',
    output: 'A suitability summary per applicant, and on demand a shortlist with a verdict and a reason for each',
    body: 'The summary is written the moment somebody applies, so the employer opens a ranked list where every row already argues its own case. The shortlist goes further and commits to a verdict.',
    gain: 'Shortlisting takes minutes, and a rejection carries a reason rather than a shrug.',
  },
  {
    key: 'follow',
    icon: Bell,
    stage: 'Follow through',
    tagline: 'Nobody is left waiting',
    functions: ['generateStatusUpdateMessage', 'generateInterviewQuestions'],
    input: 'A pipeline status change, or an interview about to happen',
    output: 'A written update in the candidate own language, and interview questions specific to the role',
    body: 'Moving somebody through the pipeline writes and sends the message. Reaching the interview stage generates preparation questions for that particular vacancy rather than generic ones.',
    gain: 'The silence after applying — the most common complaint about hiring anywhere — is designed out rather than apologised for.',
  },
  {
    key: 'explain',
    icon: MessageSquare,
    stage: 'Explain',
    tagline: 'An assistant that can only see what you can',
    functions: ['answerAssistant'],
    input: 'A question from a visitor, or from a signed-in candidate',
    output: 'An answer, with links to the real pages it refers to',
    body: 'Its safety is not an instruction in a prompt, because a prompt instruction is a request and anyone can argue with it. The service can fetch exactly two kinds of thing: what the public site already shows, and your own records.',
    gain: 'There is no code path to another person data, to moderation state, or to anything under administration. It cannot disclose what it was never given.',
  },
];

export const AI_FUNCTIONS = [
  ['parseResume',                 'CV upload',              'Skills, education, experience, languages, certifications'],
  ['reviewJobPost',               'Job publish',            'Quality and fraud screen — advisory to the moderator'],
  ['generateJobDescription',      'Post a job',             'Title, description and required skills from a few answers'],
  ['generateCompanyProfile',      'Employer profile',       'A company page drafted from the roles actually posted'],
  ['nextProfileQuestion',         'Profile builder',        'The next question, written from the last answer'],
  ['deriveJobSpecification',      'End of profile builder', 'What this candidate is really looking for'],
  ['generateCandidateSummary',    'On apply',               'A suitability summary written for the employer'],
  ['rankApplicants',              'AI shortlist',           'A verdict and a specific reason per candidate'],
  ['generateInterviewQuestions',  'Interview stage',        'Preparation questions for that exact role'],
  ['generateStatusUpdateMessage', 'Pipeline change',        'The status update, written in the right language'],
  ['answerAssistant',             'Public assistant',       'Answers about the platform, linked to real pages'],
  ['embedTexts',                  'Skill matching',         'Cached vectors — each distinct skill billed once, ever'],
];

/* ------------------------------------------------------------------ */
/*  Matching — weights imported, never retyped                         */
/* ------------------------------------------------------------------ */

export const FACTORS = [
  {
    key: 'skills', icon: Zap, label: 'Skills', weight: MATCH_WEIGHTS.SKILLS,
    rule: 'Compared by meaning over cached embeddings, calibrated so unrelated terms earn nothing at all.',
    options: [
      { label: 'Strong overlap', value: 100 },
      { label: 'Partial',        value: 60 },
      { label: 'Thin',           value: 25 },
    ],
  },
  {
    key: 'location', icon: MapPin, label: 'Location', weight: MATCH_WEIGHTS.LOCATION,
    rule: 'Same city and country scores 100. Same country only scores 50. Anywhere else scores 0.',
    options: [
      { label: 'Same city',    value: 100 },
      { label: 'Same country', value: 50 },
      { label: 'Elsewhere',    value: 0 },
    ],
  },
  {
    key: 'salary', icon: BadgeDollarSign, label: 'Salary', weight: MATCH_WEIGHTS.SALARY,
    rule: 'Overlapping ranges score 100, otherwise the score decays with distance. Unstated on either side is neutral, never a penalty.',
    options: [
      { label: 'Overlaps or unstated', value: 100 },
      { label: 'Close',                value: 60 },
      { label: 'Far apart',            value: 10 },
    ],
  },
  {
    key: 'education', icon: GraduationCap, label: 'Education', weight: MATCH_WEIGHTS.EDUCATION,
    rule: 'A ranked ladder from secondary to doctorate. At or above what the vacancy asks scores 100; below it scores in proportion.',
    options: [
      { label: 'Meets it',        value: 100 },
      { label: 'One level below', value: 67 },
      { label: 'Two below',       value: 33 },
    ],
  },
  {
    key: 'experience', icon: Briefcase, label: 'Experience', weight: MATCH_WEIGHTS.EXPERIENCE,
    rule: 'The same ranked ladder, from entry through mid and senior to executive.',
    options: [
      { label: 'Meets it',        value: 100 },
      { label: 'One level below', value: 67 },
      { label: 'Two below',       value: 33 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  What each side gets out of it                                      */
/* ------------------------------------------------------------------ */

export const BENEFITS = [
  {
    key: 'candidate',
    icon: Users,
    label: 'For job seekers',
    items: [
      { icon: Radar,     title: 'Found for what you can do',          body: 'Skills are matched by meaning, not spelling. A qualified person no longer scores zero on the heaviest factor because their CV says NodeJS while the vacancy says Node.js.' },
      { icon: Scale,     title: 'The reasoning, not just a verdict',  body: 'Every match shows which factor earned what. A low score is not a mystery — you can see where it came from and what would move it.' },
      { icon: FileText,  title: 'One profile, several CVs',           body: 'Keep a version per direction and see which one wins on which vacancy, and by how many points. Then send the strongest one deliberately.' },
      { icon: Bell,      title: 'Nothing goes into silence',          body: 'Status changes, employer replies, accepted introductions and closed vacancies all reach you by email and inside the app.' },
      { icon: Lock,      title: 'Your CV stays yours',                body: 'Stored under unguessable filenames, never served publicly, and downloadable only by an employer you actually applied to. There is no browsable pool of CVs.' },
      { icon: Languages, title: 'Somali or English, anywhere',        body: 'The switch covers the working platform, not only the front page — and AI-written messages follow the language you chose.' },
    ],
  },
  {
    key: 'employer',
    icon: Building2,
    label: 'For employers',
    items: [
      { icon: ListChecks, title: 'Read six, not two hundred',      body: 'Applicants arrive ranked, each with a written summary of why this person suits this role. The reading order is settled before you open the list.' },
      { icon: Sparkles,   title: 'A vacancy written in minutes',   body: 'Answer a few questions and AI drafts the title, description and skills. Edit it, close it, reopen it — none of it is permanent.' },
      { icon: UserCheck,  title: 'A shortlist that argues',        body: 'A verdict and a specific reason per candidate, so a decision can be explained to a colleague — or to the candidate.' },
      { icon: Send,       title: 'Every candidate hears back',     body: 'Status changes email automatically. The pipeline maintains its own communication instead of relying on somebody remembering.' },
      { icon: LineChart,  title: 'Know your own hiring',           body: 'Funnel, match distribution, per-job performance, and the cities and skills your applicants are coming from.' },
      { icon: Building2,  title: 'A page that earns applications', body: 'Candidates read your company profile before applying. AI drafts it from the roles you post, so it describes the work rather than the boilerplate.' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Trust                                                              */
/* ------------------------------------------------------------------ */

export const RULES = [
  {
    q: 'A candidate needs a 70% profile and one CV before applying',
    a: 'An application with an empty profile scores near zero and tells the employer nothing — it wastes both sides. The 70% is computed from the profile itself on every save, weighted to follow the same factors the matching engine uses, so completing it is the same work as scoring well.',
  },
  {
    q: 'An employer cannot publish their own vacancy',
    a: 'Publication is a moderator decision, the first time and every time. Editing a live job sends it back for review, because the copy that was approved is no longer the copy that would be published.',
  },
  {
    q: 'An employer needs a complete company profile to post',
    a: 'A name, an industry, a description, a city and a contact address. A vacancy sitting behind a blank profile gives a candidate nothing to judge before handing over their CV.',
  },
  {
    q: 'A candidate gets one introduction per application',
    a: 'After the first message, the employer must accept before the conversation continues. It is enforced in the socket handler — the only place in the system where a message can be created — rather than by hiding a button.',
  },
  {
    q: 'Employers see only their own applicants',
    a: 'There is no browsable pool of CVs anywhere on the platform. Download is authorised per record, and an unrelated employer asking for a file is refused outright.',
  },
  {
    q: 'The last moderator cannot be deleted or suspended',
    a: 'Either action would lock the owner of the platform out of their own moderation tools, with no route back in.',
  },
];

export const SECURITY = [
  { icon: KeyRound,    text: 'Both server secrets are validated at boot — minimum length enforced, known-published values permanently rejected, and the server refuses to start otherwise.' },
  { icon: Lock,        text: 'No fallback secrets anywhere in the code. A fallback published in a repository is not a fallback.' },
  { icon: Clock,       text: 'Rate limits on everything worth abusing: 10 credential attempts per 15 minutes, 8 outbound emails per 10 minutes, 12 registrations per hour, 25 assistant questions per 5 minutes.' },
  { icon: Globe,       text: 'Cross-origin requests are restricted to exactly the configured origin in production.' },
  { icon: Database,    text: 'CVs are stored under random unguessable filenames, never served statically, and reachable only through an authorised route.' },
  { icon: ShieldCheck, text: 'Passwords are hashed with bcrypt. Administrators cannot set one — only the owner of an account can.' },
  { icon: Eye,         text: 'Password reset and code resend answer identically whether or not an address exists, so neither form can be used to discover who has an account.' },
  { icon: FileText,    text: 'Uploaded CVs and photographs are kept out of version control. The repository has a public remote.' },
];
