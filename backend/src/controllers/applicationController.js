const Application = require('../models/Application');
const Job = require('../models/Job');
const JobseekerProfile = require('../models/JobseekerProfile');
const Message = require('../models/Message');
const User = require('../models/User');
const { calculateMatchScore } = require('../services/matchingService');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const { APPLICATION_STATUS } = require('../../../shared/constants');

// @desc    Apply to a job listing
// @route   POST /api/applications
// @access  Private (Jobseeker only)
const applyToJob = async (req, res) => {
  try {
    const { jobId, coverNote } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }

    const job = await Job.findById(jobId).populate('company');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'published') {
      return res.status(400).json({ success: false, message: 'This job is no longer open for applications' });
    }

    // Check if already applied
    const alreadyApplied = await Application.findOne({ job: jobId, jobseeker: req.user._id });
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: 'You have already applied to this job listing' });
    }

    // Fetch jobseeker profile
    const profile = await JobseekerProfile.findOne({ user: req.user._id }).populate('user', 'name email preferredLanguage');
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Please complete your profile details before applying.' });
    }

    // Calculate match score
    const { score, breakdown } = calculateMatchScore(profile, job);

    // Generate AI candidate summary
    const summary = await aiService.generateCandidateSummary(profile, job, { score, breakdown });

    const application = await Application.create({
      job: jobId,
      jobseeker: req.user._id,
      coverNote,
      matchScore: score,
      matchBreakdown: breakdown,
      aiSummary: summary,
      status: APPLICATION_STATUS.APPLIED,
      statusHistory: [
        {
          status: APPLICATION_STATUS.APPLIED,
          changedBy: req.user._id,
          note: 'Initial application submitted.'
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Application successfully submitted',
      data: application
    });
  } catch (error) {
    console.error('Apply Job Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current jobseeker's applications
// @route   GET /api/applications/mine
// @access  Private (Jobseeker only)
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ jobseeker: req.user._id })
      .populate({
        path: 'job',
        populate: { path: 'company', select: 'name logoUrl location website' }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    console.error('Get My Applications Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get applications for a job (Employer view)
// @route   GET /api/applications/job/:id
// @access  Private (Employer only)
const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Verify ownership
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view applicants for this job' });
    }

    const applications = await Application.find({ job: req.params.id })
      .populate('jobseeker', 'name email phone')
      .sort({ matchScore: -1 });

    // Enforce profile attachment for each candidate
    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const profile = await JobseekerProfile.findOne({ user: app.jobseeker._id }).select('headline bio skills location experience education highestEducationLevel experienceLevel');
        return {
          ...app.toObject(),
          jobseekerProfile: profile
        };
      })
    );

    return res.status(200).json({ success: true, count: enrichedApplications.length, data: enrichedApplications });
  } catch (error) {
    console.error('Get Job Applications Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update candidate application ATS status
// @route   PUT /api/applications/:id/status
// @access  Private (Employer only)
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = Object.values(APPLICATION_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid application status' });
    }

    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate('jobseeker', 'name email preferredLanguage');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Verify ownership of the job
    if (application.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this application' });
    }

    // Update status and history
    application.status = status;
    application.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || `Application updated to ${status}`
    });

    await application.save();

    // Trigger AI status change notification message
    const msg = await aiService.generateStatusUpdateMessage(status, application.job.title, application.jobseeker.preferredLanguage);

    // Send email log to applicant
    await emailService.sendStatusUpdateEmail(
      application.jobseeker.email,
      application.jobseeker.name,
      application.job.title,
      status,
      msg
    );

    // Record automated message in database log
    await Message.create({
      application: application._id,
      sender: req.user._id,
      recipient: application.jobseeker._id,
      content: msg,
      isAutomated: true
    });

    return res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Update Application Status Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger AI interview prep email
// @route   POST /api/applications/:id/interview-prep
// @access  Private (Employer only)
const sendInterviewPrep = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate('jobseeker', 'name email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Verify employer owns job
    if (application.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this application' });
    }

    // Generate prep
    const prep = await aiService.generateInterviewQuestions(application.job, 'candidate');

    // Send email stub
    await emailService.sendInterviewPrepEmail(
      application.jobseeker.email,
      application.jobseeker.name,
      application.job.title,
      prep.questions,
      prep.tip
    );

    application.interviewPrepSent = true;
    await application.save();

    // Also record an automated message about the interview prep materials
    await Message.create({
      application: application._id,
      sender: req.user._id,
      recipient: application.jobseeker._id,
      content: `Hello! We've sent you an email with tailored interview preparation questions and tips to help you get ready for our discussion.`,
      isAutomated: true
    });

    return res.status(200).json({
      success: true,
      message: 'AI Interview preparation materials successfully generated and sent to candidate',
      data: prep
    });
  } catch (error) {
    console.error('Send Interview Prep Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  sendInterviewPrep
};
