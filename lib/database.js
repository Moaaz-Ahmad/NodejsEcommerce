// The database connection. Connects once at startup and makes sure every index exists.
const mongoose = require('mongoose');
const { mongoUri } = require('../config');
require('../models/schemas'); // registers the models, so their indexes get created below

exports.connect = async () => {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000, // fail fast with a clear message when MongoDB isn't reachable
  });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
};
