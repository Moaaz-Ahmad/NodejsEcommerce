const crypto = require('crypto');
const db = require('./db');

const COLS = 'id, title, price, imageUrl';
const isDuplicate = (err) => err.code === 'ER_DUP_ENTRY';

exports.all = async () => (await db.query(`SELECT ${COLS} FROM products ORDER BY createdAt, title`))[0];

exports.find = async (id) => (await db.query(`SELECT ${COLS} FROM products WHERE id = ?`, [id]))[0][0];

// product name is the unique key (UNIQUE index, case-insensitive): an existing name is updated instead of duplicated
// returns true if a new product was created, false if an existing one was updated
exports.upsert = async ({ title, price, imageUrl }) => {
  try {
    await db.query('INSERT INTO products (id, title, price, imageUrl) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), title, price, imageUrl]);
    return true;
  } catch (err) {
    if (!isDuplicate(err)) throw err;
    await db.query('UPDATE products SET title = ?, price = ?, imageUrl = ? WHERE title = ?',
      [title, price, imageUrl, title]);
    return false;
  }
};

// returns 'ok' | 'missing' | 'duplicate' (another product already uses that name)
exports.update = async (id, { title, price, imageUrl }) => {
  if (!(await exports.find(id))) return 'missing';
  try {
    await db.query('UPDATE products SET title = ?, price = ?, imageUrl = ? WHERE id = ?', [title, price, imageUrl, id]);
    return 'ok';
  } catch (err) {
    if (isDuplicate(err)) return 'duplicate';
    throw err;
  }
};

// cart rows referencing the product are removed by the ON DELETE CASCADE foreign key
exports.remove = (id) => db.query('DELETE FROM products WHERE id = ?', [id]);
