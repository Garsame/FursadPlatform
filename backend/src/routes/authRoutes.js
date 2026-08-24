const express = require('express');
const router = express.Router();
const {
  register, verifyOtp, login, getMe, resendOtp, forgotPassword, resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { credentialLimiter, emailLimiter, registerLimiter } = require('../middleware/rateLimit');

router.post('/register', registerLimiter, register);
router.post('/verify-otp', credentialLimiter, verifyOtp);
router.post('/resend-otp', emailLimiter, resendOtp);
router.post('/login', credentialLimiter, login);
router.post('/forgot-password', emailLimiter, forgotPassword);
router.post('/reset-password', credentialLimiter, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
