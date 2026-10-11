const User = require('../models/user');
const Order = require('../models/order');

exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login', error: null });
};

exports.postLogin = (req, res, next) => {
  const user = User.authenticate(req.body.username, req.body.password);
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
