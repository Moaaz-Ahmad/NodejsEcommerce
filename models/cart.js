const { UniqueConstraintError } = require('sequelize');
const { CartItem } = require('./db');

// returns [{ productId, qty }]
exports.get = (username) =>
  CartItem.findAll({ where: { username }, attributes: ['productId', 'qty'], raw: true });

exports.add = async (username, productId) => {
  try {
    await CartItem.create({ username, productId, qty: 1 });
  } catch (err) {
    if (!(err instanceof UniqueConstraintError)) throw err;
    await CartItem.increment('qty', { where: { username, productId } }); // already in cart: +1
  }
};

exports.remove = (username, productId) => CartItem.destroy({ where: { username, productId } });

// badge count: total quantity in the user's cart (deleted products are already gone via the cascade)
exports.count = async (username) => Number(await CartItem.sum('qty', { where: { username } })) || 0;
