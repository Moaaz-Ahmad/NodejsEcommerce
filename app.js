// The Express application: views, static files, form parsing, sessions, routes and error pages, wired together.
// It only builds the app. Settings are in config.js, and connecting to the database and listening is server.js.
const express = require('express');
const path = require('path');
const config = require('./config');
const sessions = require('./middleware/session');
const locals = require('./middleware/locals');
const csrf = require('./middleware/csrf');
const { notFound, errorHandler } = require('./middleware/errors');

// Build the app around a session store (see models/sessionStore.js). A function rather than a ready-made app,
// because the store needs the database connection, which only exists once server.js has connected.
module.exports = (sessionStore) => {
  const app = express();

  // behind a reverse proxy that ends HTTPS, trust its headers so secure cookies and req.secure work
  if (config.trustProxy) app.set('trust proxy', 1);

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Serve files in Public/ at their URL paths, e.g. /css/main.css
  app.use(express.static(path.join(__dirname, 'Public')));
  // Parse HTML form posts into req.body
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => { req.body ??= {}; next(); }); // Express 5 leaves req.body undefined when a POST has no form body

  app.use(sessions(sessionStore));
  app.use(locals);
  app.use(csrf); // refuses any POST that does not carry this session's token

  app.use(require('./routes'));
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
