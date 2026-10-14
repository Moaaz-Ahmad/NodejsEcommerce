// Admin handlers: list, add, edit and delete products. Routes already restrict these to the admin account.
// Form checking is lib/validators.js; deleting a product (and clearing it from carts) is services/products.js.
const Product = require('../models/product');
const products = require('../services/products');
const { validateProduct } = require('../lib/validators');

// Shared 404 response for a product id that does not exist
const notFound = (res) => res.status(404).render('error', { title: 'Not Found', message: 'Product not found.' });

// Product management list
exports.getProducts = async (req, res) => {
  res.render('admin/products', { title: 'Manage Products', products: await Product.all() });
};

// Empty add-product form
exports.getAddProduct = (req, res) => {
  res.render('admin/edit-product', { title: 'Add Product', product: {}, error: null });
};

// Add a product. If the title already exists, that product is updated instead and the admin sees a notice saying so
exports.postAddProduct = async (req, res) => {
  const { value, error } = validateProduct(req.body);
  if (error) return res.status(400).render('admin/edit-product', { title: 'Add Product', product: req.body, error });
  const created = await Product.upsert(value);
  req.session.flash = created
    ? `"${value.title}" added.`
    : `"${value.title}" already exists, so the existing product was updated.`;
  res.redirect('/admin/products');
};

// Edit form, filled in with the product
exports.getEditProduct = async (req, res) => {
  const product = await Product.find(req.params.id);
  if (!product) return notFound(res);
  res.render('admin/edit-product', { title: 'Edit Product', product, error: null });
};

// Save product edits. Bad input or a title used by another product re-shows the form with an error
exports.postEditProduct = async (req, res) => {
  const { value, error } = validateProduct(req.body);
  if (error) {
    return res.status(400).render('admin/edit-product', {
      title: 'Edit Product', product: { ...req.body, id: req.params.id }, error,
    });
  }
  const result = await Product.update(req.params.id, value);
  if (result === 'missing') return notFound(res);
  if (result === 'duplicate') {
    return res.status(400).render('admin/edit-product', {
      title: 'Edit Product', product: { ...req.body, id: req.params.id },
      error: 'Another product already has that name.',
    });
  }
  req.session.flash = `"${value.title}" updated.`;
  res.redirect('/admin/products');
};

// Delete a product. Its cart lines are removed too
exports.postDeleteProduct = async (req, res) => {
  await products.remove(req.params.id);
  res.redirect('/admin/products');
};
