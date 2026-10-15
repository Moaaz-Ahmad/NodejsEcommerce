// CSRF tokens and the same-origin check. Pure crypto and string handling: no database, no HTTP.
// A page can only send a state-changing request on a visitor's behalf if it knows the token, and only the site's own
// pages (which the browser's same-origin rule keeps other sites from reading) are given one.
//
// Each session has a random secret. The token put in a form is a fresh random salt plus HMAC(secret, salt), so:
//  - it differs on every page render (an attacker watching compressed responses can't learn it, see BREACH),
//  - every token made for the session stays valid, so several open tabs and the back button keep working,
//  - the token never reveals the secret, and one session's tokens are useless in another session.
const crypto = require('crypto');

// the name of the hidden form field that carries the token
exports.FIELD = '_csrf';

// A new random secret for a session
exports.newSecret = () => crypto.randomBytes(32).toString('base64url');

const mac = (secret, salt) => crypto.createHmac('sha256', secret).update(salt).digest('base64url');

// A token for a form: <salt>.<mac>
exports.makeToken = (secret) => {
  const salt = crypto.randomBytes(16).toString('base64url');
  return `${salt}.${mac(secret, salt)}`;
};

// Is this token one that was made from this secret? Anything that isn't a plain string (a missing field, a repeated
// field that arrives as an array) is simply invalid. The comparison takes the same time however much matches.
exports.verifyToken = (secret, token) => {
  if (typeof secret !== 'string' || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const expected = Buffer.from(mac(secret, parts[0]));
  const given = Buffer.from(parts[1]);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

// Does the request's own evidence say it came from this site? Browsers add these headers to requests and pages cannot
// change them. A second check on top of the token, not a replacement for it:
//  - Sec-Fetch-Site, when sent, must say the request came from this very site ("same-origin") or was typed or
//    bookmarked ("none"). "cross-site" and even "same-site" (a sibling subdomain, which may not be ours) are refused.
//  - Origin, when sent, must be this site's own host. "null" (sent after cross-site redirects and from sandboxed
//    frames) and anything unparseable are refused.
//  - When neither header is sent (curl, old browsers, privacy tools) the token alone decides.
// host is the request's own host, with the port, e.g. "shop.example.com" or "localhost:3000".
exports.isSameOrigin = ({ origin, secFetchSite, host }) => {
  if (secFetchSite !== undefined && secFetchSite !== 'same-origin' && secFetchSite !== 'none') return false;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};
