const mongoose = require('mongoose');

/**
 * A jobseeker may keep several CVs — one tuned for engineering roles, another
 * for data roles. Each is parsed independently by the AI into its own profile
 * snapshot, which is what the matching engine scores against. That is what
 * makes "matched by AI through which CV" possible.
 */
const cvSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    label: {
      type: String,
      trim: true,
      default: 'My CV'
    },
    originalName: { type: String, required: true },
    storedName:   { type: String, required: true }, // filename on disk
    mimeType:     { type: String, required: true },
    sizeBytes:    { type: Number, default: 0 },

    // Plain text pulled out of the PDF/DOCX, fed to the AI parser.
    rawText: { type: String, default: '' },

    // AI-extracted profile snapshot for THIS CV.
    parsed: {
      headline:   { type: String, default: '' },
      bio:        { type: String, default: '' },
      skills:     [{ type: String, trim: true }],
      location:   {
        city:    { type: String, default: '' },
        country: { type: String, default: '' }
      },
      education:  [{
        institution: String,
        level: String,
        fieldOfStudy: String,
        startYear: Number,
        endYear: Number
      }],
      experience: [{
        title: String,
        company: String,
        startDate: Date,
        endDate: Date,
        description: String
      }],
      experienceLevel:       { type: String, default: '' },
      highestEducationLevel: { type: String, default: '' },
      // Read straight off the CV. In this region a candidate's languages are
      // often the deciding factor for customer-facing roles, and they were
      // being thrown away entirely.
      languages: [{
        name:        { type: String, trim: true },
        proficiency: { type: String, trim: true, default: '' }
      }],
      certifications: [{ type: String, trim: true }],
      salaryExpectation: {
        min:      { type: Number, default: 0 },
        max:      { type: Number, default: 0 },
        currency: { type: String, default: 'USD' }
      }
    },

    parseStatus: {
      type: String,
      enum: ['pending', 'parsed', 'failed'],
      default: 'pending'
    },
    parseError: { type: String, default: '' },

    // The CV sent with an application when the seeker does not pick one.
    isPrimary: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const CV = mongoose.model('CV', cvSchema);
module.exports = CV;
