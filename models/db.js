const crypto = require('crypto');
const mongoose = require('mongoose');

const uuid = () => crypto.randomUUID();
// ids are UUID strings (not ObjectIds), so URLs stay the same and invalid ids never throw cast errors
const id = { type: String, default: uuid };

// case-insensitive matching for product titles (used by the unique index and by every title query)
const CI = { locale: 'en', strength: 2 };

// id is the primary (unique) key; title is the unique business key that identifies duplicate products
const productSchema = new mongoose.Schema({
  _id: id,
  title: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });
productSchema.index({ title: 1 }, { unique: true, collation: CI });

// No username or role is stored: usernameHash = HMAC(secret pepper, lowercased username) is the login lookup key,
// and the admin is the account whose hash matches ADMIN_USERNAME (see models/user.js).
// passwordHash = scrypt(password, salt) with a random salt per user; the password itself is never stored.
const userSchema = new mongoose.Schema({
  _id: id,
  usernameHash: { type: String, required: true, unique: true },
  salt: { type: String, required: true },
  passwordHash: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const cartItemSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  qty: { type: Number, required: true, default: 1 },
}, { versionKey: false });
cartItemSchema.index({ userId: 1, productId: 1 }, { unique: true });
cartItemSchema.index({ productId: 1 });

// items are embedded snapshots (title/price/qty) so later product edits or deletes don't rewrite history
const orderSchema = new mongoose.Schema({
  _id: id,
  userId: { type: String, required: true, index: true },
  total: { type: Number, required: true },
  placedAt: { type: Date, default: Date.now },
  items: [{ _id: false, title: String, price: Number, qty: Number }],
}, { versionKey: false });

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);
const Order = mongoose.model('Order', orderSchema);

const init = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/node-complete', {
    serverSelectionTimeoutMS: 5000, // fail fast with a clear message when MongoDB isn't reachable
  });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // make sure indexes exist
};

module.exports = { mongoose, CI, User, Product, CartItem, Order, init };
