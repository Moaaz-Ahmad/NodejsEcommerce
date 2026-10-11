const Product = require('../models/product');
const Cart = require('../models/cart');
const Order = require('../models/order');

// cart entries joined with current products; entries whose product was deleted are dropped
async function cartLines(username) {
  const [items, products] = await Promise.all([Cart.get(username), Product.all()]);
  const lines = items
    .map((i) => ({ product: products.find((p) => p.id === i.productId), qty: i.qty }))
    .filter((l) => l.product);
  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  return { lines, total };
}

exports.getShop = async (req, res) => {
  res.render('shop/index', { title: 'Shop', products: await Product.all() });
};

exports.getProduct = async (req, res) => {
  const product = await Product.find(req.params.id);
  if (!product) return res.status(404).render('error', { title: 'Not Found', message: 'Product not found.' });
  res.render('shop/product', { title: product.title, product });
};

exports.getCart =async (req, res) => {
  res.render('shop/cart', { title: 'Cart', ...(await cartLines(req.session.user.username)) });
};

exports.postCart = async (req, res) => {
  if (await Product.find(req.body.productId)) await Cart.add(req.session.user.username, req.body.productId);
  res.redirect('/cart');
};

exports.postCartDelete = async (req, res) => {
  await Cart.remove(req.session.user.username, req.body.productId);
  res.redirect('/cart');
};

exports.getCheckout = async (req, res) => {
  const cart = await cartLines(req.session.user.username);
  if (!cart.lines.length) return res.redirect('/cart');
  res.render('shop/checkout', { title: 'Checkout', ...cart });
};

exports.postCheckout = async (req, res) => {
  const { username } = req.session.user;
  const { lines } = await cartLines(username);
  if (!lines.length) return res.redirect('/cart');
  await Order.place(username, lines.map((l) => ({ title: l.product.title, price: l.product.price, qty: l.qty })));
  await Cart.clear(username);
  res.redirect('/profile');
};
