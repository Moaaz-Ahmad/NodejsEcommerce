// Cart use cases that span models: building the cart view, and turning a cart into an order.
const Product = require('../models/product');
const Cart = require('../models/cart');
const Order = require('../models/order');

// The user's cart lines joined with current product details, plus the total.
// Lines for products that were deleted are left out.
exports.viewCart = async (userId) => {
  const [items, products] = await Promise.all([Cart.get(userId), Product.all()]);
  const lines = items
    .map((i) => ({ product: products.find((p) => p.id === i.productId), qty: i.qty }))
    .filter((l) => l.product);
  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  return { lines, total };
};

// Turn the user's cart into an order (titles and prices are copied into it) and empty the cart.
// Returns false, and does nothing, when the cart is empty.
// ponytail: order insert and cart clear are two writes (multi-document transactions need a replica set);
// if the clear fails the user sees an error with the cart intact, and retrying would duplicate the order.
exports.checkout = async (userId) => {
  const { lines, total } = await exports.viewCart(userId);
  if (!lines.length) return false;
  const items = lines.map((l) => ({ title: l.product.title, price: l.product.price, qty: l.qty }));
  await Order.create(userId, items, total);
  await Cart.clear(userId);
  return true;
};
