const User = require('../models/user');
const Order = require('../models/order');

exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login', error: null });
};

exports.postLogin = async (req, res, next) => {
  const user = await User.authenticate(req.body.username, req.body.password);
  if (!user) {
    return res.status(401).render('auth/login', { title: 'Login', error: 'Invalid username or password.' });
  }
  req.session.regenerate((err) => { // new session id on login (prevents fixation)
    if (err) return next(err);
    req.session.user = user;
    res.redirect('/');
  });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};

exports.getProfile = async (req, res) => {
  const orders = await Order.forUser(req.session.user.username);
  res.render('auth/profile', { title: 'Profile', orders });
};

exports.getChangePassword = (req, res) => {
  res.render('auth/change-password', { title: 'Change Password', error: null });
};

exports.postChangePassword = async (req, res, next) => {
  const { username } = req.session.user;
  const { current, password, confirm } = req.body;
  const fail = (status, error) => res.status(status).render('auth/change-password', { title: 'Change Password', error });

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return fail(400, 'New password must be 8 to 128 characters.');
  }
  if (password !== confirm) return fail(400, 'New password and confirmation do not match.');
  if (password === current) return fail(400, 'New password must be different from the current one.');
  if (!(await User.authenticate(username, current))) return fail(403, 'Current password is incorrect.');

  await User.setPassword(username, password);
  const user = req.session.user;
  req.session.regenerate((err) => { // fresh session id after a credential change
    if (err) return next(err);
    req.session.user = user;
    req.session.flash = 'Password changed.';
    res.redirect('/profile');
  });
};
