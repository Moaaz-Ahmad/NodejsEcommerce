const { sequelize, Order, OrderItem, CartItem } = require('./db');

// items are snapshots ({ title, price, qty }). Order insert and cart clear commit together,
// so a failure never leaves a paid-for cart behind.
exports.place = (userId, items) =>
  sequelize.transaction(async (transaction) => {
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const order = await Order.create({ userId, total }, { transaction });
    await OrderItem.bulkCreate(items.map((i) => ({ ...i, orderId: order.id })), { transaction });
    await CartItem.destroy({ where: { userId }, transaction });
  });

// newest first, each with its items
exports.forUser = async (userId) =>
  (await Order.findAll({
    where: { userId },
    include: [{ model: OrderItem, as: 'items' }],
    order: [['placedAt', 'DESC'], [{ model: OrderItem, as: 'items' }, 'id', 'ASC']],
  })).map((o) => o.get({ plain: true }));
