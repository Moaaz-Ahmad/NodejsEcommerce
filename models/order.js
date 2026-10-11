const crypto = require('crypto');
const db = require('./db');

// items are snapshots ({ title, price, qty }) so later product edits/deletes don't rewrite history.
// Order insert and cart clear commit together, so a failure never leaves a paid-for cart behind.
exports.place = async (username, items) => {
  const id = crypto.randomUUID();
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT INTO orders (id, username, total) VALUES (?, ?, ?)', [id, username, total]);
    await conn.query('INSERT INTO order_items (orderId, title, price, qty) VALUES ?',
      [items.map((i) => [id, i.title, i.price, i.qty])]);
    await conn.query('DELETE FROM cart WHERE username = ?', [username]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// newest first, each with its items
exports.forUser = async (username) => {
  const [orders] = await db.query('SELECT id, total, placedAt FROM orders WHERE username = ? ORDER BY placedAt DESC', [username]);
  if (!orders.length) return [];
  const [items] = await db.query(
    'SELECT orderId, title, price, qty FROM order_items WHERE orderId IN (?) ORDER BY id', [orders.map((o) => o.id)]);
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
};
