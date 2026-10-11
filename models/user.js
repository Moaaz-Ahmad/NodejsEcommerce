const crypto = require('crypto');
const { promisify } = require('util');
const { User } = require('./db');

const PEPPER = process.env.USERNAME_PEPPER;
if (!PEPPER) throw new Error('USERNAME_PEPPER is not set (see .env.example)');

const scrypt = promisify(crypto.scrypt);
const hash = async (password, salt) => (await scrypt(String(password), salt, 64)).toString('hex');
const newSalt = () => crypto.randomBytes(16).toString('hex');
// keyed hash of the normalized username: the lookup key, so login is case-insensitive
const usernameHash = (username) =>
  crypto.createHmac('sha256', PEPPER).update(String(username || '').trim().toLowerCase()).digest('hex');

const DUMMY_SALT = newSalt();

// returns { username, role } or null
exports.authenticate = async (username, password) => {
  const user = await User.findOne({ where: { usernameHash: usernameHash(username) } });
  // hash even when the user doesn't exist, so response time doesn't reveal which usernames are real
  const attempt = Buffer.from(await hash(password, user ? user.salt : DUMMY_SALT), 'hex');
  if (!user || !crypto.timingSafeEqual(attempt, Buffer.from(user.passwordHash, 'hex'))) return null;
  return { username: user.username, role: user.role }; // display spelling, so cart/orders keys stay consistent
};

exports.create = async (username, password, role = 'user') => {
  const salt = newSalt();
  return User.create({ username, usernameHash: usernameHash(username), role, salt, passwordHash: await hash(password, salt) });
};

// new random salt on every change; caller must have verified the current password
exports.setPassword = async (username, password) => {
  const salt = newSalt();
  await User.update({ salt, passwordHash: await hash(password, salt) }, { where: { usernameHash: usernameHash(username) } });
};

// first run only: creates the two built-in profiles. Override default passwords with ADMIN_PASSWORD / USER_PASSWORD.
exports.seed = async () => {
  if (await User.count()) return;
  await exports.create('admin', process.env.ADMIN_PASSWORD || 'admin123', 'admin');
  await exports.create('user', process.env.USER_PASSWORD || 'user123', 'user');
};
