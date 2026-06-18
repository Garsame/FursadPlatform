const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile, parseResumeText, getRecommendations } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { ROLES } = require('../../../shared/constants');

router.use(protect);
router.use(roleCheck(ROLES.JOBSEEKER));

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.post('/parse-resume', parseResumeText);
router.get('/recommendations', getRecommendations);

module.exports = router;
