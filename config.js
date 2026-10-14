// Application settings, read once from the environment (a .env file in the project root is loaded first).
// Every other module imports from here instead of reading process.env, so all configuration is in one place.
try { process.loadEnvFile(); } catch { /* no .env file: rely on real environment variables */ }

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;
const days = Number(process.env.SESSION_DAYS);

// a setting the app cannot run without
const required = (name) => {
  if (!process.env[name]) throw new Error(`${name} is not set (see .env.example)`);
  return process.env[name];
};

const usernamePepper = required('USERNAME_PEPPER');

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/node-complete',
  // Signs the session cookie. It must be the same on every start: a random one would make every saved cookie
  // invalid after a restart and end everyone's login. Unless SESSION_SECRET is set, it is derived from the pepper.
  sessionSecret: process.env.SESSION_SECRET
    || crypto.createHmac('sha256', usernamePepper).update('simplecom session secret').digest('hex'),
  // how long "keep me signed in" lasts, counted from the last visit (SESSION_DAYS, default 30)
  sessionMs: (days > 0 ? days : 30) * DAY_MS,
  // send the session cookie over HTTPS only. Set COOKIE_SECURE=true once the site is served over HTTPS
  secureCookies: process.env.COOKIE_SECURE === 'true',
  // trust one reverse proxy's X-Forwarded-* headers (TRUST_PROXY=true), needed for secure cookies behind a TLS-terminating proxy
  trustProxy: process.env.TRUST_PROXY === 'true',
  // secret key for the username HMAC. Without it no account can be looked up, so refuse to start
  usernamePepper,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};
