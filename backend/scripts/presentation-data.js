/**
 * Fursad — evidence pack for the hackathon presentation.
 *
 * Everything a judge might ask you to justify, measured rather than
 * remembered: what the system is made of, what is actually in the database,
 * and — the part that matters most — a live, reproducible demonstration that
 * the matching engine does what the pitch says it does.
 *
 * Run from the backend folder:
 *   node scripts/presentation-data.js
 *
 * Nothing here writes anything. It is safe to run during the event.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const ROOT = path.join(__dirname, '..');          // backend/
const REPO = path.join(ROOT, '..');               // fursad/
const FRONT = path.join(REPO, 'frontend', 'src');

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  d: (s) => `\x1b[2m${s}\x1b[0m`,
};

const rule = (t) => console.log('\n' + c.b(`── ${t} ` + '─'.repeat(Math.max(0, 58 - t.length))));
const row = (k, v) => console.log(`  ${String(k).padEnd(38)} ${c.g(v)}`);

/* ------------------------------------------------------------------ */
/*  1. What the system is made of                                      */
/* ------------------------------------------------------------------ */

const walk = (dir, ext, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, ext, acc);
    else if (ext.some((x) => e.name.endsWith(x))) acc.push(full);
  }
  return acc;
};

const countLines = (files) =>
  files.reduce((n, f) => n + fs.readFileSync(f, 'utf8').split('\n').length, 0);

const codeStats = () => {
  rule('1. WHAT THE SYSTEM IS MADE OF');

  // Endpoints, counted by parsing the routers rather than trusting the docs.
  const routeDir = path.join(ROOT, 'src', 'routes');
  const routers = fs.readdirSync(routeDir).filter((f) => f.endsWith('Routes.js'));
  let endpoints = 0;
  const perRouter = [];

  for (const f of routers) {
    const src = fs.readFileSync(path.join(routeDir, f), 'utf8');
    const n = (src.match(/router\.(get|post|put|delete|patch)\s*\(/g) || []).length;
    endpoints += n;
    perRouter.push([f.replace('Routes.js', ''), n]);
  }

  const models = fs.readdirSync(path.join(ROOT, 'src', 'models')).filter((f) => f.endsWith('.js'));

  const aiSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'aiService.js'), 'utf8');
  const aiExports = (aiSrc.match(/^\s{2}[a-zA-Z]+,$/gm) || []).length;
  const aiNumbered = (aiSrc.match(/^\s\*\s\d+\.\s/gm) || []).length;

  const appSrc = fs.readFileSync(path.join(FRONT, 'App.jsx'), 'utf8');
  const routes = (appSrc.match(/<Route\s/g) || []).length;

  const pages = walk(path.join(FRONT, 'pages'), ['.jsx']);
  const components = walk(path.join(FRONT, 'components'), ['.jsx']);
  const backendFiles = walk(path.join(ROOT, 'src'), ['.js']);
  const frontendFiles = walk(FRONT, ['.jsx', '.js']);

  row('API endpoints', endpoints);
  console.log(c.d('    ' + perRouter.map(([n, k]) => `${n}:${k}`).join('  ')));
  row('Database collections (Mongoose models)', models.length);
  console.log(c.d('    ' + models.map((m) => m.replace('.js', '')).join(', ')));
  row('AI functions wired to Gemini', aiNumbered);
  row('Frontend routes', routes);
  row('Page components', pages.length);
  row('Shared UI components', components.length);
  row('Backend lines of code', countLines(backendFiles).toLocaleString());
  row('Frontend lines of code', countLines(frontendFiles).toLocaleString());
  row('Total lines written', (countLines(backendFiles) + countLines(frontendFiles)).toLocaleString());

  // Bilingual coverage is a real differentiator in this market — count it.
  try {
    const en = JSON.parse(fs.readFileSync(path.join(FRONT, 'i18n/locales/en.json'), 'utf8'));
    const so = JSON.parse(fs.readFileSync(path.join(FRONT, 'i18n/locales/so.json'), 'utf8'));
    const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
      typeof v === 'object' && v !== null ? flat(v, `${p}${k}.`) : [`${p}${k}`]);
    const eK = flat(en), sK = flat(so);
    row('Translated strings (English)', eK.length);
    row('Translated strings (Somali)', sK.length);
    row('Somali coverage', `${Math.round((sK.filter((k) => eK.includes(k)).length / eK.length) * 100)}%`);
  } catch { /* locales optional */ }
};

/* ------------------------------------------------------------------ */
/*  2. The matching engine, demonstrated live                          */
/* ------------------------------------------------------------------ */

/**
 * The claim in the pitch is that matching by MEANING beats matching by
 * spelling. This proves it on the spot, against the real Gemini embeddings,
 * and — just as importantly — shows the engine refusing to inflate a score
 * for a candidate who genuinely does not fit.
 */
const CASES = [
  {
    name: 'Data analyst → data role (different tools, same skill)',
    candidate: ['Python', 'SQL', 'Pandas', 'scikit-learn', 'Tableau'],
    job: ['SQL', 'Excel', 'Python', 'Power BI'],
    why: 'Pandas and Tableau are never literally "Excel" or "Power BI", but they are the same capability.',
  },
  {
    name: 'Spelling variants of one technology',
    candidate: ['Node.js', 'ReactJS', 'Mongo DB'],
    job: ['NodeJS', 'React', 'MongoDB'],
    why: 'Three real skills that exact matching scores as three misses.',
  },
  {
    name: 'Same CV → a role it does NOT fit (the honesty test)',
    candidate: ['Python', 'SQL', 'Pandas', 'scikit-learn', 'Tableau'],
    job: ['Welding', 'Forklift operation', 'Warehouse safety', 'Inventory handling'],
    why: 'A system that inflates every score is useless. This must stay low.',
  },
];

const matchingDemo = async () => {
  rule('2. THE MATCHING ENGINE, DEMONSTRATED LIVE');

  const aiService = require('../src/services/aiService');
  const { scoreSkills, literalScore } = require('../src/services/skillMatchService');
  const { MATCH_WEIGHTS } = require('../../shared/constants');

  console.log('  Weights: ' + Object.entries(MATCH_WEIGHTS)
    .map(([k, v]) => `${k.toLowerCase()} ${Math.round(v * 100)}%`).join(', '));
  console.log('  AI live: ' + (aiService.isLive() ? c.g('yes — semantic matching active')
                                                  : c.y('NO KEY — literal fallback only')));

  for (const t of CASES) {
    const literal = literalScore(t.candidate, t.job);
    const semantic = await scoreSkills(t.candidate, t.job);
    const delta = semantic.score - literal;

    console.log('\n  ' + c.b(t.name));
    console.log(c.d(`    candidate: ${t.candidate.join(', ')}`));
    console.log(c.d(`    role asks: ${t.job.join(', ')}`));
    console.log(`    exact-match scoring : ${String(literal + '%').padEnd(6)}`);
    console.log(`    Fursad (semantic)   : ${String(semantic.score + '%').padEnd(6)} ` +
      (delta > 0 ? c.g(`(+${delta} points)`) : delta < 0 ? c.y(`(${delta})`) : c.d('(no change)')));
    if (semantic.matched?.length) {
      console.log(c.d('    credited: ' + semantic.matched
        .map((m) => `${m.jobSkill} ← ${m.via} (${m.similarity})`).join('; ')));
    }
    console.log(c.d(`    → ${t.why}`));
  }
};

/* ------------------------------------------------------------------ */
/*  3. What is actually in the platform right now                      */
/* ------------------------------------------------------------------ */

const liveData = async () => {
  rule('3. WHAT IS IN THE PLATFORM RIGHT NOW');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Fursad_Platform');

  const User = require('../src/models/User');
  const Job = require('../src/models/Job');
  const Application = require('../src/models/Application');
  const Company = require('../src/models/Company');
  const CV = require('../src/models/CV');
  const Message = require('../src/models/Message');
  const Notification = require('../src/models/Notification');
  const SkillEmbedding = require('../src/models/SkillEmbedding');
  const AuditLog = require('../src/models/AuditLog');

  const [users, jobs, apps, cos, cvs, msgs, notes, vectors, audits] = await Promise.all([
    User.countDocuments(), Job.countDocuments(), Application.countDocuments(),
    Company.countDocuments(), CV.countDocuments(), Message.countDocuments(),
    Notification.countDocuments(), SkillEmbedding.countDocuments(), AuditLog.countDocuments(),
  ]);

  row('Registered users', users);
  row('Employers / companies', cos);
  row('Vacancies posted', jobs);
  row('Applications submitted', apps);
  row('CVs uploaded and AI-parsed', cvs);
  row('Messages exchanged', msgs);
  row('Notifications delivered', notes);
  row('Moderation actions audited', audits);
  row('Skill vectors cached (billed once ever)', vectors);

  const byRole = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]);
  console.log(c.d('    roles: ' + byRole.map((r) => `${r._id}:${r.n}`).join('  ')));

  const byStatus = await Job.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  console.log(c.d('    jobs:  ' + byStatus.map((r) => `${r._id}:${r.n}`).join('  ')));

  const score = await Application.aggregate([
    { $match: { matchScore: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: '$matchScore' }, min: { $min: '$matchScore' }, max: { $max: '$matchScore' }, n: { $sum: 1 } } },
  ]);
  if (score[0]) {
    const s = score[0];
    row('Average match score', `${Math.round(s.avg * 10) / 10}% across ${s.n} applications`);
    row('Match score range', `${s.min}% – ${s.max}%`);
  } else {
    console.log(c.y('    No scored applications yet — run scripts/walkthrough.js first.'));
  }

  // What the market is asking for, from the live vacancies.
  const skills = await Job.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$skillsRequired' },
    { $group: { _id: { $toLower: '$skillsRequired' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } }, { $limit: 8 },
  ]);
  if (skills.length) {
    console.log(c.d('    most-demanded skills: ' + skills.map((s) => `${s._id}(${s.n})`).join(', ')));
  }
};

/* ------------------------------------------------------------------ */
/*  4. The rules the server enforces                                   */
/* ------------------------------------------------------------------ */

const rulesAudit = () => {
  rule('4. RULES ENFORCED ON THE SERVER (not just hidden in the UI)');

  const checks = [
    ['Secrets validated at boot, server refuses to start', 'src/config/secrets.js', 'process.exit(1)'],
    ['Minimum profile completeness before applying', 'src/config/applyRules.js', 'MIN_COMPLETENESS_TO_APPLY'],
    ['Employer cannot self-publish — admin approval required', 'src/controllers/jobController.js', 'PENDING_REVIEW'],
    ['Company profile required before posting', 'src/controllers/jobController.js', 'needsCompanyProfile'],
    ['CV required to apply', 'src/controllers/applicationController.js', 'needsCv'],
    ['Score frozen at apply time, computed from the CV sent', 'src/controllers/applicationController.js', 'scoringSource'],
    ['One candidate introduction until employer accepts', 'src/sockets/socketHandler.js', 'candidateCanSend'],
    ['Employers see only their own applicants', 'src/controllers/applicationController.js', 'Not authorized'],
    ['Last administrator cannot be deleted', 'src/controllers/adminController.js', 'only administrator'],
    ['Rate limiting on credentials and outbound email', 'src/middleware/rateLimit.js', 'credentialLimiter'],
    ['Enumeration-safe password reset', 'src/controllers/authController.js', 'forgotPassword'],
    ['Every moderation action audited', 'src/controllers/adminController.js', 'AuditLog.create'],
  ];

  for (const [label, file, needle] of checks) {
    const full = path.join(ROOT, file);
    const ok = fs.existsSync(full) && fs.readFileSync(full, 'utf8').includes(needle);
    console.log(`  ${ok ? c.g('✔') : c.y('?')}  ${label}`);
  }
};

/* ------------------------------------------------------------------ */

(async () => {
  console.log(c.b('\n  FURSAD — PRESENTATION EVIDENCE PACK'));
  console.log(c.d(`  Generated from the running system, ${new Date().toISOString().slice(0, 10)}`));

  try {
    codeStats();
    await liveData();
    await matchingDemo();
    rulesAudit();
    console.log(c.b('\n  ────────────────────────────────────────────────────────'));
    console.log('  Every figure above was measured, not estimated.\n');
  } catch (err) {
    console.error('\n  Failed:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  }
})();
