const { UniqueConstraintError } = require('sequelize');
const { Product } = require('./db');

exports.all = () =>
  Product.findAll({
    attributes: ['id', 'title', 'price', 'imageUrl'],
    order: [['createdAt', 'ASC'], ['title', 'ASC']],
    raw: true,
  });

exports.find = (id) => Product.findByPk(id, { raw: true });

// title is the unique key (case-insensitive collation): an existing title is updated instead of duplicated
// returns true if a new product was created, false if an existing one was updated
exports.upsert = async ({ title, price, imageUrl }) => {
  try {
    await Product.create({ title, price, imageUrl });
    return true;
  } catch (err) {
    if (!(err instanceof UniqueConstraintError)) throw err;
    await Product.update({ title, price, imageUrl }, { where: { title } });
    return false;
  }
};

// returns 'ok' | 'missing' | 'duplicate' (another product already uses that title)
exports.update = async (id, { title, price, imageUrl }) => {
  const product = await Product.findByPk(id);
  if (!product) return 'missing';
  try {
    await product.update({ title, price, imageUrl });
    return 'ok';
  } catch (err) {
    if (err instanceof UniqueConstraintError) return 'duplicate';
    throw err;
  }
};

// cart rows referencing the product are removed by the ON DELETE CASCADE foreign key
exports.remove = (id) => Product.destroy({ where: { id } });
