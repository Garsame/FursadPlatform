const Job = require('../models/Job');
const Company = require('../models/Company');
const JobseekerProfile = require('../models/JobseekerProfile');
const Application = require('../models/Application');
const aiService = require('../services/aiService');
const { rankCandidatesForJob } = require('../services/matchingService');
const { JOB_STATUS } = require('../../../shared/constants');

// @desc    List all published jobs (Public)
// @route   GET /api/jobs
// @access  Public
const getPublishedJobs = async (req, res) => {
  try {
    const { search, city, type, salaryMin } = req.query;

    const query = { status: JOB_STATUS.PUBLISHED };

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }
    if (type) {
      query.employmentType = type;
    }
    if (salaryMin) {
      query['salaryRange.max'] = { $gte: Number(salaryMin) };
    }
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { skillsRequired: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const jobs = await Job.find(query)
      .populate('company', 'name description logoUrl location website')
      .sort({ publishedAt: -1 });

    return res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('Get Published Jobs Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get details of a single job (Public)
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'name description logoUrl location website')
      .populate('postedBy', 'name email');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('Get Job By ID Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a job listing
// @route   POST /api/jobs
// @access  Private (Employer only)
const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      language,
      skillsRequired,
      location,
      salaryRange,
      educationLevel,
      experienceLevel,
      employmentType,
      status // 'draft' or 'published' requested
    } = req.body;

    // Find company belonging to this employer
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'No associated company found. Please set up your company details first.'
      });
    }

    // A vacancy is only half of what a candidate reads. If the employer behind
    // it is a blank profile, there is nothing to decide against — so the
    // company has to say who it is before it can ask anyone to apply.
    const missing = company.missingEssentials();
    if (missing.length) {
      return res.status(403).json({
        success: false,
        needsCompanyProfile: true,
        missing,
        message: `Complete your company profile before posting a job. Still needed: ${missing.map((m) => m.label).join(', ')}.`
      });
    }

    let jobStatus = JOB_STATUS.DRAFT;
    let qualityFlags = [];
    let qualityScore = 100;
    let suggestions = '';

    if (status === JOB_STATUS.PUBLISHED) {
      // The AI audit still runs, but it no longer decides. Its score, flags and
      // suggestions are stored so the administrator reviewing this job has
      // something to judge by — it is a decision aid, not the decision.
      const auditResult = await aiService.reviewJobPost({
        title,
        description,
        skillsRequired,
        location
      });

      qualityScore = auditResult.qualityScore;
      qualityFlags = auditResult.flags || [];
      suggestions = (auditResult.suggestions || []).join('\n');

      // An employer cannot publish their own vacancy. Every request to go live
      // queues for administrator approval, first time and every time after.
      jobStatus = JOB_STATUS.PENDING_REVIEW;
    }

    const job = await Job.create({
      company: company._id,
      postedBy: req.user._id,
      title,
      description,
      language: language || 'en',
      skillsRequired: skillsRequired || [],
      location,
      salaryRange,
      educationLevel,
      experienceLevel,
      employmentType,
      status: jobStatus,
      aiQualityScore: qualityScore,
      aiQualityFlags: qualityFlags,
      aiSuggestions: suggestions,
      publishedAt: jobStatus === JOB_STATUS.PUBLISHED ? new Date() : null
    });

    return res.status(201).json({
      success: true,
      message: jobStatus === JOB_STATUS.PENDING_REVIEW
        ? 'Job submitted for review. It will appear publicly once an administrator approves it.'
        : 'Job saved as a draft.',
      data: job
    });
  } catch (error) {
    console.error('Create Job Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a job listing
// @route   PUT /api/jobs/:id
// @access  Private (Employer only)
const updateJob = async (req, res) => {
  try {
    const {
      title,
      description,
      language,
      skillsRequired,
      location,
      salaryRange,
      educationLevel,
      experienceLevel,
      employmentType,
      status
    } = req.body;

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Ensure user owns this job
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this job listing' });
    }

    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (language !== undefined) job.language = language;
    if (skillsRequired !== undefined) job.skillsRequired = skillsRequired;
    if (location !== undefined) job.location = location;
    if (salaryRange !== undefined) job.salaryRange = salaryRange;
    if (educationLevel !== undefined) job.educationLevel = educationLevel;
    if (experienceLevel !== undefined) job.experienceLevel = experienceLevel;
    if (employmentType !== undefined) job.employmentType = employmentType;

    if (status !== undefined) {
      if (status === JOB_STATUS.PUBLISHED) {
        // Re-screen and queue. Employers may ask to go live; only an
        // administrator decides that they do.
        const auditResult = await aiService.reviewJobPost({
          title: job.title,
          description: job.description,
          skillsRequired: job.skillsRequired,
          location: job.location
        });

        job.aiQualityScore = auditResult.qualityScore;
        job.aiQualityFlags = auditResult.flags || [];
        job.aiSuggestions = (auditResult.suggestions || []).join('\n');
        job.status = JOB_STATUS.PENDING_REVIEW;
      } else if (status === JOB_STATUS.CLOSED || status === JOB_STATUS.DRAFT) {
        // Taking your own vacancy down is entirely the employer's call.
        job.status = status;
      } else {
        return res.status(403).json({
          success: false,
          message: 'Only an administrator can set that status.'
        });
      }
    }

    // Editing a live vacancy sends it back for review, because the copy an
    // administrator approved is no longer the copy that would be published.
    const contentEdited = [title, description, skillsRequired, location, salaryRange,
      educationLevel, experienceLevel, employmentType].some((v) => v !== undefined);

    if (contentEdited && status === undefined && job.status === JOB_STATUS.PUBLISHED) {
      job.status = JOB_STATUS.PENDING_REVIEW;
    }

    await job.save();

    const messages = {
      [JOB_STATUS.PENDING_REVIEW]: 'Sent for review. It will go live once an administrator approves it.',
      [JOB_STATUS.CLOSED]: 'Job closed. It is no longer visible to candidates.',
      [JOB_STATUS.DRAFT]: 'Saved as a draft.'
    };

    return res.status(200).json({
      success: true,
      message: messages[job.status] || 'Job successfully updated',
      data: job
    });
  } catch (error) {
    console.error('Update Job Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get my company's posted jobs
// @route   GET /api/jobs/company/mine
// @access  Private (Employer only)
const getMyCompanyJobs = async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) {
      return res.status(204).json({ success: true, data: [] });
    }

    const jobs = await Job.find({ company: company._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    console.error('Get Company Jobs Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get candidates list ranked for a specific job
// @route   GET /api/jobs/:id/candidates
// @access  Private (Employer only)
const getCandidatesRankedForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view candidates for this job' });
    }

    // Only candidates who actually applied to this job — employers do not get
    // to browse the whole talent pool.
    const applications = await Application.find({ job: job._id }).select('jobseeker');
    const profiles = await JobseekerProfile
      .find({ user: { $in: applications.map((a) => a.jobseeker) } })
      .populate('user', 'name email phone preferredLanguage');

    // Rank profiles
    const rankedCandidates = await rankCandidatesForJob(job, profiles);

    return res.status(200).json({
      success: true,
      data: rankedCandidates
    });
  } catch (error) {
    console.error('Get Ranked Candidates Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate a job description from answers
// @route   POST /api/jobs/generate-description
// @access  Private (Employer only)
const generateDescription = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers) {
      return res.status(400).json({ success: false, message: 'Employer answers are required' });
    }

    const result = await aiService.generateJobDescription(answers, req.user.preferredLanguage);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Generate Job Description Controller Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublishedJobs,
  getJobById,
  createJob,
  updateJob,
  getMyCompanyJobs,
  getCandidatesRankedForJob,
  generateDescription
};
