// Order data access. Orders keep their own copy of titles and prices.
const { Order } = require('./schemas');

// Save an order. items are snapshots ({ title, price, qty }) so later product edits or deletes don't rewrite history
exports.create = (userId, items, total) => Order.create({ userId, total, items });

// One user's orders, newest first, each with its items
exports.forUser = async (userId) =>
  (await Order.find({ userId }).sort({ placedAt: -1 }).lean()).map((o) => ({ ...o, id: o._id }));
