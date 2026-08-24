const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  console.error('Express Error Handler caught:', err.stack || err.message);

  // Upload problems are user error, not server error — answer 400 with a
  // message the UI can show directly.
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'That file is too large.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.'
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || `Upload failed: ${err.message}`
    });
  }

  // fileFilter rejections arrive as plain Errors with our own wording.
  if (/only .*(accepted|allowed)/i.test(err.message || '')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { errorHandler };
