const { MATCH_WEIGHTS } = require('../../../shared/constants');
const { scoreSkills } = require('./skillMatchService');

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
const calculateMatchScore = async (profile, job) => {
  const breakdown = {
    skills: 0,
    location: 0,
    salary: 0,
    education: 0,
    experience: 0
  };

  // 1. Skills Match (45%) — semantic when the AI is available, literal otherwise.
  const skillResult = await scoreSkills(profile.skills || [], job.skillsRequired || []);
  breakdown.skills = skillResult.score;

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
    breakdown.salary = 100; // Employer did not state a range — treat as acceptable
  } else if (candMin === 0 && candMax === 0) {
    // Candidate has not stated an expectation. Previously this scored 0, which
    // silently cost 15% of every CV-based score — a CV rarely lists a salary.
    // "Unstated" is neutral on both sides, not a penalty.
    breakdown.salary = 100;
  } else if (candMin <= jobMax && candMax >= jobMin) {
    breakdown.salary = 100; // ranges overlap
  } else if (candMin > jobMax) {
    // Candidate wants more than the job pays.
    const diff = candMin - jobMax;
    breakdown.salary = jobMax > 0 ? Math.max(0, Math.round(100 - (diff / jobMax) * 100)) : 0;
  } else {
    // Candidate would accept less than the job's floor — not a mismatch.
    const diff = jobMin - candMax;
    breakdown.salary = jobMin > 0 ? Math.max(0, Math.round(100 - (diff / jobMin) * 100)) : 100;
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
const rankJobsForCandidate = async (profile, jobs) => {
  const scored = await Promise.all(
    jobs.map(async (job) => ({ job, ...(await calculateMatchScore(profile, job)) }))
  );
  return scored.sort((a, b) => b.score - a.score);
};

/**
 * Rank candidate profiles list for a specific job
 */
const rankCandidatesForJob = async (job, profiles) => {
  const scored = await Promise.all(
    profiles.map(async (profile) => ({ profile, ...(await calculateMatchScore(profile, job)) }))
  );
  return scored.sort((a, b) => b.score - a.score);
};

module.exports = {
  calculateMatchScore,
  rankJobsForCandidate,
  rankCandidatesForJob
};
