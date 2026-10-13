try { process.loadEnvFile(); } catch { /* no .env: rely on real environment variables */ }

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const Cart = require('./models/cart');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'Public')));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => { req.body ??= {}; next(); }); // Express 5 leaves req.body undefined when a POST has no form body
// ponytail: in-memory sessions, so logins reset on restart; use a persistent store + fixed SESSION_SECRET in production
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));
app.use(async (req, res, next) => {
  const user = req.session.user || null;
  res.locals.user = user;
  res.locals.toast = req.session.flash || null; // one-shot message set before a redirect
  delete req.session.flash;
  res.locals.cartCount = user ? await Cart.count(user.id) : 0;
  next();
});

app.use(require('./routes'));

app.use((req, res) => {
  res.status(404).render('error', { title: 'Not Found', message: 'Page not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Something went wrong. Please try again.' });
});

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
