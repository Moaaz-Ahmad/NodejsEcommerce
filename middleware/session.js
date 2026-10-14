// Sessions: the signed-in user is stored in req.session.user; the browser only holds a signed id cookie.
// Takes the store so the same setup works with any session store.
const session = require('express-session');
const config = require('../config');
const { COOKIE_NAME } = require('../lib/session');

module.exports = (store) => session({
  name: COOKIE_NAME,
  secret: config.sessionSecret,
  store,
  resave: false,
  saveUninitialized: false, // no session (and no cookie) for visitors who never sign in
  rolling: true, // every visit renews the cookie, so "keep me signed in" lasts from the last visit
  cookie: {
    httpOnly: true, // not readable by scripts on the page
    sameSite: 'lax', // not sent on cross-site POSTs
    secure: config.secureCookies, // HTTPS only, when COOKIE_SECURE=true
  },
});
