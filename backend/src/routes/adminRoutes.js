const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  updateUser,
  deleteUser,
  getDeleteImpact,
  getPendingJobs,
  getAllJobs,
  setJobStatus,
  reviewJob,
  getPlatformAnalytics,
  getContactMessages,
  updateContactMessage,
  deleteContactMessage,
  getAuditLogs
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { ROLES } = require('../../../shared/constants');

router.use(protect);
router.use(roleCheck(ROLES.ADMIN));

router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id', updateUser);
router.get('/users/:id/impact', getDeleteImpact);
router.delete('/users/:id', deleteUser);
router.get('/jobs/pending', getPendingJobs);
router.get('/jobs', getAllJobs);
router.put('/jobs/:id/status', setJobStatus);
router.put('/jobs/:id/review', reviewJob);
router.get('/analytics', getPlatformAnalytics);
router.get('/contact', getContactMessages);
router.put('/contact/:id', updateContactMessage);
router.delete('/contact/:id', deleteContactMessage);
router.get('/audit-log', getAuditLogs);

module.exports = router;
