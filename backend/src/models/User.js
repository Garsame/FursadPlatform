const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    // --- Identity data captured at signup ---
    gender: {
      type: String,
      enum: ['male', 'female', 'prefer_not_to_say', ''],
      default: ''
    },
    country: { type: String, trim: true, default: '' },
    city:    { type: String, trim: true, default: '' },
    educationLevel: {
      type: String,
      enum: ['High School', 'Diploma', 'Bachelor', 'Master', 'PhD', ''],
      default: ''
    },
    // The candidate's own words for what they do; the AI later refines this
    // into JobseekerProfile.mainJobSpecification.
    jobSpecification: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, default: '' },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['jobseeker', 'employer', 'admin'],
      default: 'jobseeker'
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'so'],
      default: 'en'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    otpCode: {
      type: String
    },
    otpExpiresAt: {
      type: Date
    },
    // Password reset uses its own code, separate from the signup verification
    // one — a reset must never consume or satisfy email verification's OTP.
    resetOtpCode: {
      type: String
    },
    resetOtpExpiresAt: {
      type: Date
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
