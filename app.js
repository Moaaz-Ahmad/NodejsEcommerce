// Application entry point.
// Loads configuration, sets up Express (views, static files, form parsing, sessions),
// mounts the routes, handles 404 and error pages, then connects to MongoDB and starts listening.

try { process.loadEnvFile(); } catch { /* no .env: rely on real environment variables */ }

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const Cart = require('./models/cart');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Serve files in Public/ at their URL paths, e.g. /css/main.css
app.use(express.static(path.join(__dirname, 'Public')));
// Parse HTML form posts into req.body
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => { req.body ??= {}; next(); }); // Express 5 leaves req.body undefined when a POST has no form body
// ponytail: in-memory sessions, so logins reset on restart; use a persistent store + fixed SESSION_SECRET in production
// Sessions: the signed-in user is stored in req.session.user; the browser only holds an id cookie
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));
// Make per-request data available to every view: the current user, a one-shot toast and the cart badge count
app.use(async (req, res, next) => {
  const user = req.session.user || null;
  res.locals.user = user;
  res.locals.toast = req.session.flash || null; // one-shot message set before a redirect
  delete req.session.flash;
  res.locals.cartCount = user ? await Cart.count(user.id) : 0;
  next();
});

// Application routes (see routes/index.js)
app.use(require('./routes'));

// Any request that no route handled is a 404
app.use((req, res) => {
  res.status(404).render('error', { title: 'Not Found', message: 'Page not found.' });
});

// eslint-disable-next-line no-unused-vars
// Express treats a four-argument function as the error handler: it receives errors thrown or passed to next()
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Something went wrong. Please try again.' });
});

// Startup order: connect to MongoDB, create the admin account if no users exist, then listen
require('./models/db').init().then(require('./models/user').seed).then(
  () => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`http://localhost:${port}`));
  },
  (err) => {
    console.error(`Cannot start: database error (${err.name}). Check MONGODB_URI in .env and that MongoDB is running.`);
    process.exit(1);
  },
);
