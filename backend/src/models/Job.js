const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    language: {
      type: String,
      enum: ['en', 'so'],
      default: 'en'
    },
    skillsRequired: [
      {
        type: String,
        trim: true
      }
    ],
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' }
    },
    educationLevel: {
      type: String,
      default: ''
    },
    experienceLevel: {
      type: String,
      default: ''
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
      default: 'full-time'
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'flagged', 'closed'],
      default: 'draft'
    },
    aiQualityFlags: [
      {
        type: String
      }
    ],
    aiQualityScore: {
      type: Number,
      default: 100
    },
    aiSuggestions: {
      type: String,
      default: ''
    },
    closesAt: {
      type: Date
    },
    publishedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
