// Password hashing. Pure crypto: no database, no HTTP.
// Passwords are never stored: each user gets a random salt, and what is saved is scrypt(password, salt).
// It is a one-way hash on purpose (a stored password that could be decrypted could also be stolen).
const crypto = require('crypto');
const { promisify } = require('util');

// scrypt is deliberately slow and memory-hungry, which makes guessing passwords expensive
const scrypt = promisify(crypto.scrypt);
const newSalt = () => crypto.randomBytes(16).toString('hex');
const hashPassword = async (password, salt) => (await scrypt(String(password), salt, 64)).toString('hex');

// stand-in used when the account does not exist, so a failed login takes as long as a real one
const DUMMY = { salt: newSalt(), passwordHash: '00'.repeat(64) };

// New credentials for a password: a fresh random salt and the hash made with it (equal passwords get different hashes)
exports.makeCredentials = async (password) => {
  const salt = newSalt();
  return { salt, passwordHash: await hashPassword(password, salt) };
};

// Does the password match the user's stored { salt, passwordHash }? Pass null for an unknown user:
// the same work is still done, and the answer is false
exports.verifyPassword = async (password, user) => {
  const { salt, passwordHash } = user || DUMMY;
  const attempt = Buffer.from(await hashPassword(password, salt), 'hex');
  const matches = crypto.timingSafeEqual(attempt, Buffer.from(passwordHash, 'hex'));
  return Boolean(user) && matches;
};
