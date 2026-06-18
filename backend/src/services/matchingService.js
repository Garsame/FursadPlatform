const { MATCH_WEIGHTS } = require('../../../shared/constants');

// Education level ranking
const EDUCATION_RANKS = {
  'high school': 1,
  'secondary': 1,
  'diploma': 2,
  'bachelor': 3,
  'bsc': 3,
  'ba': 3,
  'master': 4,
  'msc': 4,
  'ma': 4,
  'phd': 5,
  'doctorate': 5
};

// Experience level ranking
const EXPERIENCE_RANKS = {
  'entry': 1,
  'mid': 2,
  'senior': 3,
  'lead': 4,
  'executive': 5
};

/**
 * Calculates match score between a single profile and a single job.
 * Returns { score (0-100), breakdown }
 */
const calculateMatchScore = (profile, job) => {
  const breakdown = {
    skills: 0,
    location: 0,
    salary: 0,
    education: 0,
    experience: 0
  };

  // 1. Skills Match (45%)
  if (!job.skillsRequired || job.skillsRequired.length === 0) {
    breakdown.skills = 100;
  } else {
    const candidateSkills = (profile.skills || []).map(s => s.toLowerCase().trim());
    const matched = job.skillsRequired.filter(s => candidateSkills.includes(s.toLowerCase().trim()));
    breakdown.skills = Math.round((matched.length / job.skillsRequired.length) * 100);
  }

  // 2. Location Match (20%)
  const jobCity = (job.location?.city || '').toLowerCase().trim();
  const jobCountry = (job.location?.country || '').toLowerCase().trim();
  const candCity = (profile.location?.city || '').toLowerCase().trim();
  const candCountry = (profile.location?.country || '').toLowerCase().trim();

  if (jobCity === candCity && jobCountry === candCountry) {
    breakdown.location = 100;
  } else if (jobCountry === candCountry) {
    breakdown.location = 50; // country matches, city doesn't
  } else {
    breakdown.location = 0;
  }

  // 3. Salary Overlap (15%)
  const jobMin = job.salaryRange?.min || 0;
  const jobMax = job.salaryRange?.max || 0;
  const candMin = profile.salaryExpectation?.min || 0;
  const candMax = profile.salaryExpectation?.max || 0;

  if (jobMin === 0 && jobMax === 0) {
    breakdown.salary = 100; // Not specified is assumed acceptable
  } else {
    // If there is an overlap
    if (candMin <= jobMax && candMax >= jobMin) {
      breakdown.salary = 100;
    } else {
      // Proximity score
      if (candMin > jobMax) {
        const diff = candMin - jobMax;
        breakdown.salary = Math.max(0, Math.round(100 - (diff / jobMax) * 100));
      } else {
        const diff = jobMin - candMax;
        breakdown.salary = Math.max(0, Math.round(100 - (diff / jobMin) * 100));
      }
    }
  }

  // 4. Education level (10%)
  const jobEd = (job.educationLevel || '').toLowerCase().trim();
  const candEd = (profile.highestEducationLevel || '').toLowerCase().trim();
  const jobEdRank = EDUCATION_RANKS[jobEd] || 0;
  const candEdRank = EDUCATION_RANKS[candEd] || 0;

  if (jobEdRank === 0) {
    breakdown.education = 100;
  } else if (candEdRank >= jobEdRank) {
    breakdown.education = 100;
  } else {
    breakdown.education = Math.round((candEdRank / jobEdRank) * 100);
  }

  // 5. Experience level (10%)
  const jobExp = (job.experienceLevel || '').toLowerCase().trim();
  const candExp = (profile.experienceLevel || '').toLowerCase().trim();
  const jobExpRank = EXPERIENCE_RANKS[jobExp] || 0;
  const candExpRank = EXPERIENCE_RANKS[candExp] || 0;

  if (jobExpRank === 0) {
    breakdown.experience = 100;
  } else if (candExpRank >= jobExpRank) {
    breakdown.experience = 100;
  } else {
    breakdown.experience = Math.round((candExpRank / jobExpRank) * 100);
  }

  // Calculate weighted total
  const rawScore = 
    (breakdown.skills * MATCH_WEIGHTS.SKILLS) +
    (breakdown.location * MATCH_WEIGHTS.LOCATION) +
    (breakdown.salary * MATCH_WEIGHTS.SALARY) +
    (breakdown.education * MATCH_WEIGHTS.EDUCATION) +
    (breakdown.experience * MATCH_WEIGHTS.EXPERIENCE);

  const score = Math.round(rawScore);

  return { score, breakdown };
};

/**
 * Rank job list for a candidate's profile
 */
const rankJobsForCandidate = (profile, jobs) => {
  const scoredJobs = jobs.map(job => {
    const { score, breakdown } = calculateMatchScore(profile, job);
    return { job, score, breakdown };
  });

  return scoredJobs.sort((a, b) => b.score - a.score);
};

/**
 * Rank candidate profiles list for a specific job
 */
const rankCandidatesForJob = (job, profiles) => {
  const scoredProfiles = profiles.map(profile => {
    const { score, breakdown } = calculateMatchScore(profile, job);
    return { profile, score, breakdown };
  });

  return scoredProfiles.sort((a, b) => b.score - a.score);
};

module.exports = {
  calculateMatchScore,
  rankJobsForCandidate,
  rankCandidatesForJob
};
