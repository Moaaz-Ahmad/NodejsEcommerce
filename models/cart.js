// Shopping cart data access. Each user has one line per product, with a quantity.
const { CartItem } = require('./schemas');

// The lines in one user's cart: [{ productId, qty }]
exports.get = (userId) => CartItem.find({ userId }, { _id: 0, productId: 1, qty: 1 }).lean();

// atomic: creates the line with qty 1, or adds 1 when the product is already in the cart
exports.add = (userId, productId) =>
  CartItem.updateOne({ userId, productId }, { $inc: { qty: 1 } }, { upsert: true });

// Remove one product line from a user's cart
exports.remove = (userId, productId) => CartItem.deleteOne({ userId, productId });

// Empty a user's cart
exports.clear = (userId) => CartItem.deleteMany({ userId });

// Remove one product from every user's cart
exports.removeProduct = (productId) => CartItem.deleteMany({ productId });

// Total quantity in a user's cart (the header badge)
exports.count = async (userId) =>
  (await CartItem.aggregate([{ $match: { userId } }, { $group: { _id: null, n: { $sum: '$qty' } } }]))[0]?.n || 0;
