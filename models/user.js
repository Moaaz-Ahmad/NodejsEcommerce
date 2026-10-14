// User data access: reads and writes user documents. Hashing, roles and account rules are in services/auth.js.
const { User } = require('./schemas');

// The user document with this username hash, or null
exports.findByHash = (usernameHash) => User.findOne({ usernameHash });

// Save a new user. Returns the document, or null when the username hash already exists (the unique index decides,
// so two simultaneous sign-ups for one name cannot both succeed)
exports.create = async ({ usernameHash, salt, passwordHash }) => {
  try {
    return await User.create({ usernameHash, salt, passwordHash });
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }
};

// Replace a user's stored salt and password hash
exports.updateCredentials = (id, { salt, passwordHash }) => User.updateOne({ _id: id }, { salt, passwordHash });

// How many users exist
exports.count = () => User.estimatedDocumentCount();
