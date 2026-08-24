const express = require('express');
const router = express.Router();
const {
  getMyProfile, updateMyProfile, parseResumeText, getRecommendations, uploadAvatar,
  getInterviewState, submitInterviewAnswer, regenerateSpecification
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { uploadAvatar: uploadAvatarFile } = require('../middleware/upload');
const { ROLES } = require('../../../shared/constants');

router.use(protect);
router.use(roleCheck(ROLES.JOBSEEKER));

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.post('/avatar', uploadAvatarFile.single('image'), uploadAvatar);
router.post('/parse-resume', parseResumeText);
router.get('/recommendations', getRecommendations);

// AI profile builder
router.get('/interview', getInterviewState);
router.post('/interview', submitInterviewAnswer);
router.post('/specification', regenerateSpecification);

module.exports = router;
