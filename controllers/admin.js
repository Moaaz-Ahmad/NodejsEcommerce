// Admin handlers: list, add, edit and delete products. Routes already restrict these to the admin account.

const Product = require('../models/product');

// returns { data } or { error }
// Validate and tidy the product form: trim text, require a title and a price of zero or more, cap lengths, and allow only http(s) image links or none
function parse(body) {
  const title = String(body.title || '').trim();
  const price = parseFloat(body.price);
  const imageUrl = String(body.imageUrl || '').trim();
  if (!title || !Number.isFinite(price) || price < 0) return { error: 'Enter a title and a non-negative price.' };
  if (title.length > 200) return { error: 'Title must be 200 characters or fewer.' };
  if (imageUrl.length > 2048) return { error: 'Image URL is too long.' };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return { error: 'Image URL must start with http:// or https://.' };
  return { data: { title, price, imageUrl } };
}

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
  const { data, error } = parse(req.body);
  if (error) return res.status(400).render('admin/edit-product', { title: 'Add Product', product: req.body, error });
  const created = await Product.upsert(data);
  req.session.flash = created
    ? `"${data.title}" added.`
    : `"${data.title}" already exists, so the existing product was updated.`;
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
  const { data, error } = parse(req.body);
  if (error) {
    return res.status(400).render('admin/edit-product', {
      title: 'Edit Product', product: { ...req.body, id: req.params.id }, error,
    });
  }
  const result = await Product.update(req.params.id, data);
  if (result === 'missing') return notFound(res);
  if (result === 'duplicate') {
    return res.status(400).render('admin/edit-product', {
      title: 'Edit Product', product: { ...req.body, id: req.params.id },
      error: 'Another product already has that name.',
    });
  }
  req.session.flash = `"${data.title}" updated.`;
  res.redirect('/admin/products');
};

// Delete a product. Its cart lines are removed too
exports.postDeleteProduct = async (req, res) => {
  await Product.remove(req.params.id);
  res.redirect('/admin/products');
};
