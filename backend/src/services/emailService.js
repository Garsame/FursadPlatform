/**
 * Email delivery. Uses SMTP when configured; otherwise falls back to logging the
 * message to the console so local development still works without credentials.
 */
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 587 uses STARTTLS, which nodemailer negotiates
    auth: {
      user: SMTP_USER,
      // Gmail app passwords are shown in groups of four; the spaces are display
      // only and must be stripped or authentication fails.
      pass: SMTP_PASSWORD.replace(/\s+/g, '')
    }
  });

  transporter.verify()
    .then(() => console.log(`SMTP ready — sending as ${EMAIL_FROM}`))
    .catch((err) => console.error('SMTP verification failed:', err.message));
} else {
  console.log('SMTP not configured. Emails will be logged to the console.');
}

const isLive = () => !!transporter;

/** Sends via SMTP, or logs. Never throws — email must not break a user flow. */
const deliver = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.log('\n==================================================');
    console.log(`[MAIL] TO: ${to}`);
    console.log(`[MAIL] SUBJECT: ${subject}`);
    console.log(text);
    console.log('==================================================\n');
    return { sent: false, logged: true };
  }

  try {
    const info = await transporter.sendMail({ from: EMAIL_FROM, to, subject, text, html });
    console.log(`[MAIL] sent "${subject}" to ${to} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[MAIL] FAILED to send "${subject}" to ${to}:`, error.message);
    // Fall back to the console so a developer can still complete the flow.
    console.log(`[MAIL FALLBACK] ${subject}\n${text}`);
    return { sent: false, error: error.message };
  }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ------------------------------------------------------------------ */

const shell = (heading, body) => `
  <div style="margin:0;padding:24px;background:#FAF9F6;font-family:Inter,Segoe UI,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E7E4DB;border-radius:14px;overflow:hidden">
      <div style="background:#0B5C43;padding:20px 28px">
        <span style="color:#00C27C;font-size:22px;font-weight:800;letter-spacing:-.5px">Fursad</span>
        <span style="color:rgba(244,248,246,.72);font-size:12px;margin-left:10px">Powering Opportunity Across East Africa</span>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 14px;font-size:20px;color:#0F1F1A">${heading}</h1>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #E7E4DB;color:#6B7A73;font-size:12px">
        You are receiving this because you have a Fursad account.
      </div>
    </div>
  </div>`;

const sendVerificationEmail = async (email, otp) =>
  deliver({
    to: email,
    subject: 'Your Fursad verification code',
    text: `Ku soo dhawaada Fursad! Welcome to Fursad.\n\nYour verification code is: ${otp}\n\nIt expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    html: shell('Verify your email', `
      <p style="margin:0 0 18px;color:#4A5A52;line-height:1.6">
        Ku soo dhawaada Fursad! Enter this code to finish creating your account.
      </p>
      <div style="text-align:center;margin:22px 0">
        <span style="display:inline-block;background:#00C27C;color:#06231A;font-size:30px;font-weight:800;
          letter-spacing:8px;padding:14px 26px;border-radius:12px">${otp}</span>
      </div>
      <p style="margin:0;color:#6B7A73;font-size:13px">
        This code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes. If you did not sign up, ignore this email.
      </p>`)
  });

const sendPasswordResetEmail = async (email, name, otp) =>
  deliver({
    to: email,
    subject: 'Reset your Fursad password',
    text: `Hello ${name},\n\nYour password reset code is: ${otp}\n\nIt expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.\n\nIf you did not ask to reset your password, ignore this email — your password has not changed.`,
    html: shell('Reset your password', `
      <p style="margin:0 0 18px;color:#4A5A52;line-height:1.6">
        Hello ${name}, enter this code to choose a new password.
      </p>
      <div style="text-align:center;margin:22px 0">
        <span style="display:inline-block;background:#00C27C;color:#06231A;font-size:30px;font-weight:800;
          letter-spacing:8px;padding:14px 26px;border-radius:12px">${otp}</span>
      </div>
      <p style="margin:0;color:#6B7A73;font-size:13px">
        This code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes. If you did not ask to reset your
        password, ignore this email — your password has not changed.
      </p>`)
  });

const sendStatusUpdateEmail = async (email, candidateName, jobTitle, status, customMessage) =>
  deliver({
    to: email,
    subject: `Application update — ${jobTitle}`,
    text: `Hello ${candidateName},\n\nYour application for "${jobTitle}" is now: ${status.toUpperCase()}.\n\n${customMessage}\n\nThe Fursad Team`,
    html: shell(`Your application is now ${status}`, `
      <p style="margin:0 0 14px;color:#4A5A52;line-height:1.6">Hello ${candidateName},</p>
      <p style="margin:0 0 14px;color:#4A5A52;line-height:1.6">
        Your application for <strong style="color:#0F1F1A">${jobTitle}</strong> has moved to
        <span style="display:inline-block;background:rgba(0,194,124,.12);color:#0B5C43;border:1px solid rgba(0,194,124,.3);
          border-radius:999px;padding:2px 10px;font-size:13px;font-weight:700">${status}</span>
      </p>
      <p style="margin:0;color:#4A5A52;line-height:1.6">${customMessage}</p>`)
  });

const sendInterviewPrepEmail = async (email, candidateName, jobTitle, questions = [], tip = '') =>
  deliver({
    to: email,
    subject: `Interview preparation — ${jobTitle}`,
    text: `Hello ${candidateName},\n\nQuestions to prepare for "${jobTitle}":\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nTip: ${tip}`,
    html: shell(`Preparing for your ${jobTitle} interview`, `
      <p style="margin:0 0 14px;color:#4A5A52;line-height:1.6">Hello ${candidateName},</p>
      <p style="margin:0 0 14px;color:#4A5A52;line-height:1.6">Questions worth preparing for:</p>
      <ol style="margin:0 0 18px;padding-left:20px;color:#4A5A52;line-height:1.9">
        ${questions.map((q) => `<li>${q}</li>`).join('')}
      </ol>
      <div style="background:rgba(224,163,64,.16);border:1px solid rgba(224,163,64,.35);border-radius:10px;padding:14px">
        <strong style="color:#8A5A0B;font-size:13px">Tip</strong>
        <p style="margin:6px 0 0;color:#4A5A52;line-height:1.6">${tip}</p>
      </div>`)
  });

/** Contact-form messages go to the platform inbox. */
const sendContactMessage = async ({ name, email, subject, message }) =>
  deliver({
    to: process.env.MANAGEMENT_EMAIL || EMAIL_FROM,
    subject: `[Fursad contact] ${subject || 'New enquiry'}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: shell('New contact enquiry', `
      <p style="margin:0 0 8px;color:#4A5A52"><strong>From:</strong> ${name} &lt;${email}&gt;</p>
      <p style="margin:0 0 14px;color:#4A5A52"><strong>Subject:</strong> ${subject || '—'}</p>
      <div style="background:#FAF9F6;border:1px solid #E7E4DB;border-radius:10px;padding:14px;
        color:#4A5A52;line-height:1.6;white-space:pre-line">${message}</div>`)
  });

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInterviewPrepEmail,
  sendStatusUpdateEmail,
  sendContactMessage,
  isLive
};
