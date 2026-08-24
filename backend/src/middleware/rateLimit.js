const rateLimit = require('express-rate-limit');

/**
 * Every unauthenticated endpoint that touches credentials or sends mail is
 * rate limited. Without this, /login is an unmetered password oracle and
 * /forgot-password and /resend-otp are unmetered ways to send mail from the
 * platform's real SMTP account to any address an attacker names.
 *
 * Counting is per IP. Behind a proxy the app must set 'trust proxy' or every
 * client collapses into one bucket — noted here because that is the usual way
 * this protection silently stops working in production.
 */

const message = (text) => ({ success: false, message: text });

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  // Failed attempts are the thing worth limiting. A user who signs in
  // correctly ten times in a row is not the attack.
  skipSuccessfulRequests: true
};

/** Credential guessing: login and reset-password both check a secret. */
const credentialLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: (req, res) =>
    res.status(429).json(message('Too many attempts. Please wait 15 minutes and try again.'))
});

/**
 * Anything that causes an email to be sent to an address the caller names.
 *
 * Four per ten minutes was too tight to live with: signing up, resending a
 * code and then walking through a password reset spends the whole allowance,
 * so an ordinary person — or anyone demonstrating the product — gets locked
 * out of a flow they are using correctly. Eight still makes bulk sending
 * useless to an attacker.
 */
const emailLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_EMAIL || 8),
  skipSuccessfulRequests: false, // here the send IS the cost, success or not
  handler: (req, res) =>
    res.status(429).json(message('Too many requests. Please wait a few minutes before asking for another code.'))
});

/** Account creation. Generous enough for a shared office, tight enough to matter. */
const registerLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 12,
  skipSuccessfulRequests: false,
  handler: (req, res) =>
    res.status(429).json(message('Too many accounts created from this network. Please try again later.'))
});

module.exports = { credentialLimiter, emailLimiter, registerLimiter };
