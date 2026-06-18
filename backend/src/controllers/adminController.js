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

    // Generate mock analytical history data for graphing
    const userGrowth = [
      { month: 'Jan', count: Math.round(totalUsers * 0.4) },
      { month: 'Feb', count: Math.round(totalUsers * 0.5) },
      { month: 'Mar', count: Math.round(totalUsers * 0.7) },
      { month: 'Apr', count: Math.round(totalUsers * 0.8) },
      { month: 'May', count: Math.round(totalUsers * 0.9) },
      { month: 'Jun', count: totalUsers }
    ];

    const jobsGrowth = [
      { month: 'Jan', count: Math.round(totalJobs * 0.3) },
      { month: 'Feb', count: Math.round(totalJobs * 0.4) },
      { month: 'Mar', count: Math.round(totalJobs * 0.6) },
      { month: 'Apr', count: Math.round(totalJobs * 0.7) },
      { month: 'May', count: Math.round(totalJobs * 0.9) },
      { month: 'Jun', count: totalJobs }
    ];

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalJobs,
          pendingReviews: pendingJobsCount,
          activeApplications,
          jobseekersCount,
          employersCount,
          suspendedUsersCount
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
