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
