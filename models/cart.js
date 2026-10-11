const store = require('./store')('carts', {});

// carts are { username: [{ productId, qty }] }
exports.get = async (username) => (await store.read())[username] || [];

exports.add = (username, productId) =>
  store.update((carts) => {
    const items = (carts[username] ||= []);
    const item = items.find((i) => i.productId === productId);
    if (item) item.qty += 1;
    else items.push({ productId, qty: 1 });
  });

exports.remove = (username, productId) =>
  store.update((carts) => {
    carts[username] = (carts[username] || []).filter((i) => i.productId !== productId);
  });

exports.clear = (username) => store.update((carts) => { delete carts[username]; });

// drops a deleted product from every user's cart
exports.removeEverywhere = (productId) =>
  store.update((carts) => {
    for (const user of Object.keys(carts)) carts[user] = carts[user].filter((i) => i.productId !== productId);
  });

// badge count: only entries whose product still exists (covers carts saved before cascade delete)
exports.count = async (username) => {
  const [items, products] = await Promise.all([exports.get(username), require('./product').all()]);
  const ids = new Set(products.map((p) => p.id));
  return items.filter((i) => ids.has(i.productId)).reduce((n, i) => n + i.qty, 0);
};
