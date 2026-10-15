// User data access: reads and writes user documents. Password hashing and account rules are in services/auth.js.
const { User } = require('./schemas');

// The user document with this (already normalised) email address, or null
exports.findByEmail = (email) => User.findOne({ email });

// Save a new user. Returns the document, or null when the email is already registered (the unique index decides,
// so two simultaneous sign-ups for one address cannot both succeed)
exports.create = async ({ email, salt, passwordHash }) => {
  try {
    return await User.create({ email, salt, passwordHash });
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }
};

// Replace a user's stored salt and password hash
exports.updateCredentials = (id, { salt, passwordHash }) => User.updateOne({ _id: id }, { salt, passwordHash });
