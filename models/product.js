// Product data access.
// Titles are unique (case-insensitive), so the title identifies a product as well as its id does.
const { Product, CI } = require('./schemas');

// MongoDB error code for a unique-index violation
const isDuplicate = (err) => err.code === 11000;
// Convert a stored document to the plain shape the views use (id instead of _id)
const plain = (p) => p && { id: p._id, title: p.title, price: p.price, imageUrl: p.imageUrl };

// All products, oldest first (ties broken by title)
exports.all = async () =>
  (await Product.find().sort({ createdAt: 1, title: 1 }).collation(CI).lean()).map(plain);

// One product by id, or undefined when there is none
exports.find = async (id) => plain(await Product.findById(id).lean());

// title is the unique key (case-insensitive index): an existing title is updated instead of duplicated
// returns true if a new product was created, false if an existing one was updated
exports.upsert = async ({ title, price, imageUrl }) => {
  try {
    await Product.create({ title, price, imageUrl });
    return true;
  } catch (err) {
    if (!isDuplicate(err)) throw err;
    await Product.updateOne({ title: title.trim() }, { title, price, imageUrl }).collation(CI);
    return false;
  }
};

// Update a product, returning 'missing', 'duplicate' (another product already uses that title) or 'ok'
exports.update = async (id, { title, price, imageUrl }) => {
  const product = await Product.findById(id);
  if (!product) return 'missing';
  try {
    Object.assign(product, { title, price, imageUrl });
    await product.save();
    return 'ok';
  } catch (err) {
    if (isDuplicate(err)) return 'duplicate';
    throw err;
  }
};

// Delete a product. Removing it from carts is a rule across collections: see services/products.js
exports.remove = (id) => Product.deleteOne({ _id: id });
