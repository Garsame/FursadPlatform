const path = require('path');
const JobseekerProfile = require('../models/JobseekerProfile');
const User = require('../models/User');
const Job = require('../models/Job');
const CV = require('../models/CV');
const aiService = require('../services/aiService');
const { rankJobsForCandidate } = require('../services/matchingService');
const { removeFile, UPLOAD_ROOT } = require('../services/documentService');

// @desc    Get current jobseeker profile
// @route   GET /api/profile/me
// @access  Private (Jobseeker only)
const getMyProfile = async (req, res) => {
  try {
    const profile = await JobseekerProfile.findOne({ user: req.user._id }).populate('user', 'name email phone preferredLanguage');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error('Get Profile Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update jobseeker profile
// @route   PUT /api/profile/me
// @access  Private (Jobseeker only)
const updateMyProfile = async (req, res) => {
  try {
    const {
      headline,
      bio,
      skills,
      location,
      education,
      experience,
      experienceLevel,
      highestEducationLevel,
      salaryExpectation,
      languagesSpoken,
      resumeFileUrl
    } = req.body;

    let profile = await JobseekerProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new JobseekerProfile({ user: req.user._id });
    }

    // Update fields
    if (headline !== undefined) profile.headline = headline;
    if (bio !== undefined) profile.bio = bio;
    if (skills !== undefined) profile.skills = skills;
    if (location !== undefined) profile.location = location;
    if (education !== undefined) profile.education = education;
    if (experience !== undefined) profile.experience = experience;
    if (experienceLevel !== undefined) profile.experienceLevel = experienceLevel;
    if (highestEducationLevel !== undefined) profile.highestEducationLevel = highestEducationLevel;
    if (salaryExpectation !== undefined) profile.salaryExpectation = salaryExpectation;
    if (languagesSpoken !== undefined) profile.languagesSpoken = languagesSpoken;
    if (resumeFileUrl !== undefined) profile.resumeFileUrl = resumeFileUrl;

    // Calculate completeness score (simple estimation)
    let completeness = 10; // base score for account creation
    if (profile.headline) completeness += 15;
    if (profile.bio) completeness += 15;
    if (profile.skills && profile.skills.length > 0) completeness += 20;
    if (profile.location?.city) completeness += 10;
    if (profile.education && profile.education.length > 0) completeness += 15;
    if (profile.experience && profile.experience.length > 0) completeness += 15;
    profile.profileCompletenessScore = Math.min(100, completeness);

    await profile.save();

    const populatedProfile = await JobseekerProfile.findById(profile._id).populate('user', 'name email phone preferredLanguage');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: populatedProfile
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Parse resume text using AI
// @route   POST /api/profile/parse-resume
// @access  Private (Jobseeker only)
const parseResumeText = async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return res.status(400).json({ success: false, message: 'Raw resume text is required' });
    }

    // Call Gemini AI parser
    const parsedData = await aiService.parseResume(rawText, req.user.preferredLanguage);

    let profile = await JobseekerProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new JobseekerProfile({ user: req.user._id });
    }

    // Map parsed data to model fields
    profile.headline = parsedData.headline || profile.headline;
    profile.bio = parsedData.bio || profile.bio;
    profile.skills = parsedData.skills || profile.skills;
    profile.location = parsedData.location || profile.location;
    profile.education = parsedData.education || profile.education;
    profile.experience = parsedData.experience || profile.experience;
    profile.experienceLevel = parsedData.experienceLevel || profile.experienceLevel;
    profile.highestEducationLevel = parsedData.highestEducationLevel || profile.highestEducationLevel;
    profile.profileCompletenessScore = parsedData.profileCompletenessScore || profile.profileCompletenessScore;
    profile.aiImprovementTips = parsedData.aiImprovementTips || profile.aiImprovementTips;
    
    await profile.save();

    const populatedProfile = await JobseekerProfile.findById(profile._id).populate('user', 'name email phone preferredLanguage');

    return res.status(200).json({
      success: true,
      message: 'Resume parsed and profile updated successfully',
      data: populatedProfile
    });
  } catch (error) {
    console.error('Parse Resume Controller Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get AI job recommendations, scored against the profile or a chosen CV
// @route   GET /api/profile/recommendations?cvId=<id|primary>
// @access  Private (Jobseeker only)
const getRecommendations = async (req, res) => {
  try {
    const { cvId } = req.query;

    // The thing we score against: either the hand-written profile, or the AI
    // snapshot the parser produced for one specific CV.
    let source = null;
    let basis = { type: 'profile', cvId: null, cvLabel: null };

    if (cvId) {
      const query = cvId === 'primary'
        ? { user: req.user._id, isPrimary: true }
        : { _id: cvId, user: req.user._id };

      const cv = await CV.findOne(query);
      if (!cv) {
        return res.status(404).json({ success: false, message: 'CV not found' });
      }
      if (cv.parseStatus !== 'parsed') {
        return res.status(400).json({
          success: false,
          message: 'This CV has not been analysed yet, so it cannot be used for matching.'
        });
      }
      source = cv.parsed;
      basis = { type: 'cv', cvId: cv._id, cvLabel: cv.label };
    } else {
      source = await JobseekerProfile.findOne({ user: req.user._id });
      if (!source) {
        return res.status(404).json({ success: false, message: 'Profile not found. Please complete profile details first.' });
      }
    }

    const jobs = await Job.find({ status: 'published' })
      .populate('company', 'name description logoUrl location website');

    const recommendations = await rankJobsForCandidate(source, jobs);

    return res.status(200).json({
      success: true,
      basis,
      data: recommendations
    });
  } catch (error) {
    console.error('Get Recommendations Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload / replace my profile photo
// @route   POST /api/profile/avatar
// @access  Private (Jobseeker only)
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'An image file is required' });
    }

    // The avatar is identity data, so it lives on User and comes back from
    // /auth/me — that is what every layout reads.
    const user = await User.findById(req.user._id);

    // Drop the previous image so uploads do not pile up on disk.
    if (user.avatarUrl) {
      removeFile(path.join(UPLOAD_ROOT, 'avatars', path.basename(user.avatarUrl)));
    }

    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated',
      data: { avatarUrl: user.avatarUrl }
    });
  } catch (error) {
    console.error('Upload Avatar Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Identity context handed to the AI on every interview turn. */
const identityOf = (user) => ({
  name: user.name,
  gender: user.gender || undefined,
  country: user.country || undefined,
  city: user.city || undefined,
  educationLevel: user.educationLevel || undefined,
  jobSpecification: user.jobSpecification || undefined,
  preferredLanguage: user.preferredLanguage
});

// @desc    Get the next profile-builder question
// @route   GET /api/profile/interview
// @access  Private (Jobseeker only)
const getInterviewState = async (req, res) => {
  try {
    let profile = await JobseekerProfile.findOne({ user: req.user._id });
    if (!profile) profile = await JobseekerProfile.create({ user: req.user._id });

    const history = profile.aiInterview?.answers || [];
    const next = await aiService.nextProfileQuestion(identityOf(req.user), history);

    return res.status(200).json({
      success: true,
      data: {
        ...next,
        answered: history.length,
        total: aiService.PROFILE_TOPICS.length,
        history,
        completedAt: profile.aiInterview?.completedAt || null,
        mainJobSpecification: profile.mainJobSpecification || null,
        aiLive: aiService.isLive()
      }
    });
  } catch (error) {
    console.error('Interview State Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit one answer, get the next question (or the final spec)
// @route   POST /api/profile/interview
// @access  Private (Jobseeker only)
const submitInterviewAnswer = async (req, res) => {
  try {
    const { field, question, answer } = req.body;
    if (!field || !answer?.trim()) {
      return res.status(400).json({ success: false, message: 'An answer is required' });
    }

    let profile = await JobseekerProfile.findOne({ user: req.user._id });
    if (!profile) profile = await JobseekerProfile.create({ user: req.user._id });
    if (!profile.aiInterview) profile.aiInterview = { answers: [], completedAt: null };

    // Replace rather than duplicate if they revisit a topic.
    const existing = profile.aiInterview.answers.find((a) => a.field === field);
    if (existing) {
      existing.answer = answer.trim();
      existing.question = question || existing.question;
      existing.answeredAt = new Date();
    } else {
      profile.aiInterview.answers.push({ field, question, answer: answer.trim() });
    }

    // Fold the answers straight into the fields the matching engine reads, so
    // the interview improves match quality rather than just sitting there.
    if (field === 'technicalSkills') {
      const skills = answer.split(/[,;/]| and /i).map((s) => s.trim()).filter(Boolean);
      if (skills.length) profile.skills = [...new Set([...(profile.skills || []), ...skills])];
    }
    if (field === 'salary') {
      const nums = (answer.match(/\d[\d,]*/g) || []).map((n) => Number(n.replace(/,/g, '')));
      if (nums.length >= 2) profile.salaryExpectation = { min: Math.min(...nums), max: Math.max(...nums), currency: 'USD' };
      else if (nums.length === 1) profile.salaryExpectation = { min: nums[0], max: nums[0], currency: 'USD' };
    }
    if (field === 'preferredRole' && !profile.headline) {
      profile.headline = answer.trim().slice(0, 120);
    }

    const history = profile.aiInterview.answers;
    const next = await aiService.nextProfileQuestion(identityOf(req.user), history);

    // Finished: derive the main job specification from everything we know.
    if (next.done) {
      const cvs = await CV.find({ user: req.user._id, parseStatus: 'parsed' }).select('label parsed');
      const snapshots = cvs.map((c) => ({
        label: c.label,
        skills: c.parsed?.skills || [],
        experienceLevel: c.parsed?.experienceLevel,
        headline: c.parsed?.headline
      }));

      const spec = await aiService.deriveJobSpecification(identityOf(req.user), history, snapshots);
      profile.mainJobSpecification = {
        title: spec.title || '',
        summary: spec.summary || '',
        strengths: spec.strengths || [],
        suggestedRoles: spec.suggestedRoles || [],
        idealSalary: spec.idealSalary || { min: 0, max: 0, currency: 'USD' },
        generatedAt: new Date()
      };
      if (spec.skillGaps?.length) profile.skillGaps = spec.skillGaps;
      profile.aiInterview.completedAt = new Date();
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      data: {
        ...next,
        answered: history.length,
        total: aiService.PROFILE_TOPICS.length,
        history,
        completedAt: profile.aiInterview.completedAt,
        mainJobSpecification: profile.mainJobSpecification,
        aiLive: aiService.isLive()
      }
    });
  } catch (error) {
    console.error('Interview Answer Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Regenerate the job specification on demand
// @route   POST /api/profile/specification
// @access  Private (Jobseeker only)
const regenerateSpecification = async (req, res) => {
  try {
    const profile = await JobseekerProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const cvs = await CV.find({ user: req.user._id, parseStatus: 'parsed' }).select('label parsed');
    const spec = await aiService.deriveJobSpecification(
      identityOf(req.user),
      profile.aiInterview?.answers || [],
      cvs.map((c) => ({ label: c.label, skills: c.parsed?.skills || [], headline: c.parsed?.headline }))
    );

    profile.mainJobSpecification = {
      title: spec.title || '', summary: spec.summary || '',
      strengths: spec.strengths || [], suggestedRoles: spec.suggestedRoles || [],
      idealSalary: spec.idealSalary || { min: 0, max: 0, currency: 'USD' },
      generatedAt: new Date()
    };
    if (spec.skillGaps?.length) profile.skillGaps = spec.skillGaps;
    await profile.save();

    return res.status(200).json({ success: true, data: profile.mainJobSpecification });
  } catch (error) {
    console.error('Regenerate Specification Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  parseResumeText,
  getRecommendations,
  uploadAvatar,
  getInterviewState,
  submitInterviewAnswer,
  regenerateSpecification
};
