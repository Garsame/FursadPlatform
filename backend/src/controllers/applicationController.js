const Application = require('../models/Application');
const Job = require('../models/Job');
const JobseekerProfile = require('../models/JobseekerProfile');
const Message = require('../models/Message');
const User = require('../models/User');
const CV = require('../models/CV');
const { calculateMatchScore } = require('../services/matchingService');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const Company = require('../models/Company');
const { APPLICATION_STATUS } = require('../../../shared/constants');

// @desc    Apply to a job listing
// @route   POST /api/applications
// @access  Private (Jobseeker only)
const applyToJob = async (req, res) => {
  try {
    const { jobId, coverNote, cvId } = req.body;

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

    // A CV is mandatory. An application with no document behind it gives the
    // employer nothing to download and scores the candidate off an empty
    // profile, which is how people ended up looking unqualified on paper when
    // their actual CV was sitting in their account unattached.
    const chosenCv = cvId
      ? await CV.findOne({ _id: cvId, user: req.user._id })
      : await CV.findOne({ user: req.user._id, isPrimary: true });

    if (!chosenCv) {
      const anyCv = await CV.countDocuments({ user: req.user._id });
      return res.status(400).json({
        success: false,
        needsCv: true,
        message: anyCv
          ? 'Please choose which CV to send with this application.'
          : 'You need to upload a CV before you can apply for a job.'
      });
    }

    // Score against the CV actually being sent, when it has been analysed.
    // The matched-jobs list already scores per CV, so scoring the application
    // off the profile instead produced a different number from the one the
    // candidate was shown when they decided to apply.
    const scoringSource = chosenCv.parseStatus === 'parsed' ? chosenCv.parsed : profile;
    const { score, breakdown } = await calculateMatchScore(scoringSource, job);

    // Generate AI candidate summary
    const summary = await aiService.generateCandidateSummary(scoringSource, job, { score, breakdown });

    const application = await Application.create({
      job: jobId,
      jobseeker: req.user._id,
      cv: chosenCv ? chosenCv._id : null,
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

    await notificationService.newApplication({
      application, job, candidateName: req.user.name
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

// @desc    The candidate's conversation list — one thread per application
// @route   GET /api/applications/threads
// @access  Private (Jobseeker only)
const getMyThreads = async (req, res) => {
  try {
    const applications = await Application.find({ jobseeker: req.user._id })
      .populate({
        path: 'job',
        select: 'title postedBy company',
        populate: { path: 'company', select: 'name logoUrl' }
      })
      .sort({ createdAt: -1 });

    // A job removed underneath an application would otherwise crash the list.
    const live = applications.filter((a) => a.job);
    const ids = live.map((a) => a._id);

    const [lastMessages, unreadCounts, ownCounts] = await Promise.all([
      Message.aggregate([
        { $match: { application: { $in: ids } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$application',
            content: { $last: '$content' },
            createdAt: { $last: '$createdAt' },
            sender: { $last: '$sender' }
          }
        }
      ]),
      Message.aggregate([
        { $match: { application: { $in: ids }, recipient: req.user._id, isRead: false } },
        { $group: { _id: '$application', n: { $sum: 1 } } }
      ]),
      // The candidate's own typed messages, which is what the one-opener rule
      // counts. Automated status updates are not theirs and must not count.
      Message.aggregate([
        { $match: { application: { $in: ids }, sender: req.user._id, isAutomated: false } },
        { $group: { _id: '$application', n: { $sum: 1 } } }
      ])
    ]);

    const lastByApp = new Map(lastMessages.map((m) => [String(m._id), m]));
    const unreadByApp = new Map(unreadCounts.map((u) => [String(u._id), u.n]));
    const ownByApp = new Map(ownCounts.map((o) => [String(o._id), o.n]));

    const threads = live.map((a) => {
      const last = lastByApp.get(String(a._id));
      const accepted = !!a.messaging?.acceptedAt;
      const ownSent = ownByApp.get(String(a._id)) || 0;
      return {
        applicationId: a._id,
        status: a.status,
        messagingAccepted: accepted,
        canSend: accepted || ownSent === 0,
        openerUsed: !accepted && ownSent > 0,
        appliedAt: a.createdAt,
        jobTitle: a.job.title,
        companyName: a.job.company?.name || 'Employer',
        companyLogoUrl: a.job.company?.logoUrl || '',
        // Who the candidate is talking to. The socket needs this to address
        // the message, and it is the employer who posted the job.
        employerUserId: a.job.postedBy,
        lastMessage: last
          ? { content: last.content, createdAt: last.createdAt, fromMe: String(last.sender) === String(req.user._id) }
          : null,
        unreadCount: unreadByApp.get(String(a._id)) || 0
      };
    });

    // Live conversations first, then applications nobody has written on yet.
    threads.sort((a, b) => {
      if (!!a.lastMessage !== !!b.lastMessage) return a.lastMessage ? -1 : 1;
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      }
      return new Date(b.appliedAt) - new Date(a.appliedAt);
    });

    return res.status(200).json({
      success: true,
      count: threads.length,
      unreadTotal: threads.reduce((sum, t) => sum + t.unreadCount, 0),
      data: threads
    });
  } catch (error) {
    console.error('Get My Threads Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    The employer's conversations, grouped by the job they belong to
// @route   GET /api/applications/employer/threads
// @access  Private (Employer only)
const getEmployerThreads = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id })
      .select('title status location employmentType createdAt')
      .sort({ createdAt: -1 });

    const jobIds = jobs.map((j) => j._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate('jobseeker', 'name avatarUrl city')
      .sort({ matchScore: -1 });

    const appIds = applications.map((a) => a._id);

    const [lastMessages, unreadCounts, seekerCounts] = await Promise.all([
      Message.aggregate([
        { $match: { application: { $in: appIds } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$application',
            content: { $last: '$content' },
            createdAt: { $last: '$createdAt' },
            sender: { $last: '$sender' }
          }
        }
      ]),
      Message.aggregate([
        { $match: { application: { $in: appIds }, recipient: req.user._id, isRead: false } },
        { $group: { _id: '$application', n: { $sum: 1 } } }
      ]),
      // The candidate's own typed messages — what the one-opener gate counts.
      Message.aggregate([
        { $match: { application: { $in: appIds }, isAutomated: false, sender: { $ne: req.user._id } } },
        { $group: { _id: '$application', n: { $sum: 1 } } }
      ])
    ]);

    const lastBy = new Map(lastMessages.map((m) => [String(m._id), m]));
    const unreadBy = new Map(unreadCounts.map((u) => [String(u._id), u.n]));
    const seekerBy = new Map(seekerCounts.map((s) => [String(s._id), s.n]));

    const threadsByJob = new Map(jobIds.map((id) => [String(id), []]));

    for (const a of applications) {
      const last = lastBy.get(String(a._id));
      const accepted = !!a.messaging?.acceptedAt;

      threadsByJob.get(String(a.job))?.push({
        applicationId: a._id,
        candidateId: a.jobseeker?._id,
        candidateName: a.jobseeker?.name || 'Unknown',
        candidateCity: a.jobseeker?.city || '',
        avatarUrl: a.jobseeker?.avatarUrl || '',
        status: a.status,
        matchScore: a.matchScore,
        messagingAccepted: accepted,
        awaitingAcceptance: !accepted && (seekerBy.get(String(a._id)) || 0) > 0,
        unreadCount: unreadBy.get(String(a._id)) || 0,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt,
              fromMe: String(last.sender) === String(req.user._id)
            }
          : null
      });
    }

    const data = jobs.map((j) => {
      const threads = (threadsByJob.get(String(j._id)) || []).sort((a, b) => {
        // Conversations first, newest activity at the top, then everyone else
        // by how well they match.
        if (!!a.lastMessage !== !!b.lastMessage) return a.lastMessage ? -1 : 1;
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        }
        return b.matchScore - a.matchScore;
      });

      return {
        jobId: j._id,
        title: j.title,
        status: j.status,
        city: j.location?.city || '',
        employmentType: j.employmentType,
        applicantCount: threads.length,
        conversationCount: threads.filter((t) => t.lastMessage).length,
        awaitingAcceptance: threads.filter((t) => t.awaitingAcceptance).length,
        unreadCount: threads.reduce((sum, t) => sum + t.unreadCount, 0),
        threads
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      unreadTotal: data.reduce((sum, j) => sum + j.unreadCount, 0),
      awaitingTotal: data.reduce((sum, j) => sum + j.awaitingAcceptance, 0),
      data
    });
  } catch (error) {
    console.error('Get Employer Threads Error:', error.message);
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
      .populate('cv', 'label originalName mimeType sizeBytes parseStatus')
      // The employer's chat needs job.postedBy to tell its own messages from
      // the candidate's. Without this populate `job` is a bare id, so
      // `job.postedBy` was undefined and rendering any message threw.
      .populate('job', 'title postedBy')
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

    // The candidate knows the employer by their company, not by the name of
    // whoever happens to be operating the account.
    const employerCompany = await Company.findById(application.job.company).select('name');

    await notificationService.applicationStatusChanged({
      application,
      job: application.job,
      companyName: employerCompany?.name || req.user.name
    });

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

// @desc    AI shortlist of the people who applied to this job
// @route   GET /api/applications/job/:id/shortlist
// @access  Private (Employer who owns the job)
const getAiShortlist = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this job' });
    }

    const applications = await Application.find({ job: job._id })
      .populate('jobseeker', 'name educationLevel city country')
      .sort({ matchScore: -1 });

    if (!applications.length) {
      return res.status(200).json({ success: true, data: { ranking: [], summary: '' } });
    }

    // Only what the model needs to judge fit — no contact details.
    const profiles = await JobseekerProfile.find({
      user: { $in: applications.map((a) => a.jobseeker._id) }
    }).select('user headline bio skills experienceLevel highestEducationLevel experience');

    const byUser = new Map(profiles.map((p) => [String(p.user), p]));

    const payload = applications.map((a) => {
      const p = byUser.get(String(a.jobseeker._id));
      return {
        applicationId: String(a._id),
        name: a.jobseeker.name,
        matchScore: a.matchScore,
        headline: p?.headline || '',
        skills: p?.skills || [],
        experienceLevel: p?.experienceLevel || '',
        education: p?.highestEducationLevel || '',
        yearsOfRoles: (p?.experience || []).length,
        coverNote: (a.coverNote || '').slice(0, 300)
      };
    });

    const result = await aiService.rankApplicants(job, payload);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('AI Shortlist Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  applyToJob,
  getMyApplications,
  getMyThreads,
  getEmployerThreads,
  getJobApplications,
  updateApplicationStatus,
  sendInterviewPrep,
  getAiShortlist
};
