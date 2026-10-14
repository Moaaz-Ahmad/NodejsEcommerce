// Per-request data every view can use: the signed-in user, a one-off toast message, and the cart badge count.
const Cart = require('../models/cart');

module.exports = async (req, res, next) => {
  const user = req.session.user || null;
  res.locals.user = user;
  res.locals.toast = req.session.flash || null; // set before a redirect, shown once
  delete req.session.flash;
  res.locals.cartCount = user ? await Cart.count(user.id) : 0;
  next();
};
