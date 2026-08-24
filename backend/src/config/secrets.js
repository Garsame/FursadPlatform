/**
 * Secrets are read once, at boot, and validated here.
 *
 * Previously JWT_SECRET and ADMIN_SECRET each had a literal fallback inlined at
 * four call sites, and those exact fallbacks were committed in .env.example.
 * Anyone holding the repository could therefore sign a token for any user id,
 * or self-register as an administrator. A fallback that is public is not a
 * fallback — it is a published key, so there is no longer one. The server
 * refuses to start rather than run on a value an attacker already knows.
 */

// The values that shipped in .env.example. Permanently burned.
const COMPROMISED = new Set([
  'fursad_default_secure_secret_key_12345',
  'fursad_admin_portal_secret_token_98765'
]);

const MIN_LENGTH = 32;

const fail = (name, reason) => {
  console.error(
    `\n[FATAL] ${name} ${reason}.\n` +
    `        The server will not start without a private ${name}.\n` +
    `        Generate one with:\n` +
    `          node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"\n` +
    `        then set ${name}=<value> in backend/.env\n`
  );
  process.exit(1);
};

const requireSecret = (name) => {
  const raw = (process.env[name] || '').trim();

  if (!raw) fail(name, 'is not set');
  if (COMPROMISED.has(raw)) fail(name, 'is still the example value published in .env.example');
  if (raw.length < MIN_LENGTH) fail(name, `is only ${raw.length} characters (minimum ${MIN_LENGTH})`);

  return raw;
};

module.exports = {
  JWT_SECRET: requireSecret('JWT_SECRET'),
  ADMIN_SECRET: requireSecret('ADMIN_SECRET')
};
