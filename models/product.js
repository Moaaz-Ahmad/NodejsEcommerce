const { Product, CartItem, CI } = require('./db');

const isDuplicate = (err) => err.code === 11000;
const plain = (p) => p && { id: p._id, title: p.title, price: p.price, imageUrl: p.imageUrl };

exports.all = async () =>
  (await Product.find().sort({ createdAt: 1, title: 1 }).collation(CI).lean()).map(plain);

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

// returns 'ok' | 'missing' | 'duplicate' (another product already uses that title)
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

// no foreign keys in MongoDB, so the product is removed from every cart explicitly
exports.remove = async (id) => {
  await Product.deleteOne({ _id: id });
  await CartItem.deleteMany({ productId: id });
};
