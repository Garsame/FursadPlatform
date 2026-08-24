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

const JobseekerProfile = mongoose.model('JobseekerProfile', jobseekerProfileSchema);
module.exports = JobseekerProfile;
