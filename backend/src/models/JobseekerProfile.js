const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  institution: String,
  level: String, // e.g. High School, Bachelor, Master, PhD
  fieldOfStudy: String,
  startYear: Number,
  endYear: Number
});

const experienceSchema = new mongoose.Schema({
  title: String,
  company: String,
  startDate: Date,
  endDate: Date,
  description: String
});

const jobseekerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    headline: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    skills: [
      {
        type: String,
        trim: true
      }
    ],
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    education: [educationSchema],
    experience: [experienceSchema],
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
      default: 'entry'
    },
    highestEducationLevel: {
      type: String,
      default: ''
    },
    salaryExpectation: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' }
    },
    languagesSpoken: [
      {
        type: String
      }
    ],
    profileCompletenessScore: {
      type: Number,
      default: 0
    },
    aiImprovementTips: {
      type: String,
      default: ''
    },
    resumeFileUrl: {
      type: String,
      default: ''
    },
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
      }
    ],
    careerPathSuggestions: [
      {
        type: String
      }
    ],
    skillGaps: [
      {
        type: String
      }
    ],
    applicationResponseRate: {
      type: Number,
      default: 100
    },
    searchHistory: [
      {
        type: String
      }
    ],

    // --- AI-guided profile interview ---
    aiInterview: {
      answers: [{
        field:    String,
        question: String,
        answer:   String,
        answeredAt: { type: Date, default: Date.now }
      }],
      completedAt: { type: Date, default: null }
    },

    // What the AI concluded the candidate is, from identity + answers + CVs.
    mainJobSpecification: {
      title:     { type: String, default: '' },
      summary:   { type: String, default: '' },
      strengths: [{ type: String }],
      suggestedRoles: [{ type: String }],
      idealSalary: {
        min:      { type: Number, default: 0 },
        max:      { type: Number, default: 0 },
        currency: { type: String, default: 'USD' }
      },
      generatedAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
);

/**
 * Completeness, derived from the profile rather than stored by whoever last
 * edited it.
 *
 * The score used to be written only by the manual profile editor, so uploading
 * a CV or finishing the AI interview left it untouched and it drifted away
 * from reality — a profile with a single skill was sitting at 70%. A number
 * that decides whether someone may apply has to be computed from what is
 * actually there.
 *
 * The weights follow the matching engine: skills carry 45% of a match score,
 * so a profile without them is not ready regardless of how full it looks.
 */
const COMPLETENESS_FIELDS = [
  { key: 'skills', weight: 25, label: 'At least three skills',
    hint: 'Skills are 45% of every match score — this matters more than anything else',
    has: (p) => (p.skills || []).length >= 3 },
  { key: 'city', weight: 15, label: 'Your city',
    hint: 'Location is 20% of a match score',
    has: (p) => !!p.location?.city },
  { key: 'headline', weight: 10, label: 'A headline',
    hint: 'One line on what you do, shown to employers first',
    has: (p) => !!(p.headline || '').trim() },
  { key: 'bio', weight: 10, label: 'A short bio',
    hint: 'At least a sentence about yourself',
    has: (p) => (p.bio || '').trim().length >= 40 },
  { key: 'education', weight: 10, label: 'Your education level',
    hint: 'Counts for 10% of a match score',
    has: (p) => !!p.highestEducationLevel },
  { key: 'experienceLevel', weight: 10, label: 'Your experience level',
    hint: 'Entry, mid, senior and so on — another 10%',
    has: (p) => !!p.experienceLevel },
  { key: 'salary', weight: 10, label: 'Salary expectation',
    hint: 'A range in USD; 15% of a match score',
    has: (p) => (p.salaryExpectation?.min > 0 || p.salaryExpectation?.max > 0) },
  { key: 'history', weight: 5, label: 'One work history entry',
    hint: 'Where you have worked',
    has: (p) => (p.experience || []).length > 0 },
  { key: 'schooling', weight: 5, label: 'One education entry',
    hint: 'Where you studied',
    has: (p) => (p.education || []).length > 0 }
];

jobseekerProfileSchema.methods.recalculateCompleteness = function () {
  this.profileCompletenessScore = COMPLETENESS_FIELDS
    .reduce((sum, f) => sum + (f.has(this) ? f.weight : 0), 0);
  return this.profileCompletenessScore;
};

/** What is still missing, named rather than expressed as a percentage. */
jobseekerProfileSchema.methods.missingForApplying = function () {
  return COMPLETENESS_FIELDS
    .filter((f) => !f.has(this))
    .map(({ key, label, hint, weight }) => ({ key, label, hint, worth: weight }));
};

jobseekerProfileSchema.pre('save', function (next) {
  this.recalculateCompleteness();
  next();
});

const JobseekerProfile = mongoose.model('JobseekerProfile', jobseekerProfileSchema);
module.exports = JobseekerProfile;
module.exports.COMPLETENESS_FIELDS = COMPLETENESS_FIELDS;
