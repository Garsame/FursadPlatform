const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// @desc    Public contact form
// @route   POST /api/contact
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ success: false, message: 'That message is too long' });
    }

    await emailService.sendContactMessage({
      name: name.trim(), email: email.trim(), subject, message: message.trim()
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you for contacting us. Our team will respond shortly.'
    });
  } catch (error) {
    console.error('Contact Form Error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not send your message.' });
  }
});

module.exports = router;
