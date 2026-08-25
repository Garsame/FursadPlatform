const Notification = require('../models/Notification');
const CV = require('../models/CV');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const JobseekerProfile = require('../models/JobseekerProfile');
const Company = require('../models/Company');
const { toUser } = require('../sockets/registry');
const { calculateMatchScore } = require('./matchingService');

/**
 * Creating a notification must never be able to break the thing that caused
 * it. Nobody should fail to get hired because telling them about it threw.
 */
const notify = async ({ recipient, type, title, body = '', link = '', meta = {} }) => {
  try {
    if (!recipient) return null;
    const doc = await Notification.create({ recipient, type, title, body, link, meta });
    toUser(recipient, 'notification:new', doc);
    return doc;
  } catch (error) {
    console.error(`[notify] ${type} failed:`, error.message);
    return null;
  }
};

const notifyMany = async (items) => {
  const results = await Promise.all(items.map(notify));
  return results.filter(Boolean).length;
};

/* ------------------------------------------------------------ candidate */

const STATUS_COPY = {
  reviewed: ['Your application was reviewed', 'has looked at your application for'],
  shortlisted: ['You have been shortlisted', 'has shortlisted you for'],
  interview: ['You have been invited to interview', 'wants to interview you for'],
  offer: ['You have received an offer', 'has made you an offer for'],
  hired: ['You got the job', 'has hired you for'],
  rejected: ['Your application was not successful', 'is not moving forward with your application for']
};

const applicationStatusChanged = async ({ application, job, companyName }) => {
  const copy = STATUS_COPY[application.status];
  if (!copy) return null;
  return notify({
    recipient: application.jobseeker,
    type: 'application_status',
    title: copy[0],
    body: `${companyName} ${copy[1]} ${job.title}.`,
    link: `/dashboard/applications`,
    meta: { jobId: job._id, applicationId: application._id }
  });
};

const jobClosedForApplicants = async ({ job, companyName }) => {
  const apps = await Application.find({
    job: job._id,
    status: { $nin: ['hired', 'rejected'] }
  }).select('jobseeker _id');

  return notifyMany(apps.map((a) => ({
    recipient: a.jobseeker,
    type: 'job_closed',
    title: 'A job you applied to has closed',
    body: `${companyName} has closed ${job.title}. Your application is kept on record.`,
    link: '/dashboard/applications',
    meta: { jobId: job._id, applicationId: a._id }
  })));
};

/* ------------------------------------------------------------- employer */

const newApplication = async ({ application, job, candidateName }) => notify({
  recipient: job.postedBy,
  type: 'new_application',
  title: `${candidateName} applied to ${job.title}`,
  body: `Match score ${application.matchScore}%.`,
  link: `/provider/jobs/${job._id}/applicants`,
  meta: { jobId: job._id, applicationId: application._id, actorId: application.jobseeker, matchScore: application.matchScore }
});

const DECISION_COPY = {
  published: ['Your job was approved', 'is now live and visible to candidates.'],
  pending_review: ['Your job was withdrawn for review', 'has been taken off the public site pending review.'],
  flagged: ['Your job was not approved', 'was reviewed and has not been approved for publication.'],
  closed: ['Your job was closed', 'has been closed by an administrator.'],
  draft: ['Your job was returned to draft', 'has been moved back to draft.']
};

const jobDecision = async ({ job, status, note }) => {
  const copy = DECISION_COPY[status];
  if (!copy) return null;
  return notify({
    recipient: job.postedBy,
    type: 'job_decision',
    title: copy[0],
    body: `${job.title} ${copy[1]}${note ? ` Reviewer note: ${note}` : ''}`,
    link: '/provider/jobs',
    meta: { jobId: job._id }
  });
};

/* -------------------------------------------------- new job fan-out */

const MATCH_THRESHOLD = Number(process.env.NOTIFY_MATCH_THRESHOLD || 70);
const RELEVANCE_FLOOR = Number(process.env.NOTIFY_RELEVANCE_FLOOR || 50);

/**
 * Tell the candidates a newly published vacancy actually suits.
 *
 * Scores the job against each candidate's best CV — falling back to their
 * profile when they have none — and notifies only those at or above the
 * threshold. The point of a notification is that it is worth reading; a
 * message every time anyone posts anything is noise people learn to ignore.
 *
 * When this is the company's first published vacancy the company itself is
 * news, so candidates in the band below the match threshold are told about the
 * employer instead. Nobody receives both: above the threshold you get the job,
 * below it you get the employer, and under the floor you get nothing.
 *
 * Deliberately called without awaiting, after the response has been sent. At
 * three candidates this is instant; at ten thousand it must not hold up the
 * administrator who pressed approve.
 */
const announcePublishedJob = async (jobId) => {
  try {
    const job = await Job.findById(jobId).populate('company', 'name');
    if (!job || job.status !== 'published') return;

    const companyName = job.company?.name || 'An employer';

    // Is this the company's first vacancy to reach the public site?
    const publishedCount = await Job.countDocuments({
      company: job.company?._id,
      status: 'published'
    });
    const isFirstFromCompany = publishedCount <= 1;

    const seekers = await User.find({ role: 'jobseeker', isActive: true, isVerified: true }).select('_id');
    if (!seekers.length) return;

    const seekerIds = seekers.map((s) => s._id);
    const [cvs, profiles] = await Promise.all([
      CV.find({ user: { $in: seekerIds }, parseStatus: 'parsed' }).select('user parsed label'),
      JobseekerProfile.find({ user: { $in: seekerIds } }).select('user skills location salaryExpectation highestEducationLevel experienceLevel')
    ]);

    const cvsByUser = new Map();
    cvs.forEach((cv) => {
      if (!cvsByUser.has(String(cv.user))) cvsByUser.set(String(cv.user), []);
      cvsByUser.get(String(cv.user)).push(cv);
    });
    const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

    const matched = [];
    const nearby = [];

    for (const seeker of seekers) {
      const key = String(seeker._id);
      const sources = cvsByUser.get(key)?.length
        ? cvsByUser.get(key).map((cv) => ({ label: cv.label, data: cv.parsed }))
        : profileByUser.has(key)
          ? [{ label: null, data: profileByUser.get(key) }]
          : [];

      if (!sources.length) continue;

      let best = { score: 0, label: null };
      for (const s of sources) {
        const { score } = await calculateMatchScore(s.data, job);
        if (score > best.score) best = { score, label: s.label };
      }

      if (best.score >= MATCH_THRESHOLD) matched.push({ seeker, best });
      else if (isFirstFromCompany && best.score >= RELEVANCE_FLOOR) nearby.push({ seeker, best });
    }

    await notifyMany(matched.map(({ seeker, best }) => ({
      recipient: seeker._id,
      type: 'job_match',
      title: `New job matches you — ${best.score}%`,
      body: `${job.title} at ${companyName}${best.label ? ` scores ${best.score}% against your "${best.label}" CV.` : ` scores ${best.score}% against your profile.`}`,
      link: `/jobs/${job._id}`,
      meta: { jobId: job._id, companyId: job.company?._id, matchScore: best.score }
    })));

    await notifyMany(nearby.map(({ seeker, best }) => ({
      recipient: seeker._id,
      type: 'new_employer',
      title: `${companyName} has started hiring on Fursad`,
      body: `Their first vacancy, ${job.title}, scores ${best.score}% against your profile. Worth a look.`,
      link: `/companies/${job.company?._id}`,
      meta: { jobId: job._id, companyId: job.company?._id, matchScore: best.score }
    })));

    console.log(`[notify] "${job.title}" announced — ${matched.length} matched (>=${MATCH_THRESHOLD}%), ${nearby.length} told about the employer`);
  } catch (error) {
    console.error('[notify] announcePublishedJob failed:', error.message);
  }
};

module.exports = {
  notify,
  notifyMany,
  applicationStatusChanged,
  jobClosedForApplicants,
  newApplication,
  jobDecision,
  announcePublishedJob,
  MATCH_THRESHOLD,
  RELEVANCE_FLOOR
};
