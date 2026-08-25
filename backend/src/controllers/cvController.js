const path = require('path');
const CV = require('../models/CV');
const JobseekerProfile = require('../models/JobseekerProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const aiService = require('../services/aiService');
const { extractText, removeFile, UPLOAD_ROOT } = require('../services/documentService');
const { ROLES } = require('../../../shared/constants');

const cvDiskPath = (cv) => path.join(UPLOAD_ROOT, 'cvs', cv.storedName);

// Never ship rawText in list responses — it is large and not needed by the UI.
const LIST_FIELDS = '-rawText';

// @desc    List my CVs
// @route   GET /api/cvs
// @access  Private (Jobseeker)
const getMyCvs = async (req, res) => {
  try {
    const cvs = await CV.find({ user: req.user._id }).select(LIST_FIELDS).sort({ isPrimary: -1, createdAt: -1 });
    return res.status(200).json({ success: true, count: cvs.length, data: cvs });
  } catch (error) {
    console.error('Get CVs Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload a CV, extract its text and AI-parse it
// @route   POST /api/cvs
// @access  Private (Jobseeker)
const uploadCv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A CV file is required' });
    }

    const absolute = path.join(UPLOAD_ROOT, 'cvs', req.file.filename);

    // Distinguish "this file genuinely has no text in it" from "our extractor
    // broke". Both used to surface to the candidate as the same message, which
    // hid a library bug behind an accusation about their document.
    let rawText = '';
    let extractionError = '';
    try {
      rawText = await extractText(absolute, req.file.mimetype);
    } catch (err) {
      extractionError = `Could not read this file: ${err.message}`;
      console.error('CV text extraction failed:', err);
    }

    const isFirst = (await CV.countDocuments({ user: req.user._id })) === 0;

    const cv = await CV.create({
      user: req.user._id,
      label: (req.body.label || '').trim() || path.parse(req.file.originalname).name,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      rawText,
      isPrimary: isFirst,
      parseStatus: 'pending'
    });

    // AI parse. Never blocks the upload — a CV that fails to parse is still a
    // downloadable document, it just has no match data yet.
    if (rawText && rawText.length > 40) {
      try {
        const parsed = await aiService.parseResume(rawText, req.user.preferredLanguage);
        cv.parsed = {
          headline: parsed.headline || '',
          bio: parsed.bio || '',
          skills: parsed.skills || [],
          location: parsed.location || { city: '', country: '' },
          education: parsed.education || [],
          experience: parsed.experience || [],
          experienceLevel: parsed.experienceLevel || '',
          highestEducationLevel: parsed.highestEducationLevel || '',
          salaryExpectation: parsed.salaryExpectation || { min: 0, max: 0, currency: 'USD' },
          languages: parsed.languages || [],
          certifications: parsed.certifications || []
        };
        cv.parseStatus = 'parsed';

        // Languages belong on the profile too — an employer reading an
        // applicant sees the profile, and a language only ever recorded on one
        // CV would be invisible everywhere else.
        if (parsed.languages?.length) {
          const profile = await JobseekerProfile.findOne({ user: req.user._id });
          if (profile) {
            const known = new Set((profile.languagesSpoken || []).map((l) => l.toLowerCase()));
            const additions = parsed.languages
              .map((l) => l.name)
              .filter((n) => n && !known.has(n.toLowerCase()));
            if (additions.length) {
              profile.languagesSpoken = [...(profile.languagesSpoken || []), ...additions];
              await profile.save();
            }
          }
        }
      } catch (err) {
        cv.parseStatus = 'failed';
        cv.parseError = err.message;
      }
    } else {
      cv.parseStatus = 'failed';
      cv.parseError = extractionError ||
        'No readable text could be extracted from this file. If it is a scanned image, a text-based PDF or Word file will work better.';
    }

    await cv.save();

    const clean = cv.toObject();
    delete clean.rawText;

    return res.status(201).json({
      success: true,
      message: cv.parseStatus === 'parsed'
        ? 'CV uploaded and analysed successfully'
        : `CV uploaded, but it could not be analysed. ${cv.parseError} It can still be downloaded by employers, but it will not be used for matching.`,
      data: clean
    });
  } catch (error) {
    console.error('Upload CV Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Rename / relabel a CV
// @route   PUT /api/cvs/:id
// @access  Private (Jobseeker)
const updateCv = async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    if (cv.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (req.body.label !== undefined) cv.label = req.body.label.trim() || cv.label;
    await cv.save();

    const clean = cv.toObject();
    delete clean.rawText;
    return res.status(200).json({ success: true, data: clean });
  } catch (error) {
    console.error('Update CV Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a CV as the default one
// @route   PUT /api/cvs/:id/primary
// @access  Private (Jobseeker)
const setPrimaryCv = async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    if (cv.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await CV.updateMany({ user: req.user._id }, { $set: { isPrimary: false } });
    cv.isPrimary = true;
    await cv.save();

    return res.status(200).json({ success: true, message: 'Default CV updated' });
  } catch (error) {
    console.error('Set Primary CV Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a CV
// @route   DELETE /api/cvs/:id
// @access  Private (Jobseeker)
const deleteCv = async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });
    if (cv.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Keep CVs that were already sent to an employer: deleting one would break
    // the record of what that employer actually received.
    const usedInApplication = await Application.countDocuments({ cv: cv._id });
    if (usedInApplication > 0) {
      return res.status(400).json({
        success: false,
        message: `This CV was sent with ${usedInApplication} application(s) and cannot be deleted.`
      });
    }

    removeFile(cvDiskPath(cv));
    await cv.deleteOne();

    // Promote another CV if the default was removed.
    if (cv.isPrimary) {
      const next = await CV.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (next) { next.isPrimary = true; await next.save(); }
    }

    return res.status(200).json({ success: true, message: 'CV deleted' });
  } catch (error) {
    console.error('Delete CV Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download a CV file
// @route   GET /api/cvs/:id/download
// @access  Private — owner, an employer who received it, or an admin
const downloadCv = async (req, res) => {
  try {
    const cv = await CV.findById(req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found' });

    let allowed = false;

    if (cv.user.toString() === req.user._id.toString()) {
      allowed = true;                                   // the owner
    } else if (req.user.role === ROLES.ADMIN) {
      allowed = true;                                   // platform oversight
    } else if (req.user.role === ROLES.EMPLOYER) {
      // Only if this candidate actually applied to one of this employer's jobs.
      const myJobs = await Job.find({ postedBy: req.user._id }).select('_id');
      allowed = (await Application.countDocuments({
        jobseeker: cv.user,
        job: { $in: myJobs.map((j) => j._id) }
      })) > 0;
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this CV' });
    }

    return res.download(cvDiskPath(cv), cv.originalName);
  } catch (error) {
    console.error('Download CV Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List a candidate's CVs (employer/admin view of an applicant)
// @route   GET /api/cvs/candidate/:userId
// @access  Private (Employer who received an application, or Admin)
const getCandidateCvs = async (req, res) => {
  try {
    if (req.user.role === ROLES.EMPLOYER) {
      const myJobs = await Job.find({ postedBy: req.user._id }).select('_id');
      const applied = await Application.countDocuments({
        jobseeker: req.params.userId,
        job: { $in: myJobs.map((j) => j._id) }
      });
      if (!applied) {
        return res.status(403).json({ success: false, message: 'This candidate has not applied to your jobs' });
      }
    } else if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const cvs = await CV.find({ user: req.params.userId }).select(LIST_FIELDS).sort({ isPrimary: -1 });
    return res.status(200).json({ success: true, count: cvs.length, data: cvs });
  } catch (error) {
    console.error('Get Candidate CVs Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyCvs, uploadCv, updateCv, setPrimaryCv, deleteCv, downloadCv, getCandidateCvs
};
