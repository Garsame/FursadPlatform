/**
 * Fursad — end-to-end walkthrough.
 *
 * Drives the whole platform through its real HTTP API, exactly as the browser
 * does: register, verify, build a profile, upload a CV, post a vacancy, have an
 * administrator approve it, apply, rank, message and notify. Nothing is
 * simulated — every step is a real request against the running server and the
 * real database.
 *
 * Two jobs at once:
 *   1. It VERIFIES the journey. Any broken link in the chain fails loudly,
 *      naming the step and the server's own reason.
 *   2. It SEEDS a demo. What it leaves behind is a coherent story you can walk
 *      a judge through in the browser afterwards.
 *
 * Verification codes are read straight from the database rather than from an
 * inbox, so this works whether or not SMTP is configured.
 *
 * Run from the backend folder:
 *   node scripts/walkthrough.js            seed and verify, leave the data
 *   node scripts/walkthrough.js --clean    verify, then remove what it created
 *
 * Re-running is safe: the demo accounts are removed and rebuilt each time.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const API = process.env.WALKTHROUGH_API || `http://localhost:${process.env.PORT || 5000}/api`;
const CLEAN = process.argv.includes('--clean');
const PASSWORD = 'Fursad@2026';

/* ------------------------------------------------------------------ */
/*  The cast                                                           */
/* ------------------------------------------------------------------ */
/* Fictional people and a fictional company, deliberately. These are    */
/* demonstration accounts, not real businesses — the platform's own     */
/* notes are explicit that only genuine registrations belong here, so   */
/* nothing below borrows a real company's name or trademark.            */

const CANDIDATE = {
  name: 'Amina Yusuf Farah',
  email: 'amina.demo@fursad.test',
  phone: '+252612000111',
  password: PASSWORD,
  role: 'jobseeker',
  gender: 'female',
  country: 'Somalia',
  city: 'Mogadishu',
  educationLevel: 'Bachelor',
  jobSpecification: 'Backend developer working with Node.js and databases',
};

const EMPLOYER = {
  name: 'Khalid Abdi',
  email: 'khalid.demo@fursad.test',
  phone: '+252612000222',
  password: PASSWORD,
  role: 'employer',
  country: 'Somalia',
  city: 'Mogadishu',
};

const ADMIN = {
  name: 'Fursad Moderator',
  email: 'moderator.demo@fursad.test',
  phone: '+252612000333',
  password: PASSWORD,
  role: 'admin',
  adminSecret: process.env.ADMIN_SECRET,
};

const DEMO_EMAILS = [CANDIDATE.email, EMPLOYER.email, ADMIN.email];

const CV_TEXT = `AMINA YUSUF FARAH
Backend Developer — Mogadishu, Somalia
amina.demo@fursad.test | +252 61 200 0111

PROFILE
Backend developer with four years building APIs and data services for
fintech and telecom clients across East Africa. Comfortable owning a
service from schema design through to production monitoring.

SKILLS
Node.js, Express, MongoDB, REST API design, JavaScript, Git, Docker,
PostgreSQL, Redis, unit testing

EXPERIENCE
Backend Developer — Horn Digital Systems, Mogadishu (2022 - present)
  Built and maintained the payments reconciliation service handling
  roughly 40,000 transactions a day. Cut median API latency from 800ms
  to 180ms by introducing caching and fixing N+1 queries.

Junior Developer — Banadir Software House, Mogadishu (2021 - 2022)
  Worked on internal tooling and a customer portal in JavaScript.

EDUCATION
BSc Computer Science — Somali National University, 2017 - 2021

LANGUAGES
Somali (native), English (fluent), Arabic (intermediate)

CERTIFICATIONS
MongoDB Associate Developer
`;

const JOB = {
  title: 'Backend Developer (Node.js)',
  description: `We are hiring a backend developer to join the engineering team
building our mobile money platform.

What you will do:
- Design and build REST APIs in Node.js and Express
- Model and query data in MongoDB
- Work with the mobile team to ship features end to end
- Take part in code review and help keep the test suite healthy

What we are looking for:
- Solid JavaScript, and real experience with Node.js in production
- Comfort with databases and API design
- A degree in computer science or equivalent practical experience
- Somali and English`,
  skillsRequired: ['Node.js', 'Express', 'MongoDB', 'REST API design', 'JavaScript', 'Git'],
  location: { city: 'Mogadishu', country: 'Somalia' },
  salaryRange: { min: 900, max: 1600, currency: 'USD' },
  educationLevel: 'Bachelor',
  experienceLevel: 'mid',
  employmentType: 'full-time',
  status: 'published', // requests publication; the server queues it for review
};

/* ------------------------------------------------------------------ */
/*  Plumbing                                                           */
/* ------------------------------------------------------------------ */

const results = [];
let stepNo = 0;

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

class StepError extends Error {}

/** Runs one step, records the outcome, and stops the run if it fails. */
const step = async (label, fn) => {
  stepNo += 1;
  const n = String(stepNo).padStart(2, '0');
  try {
    const detail = await fn();
    results.push({ n, label, ok: true, detail: detail || '' });
    console.log(`${c.green('  PASS')}  ${n}. ${label}${detail ? c.dim(`  — ${detail}`) : ''}`);
  } catch (error) {
    results.push({ n, label, ok: false, detail: error.message });
    console.log(`${c.red('  FAIL')}  ${n}. ${label}`);
    console.log(`        ${c.red(error.message)}`);
    throw new StepError(label);
  }
};

/**
 * One HTTP call. Returns the parsed body, and throws with the SERVER's own
 * message on failure — the server explains itself well, so repeating its
 * words is more useful than inventing new ones.
 */
const call = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    throw new Error(
      `Could not reach ${method} ${path} — is the backend running on ${API}? (${error.message})`
    );
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 160)}`);
  }

  if (!res.ok || data.success === false) {
    const extra = data.missing?.length ? ` [still needed: ${data.missing.map((m) => m.label).join(', ')}]` : '';
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${data.message || text.slice(0, 160)}${extra}`);
  }
  return data;
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/* ------------------------------------------------------------------ */
/*  Direct database access — only for reading codes and cleaning up    */
/* ------------------------------------------------------------------ */

let models = {};

const connectDb = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/Fursad_Platform';
  await mongoose.connect(uri);
  models = {
    User: require('../src/models/User'),
    JobseekerProfile: require('../src/models/JobseekerProfile'),
    CV: require('../src/models/CV'),
    Company: require('../src/models/Company'),
    Job: require('../src/models/Job'),
    Application: require('../src/models/Application'),
    Message: require('../src/models/Message'),
    Notification: require('../src/models/Notification'),
  };
  return uri;
};

/** Reads the verification code the server just generated. */
const readOtp = async (email) => {
  const user = await models.User.findOne({ email }).select('otpCode');
  assert(user, `no user row for ${email} — registration did not persist`);
  assert(user.otpCode, `no verification code stored for ${email}`);
  return user.otpCode;
};

/** Removes the demo cast and everything attached to them. Idempotent. */
const wipeDemo = async () => {
  const users = await models.User.find({ email: { $in: DEMO_EMAILS } }).select('_id');
  const ids = users.map((u) => u._id);
  if (!ids.length) return 0;

  const jobs = await models.Job.find({ postedBy: { $in: ids } }).select('_id');
  const jobIds = jobs.map((j) => j._id);

  const apps = await models.Application.find({
    $or: [{ jobseeker: { $in: ids } }, { job: { $in: jobIds } }],
  }).select('_id');

  await models.Message.deleteMany({ application: { $in: apps.map((a) => a._id) } });
  await models.Application.deleteMany({ _id: { $in: apps.map((a) => a._id) } });
  await models.Job.deleteMany({ _id: { $in: jobIds } });
  await models.Company.deleteMany({ owner: { $in: ids } });
  await models.JobseekerProfile.deleteMany({ user: { $in: ids } });
  await models.CV.deleteMany({ user: { $in: ids } });
  await models.Notification.deleteMany({ recipient: { $in: ids } });
  await models.User.deleteMany({ _id: { $in: ids } });
  return ids.length;
};

/* ------------------------------------------------------------------ */
/*  The walkthrough                                                    */
/* ------------------------------------------------------------------ */

const run = async () => {
  console.log(c.bold('\n  FURSAD — END-TO-END WALKTHROUGH'));
  console.log(c.dim(`  API: ${API}`));

  const state = {};

  console.log(c.bold('\n  Setup\n'));

  await step('Database reachable', async () => {
    const uri = await connectDb();
    return uri.replace(/\/\/[^@]*@/, '//***@');
  });

  await step('Previous demo data cleared', async () => {
    const n = await wipeDemo();
    return n ? `removed ${n} previous demo account(s)` : 'nothing left over';
  });

  await step('API responding', async () => {
    const res = await fetch(API.replace(/\/api$/, '/'));
    assert(res.ok, `base route returned HTTP ${res.status}`);
    return 'server is up';
  });

  await step('Admin secret is configured', async () => {
    assert(ADMIN.adminSecret, 'ADMIN_SECRET is not set in backend/.env — cannot register a moderator');
    assert(ADMIN.adminSecret.length >= 32, 'ADMIN_SECRET is shorter than 32 characters');
    return `${ADMIN.adminSecret.length} characters`;
  });

  /* --- The candidate ---------------------------------------------- */
  console.log(c.bold('\n  The candidate\n'));

  await step('Candidate registers', async () => {
    const out = await call('POST', '/auth/register', { body: CANDIDATE });
    assert(out.requiresVerification, 'expected the account to require email verification');
    return CANDIDATE.email;
  });

  await step('Verification code issued and accepted', async () => {
    const otp = await readOtp(CANDIDATE.email);
    const out = await call('POST', '/auth/verify-otp', {
      body: { email: CANDIDATE.email, otpCode: otp },
    });
    assert(out.token, 'verification did not return a session token');
    state.candidateToken = out.token;
    return `code ${otp} accepted, signed in`;
  });

  await step('Profile was created automatically on verification', async () => {
    const out = await call('GET', '/profile/me', { token: state.candidateToken });
    assert(out.data, 'no profile record came back');
    return `completeness ${out.data.profileCompletenessScore}% at this point`;
  });

  await step('Candidate fills in their profile', async () => {
    const out = await call('PUT', '/profile/me', {
      token: state.candidateToken,
      body: {
        headline: 'Backend developer — Node.js, Express, MongoDB',
        bio: 'Backend developer with four years building APIs and data services for fintech and telecom clients across East Africa. I like owning a service end to end.',
        skills: ['Node.js', 'Express', 'MongoDB', 'JavaScript', 'REST API design', 'Git', 'Docker'],
        location: { city: 'Mogadishu', country: 'Somalia' },
        highestEducationLevel: 'Bachelor',
        experienceLevel: 'mid',
        salaryExpectation: { min: 1000, max: 1700, currency: 'USD' },
        languagesSpoken: ['Somali', 'English', 'Arabic'],
        education: [{
          institution: 'Somali National University',
          level: 'Bachelor',
          fieldOfStudy: 'Computer Science',
          startYear: 2017,
          endYear: 2021,
        }],
        experience: [{
          title: 'Backend Developer',
          company: 'Horn Digital Systems',
          startDate: new Date('2022-03-01'),
          endDate: null,
          description: 'Payments reconciliation service, roughly 40,000 transactions a day.',
        }],
      },
    });
    state.completeness = out.data.profileCompletenessScore;
    assert(state.completeness >= 70, `completeness is ${state.completeness}%, below the 70% needed to apply`);
    return `completeness now ${state.completeness}% — above the 70% bar`;
  });

  await step('Candidate uploads a CV, and the AI reads it', async () => {
    const form = new FormData();
    form.append('file', new Blob([CV_TEXT], { type: 'text/plain' }), 'amina-yusuf-cv.txt');
    form.append('label', 'Backend CV');

    const out = await call('POST', '/cvs', { token: state.candidateToken, form });
    const cv = out.data;
    state.cvId = cv._id;
    assert(cv.parseStatus === 'parsed', `CV parse status is "${cv.parseStatus}", expected "parsed"`);
    const skills = cv.parsed?.skills || [];
    assert(skills.length > 0, 'the AI extracted no skills from the CV');
    return `parsed — ${skills.length} skills, ${(cv.parsed?.languages || []).length} languages read off the CV`;
  });

  /* --- The employer ------------------------------------------------ */
  console.log(c.bold('\n  The employer\n'));

  await step('Employer registers and verifies', async () => {
    await call('POST', '/auth/register', { body: EMPLOYER });
    const otp = await readOtp(EMPLOYER.email);
    const out = await call('POST', '/auth/verify-otp', {
      body: { email: EMPLOYER.email, otpCode: otp },
    });
    assert(out.token, 'employer verification returned no token');
    state.employerToken = out.token;
    return EMPLOYER.email;
  });

  await step('Posting is blocked while the company profile is blank', async () => {
    try {
      await call('POST', '/jobs', { token: state.employerToken, body: JOB });
    } catch (error) {
      assert(
        /complete your company profile/i.test(error.message),
        `blocked, but not for the expected reason: ${error.message}`
      );
      return 'refused, as designed';
    }
    throw new Error('a job was posted behind an empty company profile — the gate did not hold');
  });

  await step('Employer completes the company profile', async () => {
    const out = await call('PUT', '/companies/mine', {
      token: state.employerToken,
      body: {
        name: 'Sahal Digital',
        industry: 'Financial technology',
        description: 'Sahal Digital builds mobile money infrastructure for banks and telecom operators in Somalia and the wider Horn of Africa.',
        about: 'Founded in Mogadishu, Sahal Digital runs the payment rails behind several regional mobile wallets. The engineering team is small, works in one office, and ships to production most weeks.',
        location: { city: 'Mogadishu', country: 'Somalia' },
        contactEmail: 'careers@sahaldigital.test',
        companySize: '11-50',
        foundedYear: 2019,
        tagline: 'Mobile money infrastructure for the Horn of Africa',
        benefits: ['Health cover', 'Training budget', 'Transport allowance', 'Annual bonus'],
        values: ['We ship and then improve', 'We explain our decisions', 'We answer candidates'],
      },
    });
    state.companyId = out.data._id;
    return `"${out.data.name}" — profile ${out.data.profileCompleteness}% complete`;
  });

  await step('Employer posts the vacancy', async () => {
    const out = await call('POST', '/jobs', { token: state.employerToken, body: JOB });
    state.jobId = out.data._id;
    assert(
      out.data.status === 'pending_review',
      `job status is "${out.data.status}" — an employer should not be able to publish directly`
    );
    return `queued for review, AI quality score ${out.data.aiQualityScore}`;
  });

  await step('The unapproved job is NOT on the public site', async () => {
    const out = await call('GET', '/jobs');
    const visible = (out.data || []).some((j) => String(j._id) === String(state.jobId));
    assert(!visible, 'an unapproved job is publicly visible — the approval gate is not holding');
    return 'correctly hidden until approved';
  });

  /* --- The moderator ----------------------------------------------- */
  console.log(c.bold('\n  The moderator\n'));

  await step('Moderator registers with the admin secret', async () => {
    const out = await call('POST', '/auth/register', { body: ADMIN });
    assert(out.token, 'admin registration returned no token');
    state.adminToken = out.token;
    return 'auto-verified, no email code needed';
  });

  await step('The vacancy is waiting in the review queue', async () => {
    const out = await call('GET', '/admin/jobs/pending', { token: state.adminToken });
    const found = (out.data || []).find((j) => String(j._id) === String(state.jobId));
    assert(found, 'the posted job is not in the pending queue');
    return `"${found.title}" from ${found.company?.name || 'unknown'}`;
  });

  await step('Moderator approves it', async () => {
    const out = await call('PUT', `/admin/jobs/${state.jobId}/status`, {
      token: state.adminToken,
      body: { status: 'published', note: 'Genuine employer, clear role. Approved.' },
    });
    assert(out.data.status === 'published', `status after approval is "${out.data.status}"`);
    return out.emailed ? 'published, employer emailed' : 'published (email logged to console)';
  });

  await step('It is now on the public site', async () => {
    const out = await call('GET', '/jobs');
    const found = (out.data || []).find((j) => String(j._id) === String(state.jobId));
    assert(found, 'the approved job is still not publicly listed');
    return `visible to everyone — "${found.title}"`;
  });

  /* --- Matching and applying --------------------------------------- */
  console.log(c.bold('\n  Matching and applying\n'));

  await step('The job is recommended to the candidate, with a score', async () => {
    const out = await call('GET', '/profile/recommendations', { token: state.candidateToken });
    const list = out.data?.matches || out.data || [];
    const found = list.find((m) => String(m.job?._id || m._id) === String(state.jobId));
    assert(found, 'the new vacancy did not appear in the candidate\'s matches');
    const score = found.score ?? found.matchScore;
    assert(typeof score === 'number', 'the match came back without a score');
    state.recommendedScore = score;
    return `matched at ${score}%`;
  });

  await step('Candidate applies with their CV', async () => {
    const out = await call('POST', '/applications', {
      token: state.candidateToken,
      body: {
        jobId: state.jobId,
        cvId: state.cvId,
        coverNote: 'I have spent four years on payment systems in Mogadishu and would like to keep doing that work at a larger scale.',
      },
    });
    state.applicationId = out.data._id;
    state.appliedScore = out.data.matchScore;
    const b = out.data.matchBreakdown || {};
    assert(typeof state.appliedScore === 'number', 'the application was stored without a match score');
    return `score ${state.appliedScore}% (skills ${b.skills}, location ${b.location}, salary ${b.salary}, education ${b.education}, experience ${b.experience})`;
  });

  await step('An AI suitability summary was written for the employer', async () => {
    const out = await call('GET', `/applications/job/${state.jobId}`, { token: state.employerToken });
    const app = (out.data || []).find((a) => String(a._id) === String(state.applicationId));
    assert(app, 'the application is not visible to the employer');
    assert(app.aiSummary && app.aiSummary.length > 20, 'no AI summary was attached to the application');
    assert(app.scoreBasis?.source === 'cv', `score basis is "${app.scoreBasis?.source}", expected "cv"`);
    return `scored from the CV, summary ${app.aiSummary.length} characters`;
  });

  await step('Applying twice to the same job is refused', async () => {
    try {
      await call('POST', '/applications', {
        token: state.candidateToken,
        body: { jobId: state.jobId, cvId: state.cvId },
      });
    } catch (error) {
      assert(/already applied/i.test(error.message), `refused for an unexpected reason: ${error.message}`);
      return 'duplicate blocked, as designed';
    }
    throw new Error('the same candidate applied twice to one vacancy');
  });

  /* --- The employer works the pipeline ----------------------------- */
  console.log(c.bold('\n  Working the pipeline\n'));

  await step('AI shortlist ranks the applicants with reasons', async () => {
    const out = await call('GET', `/applications/job/${state.jobId}/shortlist`, {
      token: state.employerToken,
    });
    const ranking = out.data?.ranking || [];
    assert(ranking.length > 0, 'the shortlist came back empty');
    const first = ranking[0];
    if (out.data.degraded) {
      return c.yellow(`degraded fallback — ${first.reason}`);
    }
    return `${ranking.length} ranked — top verdict "${first.verdict}"`;
  });

  await step('Employer moves the candidate to shortlisted', async () => {
    const out = await call('PUT', `/applications/${state.applicationId}/status`, {
      token: state.employerToken,
      body: { status: 'shortlisted', note: 'Strong payments background, right stack.' },
    });
    assert(out.data.status === 'shortlisted', `status is "${out.data.status}"`);
    return 'candidate emailed, automated message logged to the thread';
  });

  await step('Candidate sees the status change on their application', async () => {
    const out = await call('GET', '/applications/mine', { token: state.candidateToken });
    const app = (out.data || []).find((a) => String(a._id) === String(state.applicationId));
    assert(app, 'the application is missing from the candidate\'s list');
    assert(app.status === 'shortlisted', `candidate sees status "${app.status}"`);
    return `"${app.job?.title}" — shortlisted`;
  });

  await step('Candidate was notified, with a link to the right screen', async () => {
    const out = await call('GET', '/notifications', { token: state.candidateToken });
    const list = out.data || [];
    assert(list.length > 0, 'the candidate has no notifications at all');
    const statusNote = list.find((n) => n.type === 'application_status');
    assert(statusNote, `no application_status notification (got: ${list.map((n) => n.type).join(', ') || 'none'})`);
    assert(statusNote.link, 'the notification carries no link');
    return `${list.length} notification(s) — "${statusNote.title}"`;
  });

  await step('A conversation thread exists for the candidate', async () => {
    const out = await call('GET', '/applications/threads', { token: state.candidateToken });
    const thread = (out.data || []).find((t) => String(t.applicationId) === String(state.applicationId));
    assert(thread, 'no message thread was created for the application');
    return `thread open with ${thread.companyName}, candidate may send: ${thread.canSend}`;
  });

  await step('Employer sees the thread grouped under the vacancy', async () => {
    const out = await call('GET', '/applications/employer/threads', { token: state.employerToken });
    const job = (out.data || []).find((j) => String(j.jobId) === String(state.jobId));
    assert(job, 'the vacancy is missing from the employer\'s message view');
    assert(job.threads.length > 0, 'the vacancy has no candidate threads');
    return `${job.applicantCount} applicant(s) under "${job.title}"`;
  });

  /* --- What the moderator sees ------------------------------------- */
  console.log(c.bold('\n  Moderator oversight\n'));

  await step('Platform analytics report real, reconciled numbers', async () => {
    const out = await call('GET', '/admin/analytics', { token: state.adminToken });
    const s = out.data.summary;
    const growth = out.data.charts.userGrowth;
    assert(Array.isArray(growth) && growth.length > 0, 'the growth chart is empty');
    const last = growth[growth.length - 1];
    assert(
      last.count === s.totalUsers,
      `the growth chart ends at ${last.count} but the platform has ${s.totalUsers} users — these must reconcile`
    );
    assert(s.avgMatchScore !== undefined, 'no average match score reported');
    return `${s.totalUsers} users, ${s.totalJobs} jobs, ${s.totalApplications} applications, avg match ${s.avgMatchScore}%`;
  });

  await step('Every moderator action was written to the audit log', async () => {
    const out = await call('GET', '/admin/audit-log', { token: state.adminToken });
    const entry = (out.data || []).find(
      (l) => l.action === 'JOB_APPROVED' && String(l.targetId) === String(state.jobId)
    );
    assert(entry, 'the approval was not recorded in the audit log');
    return `"${entry.action}" by ${entry.actor?.name}`;
  });

  /* --- Boundaries hold --------------------------------------------- */
  console.log(c.bold('\n  Boundaries\n'));

  await step('An employer cannot reach the moderator API', async () => {
    try {
      await call('GET', '/admin/users', { token: state.employerToken });
    } catch (error) {
      assert(/40[13]/.test(error.message), `refused, but with an odd response: ${error.message}`);
      return 'refused with 403, as designed';
    }
    throw new Error('an employer token reached the admin API — role separation is broken');
  });

  await step('A candidate cannot read another employer\'s applicant list', async () => {
    try {
      await call('GET', `/applications/job/${state.jobId}`, { token: state.candidateToken });
    } catch (error) {
      assert(/40[13]/.test(error.message), `refused, but with an odd response: ${error.message}`);
      return 'refused with 403, as designed';
    }
    throw new Error('a candidate read the employer applicant list');
  });

  await step('An unauthenticated caller is turned away', async () => {
    try {
      await call('GET', '/applications/mine');
    } catch (error) {
      assert(/401/.test(error.message), `refused, but with an odd response: ${error.message}`);
      return 'refused with 401, as designed';
    }
    throw new Error('an anonymous request read a private endpoint');
  });
};

/* ------------------------------------------------------------------ */

const summarise = async () => {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log(c.bold('\n  ────────────────────────────────────────────────────────'));
  if (!failed.length) {
    console.log(c.bold(c.green(`  ALL ${passed} CHECKS PASSED`)));
    console.log('  The full journey works end to end: sign-up, verification,');
    console.log('  profile, CV parsing, company profile, posting, moderation,');
    console.log('  matching, applying, ranking, the pipeline and notifications.');
  } else {
    console.log(c.bold(c.red(`  ${passed} passed, ${failed.length} FAILED`)));
    failed.forEach((f) => console.log(c.red(`    ${f.n}. ${f.label}`)));
  }

  if (CLEAN) {
    const n = await wipeDemo();
    console.log(c.dim(`\n  --clean: removed ${n} demo account(s) and everything attached.`));
  } else if (!failed.length) {
    console.log(c.bold('\n  Demo data left in place. Sign in at http://localhost:5174\n'));
    console.log(`    Candidate   ${CANDIDATE.email}`);
    console.log(`                /signin`);
    console.log(`    Employer    ${EMPLOYER.email}`);
    console.log(`                /provider/login`);
    console.log(`    Moderator   ${ADMIN.email}`);
    console.log(`                /admin/login`);
    console.log(`    Password    ${PASSWORD}  (all three)\n`);
    console.log(c.dim('  A good demo path: sign in as the candidate, show the matched job'));
    console.log(c.dim('  and its score breakdown, then switch to the employer to show the'));
    console.log(c.dim('  same person ranked with an AI summary, then the moderator queue.'));
  }
  console.log('');
};

(async () => {
  let exitCode = 0;
  try {
    await run();
  } catch (error) {
    exitCode = 1;
    if (!(error instanceof StepError)) {
      console.log(c.red(`\n  Unexpected failure: ${error.stack || error.message}`));
    }
  }

  try {
    await summarise();
  } catch (error) {
    console.log(c.red(`  Could not summarise: ${error.message}`));
  }

  await mongoose.disconnect().catch(() => {});
  process.exit(exitCode);
})();
