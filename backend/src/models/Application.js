const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['applied', 'reviewed', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'],
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  note: {
    type: String,
    default: ''
  }
});

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    jobseeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['applied', 'reviewed', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'],
      default: 'applied'
    },
    statusHistory: [statusHistorySchema],
    matchScore: {
      type: Number,
      default: 0
    },
    matchBreakdown: {
      skills: { type: Number, default: 0 },
      location: { type: Number, default: 0 },
      salary: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      experience: { type: Number, default: 0 }
    },
    aiSummary: {
      type: String,
      default: ''
    },
    interviewPrepSent: {
      type: Boolean,
      default: false
    },
    interviewScorecard: {
      type: String,
      default: ''
    },
    coverNote: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
