const path = require('path');
const Company = require('../models/Company');
const Job = require('../models/Job');
const { removeFile, UPLOAD_ROOT } = require('../services/documentService');
const aiService = require('../services/aiService');

const PUBLIC_FIELDS =
  'name tagline description about industry location headquarters website logoUrl ' +
  'foundedYear companySize benefits values socials isVerified profileCompleteness createdAt';

// @desc    Get the company owned by the logged-in employer
// @route   GET /api/companies/mine
// @access  Private (Employer)
const getMyCompany = async (req, res) => {
  try {
    let company = await Company.findOne({ owner: req.user._id });
    if (!company) {
      company = await Company.create({
        name: `${req.user.name}'s Company`,
        owner: req.user._id,
        recruiters: [req.user._id]
      });
    }
    return res.status(200).json({ success: true, data: company });
  } catch (error) {
    console.error('Get My Company Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update my company profile
// @route   PUT /api/companies/mine
// @access  Private (Employer)
const updateMyCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const editable = [
      'name', 'tagline', 'description', 'about', 'industry', 'website',
      'headquarters', 'foundedYear', 'companySize', 'registrationNumber',
      'contactEmail', 'contactPhone'
    ];
    editable.forEach((k) => {
      if (req.body[k] !== undefined) company[k] = req.body[k];
    });

    if (req.body.location) company.location = req.body.location;
    if (Array.isArray(req.body.benefits)) company.benefits = req.body.benefits.filter(Boolean);
    if (Array.isArray(req.body.values)) company.values = req.body.values.filter(Boolean);
    if (req.body.socials) company.socials = { ...company.socials?.toObject?.() ?? {}, ...req.body.socials };

    await company.save(); // pre-save recalculates completeness

    return res.status(200).json({
      success: true,
      message: 'Company profile updated',
      data: company
    });
  } catch (error) {
    console.error('Update Company Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload company logo
// @route   POST /api/companies/mine/logo
// @access  Private (Employer)
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'An image file is required' });

    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    if (company.logoUrl) {
      removeFile(path.join(UPLOAD_ROOT, 'avatars', path.basename(company.logoUrl)));
    }
    company.logoUrl = `/uploads/avatars/${req.file.filename}`;
    await company.save();

    return res.status(200).json({
      success: true,
      message: 'Logo updated',
      data: { logoUrl: company.logoUrl, profileCompleteness: company.profileCompleteness }
    });
  } catch (error) {
    console.error('Upload Logo Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI-drafted company description from a few facts
// @route   POST /api/companies/mine/generate
// @access  Private (Employer)
const generateCompanyCopy = async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    // What a company hires for describes it better than anything it writes
    // about itself, so the roles go to the model as evidence.
    const jobs = await Job.find({ company: company._id })
      .select('title skillsRequired')
      .sort({ createdAt: -1 })
      .limit(8);

    const draft = await aiService.generateCompanyProfile({
      name: company.name,
      industry: company.industry,
      city: company.location?.city,
      country: company.location?.country,
      foundedYear: company.foundedYear,
      companySize: company.companySize,
      website: company.website,
      tagline: company.tagline,
      description: company.description,
      about: company.about,
      benefits: company.benefits,
      values: company.values,
      jobTitles: jobs.map((j) => j.title),
      jobSkills: [...new Set(jobs.flatMap((j) => j.skillsRequired || []))],
      notes: req.body?.notes || ''
    });

    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    console.error('Generate Company Copy Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Public list of employers with live jobs (the trust wall)
// @route   GET /api/companies
// @access  Public
const getPublicCompanies = async (req, res) => {
  try {
    const publishedJobs = await Job.find({ status: 'published' }).select('company');
    const ids = [...new Set(publishedJobs.map((j) => String(j.company)))];

    const companies = await Company.find({ _id: { $in: ids } })
      .select(PUBLIC_FIELDS)
      .sort({ profileCompleteness: -1, name: 1 });

    const counts = publishedJobs.reduce((acc, j) => {
      acc[String(j.company)] = (acc[String(j.company)] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      count: companies.length,
      data: companies.map((c) => ({ ...c.toObject(), openRoles: counts[String(c._id)] || 0 }))
    });
  } catch (error) {
    console.error('Get Public Companies Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Public employer profile + their open roles
// @route   GET /api/companies/:id
// @access  Public
const getPublicCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).select(PUBLIC_FIELDS);
    if (!company) return res.status(404).json({ success: false, message: 'Employer not found' });

    const jobs = await Job.find({ company: company._id, status: 'published' })
      .populate('company', 'name logoUrl location')
      .sort({ publishedAt: -1 });

    return res.status(200).json({ success: true, data: { company, jobs } });
  } catch (error) {
    console.error('Get Public Company Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyCompany, updateMyCompany, uploadLogo, generateCompanyCopy,
  getPublicCompanies, getPublicCompany
};
