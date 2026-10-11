const crypto = require('crypto');
const store = require('./store')('orders', []);

// items are snapshots ({ title, price, qty }) so later product edits/deletes don't rewrite history
exports.place = (username, items) =>
  store.update((orders) => {
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    orders.push({ id: crypto.randomUUID(), username, items, total, placedAt: new Date().toISOString() });
  });

exports.forUser = async (username) =>
  (await store.read()).filter((o) => o.username === username).reverse();
