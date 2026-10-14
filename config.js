// Application settings, read once from the environment (a .env file in the project root is loaded first).
// Every other module imports from here instead of reading process.env, so all configuration is in one place.
try { process.loadEnvFile(); } catch { /* no .env file: rely on real environment variables */ }

const crypto = require('crypto');

// a setting the app cannot run without
const required = (name) => {
  if (!process.env[name]) throw new Error(`${name} is not set (see .env.example)`);
  return process.env[name];
};

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/node-complete',
  // a random secret per start means logins reset on restart; set SESSION_SECRET to keep them
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  // secret key for the username HMAC. Without it no account can be looked up, so refuse to start
  usernamePepper: required('USERNAME_PEPPER'),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};
