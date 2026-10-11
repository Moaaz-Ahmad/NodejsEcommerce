const crypto = require('crypto');
const { promisify } = require('util');
const { UniqueConstraintError } = require('sequelize');
const { User } = require('./db');

const PEPPER = process.env.USERNAME_PEPPER;
if (!PEPPER) throw new Error('USERNAME_PEPPER is not set (see .env.example)');

const scrypt = promisify(crypto.scrypt);
const hash = async (password, salt) => (await scrypt(String(password), salt, 64)).toString('hex');
const newSalt = () => crypto.randomBytes(16).toString('hex');
// keyed hash of the normalized username: the lookup key, so login is case-insensitive
const usernameHash = (username) =>
  crypto.createHmac('sha256', PEPPER).update(String(username || '').trim().toLowerCase()).digest('hex');

// No role column: the admin is the one account whose username hash matches ADMIN_USERNAME.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_HASH = usernameHash(ADMIN_USERNAME);
const roleOf = (user) => (user.usernameHash === ADMIN_HASH ? 'admin' : 'user');

const DUMMY_SALT = newSalt();

exports.isReserved = (username) => usernameHash(username) === ADMIN_HASH;

// returns the session user { id, username, role } or null.
// username is only the name typed at login (the database doesn't store it), kept for display.
exports.authenticate = async (username, password) => {
  const user = await User.findOne({ where: { usernameHash: usernameHash(username) } });
  // hash even when the user doesn't exist, so response time doesn't reveal which usernames are real
  const attempt = Buffer.from(await hash(password, user ? user.salt : DUMMY_SALT), 'hex');
  if (!user || !crypto.timingSafeEqual(attempt, Buffer.from(user.passwordHash, 'hex'))) return null;
  return { id: user.id, username: String(username).trim(), role: roleOf(user) };
};

// returns the session user, or null when the username is already taken (case-insensitive)
exports.create = async (username, password) => {
  const salt = newSalt();
  try {
    const user = await User.create({ usernameHash: usernameHash(username), salt, passwordHash: await hash(password, salt) });
    return { id: user.id, username: String(username).trim(), role: roleOf(user) };
  } catch (err) {
    if (err instanceof UniqueConstraintError) return null; // unique index on usernameHash decides, so races are safe
    throw err;
  }
};

// new random salt on every change; caller must have verified the current password
exports.setPassword = async (id, password) => {
  const salt = newSalt();
  await User.update({ salt, passwordHash: await hash(password, salt) }, { where: { id } });
};

// first run only: creates the admin account (everyone else registers). Set ADMIN_PASSWORD to override the default.
exports.seed = async () => {
  if (await User.count()) return;
  await exports.create(ADMIN_USERNAME, process.env.ADMIN_PASSWORD || 'admin123');
};
