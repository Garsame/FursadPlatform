const express = require('express');
const router = express.Router();
const {
  getMyCvs, uploadCv, updateCv, setPrimaryCv, deleteCv, downloadCv, getCandidateCvs
} = require('../controllers/cvController');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { uploadCv: uploadCvFile } = require('../middleware/upload');
const { ROLES } = require('../../../shared/constants');

router.use(protect);

// Shared: download + candidate lookup are authorised per-record inside the
// controller, because employers and admins legitimately reach them too.
router.get('/:id/download', downloadCv);
router.get('/candidate/:userId', getCandidateCvs);

// Jobseeker-only management of their own CVs.
router.get('/', roleCheck(ROLES.JOBSEEKER), getMyCvs);
router.post('/', roleCheck(ROLES.JOBSEEKER), uploadCvFile.single('file'), uploadCv);
router.put('/:id', roleCheck(ROLES.JOBSEEKER), updateCv);
router.put('/:id/primary', roleCheck(ROLES.JOBSEEKER), setPrimaryCv);
router.delete('/:id', roleCheck(ROLES.JOBSEEKER), deleteCv);

module.exports = router;
