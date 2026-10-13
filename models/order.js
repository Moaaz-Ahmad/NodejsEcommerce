// Order data access. Orders keep their own copy of titles and prices.

const { Order, CartItem } = require('./db');

// items are snapshots ({ title, price, qty }).
// ponytail: order insert and cart clear are two writes (multi-document transactions need a replica set);
// if the clear fails the user sees an error with the cart intact, and retrying would duplicate the order.
// Turn the given items into an order and empty the user's cart
exports.place = async (userId, items) => {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  await Order.create({ userId, total, items });
  await CartItem.deleteMany({ userId });
};

// newest first, each with its items
exports.forUser = async (userId) =>
  (await Order.find({ userId }).sort({ placedAt: -1 }).lean()).map((o) => ({ ...o, id: o._id }));
