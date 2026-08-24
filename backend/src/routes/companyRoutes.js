const express = require('express');
const router = express.Router();
const {
  getMyCompany, updateMyCompany, uploadLogo, generateCompanyCopy, getMyCompanyAnalytics,
  getPublicCompanies, getPublicCompany
} = require('../controllers/companyController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { uploadAvatar } = require('../middleware/upload');
const { ROLES } = require('../../../shared/constants');

// Public employer profiles — candidates read these before applying.
router.get('/', getPublicCompanies);

// Employer-managed routes must be declared before '/:id' so "mine" is not
// swallowed as an id.
router.get('/mine', protect, roleCheck(ROLES.EMPLOYER), getMyCompany);
router.get('/mine/analytics', protect, roleCheck(ROLES.EMPLOYER), getMyCompanyAnalytics);
router.put('/mine', protect, roleCheck(ROLES.EMPLOYER), updateMyCompany);
router.post('/mine/logo', protect, roleCheck(ROLES.EMPLOYER), uploadAvatar.single('image'), uploadLogo);
router.post('/mine/generate', protect, roleCheck(ROLES.EMPLOYER), generateCompanyCopy);

router.get('/:id', getPublicCompany);

module.exports = router;
