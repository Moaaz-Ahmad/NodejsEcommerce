const crypto = require('crypto');

// Two fixed profiles. Override the default passwords with ADMIN_PASSWORD / USER_PASSWORD.
const users = {
  admin: { role: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' },
  user: { role: 'user', password: process.env.USER_PASSWORD || 'user123' },
};

const digest = (s) => crypto.createHash('sha256').update(s).digest(); // equal length for timingSafeEqual

// returns { username, role } or null
exports.authenticate = (username, password) => {
  const u = Object.hasOwn(users, username) ? users[username] : null;
  if (!u || !crypto.timingSafeEqual(digest(String(password)), digest(u.password))) return null;
  return { username, role: u.role };
};
