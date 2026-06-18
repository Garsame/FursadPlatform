const Job = require('../models/Job');
const Company = require('../models/Company');
const JobseekerProfile = require('../models/JobseekerProfile');
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

    let jobStatus = JOB_STATUS.DRAFT;
    let qualityFlags = [];
    let qualityScore = 100;
    let suggestions = '';

    if (status === JOB_STATUS.PUBLISHED) {
      // Run AI quality audit
      const auditResult = await aiService.reviewJobPost({
        title,
        description,
        skillsRequired,
        location
      });

      qualityScore = auditResult.qualityScore;
      qualityFlags = auditResult.flags || [];
      suggestions = (auditResult.suggestions || []).join('\n');

      if (auditResult.requiresManualReview) {
        jobStatus = JOB_STATUS.PENDING_REVIEW;
      } else {
        jobStatus = JOB_STATUS.PUBLISHED;
      }
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
        ? 'Job created and flagged for manual admin review due to AI quality signals.'
        : 'Job successfully created',
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
      if (status === JOB_STATUS.PUBLISHED && job.status !== JOB_STATUS.PUBLISHED) {
        // Run AI quality audit
        const auditResult = await aiService.reviewJobPost({
          title: job.title,
          description: job.description,
          skillsRequired: job.skillsRequired,
          location: job.location
        });

        job.aiQualityScore = auditResult.qualityScore;
        job.aiQualityFlags = auditResult.flags || [];
        job.aiSuggestions = (auditResult.suggestions || []).join('\n');

        if (auditResult.requiresManualReview) {
          job.status = JOB_STATUS.PENDING_REVIEW;
        } else {
          job.status = JOB_STATUS.PUBLISHED;
          job.publishedAt = new Date();
        }
      } else {
        job.status = status;
      }
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: job.status === JOB_STATUS.PENDING_REVIEW
        ? 'Job updated and flagged for admin review.'
        : 'Job successfully updated',
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

    // Fetch all jobseeker profiles
    const profiles = await JobseekerProfile.find().populate('user', 'name email phone preferredLanguage');

    // Rank profiles
    const rankedCandidates = rankCandidatesForJob(job, profiles);

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
