// Account rules: logging in with an email and password, registering, changing a password, who counts as admin,
// and making sure the admin account exists. Password hashing is lib/credentials.js; storage is models/user.js.
const credentials = require('../lib/credentials');
const Users = require('../models/user');
const { normalizeEmail } = require('../lib/validators');
const { adminEmail, adminPassword } = require('../config');

// No role is stored: the admin is the one account whose email is ADMIN_EMAIL
const roleOf = (user) => (user.email === adminEmail ? 'admin' : 'user');

// What the session keeps about a user (the session itself is stored encrypted)
const toSessionUser = (user) => ({ id: user._id, email: user.email, role: roleOf(user) });

// Save a new account with hashed credentials. Returns the session user, or null when the email is already registered
const createAccount = async (email, password) => {
  const user = await Users.create({ email, ...(await credentials.makeCredentials(password)) });
  return user && toSessionUser(user);
};

// True when the address is the admin's. Nobody can register under it
exports.isReserved = (email) => normalizeEmail(email) === adminEmail;

// Check an email and password. Returns the session user, or null if they do not match.
// Unknown email and wrong password are indistinguishable to the caller (and take the same time)
exports.authenticate = async (email, password) => {
  const user = await Users.findByEmail(normalizeEmail(email));
  return (await credentials.verifyPassword(password, user)) ? toSessionUser(user) : null;
};

// Create a regular account. Returns the session user, or null when the address is reserved or already registered
exports.register = async (email, password) =>
  exports.isReserved(email) ? null : createAccount(normalizeEmail(email), password);

// Change the signed-in user's password. Returns false when the current password is wrong
exports.changePassword = async (sessionUser, currentPassword, newPassword) => {
  if (!(await exports.authenticate(sessionUser.email, currentPassword))) return false;
  await Users.updateCredentials(sessionUser.id, await credentials.makeCredentials(newPassword));
  return true;
};

// At startup: create the admin account if it doesn't exist yet (everyone else registers)
exports.seedAdmin = async () => {
  if (await Users.findByEmail(adminEmail)) return;
  await createAccount(adminEmail, adminPassword);
};
