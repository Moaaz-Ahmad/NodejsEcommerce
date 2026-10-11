const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'node-complete',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD, // set in .env (not committed)
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false },
);

// id is the primary (unique) key; title is the unique business key that identifies duplicate products
const Product = sequelize.define('Product', {
  id: { type: DataTypes.STRING, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING, allowNull: false, unique: true },
  price: { type: DataTypes.DOUBLE, allowNull: false },
  imageUrl: { type: DataTypes.TEXT('long'), allowNull: false },
}, { tableName: 'products', updatedAt: false });

// passwords are never stored: salt is random per user, passwordHash = scrypt(password, salt).
// No username or role is stored: usernameHash = HMAC(secret pepper, lowercased username) is the login lookup key,
// and the admin is the account whose hash matches ADMIN_USERNAME (see models/user.js).
const User = sequelize.define('User', {
  id: { type: DataTypes.STRING, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  usernameHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  salt: { type: DataTypes.STRING(32), allowNull: false },
  passwordHash: { type: DataTypes.STRING(128), allowNull: false },
}, { tableName: 'users', updatedAt: false });

const CartItem = sequelize.define('CartItem', {
  userId: { type: DataTypes.STRING, primaryKey: true },
  productId: { type: DataTypes.STRING, primaryKey: true },
  qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, { tableName: 'cart', timestamps: false });

const Order = sequelize.define('Order', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.STRING, allowNull: false },
  total: { type: DataTypes.DOUBLE, allowNull: false },
  placedAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'orders', timestamps: false, indexes: [{ fields: ['userId'] }] });

// title/price are snapshots so later product edits or deletes don't rewrite history
const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.STRING(36), allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DOUBLE, allowNull: false },
  qty: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'order_items', timestamps: false });

User.hasMany(CartItem, { foreignKey: 'userId', onDelete: 'CASCADE' });
CartItem.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId' });
// deleting a product removes it from every cart; deleting an order removes its items
Product.hasMany(CartItem, { foreignKey: 'productId', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// creates missing tables only; existing tables and data are left as they are
const init = () => sequelize.sync();

module.exports = { sequelize, User, Product, CartItem, Order, OrderItem, init };
