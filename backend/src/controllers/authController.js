const User = require('../models/User');
const JobseekerProfile = require('../models/JobseekerProfile');
const Company = require('../models/Company');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { ROLES } = require('../../../shared/constants');
const { ADMIN_SECRET } = require('../config/secrets');

const otpExpiry = () =>
  new Date(Date.now() + (Number(process.env.OTP_EXPIRES_MINUTES) || 10) * 60 * 1000);

/**
 * A verified account needs the record its portal depends on: a jobseeker with
 * no JobseekerProfile is blocked at "apply", and an employer with no Company is
 * blocked at "post a job". Verification used to be the only path that created
 * these, so password reset — which also proves the user owns the address —
 * calls the same helper rather than duplicating it.
 */
const ensureRoleRecords = async (user) => {
  if (user.role === ROLES.JOBSEEKER) {
    const exists = await JobseekerProfile.findOne({ user: user._id });
    if (!exists) {
      await JobseekerProfile.create({
        user: user._id,
        skills: [],
        headline: user.jobSpecification || '',
        location: { city: user.city || '', country: user.country || '' },
        highestEducationLevel: user.educationLevel || ''
      });
    }
  } else if (user.role === ROLES.EMPLOYER) {
    const exists = await Company.findOne({ owner: user._id });
    if (!exists) {
      await Company.create({
        name: `${user.name}'s Company`,
        owner: user._id,
        recruiters: [user._id],
        // Seeded from the account address so a new employer is not blocked
        // from posting over a field they would only ever fill with this.
        contactEmail: user.email,
        location: { city: user.city || '', country: user.country || '' }
      });
    }
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const {
      name, email, phone, password, role, adminSecret,
      gender, country, city, educationLevel, jobSpecification
    } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Validate role
    const validRoles = [ROLES.JOBSEEKER, ROLES.EMPLOYER, ROLES.ADMIN];
    const userRole = role || ROLES.JOBSEEKER;
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check if role is admin and verify secret key
    if (userRole === ROLES.ADMIN) {
      if (adminSecret !== ADMIN_SECRET) {
        return res.status(401).json({ success: false, message: 'Invalid Admin Secret Key' });
      }
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Generate OTP for jobseekers and employers
    const otp = generateOTP();
    const otpExpires = otpExpiry();

    const isVerified = userRole === ROLES.ADMIN; // Admins are auto-verified

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: userRole,
      gender: gender || '',
      country: country || '',
      city: city || '',
      educationLevel: educationLevel || '',
      jobSpecification: jobSpecification || '',
      isVerified,
      otpCode: isVerified ? undefined : otp,
      otpExpiresAt: isVerified ? undefined : otpExpires
    });

    if (user) {
      if (!isVerified) {
        // Send email OTP
        await sendVerificationEmail(email, otp);
        return res.status(201).json({
          success: true,
          message: 'Registration successful. Verification code sent to email.',
          email: user.email,
          role: user.role,
          requiresVerification: true
        });
      } else {
        // Return token for auto-verified Admin
        return res.status(201).json({
          success: true,
          message: 'Admin registered successfully',
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id)
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified' });
    }

    // Check expiration
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }

    // Verify OTP code
    if (user.otpCode !== otpCode) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // Seed the records this role's portal depends on, from the identity data
    // collected at signup, so matching works immediately with no empty state.
    await ensureRoleRecords(user);

    return res.status(200).json({
      success: true,
      message: 'Account successfully verified',
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('OTP Verification Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if verified
    if (!user.isVerified) {
      // Re-trigger OTP
      const otp = generateOTP();
      user.otpCode = otp;
      user.otpExpiresAt = otpExpiry();
      await user.save();
      await sendVerificationEmail(email, otp);

      return res.status(403).json({
        success: false,
        message: 'Email verification required. A new code has been sent.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user has already been populated by auth protect middleware
    return res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get Me Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send a fresh signup verification code
// @route   POST /api/auth/resend-otp
// @access  Public (rate limited)
const resendOtp = async (req, res) => {
  // Deliberately uniform: the response must not reveal whether an address is
  // registered, or whether it is already verified.
  const generic = {
    success: true,
    message: 'If that address needs verifying, a new code is on its way.'
  };

  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || user.isVerified) {
      return res.status(200).json(generic);
    }

    const otp = generateOTP();
    user.otpCode = otp;
    user.otpExpiresAt = otpExpiry();
    await user.save();

    await sendVerificationEmail(user.email, otp);

    return res.status(200).json(generic);
  } catch (error) {
    console.error('Resend OTP Error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not resend the code. Please try again.' });
  }
};

// @desc    Start a password reset — emails a single-use code
// @route   POST /api/auth/forgot-password
// @access  Public (rate limited)
const forgotPassword = async (req, res) => {
  const generic = {
    success: true,
    message: 'If an account exists for that address, a reset code has been sent.'
  };

  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Suspended accounts do not get a self-service route back in.
    if (!user || !user.isActive) {
      return res.status(200).json(generic);
    }

    const otp = generateOTP();
    user.resetOtpCode = otp;
    user.resetOtpExpiresAt = otpExpiry();
    await user.save();

    await sendPasswordResetEmail(user.email, user.name, otp);

    return res.status(200).json(generic);
  } catch (error) {
    console.error('Forgot Password Error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not start the reset. Please try again.' });
  }
};

// @desc    Complete a password reset with the emailed code
// @route   POST /api/auth/reset-password
// @access  Public (rate limited)
const resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email?.trim() || !code?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email, code and a new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // One message for every failure mode, so this cannot be used to probe which
    // addresses exist or which codes are close.
    const invalid = { success: false, message: 'That reset code is invalid or has expired.' };

    if (!user || !user.isActive) return res.status(400).json(invalid);
    if (!user.resetOtpCode || !user.resetOtpExpiresAt) return res.status(400).json(invalid);
    if (user.resetOtpExpiresAt < new Date()) return res.status(400).json(invalid);
    if (user.resetOtpCode !== code.trim()) return res.status(400).json(invalid);

    // Assigning triggers the pre-save hook that hashes it.
    user.password = password;
    user.resetOtpCode = undefined;
    user.resetOtpExpiresAt = undefined;

    // Receiving the code proves they own the address, which is exactly what
    // signup verification proves. Someone who never finished verifying should
    // not be stranded behind a second gate after resetting.
    if (!user.isVerified) {
      user.isVerified = true;
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
    }

    user.lastLoginAt = new Date();
    await user.save();

    await ensureRoleRecords(user);

    return res.status(200).json({
      success: true,
      message: 'Password updated. You are signed in.',
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Reset Password Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  getMe,
  resendOtp,
  forgotPassword,
  resetPassword
};
