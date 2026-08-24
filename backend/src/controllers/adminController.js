const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const { JOB_STATUS } = require('../../../shared/constants');

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

// @desc    Approve or reject a job listing
// @route   PUT /api/admin/jobs/:id/review
// @access  Private (Admin only)
const reviewJob = async (req, res) => {
  try {
    const { action, note } = req.body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const newStatus = action === 'approve' ? JOB_STATUS.PUBLISHED : JOB_STATUS.FLAGGED;
    job.status = newStatus;
    
    if (newStatus === JOB_STATUS.PUBLISHED) {
      job.publishedAt = new Date();
    }
    
    await job.save();

    // Log the audit event
    await AuditLog.create({
      actor: req.user._id,
      action: action === 'approve' ? 'JOB_APPROVED' : 'JOB_REJECTED',
      targetType: 'Job',
      targetId: job._id,
      details: `Admin ${req.user.name} reviewed job "${job.title}" with decision: ${action}. Reason/Note: ${note || 'N/A'}`
    });

    return res.status(200).json({
      success: true,
      message: `Job listing successfully ${action === 'approve' ? 'approved and published' : 'rejected and flagged'}.`,
      data: job
    });
  } catch (error) {
    console.error('Admin Review Job Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
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

// @desc    Get platform stats and metrics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
const getPlatformAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalJobs = await Job.countDocuments();
    const pendingJobsCount = await Job.countDocuments({ status: JOB_STATUS.PENDING_REVIEW });
    const activeApplications = await Application.countDocuments({
      status: { $in: ['applied', 'reviewed', 'shortlisted', 'interview', 'offer'] }
    });

    const jobseekersCount = await User.countDocuments({ role: 'jobseeker' });
    const employersCount = await User.countDocuments({ role: 'employer' });
    const suspendedUsersCount = await User.countDocuments({ isActive: false });

    const [userGrowth, jobsGrowth, totalApplications, matchStats] = await Promise.all([
      monthlyCumulative(User),
      monthlyCumulative(Job),
      Application.countDocuments(),
      // The mean match score actually recorded on applications. This replaced a
      // hardcoded "94.2% platform match accuracy" on the analytics screen.
      Application.aggregate([
        { $match: { matchScore: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$matchScore' }, n: { $sum: 1 } } }
      ])
    ]);

    const avgMatchScore = matchStats.length ? Math.round(matchStats[0].avg * 10) / 10 : null;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalJobs,
          pendingReviews: pendingJobsCount,
          activeApplications,
          totalApplications,
          jobseekersCount,
          employersCount,
          suspendedUsersCount,
          // null means "not enough data to say" — the UI must render that as
          // such rather than inventing a number to fill the space.
          avgMatchScore,
          avgMatchSampleSize: matchStats.length ? matchStats[0].n : 0
        },
        charts: {
          userGrowth,
          jobsGrowth
        }
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
  reviewJob,
  getPlatformAnalytics,
  getAuditLogs
};
