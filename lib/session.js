// Changes to the login session: signing in and out. Wraps express-session's callback style in promises,
// so a failure reaches the error handler and handlers don't repeat the same nested callbacks.
const COOKIE_NAME = 'connect.sid'; // express-session's default cookie name

// Start a fresh session (new id, which prevents session fixation) holding the user, with an optional one-off toast message
exports.signIn = (req, user, flash) => new Promise((resolve, reject) => {
  req.session.regenerate((err) => {
    if (err) return reject(err);
    req.session.user = user;
    if (flash) req.session.flash = flash;
    resolve();
  });
});

// End the session and clear its cookie
exports.signOut = (req, res) => new Promise((resolve, reject) => {
  req.session.destroy((err) => {
    if (err) return reject(err);
    res.clearCookie(COOKIE_NAME);
    resolve();
  });
});
