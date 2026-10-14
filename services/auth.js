// Account rules: logging in, registering, changing a password, who counts as admin, and creating the first admin.
// Hashing is lib/credentials.js; reading and writing users is models/user.js.
const credentials = require('../lib/credentials');
const Users = require('../models/user');
const { adminUsername, adminPassword } = require('../config');

// No role is stored: the admin is the one account whose username hash matches ADMIN_USERNAME
const ADMIN_HASH = credentials.usernameHash(adminUsername);
const roleOf = (user) => (user.usernameHash === ADMIN_HASH ? 'admin' : 'user');

// What the session keeps about a user. username is only the name as typed (the database doesn't store it), for display
const toSessionUser = (user, username) => ({ id: user._id, username: String(username).trim(), role: roleOf(user) });

// Save a new account with hashed credentials. Returns the session user, or null when the username is taken
const createAccount = async (username, password) => {
  const user = await Users.create({
    usernameHash: credentials.usernameHash(username),
    ...(await credentials.makeCredentials(password)),
  });
  return user && toSessionUser(user, username);
};

// True when the name is the admin's. Nobody can register under it
exports.isReserved = (username) => credentials.usernameHash(username) === ADMIN_HASH;

// Check a username and password. Returns the session user, or null if they do not match
exports.authenticate = async (username, password) => {
  const user = await Users.findByHash(credentials.usernameHash(username));
  return (await credentials.verifyPassword(password, user)) ? toSessionUser(user, username) : null;
};

// Create a regular account. Returns the session user, or null when the name is reserved or already taken
exports.register = async (username, password) =>
  exports.isReserved(username) ? null : createAccount(username, password);

// Change the signed-in user's password. Returns false when the current password is wrong
exports.changePassword = async (sessionUser, currentPassword, newPassword) => {
  if (!(await exports.authenticate(sessionUser.username, currentPassword))) return false;
  await Users.updateCredentials(sessionUser.id, await credentials.makeCredentials(newPassword));
  return true;
};

// First run only: create the admin account when no users exist (everyone else registers)
exports.seedAdmin = async () => {
  if (await Users.count()) return;
  await createAccount(adminUsername, adminPassword);
};
