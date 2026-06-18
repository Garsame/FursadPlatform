// Fursad Platform Shared Constants
// Used by both backend and frontend

const ROLES = {
  JOBSEEKER: 'jobseeker',
  EMPLOYER: 'employer',
  ADMIN: 'admin'
};

const JOB_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  FLAGGED: 'flagged',
  CLOSED: 'closed'
};

const APPLICATION_STATUS = {
  APPLIED: 'applied',
  REVIEWED: 'reviewed',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  HIRED: 'hired',
  REJECTED: 'rejected'
};

const MATCH_WEIGHTS = {
  SKILLS: 0.45,
  LOCATION: 0.20,
  SALARY: 0.15,
  EDUCATION: 0.10,
  EXPERIENCE: 0.10
};

const LANGUAGES = {
  EN: 'en',
  SO: 'so'
};

module.exports = {
  ROLES,
  JOB_STATUS,
  APPLICATION_STATUS,
  MATCH_WEIGHTS,
  LANGUAGES
};
