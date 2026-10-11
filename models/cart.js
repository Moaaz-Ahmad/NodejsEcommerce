const db = require('./db');

// returns [{ productId, qty }]
exports.get = async (username) =>
  (await db.query('SELECT productId, qty FROM cart WHERE username = ?', [username]))[0];

exports.add = (username, productId) =>
  db.query('INSERT INTO cart (username, productId, qty) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE qty = qty + 1',
    [username, productId]);

exports.remove = (username, productId) =>
  db.query('DELETE FROM cart WHERE username = ? AND productId = ?', [username, productId]);

// badge count: total quantity in the user's cart (deleted products are already gone via the cascade)
exports.count = async (username) =>
  Number((await db.query('SELECT COALESCE(SUM(qty), 0) n FROM cart WHERE username = ?', [username]))[0][0].n);
