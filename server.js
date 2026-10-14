// Entry point (npm start): check the settings, connect to MongoDB, create the admin account if there are no
// users yet, then start listening. Building the app itself is app.js.
let config;
try {
  config = require('./config');
} catch (err) {
  console.error(err.message); // a required setting is missing
  process.exit(1);
}
const app = require('./app');
const { connect } = require('./lib/database');
const { seedAdmin } = require('./services/auth');

connect().then(seedAdmin).then(
  () => app.listen(config.port, () => console.log(`http://localhost:${config.port}`)),
  (err) => {
    console.error(`Cannot start: database error (${err.name}). Check MONGODB_URI in .env and that MongoDB is running.`);
    process.exit(1);
  },
);
