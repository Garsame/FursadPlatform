const path = require('path');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const APP_STATUSES = ['applied', 'reviewed', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'];

/**
 * Everything an employer needs to judge how their hiring is actually going,
 * scoped strictly to their own vacancies.
 *
 * The dashboard previously showed four totals, which answers "how many" and
 * nothing else. An employer's real questions are which roles are drawing
 * people, whether those people are any good, and where candidates drop out.
 */
// @desc    Hiring analytics for the logged-in employer
// @route   GET /api/companies/mine/analytics
// @access  Private (Employer)
const getMyCompanyAnalytics = async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const jobs = await Job.find({ company: company._id }).sort({ createdAt: -1 });
    const jobIds = jobs.map((j) => j._id);
    const since = (days) => new Date(Date.now() - days * 864e5);

    const [apps, weekApps, byStatus, monthly, cityRows, skillRows, recent] = await Promise.all([
      Application.find({ job: { $in: jobIds } }).select('job status matchScore createdAt jobseeker'),
      Application.countDocuments({ job: { $in: jobIds }, createdAt: { $gte: since(7) } }),
      Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        { $group: { _id: '$status', n: { $sum: 1 } } }
      ]),
      // Applications received per month for the last six months.
      Application.aggregate([
        { $match: { job: { $in: jobIds }, createdAt: { $gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1)) } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, n: { $sum: 1 } } }
      ]),
      // Where the interest is coming from.
      Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        { $lookup: { from: 'jobseekerprofiles', localField: 'jobseeker', foreignField: 'user', as: 'p' } },
        { $unwind: '$p' },
        { $match: { 'p.location.city': { $nin: [null, ''] } } },
        { $group: { _id: '$p.location.city', n: { $sum: 1 } } },
        { $sort: { n: -1 } }, { $limit: 6 }
      ]),
      // What the people applying actually know.
      Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        { $lookup: { from: 'jobseekerprofiles', localField: 'jobseeker', foreignField: 'user', as: 'p' } },
        { $unwind: '$p' }, { $unwind: '$p.skills' },
        { $group: { _id: { $toLower: '$p.skills' }, n: { $sum: 1 } } },
        { $sort: { n: -1 } }, { $limit: 12 }
      ]),
      Application.find({ job: { $in: jobIds } })
        .populate('jobseeker', 'name city country')
        .populate('job', 'title')
        .sort({ createdAt: -1 }).limit(6)
    ]);

    const statusCount = APP_STATUSES.reduce((a, s) => {
      a[s] = byStatus.find((r) => r._id === s)?.n || 0;
      return a;
    }, {});

    const reached = (stages) => stages.reduce((sum, s) => sum + statusCount[s], 0);
    const funnel = [
      { stage: 'Applied', count: apps.length },
      { stage: 'Reviewed', count: reached(['reviewed', 'shortlisted', 'interview', 'offer', 'hired']) },
      { stage: 'Shortlisted', count: reached(['shortlisted', 'interview', 'offer', 'hired']) },
      { stage: 'Interview', count: reached(['interview', 'offer', 'hired']) },
      { stage: 'Offer', count: reached(['offer', 'hired']) },
      { stage: 'Hired', count: statusCount.hired }
    ];

    // Per-job performance, which is the table an employer actually reads.
    const perJob = jobs.map((j) => {
      const mine = apps.filter((a) => String(a.job) === String(j._id));
      const scores = mine.map((a) => a.matchScore).filter((n) => n > 0);
      return {
        _id: j._id,
        title: j.title,
        status: j.status,
        createdAt: j.createdAt,
        employmentType: j.employmentType,
        city: j.location?.city || '',
        aiQualityScore: j.aiQualityScore,
        aiQualityFlags: j.aiQualityFlags || [],
        applicants: mine.length,
        shortlisted: mine.filter((a) => ['shortlisted', 'interview', 'offer', 'hired'].includes(a.status)).length,
        avgScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null,
        bestScore: scores.length ? Math.max(...scores) : null
      };
    }).sort((a, b) => b.applicants - a.applicants);

    const now = new Date();
    const applicationsOverTime = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
      const hit = monthly.find((r) => r._id.y === d.getUTCFullYear() && r._id.m === d.getUTCMonth() + 1);
      return { month: MONTHS[d.getUTCMonth()], count: hit ? hit.n : 0 };
    });

    const allScores = apps.map((a) => a.matchScore).filter((n) => n > 0);
    const band = (lo, hi) => allScores.filter((s) => s >= lo && s < hi).length;

    const missing = company.missingEssentials();

    return res.status(200).json({
      success: true,
      data: {
        company: {
          name: company.name,
          profileCompleteness: company.profileCompleteness,
          missingEssentials: missing,
          canPostJobs: missing.length === 0,
          isVerified: company.isVerified
        },
        summary: {
          totalJobs: jobs.length,
          liveJobs: jobs.filter((j) => j.status === 'published').length,
          pendingApproval: jobs.filter((j) => j.status === 'pending_review').length,
          closedJobs: jobs.filter((j) => j.status === 'closed').length,
          notApproved: jobs.filter((j) => j.status === 'flagged').length,
          totalApplicants: apps.length,
          newApplicants7: weekApps,
          interviews: statusCount.interview,
          offers: statusCount.offer,
          hires: statusCount.hired,
          rejected: statusCount.rejected,
          needsReview: statusCount.applied,
          avgApplicantsPerJob: jobs.length ? Math.round((apps.length / jobs.length) * 10) / 10 : 0,
          avgMatchScore: allScores.length ? Math.round((allScores.reduce((s, n) => s + n, 0) / allScores.length) * 10) / 10 : null,
          bestMatchScore: allScores.length ? Math.max(...allScores) : null,
          avgJobQuality: jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.aiQualityScore || 0), 0) / jobs.length) : null
        },
        funnel,
        applicationsByStatus: statusCount,
        applicationsOverTime,
        matchDistribution: [
          { band: 'Under 40%', count: band(0, 40) },
          { band: '40–59%', count: band(40, 60) },
          { band: '60–74%', count: band(60, 75) },
          { band: '75–89%', count: band(75, 90) },
          { band: '90%+', count: band(90, 101) }
        ],
        perJob,
        applicantCities: cityRows.map((r) => ({ city: r._id, count: r.n })),
        applicantSkills: skillRows.map((r) => ({ skill: r._id, count: r.n })),
        recentApplicants: recent.map((a) => ({
          _id: a._id,
          name: a.jobseeker?.name || 'Unknown',
          city: a.jobseeker?.city || '',
          jobTitle: a.job?.title || '',
          jobId: a.job?._id,
          status: a.status,
          matchScore: a.matchScore,
          appliedAt: a.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Company Analytics Error:', error.message);
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
  getMyCompany, updateMyCompany, uploadLogo, generateCompanyCopy, getMyCompanyAnalytics,
  getPublicCompanies, getPublicCompany
};
