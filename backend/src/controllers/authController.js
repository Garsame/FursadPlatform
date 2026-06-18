const User = require('../models/User');
const JobseekerProfile = require('../models/JobseekerProfile');
const Company = require('../models/Company');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendVerificationEmail } = require('../services/emailService');
const { ROLES } = require('../../../shared/constants');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, adminSecret } = req.body;

    // Validate role
    const validRoles = [ROLES.JOBSEEKER, ROLES.EMPLOYER, ROLES.ADMIN];
    const userRole = role || ROLES.JOBSEEKER;
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check if role is admin and verify secret key
    if (userRole === ROLES.ADMIN) {
      const serverAdminSecret = process.env.ADMIN_SECRET || 'fursad_admin_portal_secret_token_98765';
      if (adminSecret !== serverAdminSecret) {
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
    const otpExpires = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

    const isVerified = userRole === ROLES.ADMIN; // Admins are auto-verified

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: userRole,
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

    // Setup profiles based on role
    if (user.role === ROLES.JOBSEEKER) {
      await JobseekerProfile.create({
        user: user._id,
        skills: [],
        location: { city: '', country: '' }
      });
    } else if (user.role === ROLES.EMPLOYER) {
      await Company.create({
        name: `${user.name}'s Company`,
        owner: user._id,
        recruiters: [user._id]
      });
    }

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
      user.otpExpiresAt = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);
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

module.exports = {
  register,
  verifyOtp,
  login,
  getMe
};
