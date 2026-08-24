const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const Company = require('../models/Company');
const CV = require('../models/CV');
const emailService = require('../services/emailService');
const { JOB_STATUS, APPLICATION_STATUS } = require('../../../shared/constants');

// @desc    List all platform users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Admin Get Users Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Suspend or Reactivate a user account
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'isActive status is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot change status of an Admin user' });
    }

    user.isActive = isActive;
    await user.save();

    // Log the audit event
    await AuditLog.create({
      actor: req.user._id,
      action: isActive ? 'USER_REACTIVATED' : 'USER_SUSPENDED',
      targetType: 'User',
      targetId: user._id,
      details: `Admin ${req.user.name} changed status of user ${user.email} to ${isActive ? 'active' : 'suspended'}.`
    });

    return res.status(200).json({
      success: true,
      message: `User successfully ${isActive ? 'reactivated' : 'suspended'}`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Admin Update User Status Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get jobs pending review
// @route   GET /api/admin/jobs/pending
// @access  Private (Admin only)
const getPendingJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: JOB_STATUS.PENDING_REVIEW })
      .populate('company', 'name location website logoUrl')
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('Admin Get Pending Jobs Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Every job on the platform, filterable
// @route   GET /api/admin/jobs
// @access  Private (Admin only)
const getAllJobs = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && Object.values(JOB_STATUS).includes(status)) query.status = status;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const jobs = await Job.find(query)
      .populate('company', 'name logoUrl location isVerified')
      .populate('postedBy', 'name email')
      .sort({ updatedAt: -1 });

    // Applicant counts in one pass rather than a query per row.
    const counts = await Application.aggregate([
      { $match: { job: { $in: jobs.map((j) => j._id) } } },
      { $group: { _id: '$job', n: { $sum: 1 } } }
    ]);
    const byJob = new Map(counts.map((c) => [String(c._id), c.n]));

    const withCounts = jobs.map((j) => ({ ...j.toObject(), applicantCount: byJob.get(String(j._id)) || 0 }));

    return res.status(200).json({
      success: true,
      count: withCounts.length,
      byStatus: Object.values(JOB_STATUS).reduce((acc, s) => {
        acc[s] = withCounts.filter((j) => j.status === s).length;
        return acc;
      }, {}),
      data: withCounts
    });
  } catch (error) {
    console.error('Admin Get Jobs Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Set any job to any status.
 *
 * Publication is an administrator's decision, not an employer's. This is the
 * only route that can set a job live, and it is also how a live job is pulled
 * back: setting it to pending_review takes it off the public site and returns
 * it to the employer's queue, where it stays until approved again.
 *
 * Every decision is audited and emailed. A moderation action the employer
 * never hears about is indistinguishable from the platform malfunctioning.
 */
const ACTION_NAMES = {
  [JOB_STATUS.PUBLISHED]: 'JOB_APPROVED',
  [JOB_STATUS.PENDING_REVIEW]: 'JOB_WITHDRAWN_FOR_REVIEW',
  [JOB_STATUS.FLAGGED]: 'JOB_REJECTED',
  [JOB_STATUS.CLOSED]: 'JOB_CLOSED',
  [JOB_STATUS.DRAFT]: 'JOB_RETURNED_TO_DRAFT'
};

// @desc    Change a job's status
// @route   PUT /api/admin/jobs/:id/status
// @access  Private (Admin only)
const setJobStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status || !Object.values(JOB_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${Object.values(JOB_STATUS).join(', ')}`
      });
    }

    const job = await Job.findById(req.params.id)
      .populate('company', 'name')
      .populate('postedBy', 'name email');

    if (!job) return res.status(404).json({ success: false, message: 'Job listing not found' });

    const previous = job.status;
    if (previous === status) {
      return res.status(400).json({ success: false, message: `This job is already ${status}.` });
    }

    job.status = status;
    if (status === JOB_STATUS.PUBLISHED) job.publishedAt = new Date();
    await job.save();

    await AuditLog.create({
      actor: req.user._id,
      action: ACTION_NAMES[status],
      targetType: 'Job',
      targetId: job._id,
      details: `${req.user.name} changed "${job.title}" (${job.company?.name || 'unknown company'}) from ${previous} to ${status}.${note ? ` Note: ${note}` : ''}`
    });

    // Never let a mail failure roll back a moderation decision.
    let emailed = false;
    if (job.postedBy?.email) {
      const result = await emailService.sendJobDecisionEmail(
        job.postedBy.email, job.postedBy.name, job.title, status, note || ''
      );
      emailed = !!result?.sent;
    }

    return res.status(200).json({
      success: true,
      message: `Job set to ${status}.${emailed ? ' The employer has been emailed.' : ''}`,
      emailed,
      data: job
    });
  } catch (error) {
    console.error('Admin Set Job Status Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or reject a pending job (kept for the review queue)
// @route   PUT /api/admin/jobs/:id/review
// @access  Private (Admin only)
const reviewJob = async (req, res) => {
  const { action, note } = req.body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
  }
  req.body.status = action === 'approve' ? JOB_STATUS.PUBLISHED : JOB_STATUS.FLAGGED;
  req.body.note = note;
  return setJobStatus(req, res);
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A real cumulative timeline for the last `months` months, read from createdAt.
 *
 * This replaced six hardcoded multipliers of the current total (total × 0.4,
 * × 0.5 …) that were presented as monthly history. They were not history: they
 * redrew the same shape no matter what the platform actually did, and an admin
 * reading them would have drawn conclusions from a curve that was decoration.
 *
 * Cumulative rather than per-month, because the label is "growth" and the last
 * point should reconcile with the total shown on the summary cards.
 */
const monthlyCumulative = async (model, months = 6) => {
  const now = new Date();
  // First instant of the month `months - 1` back, in UTC to match how Mongo
  // stores and buckets the dates.
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const [baseline, buckets] = await Promise.all([
    // Everything that already existed when the window opened.
    model.countDocuments({ createdAt: { $lt: windowStart } }),
    model.aggregate([
      { $match: { createdAt: { $gte: windowStart } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const byKey = new Map(buckets.map((b) => [`${b._id.y}-${b._id.m}`, b.count]));

  let running = baseline;
  const series = [];

  for (let i = 0; i < months; i++) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1) + i, 1));
    running += byKey.get(`${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}`) || 0;
    series.push({ month: MONTH_LABELS[cursor.getUTCMonth()], count: running });
  }

  return series;
};

/** Counts grouped by a field, returned as a plain object with zeros filled in. */
const groupCount = async (model, field, keys, match = {}) => {
  const rows = await model.aggregate([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $group: { _id: `$${field}`, n: { $sum: 1 } } }
  ]);
  const found = new Map(rows.map((r) => [r._id, r.n]));
  return keys.reduce((acc, k) => { acc[k] = found.get(k) || 0; return acc; }, {});
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// @desc    Get platform stats and metrics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
const getPlatformAnalytics = async (req, res) => {
  try {
    const APP_STATUSES = Object.values(APPLICATION_STATUS);
    const ACTIVE_APP = ['applied', 'reviewed', 'shortlisted', 'interview', 'offer'];

    const [
      totalUsers, totalJobs, totalApplications, totalCompanies, totalCvs,
      usersByRole, jobsByStatus, appsByStatus,
      pendingJobsCount, activeApplications, suspendedUsersCount, unverifiedUsers,
      newUsers7, newUsers30, newJobs7, newApps7,
      matchStats, matchBuckets,
      companyStats, cvParsed,
      topCities, topEmployers, topSkills,
      userGrowth, jobsGrowth, applicationsGrowth
    ] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
      Company.countDocuments(),
      CV.countDocuments(),

      groupCount(User, 'role', ['jobseeker', 'employer', 'admin']),
      groupCount(Job, 'status', Object.values(JOB_STATUS)),
      groupCount(Application, 'status', APP_STATUSES),

      Job.countDocuments({ status: JOB_STATUS.PENDING_REVIEW }),
      Application.countDocuments({ status: { $in: ACTIVE_APP } }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ isVerified: false }),

      User.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
      User.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
      Job.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
      Application.countDocuments({ createdAt: { $gte: daysAgo(7) } }),

      Application.aggregate([
        { $match: { matchScore: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$matchScore' }, min: { $min: '$matchScore' }, max: { $max: '$matchScore' }, n: { $sum: 1 } } }
      ]),
      // How well the engine is actually matching people, in bands.
      Application.aggregate([
        { $match: { matchScore: { $gt: 0 } } },
        { $bucket: {
          groupBy: '$matchScore', boundaries: [0, 40, 60, 75, 90, 101],
          default: 'other', output: { n: { $sum: 1 } }
        } }
      ]),

      Company.aggregate([
        { $group: { _id: null, avgCompleteness: { $avg: '$profileCompleteness' }, verified: { $sum: { $cond: ['$isVerified', 1, 0] } } } }
      ]),
      CV.countDocuments({ parseStatus: 'parsed' }),

      // Where the work actually is.
      Job.aggregate([
        { $match: { 'location.city': { $nin: [null, ''] } } },
        { $group: { _id: '$location.city', jobs: { $sum: 1 } } },
        { $sort: { jobs: -1 } }, { $limit: 6 }
      ]),
      // Which employers are drawing candidates.
      Application.aggregate([
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'j' } },
        { $unwind: '$j' },
        { $lookup: { from: 'companies', localField: 'j.company', foreignField: '_id', as: 'c' } },
        { $unwind: '$c' },
        { $group: { _id: '$c.name', applications: { $sum: 1 }, avgScore: { $avg: '$matchScore' } } },
        { $sort: { applications: -1 } }, { $limit: 6 }
      ]),
      // What the market is asking for.
      Job.aggregate([
        { $match: { status: JOB_STATUS.PUBLISHED } },
        { $unwind: '$skillsRequired' },
        { $group: { _id: { $toLower: '$skillsRequired' }, demand: { $sum: 1 } } },
        { $sort: { demand: -1 } }, { $limit: 10 }
      ]),

      monthlyCumulative(User),
      monthlyCumulative(Job),
      monthlyCumulative(Application)
    ]);

    const jobseekersCount = usersByRole.jobseeker;
    const employersCount = usersByRole.employer;

    // Hiring funnel: of everyone who applied, how far did they get?
    const reached = (stages) => APP_STATUSES
      .filter((s) => stages.includes(s))
      .reduce((sum, s) => sum + appsByStatus[s], 0);

    const funnel = [
      { stage: 'Applied', count: totalApplications },
      { stage: 'Reviewed', count: reached(['reviewed', 'shortlisted', 'interview', 'offer', 'hired']) },
      { stage: 'Shortlisted', count: reached(['shortlisted', 'interview', 'offer', 'hired']) },
      { stage: 'Interview', count: reached(['interview', 'offer', 'hired']) },
      { stage: 'Offer', count: reached(['offer', 'hired']) },
      { stage: 'Hired', count: appsByStatus.hired }
    ];

    const BUCKET_LABELS = { 0: 'Under 40%', 40: '40–59%', 60: '60–74%', 75: '75–89%', 90: '90%+' };

    const m = matchStats[0];
    const c = companyStats[0];

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalJobs,
          totalApplications,
          totalCompanies,
          totalCvs,
          pendingReviews: pendingJobsCount,
          activeApplications,
          jobseekersCount,
          employersCount,
          adminsCount: usersByRole.admin,
          suspendedUsersCount,
          unverifiedUsers,
          newUsers7, newUsers30, newJobs7, newApps7,
          livejobs: jobsByStatus[JOB_STATUS.PUBLISHED],
          // null means "not enough data to say". The interface must render
          // that as such rather than inventing a number to fill the space.
          avgMatchScore: m ? Math.round(m.avg * 10) / 10 : null,
          avgMatchSampleSize: m ? m.n : 0,
          matchRange: m ? { min: m.min, max: m.max } : null,
          applicationsPerJob: totalJobs ? Math.round((totalApplications / totalJobs) * 10) / 10 : 0,
          hireRate: totalApplications
            ? Math.round((appsByStatus.hired / totalApplications) * 1000) / 10
            : 0,
          cvParseRate: totalCvs ? Math.round((cvParsed / totalCvs) * 1000) / 10 : null,
          avgCompanyCompleteness: c ? Math.round(c.avgCompleteness) : 0,
          verifiedCompanies: c ? c.verified : 0
        },
        breakdown: {
          usersByRole,
          jobsByStatus,
          applicationsByStatus: appsByStatus
        },
        funnel,
        matchDistribution: matchBuckets.map((b) => ({
          band: BUCKET_LABELS[b._id] || String(b._id),
          count: b.n
        })),
        topCities: topCities.map((r) => ({ city: r._id, jobs: r.jobs })),
        topEmployers: topEmployers.map((r) => ({
          name: r._id, applications: r.applications, avgScore: Math.round(r.avgScore || 0)
        })),
        topSkills: topSkills.map((r) => ({ skill: r._id, demand: r.demand })),
        charts: { userGrowth, jobsGrowth, applicationsGrowth }
      }
    });
  } catch (error) {
    console.error('Admin Get Analytics Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-log
// @access  Private (Admin only)
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error('Admin Get Audit Logs Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  getPendingJobs,
  getAllJobs,
  setJobStatus,
  reviewJob,
  getPlatformAnalytics,
  getAuditLogs
};
