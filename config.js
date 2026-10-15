// Application settings, read once from the environment (a .env file in the project root is loaded first).
// Every other module imports from here instead of reading process.env, so all configuration is in one place.
try { process.loadEnvFile(); } catch { /* no .env file: rely on real environment variables */ }

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;
const days = Number(process.env.SESSION_DAYS);

// The secret that signs the session cookie and (through a key derived from it) encrypts the sessions kept in the
// database. It must be the same on every start: a random one would make every saved cookie and stored session
// unusable after a restart and end everyone's login. USERNAME_PEPPER is what older versions called this secret;
// it is still accepted so existing setups keep working.
const sessionSecret = process.env.SESSION_SECRET
  || (process.env.USERNAME_PEPPER
    && crypto.createHmac('sha256', process.env.USERNAME_PEPPER).update('simplecom session secret').digest('hex'));
if (!sessionSecret) throw new Error('SESSION_SECRET is not set (see .env.example)');

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/node-complete',
  sessionSecret,
  // how long "keep me signed in" lasts, counted from the last visit (SESSION_DAYS, default 30)
  sessionMs: (days > 0 ? days : 30) * DAY_MS,
  // send the session cookie over HTTPS only. Set COOKIE_SECURE=true once the site is served over HTTPS
  secureCookies: process.env.COOKIE_SECURE === 'true',
  // trust one reverse proxy's X-Forwarded-* headers (TRUST_PROXY=true), needed for secure cookies behind a TLS-terminating proxy
  trustProxy: process.env.TRUST_PROXY === 'true',
  // limits on login, registration and similar requests are on unless RATE_LIMIT=off (for load tests only)
  rateLimitEnabled: process.env.RATE_LIMIT !== 'off',
  // the email address of the admin account (compared in lower case)
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};
