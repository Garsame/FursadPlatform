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
    }
  },
  {
    timestamps: true
  }
);

const Company = mongoose.model('Company', companySchema);
module.exports = Company;
