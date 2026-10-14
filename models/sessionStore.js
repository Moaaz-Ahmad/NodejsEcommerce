// Session data access: keeps login sessions in MongoDB instead of server memory, so a login survives a server
// restart. express-session calls these methods; it still does the cookie signing and checking.
const { Store } = require('express-session');
const { Session } = require('./schemas');

// how long to keep a session whose cookie has no expiry (a login that ends when the browser closes)
const BROWSER_SESSION_MS = 24 * 60 * 60 * 1000;

// When this session stops being valid: the cookie's expiry (set for "keep me signed in"), or a day from now
const expiryOf = (sess) => (sess.cookie?.expires ? new Date(sess.cookie.expires) : new Date(Date.now() + BROWSER_SESSION_MS));

// express-session wants Node-style callbacks; turn a promise into one
const bridge = (promise, done, pick = () => undefined) => promise.then((result) => done(null, pick(result)), done);

class SessionStore extends Store {
  // The session for this id, or null when it is unknown or has expired
  get(sid, done) {
    bridge(Session.findById(sid).lean(), done, (doc) => {
      // MongoDB removes expired documents only about once a minute, so check the time here as well
      if (!doc || doc.expires <= new Date()) return null;
      return JSON.parse(doc.data);
    });
  }

  // Save a session (create or replace). userId is copied out so the user's sessions can be found later
  set(sid, sess, done) {
    bridge(Session.updateOne({ _id: sid }, { data: JSON.stringify(sess), userId: sess.user?.id ?? null, expires: expiryOf(sess) }, { upsert: true }), done);
  }

  // Push the expiry forward without rewriting the data (a visit keeps a "keep me signed in" login alive)
  touch(sid, sess, done) {
    bridge(Session.updateOne({ _id: sid }, { expires: expiryOf(sess) }), done);
  }

  // Delete one session (sign out)
  destroy(sid, done) {
    bridge(Session.deleteOne({ _id: sid }), done);
  }

  // Delete all of a user's sessions except one: used after a password change to sign out their other devices
  destroyOthers(userId, keepSid) {
    return Session.deleteMany({ userId, _id: { $ne: keepSid } });
  }
}

module.exports = SessionStore;
