const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const jobRoutes = require('./jobRoutes');
const applicationRoutes = require('./applicationRoutes');
const adminRoutes = require('./adminRoutes');
const cvRoutes = require('./cvRoutes');
const contactRoutes = require('./contactRoutes');
const companyRoutes = require('./companyRoutes');
const notificationRoutes = require('./notificationRoutes');
const assistantRoutes = require('./assistantRoutes');

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/admin', adminRoutes);
router.use('/cvs', cvRoutes);
router.use('/contact', contactRoutes);
router.use('/companies', companyRoutes);
router.use('/notifications', notificationRoutes);
router.use('/assistant', assistantRoutes);

module.exports = router;
