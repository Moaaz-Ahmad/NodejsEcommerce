// Account handlers: login, logout, profile, password change and registration.
// Each handler checks input, calls the User or Order model, and renders a view or redirects.

const User = require('../models/user');
const Order = require('../models/order');

// Login page. Signed-in users are sent to the shop instead
exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login', error: null });
};

// Check the submitted credentials. On success, start a new session holding the user; on failure, show the form again with an error
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

// End the session and clear its cookie
exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};

// Account page: the signed-in user's orders, newest first
exports.getProfile = async (req, res) => {
  const orders = await Order.forUser(req.session.user.id);
  res.render('auth/profile', { title: 'Profile', orders });
};

// Change-password form
exports.getChangePassword = (req, res) => {
  res.render('auth/change-password', { title: 'Change Password', error: null });
};

// Change the password. Requires the current password, a new one of 8 to 128 characters, and a matching confirmation. Rotates the session afterwards
exports.postChangePassword = async (req, res, next) => {
  const { id, username } = req.session.user;
  const { current, password, confirm } = req.body;
  const fail = (status, error) => res.status(status).render('auth/change-password', { title: 'Change Password', error });

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return fail(400, 'New password must be 8 to 128 characters.');
  }
  if (password !== confirm) return fail(400, 'New password and confirmation do not match.');
  if (password === current) return fail(400, 'New password must be different from the current one.');
  if (!(await User.authenticate(username, current))) return fail(403, 'Current password is incorrect.');

  await User.setPassword(id, password);
  const user = req.session.user;
  req.session.regenerate((err) => { // fresh session id after a credential change
    if (err) return next(err);
    req.session.user = user;
    req.session.flash = 'Password changed.';
    res.redirect('/profile');
  });
};

// Allowed usernames: 3 to 32 letters, digits, dots, underscores or hyphens
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

// Registration form
exports.getRegister = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/register', { title: 'Register', error: null, username: '' });
};

// Create a regular user and sign them in. The admin name is reserved, and the role is always "user" (the form cannot choose it)
exports.postRegister = async (req, res, next) => {
  if (req.session.user) return res.redirect('/');
  const username = String(req.body.username || '').trim();
  const { password, confirm } = req.body;
  const fail = (error) => res.status(400).render('auth/register', { title: 'Register', error, username });

  if (!USERNAME_RE.test(username)) return fail('Username must be 3-32 characters: letters, numbers, . _ -');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return fail('Password must be 8 to 128 characters.');
  }
  if (password !== confirm) return fail('Password and confirmation do not match.');

  // the admin name is reserved; everyone else always registers as a regular user
  const created = User.isReserved(username) ? null : await User.create(username, password);
  if (!created) return fail('That username is already taken.');

  req.session.regenerate((err) => { // sign the new user straight in
    if (err) return next(err);
    req.session.user = created;
    req.session.flash = `Welcome, ${created.username}!`;
    res.redirect('/');
  });
};
