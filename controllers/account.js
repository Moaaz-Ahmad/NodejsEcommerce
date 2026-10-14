// Handlers for the signed-in user's own account: profile page and password change.
const Order = require('../models/order');
const auth = require('../services/auth');
const { validatePasswordChange } = require('../lib/validators');
const { signIn, isRemembered, signOutOtherDevices } = require('../lib/session');

// Account page: the signed-in user's orders, newest first
exports.getProfile = async (req, res) => {
  const orders = await Order.forUser(req.session.user.id);
  res.render('auth/profile', { title: 'Profile', orders });
};

// Change-password form
exports.getChangePassword = (req, res) => {
  res.render('auth/change-password', { title: 'Change Password', error: null });
};

// Change the password. Requires the current password, a new one of 8 to 128 characters, and a matching confirmation.
// Every other saved login of this user is ended, and this browser gets a fresh session that keeps its "keep me signed in" choice
exports.postChangePassword = async (req, res) => {
  const fail = (status, error) => res.status(status).render('auth/change-password', { title: 'Change Password', error });
  const { value, error } = validatePasswordChange(req.body);
  if (error) return fail(400, error);

  const user = req.session.user;
  if (!(await auth.changePassword(user, value.current, value.password))) return fail(403, 'Current password is incorrect.');

  await signOutOtherDevices(req);
  await signIn(req, user, { flash: 'Password changed.', remember: isRemembered(req) });
  res.redirect('/profile');
};
