// Changes to the login session: signing in and out. Wraps express-session's callback style in promises,
// so a failure reaches the error handler and handlers don't repeat the same nested callbacks.
const config = require('../config');

const COOKIE_NAME = 'connect.sid'; // express-session's default cookie name
exports.COOKIE_NAME = COOKIE_NAME;

// Start a fresh session (new id, which prevents session fixation) holding the user.
// remember: true gives the cookie a long expiry (SESSION_DAYS), so the login survives closing the browser;
// false makes it a browser-session cookie. flash is an optional one-off toast message.
exports.signIn = (req, user, { flash, remember = false } = {}) => new Promise((resolve, reject) => {
  req.session.regenerate((err) => {
    if (err) return reject(err);
    req.session.user = user;
    req.session.remember = remember; // kept so a later re-sign-in (password change) can keep the same choice
    if (remember) req.session.cookie.maxAge = config.sessionMs;
    if (flash) req.session.flash = flash;
    resolve();
  });
});

// Did this login choose "keep me signed in"?
exports.isRemembered = (req) => Boolean(req.session.remember);

// End the session (it is deleted from the store) and clear its cookie
exports.signOut = (req, res) => new Promise((resolve, reject) => {
  req.session.destroy((err) => {
    if (err) return reject(err);
    res.clearCookie(COOKIE_NAME);
    resolve();
  });
});

// Sign the user out everywhere except this browser (every other saved login of theirs is deleted)
exports.signOutOtherDevices = (req) => req.sessionStore.destroyOthers(req.session.user.id, req.sessionID);
