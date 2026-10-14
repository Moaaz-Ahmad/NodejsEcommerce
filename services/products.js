// Product rules that touch more than one collection.
const Product = require('../models/product');
const Cart = require('../models/cart');

// Delete a product and take it out of every cart (MongoDB has no foreign keys to do that for us)
exports.remove = async (id) => {
  await Product.remove(id);
  await Cart.removeProduct(id);
};
