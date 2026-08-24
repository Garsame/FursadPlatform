const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recruiters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    description: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    website: {
      type: String,
      trim: true
    },
    logoUrl: {
      type: String,
      default: ''
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },

    // --- Public employer profile ---
    // Shown to candidates before they apply, so they know who they are
    // applying to. This is the trust surface of the platform.
    tagline:      { type: String, trim: true, default: '' },
    about:        { type: String, trim: true, default: '' },   // longer story
    foundedYear:  { type: Number, default: null },
    companySize:  {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+', ''],
      default: ''
    },
    headquarters: { type: String, trim: true, default: '' },
    benefits:     [{ type: String, trim: true }],
    values:       [{ type: String, trim: true }],
    contactEmail: { type: String, trim: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    socials: {
      linkedin:  { type: String, trim: true, default: '' },
      twitter:   { type: String, trim: true, default: '' },
      facebook:  { type: String, trim: true, default: '' }
    },

    profileCompleteness: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Completeness is what nudges employers to fill in the profile candidates
 * actually read. Weighted by how much each field matters to a jobseeker
 * deciding whether to trust this employer.
 */
const COMPLETENESS_FIELDS = [
  { weight: 15, has: (c) => !!c.name && !/'s Company$/.test(c.name) },
  { weight: 15, has: (c) => (c.description || '').length > 40 },
  { weight: 10, has: (c) => (c.about || '').length > 80 },
  { weight: 10, has: (c) => !!c.industry },
  { weight: 10, has: (c) => !!c.location?.city },
  { weight: 10, has: (c) => !!c.logoUrl },
  { weight: 8,  has: (c) => !!c.website },
  { weight: 7,  has: (c) => !!c.companySize },
  { weight: 5,  has: (c) => !!c.tagline },
  { weight: 5,  has: (c) => !!c.foundedYear },
  { weight: 5,  has: (c) => (c.benefits || []).length > 0 }
];

companySchema.methods.recalculateCompleteness = function () {
  const score = COMPLETENESS_FIELDS.reduce((sum, f) => sum + (f.has(this) ? f.weight : 0), 0);
  this.profileCompleteness = Math.min(100, score);
  return this.profileCompleteness;
};

companySchema.pre('save', function (next) {
  this.recalculateCompleteness();
  next();
});

const Company = mongoose.model('Company', companySchema);
module.exports = Company;
