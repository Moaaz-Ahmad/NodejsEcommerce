const crypto = require('crypto');
const store = require('./store')('products', []);

exports.all = async () => {
  const products = await store.read();
  if (products.every((p) => p.id)) return products;
  // one-time migration: products saved before ids existed
  return store.update((list) => list.forEach((p) => { p.id ||= crypto.randomUUID(); }));
};

exports.find = async (id) => (await exports.all()).find((p) => p.id === id);

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// product name is the unique key (case-insensitive): an existing name is updated instead of duplicated
// returns true if a new product was created, false if an existing one was updated
exports.upsert = async ({ title, price, imageUrl }) => {
  let created = false;
  await store.update((list) => {
    const p = list.find((x) => same(x.title, title));
    if (p) Object.assign(p, { title, price, imageUrl });
    else { list.push({ id: crypto.randomUUID(), title, price, imageUrl }); created = true; }
  });
  return created;
};

// returns 'ok' | 'missing' | 'duplicate' (another product already uses that name)
exports.update = async (id, { title, price, imageUrl }) => {
  let result = 'missing';
  await store.update((list) => {
    const p = list.find((x) => x.id === id);
    if (!p) return;
    if (list.some((x) => x.id !== id && same(x.title, title))) { result = 'duplicate'; return; }
    Object.assign(p, { title, price, imageUrl });
    result = 'ok';
  });
  return result;
};

exports.remove = (id) => store.update((list) => list.filter((p) => p.id !== id));
