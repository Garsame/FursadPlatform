const JobseekerProfile = require('../models/JobseekerProfile');
const Job = require('../models/Job');
const aiService = require('../services/aiService');
const { rankJobsForCandidate } = require('../services/matchingService');

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

// @desc    Get AI job recommendations
// @route   GET /api/profile/recommendations
// @access  Private (Jobseeker only)
const getRecommendations = async (req, res) => {
  try {
    const profile = await JobseekerProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found. Please complete profile details first.' });
    }

    // Find all active published jobs
    const jobs = await Job.find({ status: 'published' }).populate('company', 'name description logoUrl location website');

    // Run scoring and ranking
    const recommendations = rankJobsForCandidate(profile, jobs);

    return res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Get Recommendations Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  parseResumeText,
  getRecommendations
};
