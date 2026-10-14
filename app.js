// The Express application: views, static files, form parsing, sessions, routes and error pages, wired together.
// It only builds the app. Settings are in config.js, and connecting to the database and listening is server.js.
const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./config');
const locals = require('./middleware/locals');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve files in Public/ at their URL paths, e.g. /css/main.css
app.use(express.static(path.join(__dirname, 'Public')));
// Parse HTML form posts into req.body
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => { req.body ??= {}; next(); }); // Express 5 leaves req.body undefined when a POST has no form body

// Sessions: the signed-in user is stored in req.session.user; the browser only holds an id cookie
// ponytail: in-memory sessions, so logins reset on restart; use a persistent store + fixed SESSION_SECRET in production
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));
app.use(locals);

app.use(require('./routes'));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
