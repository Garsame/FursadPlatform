const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  getPendingJobs,
  reviewJob,
  getPlatformAnalytics,
  getAuditLogs
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { ROLES } = require('../../../shared/constants');

router.use(protect);
router.use(roleCheck(ROLES.ADMIN));

router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/jobs/pending', getPendingJobs);
router.put('/jobs/:id/review', reviewJob);
router.get('/analytics', getPlatformAnalytics);
router.get('/audit-log', getAuditLogs);

module.exports = router;
