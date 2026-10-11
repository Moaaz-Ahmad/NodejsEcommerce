const crypto = require('crypto');
const store = require('./store')('products', []);

exports.all = async () => {
  const products = await store.read();
  if (products.every((p) => p.id)) return products;
  // one-time migration: products saved before ids existed
  return store.update((list) => list.forEach((p) => { p.id ||= crypto.randomUUID(); }));
};

exports.find = async (id) => (await exports.all()).find((p) => p.id === id);

exports.add = ({ title, price, imageUrl }) =>
  store.update((list) => { list.push({ id: crypto.randomUUID(), title, price, imageUrl }); });

// returns false when the product no longer exists
exports.update = async (id, { title, price, imageUrl }) => {
  let found = false;
  await store.update((list) => {
    const p = list.find((x) => x.id === id);
    if (p) { Object.assign(p, { title, price, imageUrl }); found = true; }
  });
  return found;
};

exports.remove = (id) => store.update((list) => list.filter((p) => p.id !== id));
