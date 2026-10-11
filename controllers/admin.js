const Product = require('../models/product');

// returns { data } or { error }
function parse(body) {
  const title = (body.title || '').trim();
  const price = parseFloat(body.price);
  const imageUrl = (body.imageUrl || '').trim();
  if (!title || !Number.isFinite(price) || price < 0) return { error: 'Enter a title and a non-negative price.' };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return { error: 'Image URL must start with http:// or https://.' };
  return { data: { title, price, imageUrl } };
}

const notFound = (res) => res.status(404).render('error', { title: 'Not Found', message: 'Product not found.' });

exports.getProducts = async (req, res) => {
  res.render('admin/products', { title: 'Manage Products', products: await Product.all() });
};

exports.getAddProduct = (req, res) => {
  res.render('admin/edit-product', { title: 'Add Product', product: {}, error: null });
};

exports.postAddProduct = async (req, res) => {
  const { data, error } = parse(req.body);
  if (error) return res.status(400).render('admin/edit-product', { title: 'Add Product', product: req.body, error });
  await Product.add(data);
  res.redirect('/admin/products');
};

exports.getEditProduct = async (req, res) => {
  const product = await Product.find(req.params.id);
  if (!product) return notFound(res);
  res.render('admin/edit-product', { title: 'Edit Product', product, error: null });
};

exports.postEditProduct = async (req, res) => {
  const { data, error } = parse(req.body);
  if (error) {
    return res.status(400).render('admin/edit-product', {
      title: 'Edit Product', product: { ...req.body, id: req.params.id }, error,
    });
  }
  if (!(await Product.update(req.params.id, data))) return notFound(res);
  res.redirect('/admin/products');
};

exports.postDeleteProduct = async (req, res) => {
  await Product.remove(req.params.id);
  res.redirect('/admin/products');
};
