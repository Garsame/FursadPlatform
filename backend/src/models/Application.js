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
    // Which CV the candidate submitted, so the employer downloads the exact
    // document that produced this match score.
    cv: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV',
      default: null
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
    },

    /**
     * Messaging gate.
     *
     * A candidate gets exactly one opening message. After that the thread is
     * closed to them until the employer accepts it, which stops an applicant
     * from filling an employer's inbox before any interest has been shown.
     * The employer is never gated — it is their vacancy.
     *
     * Acceptance is recorded rather than inferred, so the rule can be checked
     * on the server without recounting messages on every send.
     */
    messaging: {
      acceptedAt: { type: Date, default: null },
      acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
