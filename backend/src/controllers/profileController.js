const path = require('path');
const JobseekerProfile = require('../models/JobseekerProfile');
const User = require('../models/User');
const Job = require('../models/Job');
// Required for its side effect as well as its use: populating job.company
// needs the model registered, and relying on some other module having loaded
// it first works only by accident.
const Company = require('../models/Company');
const CV = require('../models/CV');
const aiService = require('../services/aiService');
const { rankJobsForCandidate, calculateMatchScore } = require('../services/matchingService');
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

const FACTOR_LABELS = {
  skills: 'Skills', location: 'Location', salary: 'Salary',
  education: 'Education', experience: 'Experience'
};

/**
 * How every CV performs against every live vacancy.
 *
 * The matched-jobs list already let a candidate switch which CV drives the
 * ranking, but only one at a time — so "this CV is worth more on data roles
 * than my other one" was something they had to hold in their head across
 * several page loads. This scores the whole grid at once and says which CV
 * wins where, and by how much.
 *
 * The cost is one score per CV per job. Skill embeddings are cached per
 * distinct string, so after the first pass this is arithmetic rather than API
 * calls; the grid is capped so a candidate with many CVs cannot make it
 * unbounded.
 */
// @desc    Compare every CV against every open job
// @route   GET /api/profile/cv-performance
// @access  Private (Jobseeker only)
const getCvPerformance = async (req, res) => {
  try {
    const cvs = await CV.find({ user: req.user._id, parseStatus: 'parsed' })
      .select('label parsed isPrimary createdAt originalName')
      .sort({ isPrimary: -1, createdAt: -1 })
      .limit(8);

    if (!cvs.length) {
      return res.status(200).json({
        success: true,
        data: { cvs: [], jobs: [], matrix: [], summaries: [], jobBest: [], overall: null },
        message: 'Upload and analyse a CV to see how it performs against open jobs.'
      });
    }

    const jobs = await Job.find({ status: 'published' })
      .populate('company', 'name logoUrl')
      .sort({ publishedAt: -1 })
      .limit(60);

    if (!jobs.length) {
      return res.status(200).json({
        success: true,
        data: { cvs: cvs.map((c) => ({ _id: c._id, label: c.label })), jobs: [], matrix: [], summaries: [], jobBest: [], overall: null },
        message: 'There are no open jobs to compare against yet.'
      });
    }

    // One row per job, one cell per CV.
    const matrix = [];
    for (const job of jobs) {
      const cells = [];
      for (const cv of cvs) {
        const { score, breakdown } = await calculateMatchScore(cv.parsed, job);
        cells.push({ cvId: cv._id, score, breakdown });
      }
      const best = cells.reduce((a, b) => (b.score > a.score ? b : a));
      const runnerUp = cells.filter((c) => c.cvId !== best.cvId)
        .reduce((a, b) => (!a || b.score > a.score ? b : a), null);

      matrix.push({
        jobId: job._id,
        title: job.title,
        companyName: job.company?.name || '',
        city: job.location?.city || '',
        employmentType: job.employmentType,
        cells,
        bestCvId: best.cvId,
        bestScore: best.score,
        // What choosing the right CV is actually worth on this job.
        margin: runnerUp ? best.score - runnerUp.score : 0
      });
    }

    // Per-CV summary: how it does across the whole board.
    const summaries = cvs.map((cv) => {
      const scores = matrix.map((row) => row.cells.find((c) => String(c.cvId) === String(cv._id)));
      const values = scores.map((s) => s.score);
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

      const bestRow = matrix.reduce((a, b) =>
        (b.cells.find((c) => String(c.cvId) === String(cv._id)).score >
         a.cells.find((c) => String(c.cvId) === String(cv._id)).score ? b : a));

      // Average each factor so the CV's own strength and weakness are visible.
      const factorAvg = {};
      Object.keys(FACTOR_LABELS).forEach((f) => {
        factorAvg[f] = Math.round(scores.reduce((sum, s) => sum + (s.breakdown[f] || 0), 0) / scores.length);
      });
      const ordered = Object.entries(factorAvg).sort((a, b) => b[1] - a[1]);

      return {
        cvId: cv._id,
        label: cv.label,
        originalName: cv.originalName,
        isPrimary: cv.isPrimary,
        skillCount: (cv.parsed?.skills || []).length,
        languages: cv.parsed?.languages || [],
        certifications: cv.parsed?.certifications || [],
        avgScore: avg,
        bestScore: Math.max(...values),
        worstScore: Math.min(...values),
        above70: values.filter((v) => v >= 70).length,
        winsOn: matrix.filter((row) => String(row.bestCvId) === String(cv._id)).length,
        bestJob: { jobId: bestRow.jobId, title: bestRow.title, companyName: bestRow.companyName,
          score: bestRow.cells.find((c) => String(c.cvId) === String(cv._id)).score },
        strongest: { factor: FACTOR_LABELS[ordered[0][0]], score: ordered[0][1] },
        weakest: { factor: FACTOR_LABELS[ordered[ordered.length - 1][0]], score: ordered[ordered.length - 1][1] }
      };
    });

    const overallBest = summaries.reduce((a, b) => (b.avgScore > a.avgScore ? b : a));

    return res.status(200).json({
      success: true,
      data: {
        cvs: cvs.map((c) => ({ _id: c._id, label: c.label, isPrimary: c.isPrimary })),
        jobCount: jobs.length,
        matrix: matrix.sort((a, b) => b.bestScore - a.bestScore),
        summaries: summaries.sort((a, b) => b.avgScore - a.avgScore),
        overall: {
          bestCvId: overallBest.cvId,
          bestCvLabel: overallBest.label,
          bestAvg: overallBest.avgScore,
          // The single most useful sentence on the page.
          biggestMargin: matrix.reduce((a, b) => (b.margin > a.margin ? b : a))
        }
      }
    });
  } catch (error) {
    console.error('CV Performance Error:', error.message);
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
  getCvPerformance,
  uploadAvatar,
  getInterviewState,
  submitInterviewAnswer,
  regenerateSpecification
};
