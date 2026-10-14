// Unit tests for the pure modules: form validation and credential hashing. Run with: npm test
// (no database or server needed; the hashing needs a secret, so a throwaway one is set when none is configured)
process.env.USERNAME_PEPPER ||= 'test-pepper';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistration, validatePasswordChange, validateProduct } = require('../lib/validators');
const credentials = require('../lib/credentials');

test('registration: accepts a good username and password, and trims the username', () => {
  const { value, error } = validateRegistration({ username: '  Alice_1  ', password: 'password123', confirm: 'password123' });
  assert.equal(error, undefined);
  assert.equal(value.username, 'Alice_1');
});

test('registration: rejects bad usernames, short passwords and mismatched confirmation', () => {
  const ok = { password: 'password123', confirm: 'password123' };
  assert.match(validateRegistration({ ...ok, username: 'ab' }).error, /Username/);
  assert.match(validateRegistration({ ...ok, username: 'bad name!' }).error, /Username/);
  assert.match(validateRegistration({ ...ok, username: 'x'.repeat(33) }).error, /Username/);
  assert.match(validateRegistration({ username: 'alice', password: 'short', confirm: 'short' }).error, /Password must/);
  assert.match(validateRegistration({ username: 'alice', password: 'x'.repeat(129), confirm: 'x'.repeat(129) }).error, /Password must/);
  assert.match(validateRegistration({ username: 'alice', password: 'password123', confirm: 'different1' }).error, /do not match/);
});

test('registration: a missing or repeated form field cannot crash it', () => {
  assert.ok(validateRegistration({}).error);
  assert.ok(validateRegistration({ username: ['a', 'b'], password: ['password123'], confirm: 'x' }).error);
});

test('password change: checks length, confirmation and that the password actually changes', () => {
  assert.equal(validatePasswordChange({ current: 'oldpassword', password: 'newpassword', confirm: 'newpassword' }).error, undefined);
  assert.match(validatePasswordChange({ current: 'oldpassword', password: 'short', confirm: 'short' }).error, /8 to 128/);
  assert.match(validatePasswordChange({ current: 'oldpassword', password: 'newpassword', confirm: 'other-one' }).error, /do not match/);
  assert.match(validatePasswordChange({ current: 'samepassword', password: 'samepassword', confirm: 'samepassword' }).error, /different/);
});

test('product: accepts valid input and tidies it', () => {
  const { value, error } = validateProduct({ title: '  Book  ', price: '12.50', imageUrl: ' https://x.com/a.jpg ' });
  assert.equal(error, undefined);
  assert.deepEqual(value, { title: 'Book', price: 12.5, imageUrl: 'https://x.com/a.jpg' });
  assert.equal(validateProduct({ title: 'Book', price: '0' }).error, undefined); // free is allowed, no image is allowed
});

test('product: rejects a missing title, bad price, long values and non-http image links', () => {
  assert.match(validateProduct({ title: '', price: '1' }).error, /title/i);
  assert.match(validateProduct({ title: 'Book', price: '-1' }).error, /price/);
  assert.match(validateProduct({ title: 'Book', price: 'abc' }).error, /price/);
  assert.match(validateProduct({ title: 'x'.repeat(201), price: '1' }).error, /200/);
  assert.match(validateProduct({ title: 'Book', price: '1', imageUrl: 'x'.repeat(2049) }).error, /too long/);
  assert.match(validateProduct({ title: 'Book', price: '1', imageUrl: 'javascript:alert(1)' }).error, /http/);
  assert.ok(validateProduct({ title: ['a', 'b'], price: '1' }).value.title); // repeated field becomes text, not a crash
});

test('credentials: the right password verifies, a wrong one or an unknown user does not', async () => {
  const stored = await credentials.makeCredentials('correct horse');
  assert.equal(await credentials.verifyPassword('correct horse', stored), true);
  assert.equal(await credentials.verifyPassword('wrong horse', stored), false);
  assert.equal(await credentials.verifyPassword('correct horse', null), false);
});

test('credentials: every password gets its own salt, so equal passwords hash differently', async () => {
  const a = await credentials.makeCredentials('same password');
  const b = await credentials.makeCredentials('same password');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.passwordHash, b.passwordHash);
  assert.match(a.passwordHash, /^[0-9a-f]{128}$/);
});

test('credentials: the username hash ignores case and spaces but tells different names apart', () => {
  const h = credentials.usernameHash;
  assert.equal(h('Alice'), h('  alice '));
  assert.notEqual(h('alice'), h('alice2'));
  assert.match(h('alice'), /^[0-9a-f]{64}$/);
  assert.ok(h(undefined)); // missing input still gives a hash, not a crash
});
