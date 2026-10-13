// Route guards. Each one either calls next() or ends the request with a redirect or error page.

// Let the request through only when someone is signed in; otherwise send them to /login
exports.requireLogin = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/login');
};

// Let the request through only for the admin account; everyone else gets a 403 page
exports.requireAdmin = (req, res, next) => {
  if (req.session.user?.role === 'admin') return next();
  res.status(403).render('error', { title: 'Forbidden', message: 'Admins only.' });
};
