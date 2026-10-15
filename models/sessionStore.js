// Session data access: keeps login sessions in MongoDB instead of server memory, so a login survives a server
// restart. express-session calls these methods; it still does the cookie signing and checking.
// The session itself (who is signed in, their email and role) is encrypted before it is saved (lib/seal.js), so the
// database holds nothing readable about the user's session. Only the session id, the expiry time and an opaque
// user id stay readable, because lookups and the automatic clean-up need them.
const { Store } = require('express-session');
const { Session } = require('./schemas');
const { seal, unseal, VERSION } = require('../lib/seal');

// how long to keep a session whose cookie has no expiry (a login that ends when the browser closes)
const BROWSER_SESSION_MS = 24 * 60 * 60 * 1000;
// how long to keep a session nobody has signed in to. These exist only to hold a CSRF secret for the login and
// registration forms, so they are kept briefly: a stream of anonymous visits can't fill the collection for a day
const ANONYMOUS_SESSION_MS = 2 * 60 * 60 * 1000;

// When this session stops being valid: the cookie's expiry (set for "keep me signed in"), or a fixed time from now
const expiryOf = (sess) => {
  if (sess.cookie?.expires) return new Date(sess.cookie.expires);
  return new Date(Date.now() + (sess.user ? BROWSER_SESSION_MS : ANONYMOUS_SESSION_MS));
};

// express-session wants Node-style callbacks; turn a promise into one
const bridge = (promise, done, pick = () => undefined) => promise.then((result) => done(null, pick(result)), done);

class SessionStore extends Store {
  // The session for this id, or null when it is unknown, expired, or its stored data fails the integrity check
  // (altered, copied from another session, or saved in an older format)
  get(sid, done) {
    bridge(Session.findById(sid).lean(), done, (doc) => {
      // MongoDB removes expired documents only about once a minute, so check the time here as well
      if (!doc || doc.expires <= new Date()) return null;
      const json = unseal(doc.data, sid); // the session id is part of what was sealed, so data can't be moved between sessions
      return json === null ? null : JSON.parse(json);
    });
  }

  // Save a session (create or replace). userId is copied out so the user's sessions can be found later
  set(sid, sess, done) {
    bridge(Session.updateOne({ _id: sid }, { data: seal(JSON.stringify(sess), sid), userId: sess.user?.id ?? null, expires: expiryOf(sess) }, { upsert: true }), done);
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

  // Delete sessions saved in an older format: readable text from the first version, or sealed ones from before
  // accounts used email addresses. Run at startup. Those logins end (their owners sign in again once);
  // there is nothing to keep, as they can't be opened now
  purgeOldFormats() {
    return Session.deleteMany({ data: { $not: new RegExp(`^${VERSION}[.]`) } });
  }
}

module.exports = SessionStore;
