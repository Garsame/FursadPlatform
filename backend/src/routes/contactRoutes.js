const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const ContactMessage = require('../models/ContactMessage');
const User = require('../models/User');
const { emailLimiter } = require('../middleware/rateLimit');

// @desc    Public contact form
// @route   POST /api/contact
// @access  Public (rate limited — it sends mail on an address the caller names)
router.post('/', emailLimiter, async (req, res) => {
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

    // Stored first, then emailed. A message that only exists in an inbox is
    // lost the moment delivery fails, and nobody can see what was answered.
    const senderUser = await User.findOne({ email: email.trim().toLowerCase() }).select('_id');

    const record = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: (subject || '').trim(),
      message: message.trim(),
      senderUser: senderUser?._id || null
    });

    const delivery = await emailService.sendContactMessage({
      name: record.name, email: record.email, subject: record.subject, message: record.message
    });

    if (delivery?.sent) {
      record.emailDelivered = true;
      await record.save();
    }

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
