exports.requireLogin = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/login');
};

exports.requireAdmin = (req, res, next) => {
  if (req.session.user?.role === 'admin') return next();
  res.status(403).render('error', { title: 'Forbidden', message: 'Admins only.' });
};
