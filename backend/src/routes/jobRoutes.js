const express = require('express');
const router = express.Router();
const {
  getPublishedJobs,
  getJobById,
  createJob,
  updateJob,
  getMyCompanyJobs,
  getCandidatesRankedForJob,
  generateDescription
} = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { ROLES } = require('../../../shared/constants');

// Public routes
router.get('/', getPublishedJobs);
router.get('/:id', getJobById);

// Protected routes (Employer only)
router.use(protect);
router.use(roleCheck(ROLES.EMPLOYER));

router.get('/company/mine', getMyCompanyJobs);
router.post('/', createJob);
router.post('/generate-description', generateDescription);
router.put('/:id', updateJob);
router.get('/:id/candidates', getCandidatesRankedForJob);

module.exports = router;
