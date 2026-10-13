const { CartItem } = require('./db');

// returns [{ productId, qty }]
exports.get = (userId) => CartItem.find({ userId }, { _id: 0, productId: 1, qty: 1 }).lean();

// atomic: creates the line with qty 1, or adds 1 when the product is already in the cart
exports.add = (userId, productId) =>
  CartItem.updateOne({ userId, productId }, { $inc: { qty: 1 } }, { upsert: true });

exports.remove = (userId, productId) => CartItem.deleteOne({ userId, productId });

// badge count: total quantity in the user's cart (deleted products are removed from carts by Product.remove)
exports.count = async (userId) =>
  (await CartItem.aggregate([{ $match: { userId } }, { $group: { _id: null, n: { $sum: '$qty' } } }]))[0]?.n || 0;
