const { UniqueConstraintError } = require('sequelize');
const { CartItem } = require('./db');

// returns [{ productId, qty }]
exports.get = (userId) =>
  CartItem.findAll({ where: { userId }, attributes: ['productId', 'qty'], raw: true });

exports.add = async (userId, productId) => {
  try {
    await CartItem.create({ userId, productId, qty: 1 });
  } catch (err) {
    if (!(err instanceof UniqueConstraintError)) throw err;
    await CartItem.increment('qty', { where: { userId, productId } }); // already in cart: +1
  }
};

exports.remove = (userId, productId) => CartItem.destroy({ where: { userId, productId } });

// badge count: total quantity in the user's cart (deleted products are already gone via the cascade)
exports.count = async (userId) => Number(await CartItem.sum('qty', { where: { userId } })) || 0;
