// The database connection. Connects once at startup and makes the indexes match the schemas exactly.
const mongoose = require('mongoose');
const { mongoUri } = require('../config');
require('../models/schemas'); // registers the models, so their indexes get created below

exports.connect = async () => {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000, // fail fast with a clear message when MongoDB isn't reachable
  });
  // creates indexes that are missing and drops ones the schemas no longer define, such as the old unique index on
  // the username hash, which would otherwise reject every new account
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
};
