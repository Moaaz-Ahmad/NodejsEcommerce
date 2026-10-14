// Shop handlers: product pages, cart and checkout. All of them need a signed-in user (see routes/index.js).
// Cart and checkout rules live in services/cart.js.
const Product = require('../models/product');
const Cart = require('../models/cart');
const cartService = require('../services/cart');

// Shop page: every product
exports.getShop = async (req, res) => {
  res.render('shop/index', { title: 'Shop', products: await Product.all() });
};

// Details page for one product, or a 404 page when the id is unknown
exports.getProduct = async (req, res) => {
  const product = await Product.find(req.params.id);
  if (!product) return res.status(404).render('error', { title: 'Not Found', message: 'Product not found.' });
  res.render('shop/product', { title: product.title, product });
};

// Cart page
exports.getCart = async (req, res) => {
  res.render('shop/cart', { title: 'Cart', ...(await cartService.viewCart(req.session.user.id)) });
};

// form fields are coerced to strings: a repeated field (?productId=a&productId=b) arrives as an array
const productIdOf = (req) => String(req.body.productId || '');

// Add one of a product to the cart. Ignored when the product does not exist
exports.postCart = async (req, res) => {
  const productId = productIdOf(req);
  if (await Product.find(productId)) await Cart.add(req.session.user.id, productId);
  res.redirect('/cart');
};

// Remove one product line from the cart
exports.postCartDelete = async (req, res) => {
  await Cart.remove(req.session.user.id, productIdOf(req));
  res.redirect('/cart');
};

// Review page before placing the order. An empty cart goes back to the cart page
exports.getCheckout = async (req, res) => {
  const cart = await cartService.viewCart(req.session.user.id);
  if (!cart.lines.length) return res.redirect('/cart');
  res.render('shop/checkout', { title: 'Checkout', ...cart });
};

// Turn the cart into an order, then show it on the profile page. An empty cart goes back to the cart page
exports.postCheckout = async (req, res) => {
  const placed = await cartService.checkout(req.session.user.id);
  res.redirect(placed ? '/profile' : '/cart');
};
