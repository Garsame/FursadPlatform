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
    .catch((err) => {
      // Say what this means for the person running the app, not just that a
      // check failed. Nothing is broken: verification and reset codes fall
      // back to the console, so every flow can still be completed.
      console.warn(`\n[EMAIL] SMTP login failed: ${err.message}`);
      if (/BadCredentials|535/i.test(err.message)) {
        console.warn('[EMAIL] Gmail rejected the username or app password. Generate a new');
        console.warn('[EMAIL] app password at https://myaccount.google.com/apppasswords and');
        console.warn('[EMAIL] set SMTP_PASSWORD in backend/.env (spaces are stripped for you).');
      }
      console.warn('[EMAIL] Until then, codes are printed here as [MAIL FALLBACK] — sign-up,');
      console.warn('[EMAIL] verification and password reset all still work.\n');
    });
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
        <span style="color:#00C27C;font-size:22px;font-weight:800;letter-spacing:-.5px">JobAssistAI</span>
        <span style="color:rgba(244,248,246,.72);font-size:12px;margin-left:10px">Powering Opportunity Across Somalia</span>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 14px;font-size:20px;color:#0F1F1A">${heading}</h1>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #E7E4DB;color:#6B7A73;font-size:12px">
        You are receiving this because you have a JobAssistAI account.
      </div>
    </div>
  </div>`;

const sendVerificationEmail = async (email, otp) =>
  deliver({
    to: email,
    subject: 'Your JobAssistAI verification code',
    text: `Ku soo dhawaada JobAssistAI! Welcome to JobAssistAI.\n\nYour verification code is: ${otp}\n\nIt expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    html: shell('Verify your email', `
      <p style="margin:0 0 18px;color:#4A5A52;line-height:1.6">
        Ku soo dhawaada JobAssistAI! Enter this code to finish creating your account.
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
    subject: 'Reset your JobAssistAI password',
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
    text: `Hello ${candidateName},\n\nYour application for "${jobTitle}" is now: ${status.toUpperCase()}.\n\n${customMessage}\n\nThe JobAssistAI Team`,
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

/**
 * Tells an employer what an administrator decided about their vacancy.
 * A moderation decision that arrives silently is indistinguishable from the
 * platform being broken, so every one of these is announced.
 */
const JOB_DECISIONS = {
  published: {
    subject: (t) => `Your job is live — ${t}`,
    heading: 'Your job has been approved',
    lead: (t) => `Your vacancy <strong style="color:#0F1F1A">${t}</strong> has been reviewed and approved. It is now visible to candidates, and matching has started.`,
    badge: { text: 'Published', bg: 'rgba(0,194,124,.12)', fg: '#0B5C43', br: 'rgba(0,194,124,.3)' },
  },
  pending_review: {
    subject: (t) => `Your job has been withdrawn for review — ${t}`,
    heading: 'Your job is being reviewed again',
    lead: (t) => `Your vacancy <strong style="color:#0F1F1A">${t}</strong> has been taken off the public site and returned to review. It will not appear to candidates until it is approved again.`,
    badge: { text: 'Pending review', bg: 'rgba(224,163,64,.16)', fg: '#8A5A0B', br: 'rgba(224,163,64,.35)' },
  },
  flagged: {
    subject: (t) => `Your job was not approved — ${t}`,
    heading: 'Your job was not approved',
    lead: (t) => `Your vacancy <strong style="color:#0F1F1A">${t}</strong> was reviewed and has not been approved for publication. You can edit it and submit it again.`,
    badge: { text: 'Not approved', bg: 'rgba(201,54,54,.10)', fg: '#C93636', br: 'rgba(201,54,54,.25)' },
  },
  closed: {
    subject: (t) => `Your job has been closed — ${t}`,
    heading: 'Your job has been closed',
    lead: (t) => `Your vacancy <strong style="color:#0F1F1A">${t}</strong> has been closed and is no longer accepting applications. Applications already received are kept.`,
    badge: { text: 'Closed', bg: '#F1F0EA', fg: '#4A5A52', br: '#CFCABC' },
  },
};

const sendJobDecisionEmail = async (email, employerName, jobTitle, decision, note = '') => {
  const d = JOB_DECISIONS[decision];
  if (!d) return { sent: false, error: `unknown decision ${decision}` };

  const plainNote = note ? `\n\nNote from the reviewer: ${note}` : '';

  return deliver({
    to: email,
    subject: d.subject(jobTitle),
    text: `Hello ${employerName},\n\n${d.heading}. ${jobTitle}.${plainNote}\n\nThe JobAssistAI Team`,
    html: shell(d.heading, `
      <p style="margin:0 0 14px;color:#4A5A52;line-height:1.6">Hello ${employerName},</p>
      <p style="margin:0 0 16px;color:#4A5A52;line-height:1.6">${d.lead(jobTitle)}</p>
      <p style="margin:0 0 18px">
        <span style="display:inline-block;background:${d.badge.bg};color:${d.badge.fg};
          border:1px solid ${d.badge.br};border-radius:999px;padding:3px 12px;font-size:13px;
          font-weight:700">${d.badge.text}</span>
      </p>
      ${note ? `<div style="background:#FAF9F6;border:1px solid #E7E4DB;border-radius:10px;padding:14px;
        color:#4A5A52;line-height:1.6"><strong style="color:#0F1F1A;font-size:13px">Note from the reviewer</strong>
        <p style="margin:6px 0 0;white-space:pre-line">${note}</p></div>` : ''}`)
  });
};

/** Contact-form messages go to the platform inbox. */
const sendContactMessage = async ({ name, email, subject, message }) =>
  deliver({
    to: process.env.MANAGEMENT_EMAIL || EMAIL_FROM,
    subject: `[JobAssistAI contact] ${subject || 'New enquiry'}`,
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
  sendJobDecisionEmail,
  sendInterviewPrepEmail,
  sendStatusUpdateEmail,
  sendContactMessage,
  isLive
};
