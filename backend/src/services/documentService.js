const fs = require('fs');
const path = require('path');

/**
 * Pulls plain text out of an uploaded CV so the AI parser has something to read.
 * PDF and DOCX are the two formats employers actually receive; anything else is
 * stored and downloadable but not auto-parsed.
 */
/**
 * Throws when extraction genuinely fails, and returns '' only when the file
 * really holds no text.
 *
 * It used to swallow every error and return '', which turned a broken library
 * call into the message "no text could be read from this file" — blaming the
 * candidate's CV for a bug in our code. pdf-parse v2 stopped being a callable
 * function, so `pdfParse(buffer)` threw on every single PDF and every PDF CV
 * uploaded to JobAssistAI was silently marked unreadable. Failures must be loud.
 */
const extractText = async (absolutePath, mimeType) => {
  if (mimeType === 'application/pdf') {
    // v2 exports a class, not a function. Required lazily because it pulls in
    // a large PDF engine that most requests never need.
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(absolutePath)) });
    try {
      const result = await parser.getText();
      return (result.text || '').trim();
    } finally {
      // Releases the worker; without it the process keeps handles open.
      await parser.destroy().catch(() => {});
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: absolutePath });
    return (result.value || '').trim();
  }

  if (mimeType === 'text/plain') {
    return fs.readFileSync(absolutePath, 'utf8').trim();
  }

  return '';
};

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

const ensureUploadDirs = () => {
  for (const dir of ['cvs', 'avatars']) {
    const full = path.join(UPLOAD_ROOT, dir);
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true });
    }
  }
};

const removeFile = (absolutePath) => {
  try {
    if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
  } catch (error) {
    console.error('Failed to remove file:', error.message);
  }
};

module.exports = { extractText, ensureUploadDirs, removeFile, UPLOAD_ROOT };
