const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/secrets');
const assistantService = require('../services/assistantService');
const aiService = require('../services/aiService');
const rateLimit = require('express-rate-limit');

/**
 * Authentication is optional here, not absent.
 *
 * Visitors must be able to ask questions, so there is no `protect`. But when a
 * valid token is present the answer can be personalised from that person's own
 * records — so the token is read, and a bad one simply means "anonymous"
 * rather than an error. An employer or administrator is treated as anonymous:
 * this assistant is scoped to jobseekers by design.
 */
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user?.isActive && user.role === 'jobseeker') req.assistantUser = user;
    } catch {
      // An unreadable token is not an error here — it just means anonymous.
    }
  }
  next();
};

// Generation costs money and time, so it is metered per network either way.
const assistantLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_ASSISTANT || 25),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'You have asked a lot of questions in a short time. Please wait a few minutes.'
  })
});

// @desc    Ask the Fursad assistant
// @route   POST /api/assistant
// @access  Public, personalised when a jobseeker token is present
router.post('/', assistantLimiter, optionalAuth, async (req, res) => {
  try {
    const result = await assistantService.ask(req.body?.question, req.assistantUser, aiService);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Assistant route error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not answer that right now.' });
  }
});

module.exports = router;
