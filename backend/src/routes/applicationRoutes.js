const express = require('express');
const router = express.Router();
const {
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  sendInterviewPrep
} = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { ROLES } = require('../../../shared/constants');

router.use(protect);

// Jobseeker endpoints
router.post('/', roleCheck(ROLES.JOBSEEKER), applyToJob);
router.get('/mine', roleCheck(ROLES.JOBSEEKER), getMyApplications);

// Employer endpoints
router.get('/job/:id', roleCheck(ROLES.EMPLOYER), getJobApplications);
router.put('/:id/status', roleCheck(ROLES.EMPLOYER), updateApplicationStatus);
router.post('/:id/interview-prep', roleCheck(ROLES.EMPLOYER), sendInterviewPrep);

module.exports = router;
