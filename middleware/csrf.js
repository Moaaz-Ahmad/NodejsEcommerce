// CSRF protection. Every request that could change something (anything but GET, HEAD and OPTIONS) must come from this
// site's own pages and carry a token made from its own session's secret, or it is refused with a 403 before any route
// runs. Needs the session middleware and the form parser to have run first.
const { FIELD, newSecret, makeToken, verifyToken, isSameOrigin } = require('../lib/csrf');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const refuse = (res, title, message) => res.status(403).render('error', { title, message });

module.exports = (req, res, next) => {
  // Views call csrfToken() once per form. The session's secret is made the first time a token is asked for, so a
  // visitor who is never shown a form (a redirect, a 404) doesn't get a session or a cookie.
  res.locals.csrfToken = () => {
    req.session.csrfSecret ||= newSecret();
    return makeToken(req.session.csrfSecret);
  };

  if (SAFE_METHODS.has(req.method)) return next();

  // the browser's own statement of where the request came from (req.host honours TRUST_PROXY)
  if (!isSameOrigin({ origin: req.get('origin'), secFetchSite: req.get('sec-fetch-site'), host: req.host })) {
    return refuse(res, 'Request refused', 'This request did not come from this site.');
  }

  // the form field, or a header for non-form clients
  const token = req.body[FIELD] ?? req.get('x-csrf-token');
  if (verifyToken(req.session.csrfSecret, token)) return next();

  refuse(res, 'Form expired', 'This form is no longer valid: your session may have ended, or the request did not come from this site. '
    + 'Go back, reload the page and try again.');
};
