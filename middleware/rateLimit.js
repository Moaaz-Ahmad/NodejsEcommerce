// Rate limiting. limit(name, windowMs, max) makes middleware that lets each client make `max` requests per window to
// the routes it is put on, and answers further ones with a 429 and a Retry-After header, before the route does any work
// (which matters for login: checking a password is deliberately slow).
//
// Clients are told apart by IP address (req.ip). Behind a reverse proxy, set TRUST_PROXY=true so that is the visitor's
// address and not the proxy's; otherwise everyone shares one limit. Pass keyOf to count by something else, such as a
// user id. The last argument is for tests only.
const config = require('../config');
const RateLimit = require('../models/rateLimit');

const waitText = (seconds) => (seconds < 90 ? `${seconds} second${seconds === 1 ? '' : 's'}` : `${Math.ceil(seconds / 60)} minutes`);

module.exports = (name, windowMs, max, keyOf = (req) => req.ip, hit = RateLimit.hit) => async (req, res, next) => {
  if (!config.rateLimitEnabled) return next();
  const { count, resetAt } = await hit(`${name}:${keyOf(req)}`, windowMs);
  if (count <= max) return next();

  const seconds = Math.max(1, Math.ceil((new Date(resetAt) - Date.now()) / 1000));
  res.set('Retry-After', String(seconds));
  res.status(429).render('error', {
    title: 'Too many requests',
    message: `Too many attempts from your connection. Please wait ${waitText(seconds)} and try again.`,
  });
};
