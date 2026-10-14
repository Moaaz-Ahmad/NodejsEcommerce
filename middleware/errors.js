// The last two stops for a request: a 404 page for URLs nothing handled, and a 500 page for errors.

// Any request that no route handled
exports.notFound = (req, res) => {
  res.status(404).render('error', { title: 'Not Found', message: 'Page not found.' });
};

// Express treats a four-argument function as the error handler: it receives errors thrown or passed to next().
// The real error goes to the server log; the visitor only sees a generic message.
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Something went wrong. Please try again.' });
};
