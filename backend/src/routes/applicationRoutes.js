const express = require('express');
const router = express.Router();
const {
  applyToJob,
  getMyApplications,
  getMyThreads,
  getEmployerThreads,
  getJobApplications,
  updateApplicationStatus,
  sendInterviewPrep,
  getAiShortlist
} = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { ROLES } = require('../../../shared/constants');

router.use(protect);

// Jobseeker endpoints
router.post('/', roleCheck(ROLES.JOBSEEKER), applyToJob);
router.get('/mine', roleCheck(ROLES.JOBSEEKER), getMyApplications);
router.get('/threads', roleCheck(ROLES.JOBSEEKER), getMyThreads);

// Employer endpoints
router.get('/employer/threads', roleCheck(ROLES.EMPLOYER), getEmployerThreads);
router.get('/job/:id', roleCheck(ROLES.EMPLOYER), getJobApplications);
router.get('/job/:id/shortlist', roleCheck(ROLES.EMPLOYER), getAiShortlist);
router.put('/:id/status', roleCheck(ROLES.EMPLOYER), updateApplicationStatus);
router.post('/:id/interview-prep', roleCheck(ROLES.EMPLOYER), sendInterviewPrep);

module.exports = router;
