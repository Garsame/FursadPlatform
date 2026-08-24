const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { ensureUploadDirs, UPLOAD_ROOT } = require('../services/documentService');

ensureUploadDirs();

const CV_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const makeStorage = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, subdir)),
    filename: (req, file, cb) => {
      // Random name on disk: the original name is kept in the DB, and files must
      // not be guessable since CVs are personal data.
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    }
  });

const uploadCv = multer({
  storage: makeStorage('cvs'),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (!CV_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only PDF, Word (.doc/.docx) or plain text files are accepted'));
    }
    cb(null, true);
  }
});

const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG or WebP images are accepted'));
    }
    cb(null, true);
  }
});

module.exports = { uploadCv, uploadAvatar };
