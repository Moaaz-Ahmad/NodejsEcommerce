// Entry point (npm start): check the settings, connect to MongoDB, make sure the admin account exists, then
// start listening. Building the app itself is app.js.
let config;
try {
  config = require('./config');
} catch (err) {
  console.error(err.message); // a required setting is missing
  process.exit(1);
}
const createApp = require('./app');
const SessionStore = require('./models/sessionStore');
const { connect } = require('./lib/database');
const { seedAdmin } = require('./services/auth');

const start = async () => {
  await connect();
  await seedAdmin();
  const sessionStore = new SessionStore();
  await sessionStore.purgeOldFormats(); // sign out and delete sessions saved by earlier versions
  createApp(sessionStore).listen(config.port, () => console.log(`http://localhost:${config.port}`));
};

start().catch((err) => {
  console.error(`Cannot start: database error (${err.name}). Check MONGODB_URI in .env and that MongoDB is running.`);
  process.exit(1);
});
