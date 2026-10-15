// Unit tests for the pure modules: form validation, password hashing, stored-data encryption, CSRF tokens, the same-origin check and rate limiting. Run with: npm test
// (no database or server needed; a throwaway secret is set when none is configured)
process.env.SESSION_SECRET ||= 'test-session-secret';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistration, validatePasswordChange, validateProduct, normalizeEmail } = require('../lib/validators');
const credentials = require('../lib/credentials');
const { seal, unseal } = require('../lib/seal');
const csrf = require('../lib/csrf');
const limit = require('../middleware/rateLimit');

const GOOD = { password: 'password123', confirm: 'password123' };

test('email: is trimmed and lower-cased, so spelling variants are one account', () => {
  assert.equal(normalizeEmail('  Alice@Example.COM '), 'alice@example.com');
  assert.equal(normalizeEmail(undefined), '');
  assert.equal(normalizeEmail(null), '');
});

test('registration: accepts a good email and password, and normalises the email', () => {
  const { value, error } = validateRegistration({ ...GOOD, email: '  Alice.Smith+shop@Example.com ' });
  assert.equal(error, undefined);
  assert.equal(value.email, 'alice.smith+shop@example.com');
});

test('registration: rejects things that are not email addresses', () => {
  for (const email of ['', 'alice', 'alice@', '@example.com', 'alice@example', 'alice@@example.com', 'ali ce@example.com',
    'alice@exa mple.com', 'alice@example.', `${'a'.repeat(250)}@x.com`]) {
    assert.match(validateRegistration({ ...GOOD, email }).error, /valid email/, `should reject: ${email}`);
  }
});

test('registration: rejects short or long passwords and a mismatched confirmation', () => {
  const ok = { email: 'alice@example.com' };
  assert.match(validateRegistration({ ...ok, password: 'short', confirm: 'short' }).error, /Password must/);
  assert.match(validateRegistration({ ...ok, password: 'x'.repeat(129), confirm: 'x'.repeat(129) }).error, /Password must/);
  assert.match(validateRegistration({ ...ok, password: 'password123', confirm: 'different1' }).error, /do not match/);
});

test('registration: a missing or repeated form field cannot crash it', () => {
  assert.ok(validateRegistration({}).error);
  assert.ok(validateRegistration({ email: ['a@b.co', 'c@d.co'], password: ['password123'], confirm: 'x' }).error);
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

test('credentials: every password gets its own salt, and only a hash is kept', async () => {
  const a = await credentials.makeCredentials('same password');
  const b = await credentials.makeCredentials('same password');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.passwordHash, b.passwordHash);
  assert.match(a.passwordHash, /^[0-9a-f]{128}$/);
  assert.ok(!JSON.stringify(a).includes('same password'));
});

test('seal: round-trips text, and the output shows none of it', () => {
  const session = JSON.stringify({ user: { id: 'u1', email: 'alice@example.com', role: 'admin' }, remember: true });
  const sealed = seal(session, 'sid-1');
  assert.equal(unseal(sealed, 'sid-1'), session);
  for (const word of ['alice', 'example.com', 'admin', 'role', 'email']) assert.ok(!sealed.includes(word), word + ' is readable in the sealed value');
  assert.match(sealed, /^v2([.][A-Za-z0-9_-]+){3}$/); // version, iv, tag, ciphertext
});

test('seal: the same text seals differently each time', () => {
  assert.notEqual(seal('same', 'sid'), seal('same', 'sid'));
});

test('seal: an altered value is rejected, wherever it is altered', () => {
  const [v, iv, tag, ct] = seal('{"role":"user"}', 'sid').split('.');
  const flip = (b64) => (b64[0] === 'A' ? 'B' : 'A') + b64.slice(1);
  assert.equal(unseal([v, flip(iv), tag, ct].join('.'), 'sid'), null);
  assert.equal(unseal([v, iv, flip(tag), ct].join('.'), 'sid'), null);
  assert.equal(unseal([v, iv, tag, flip(ct)].join('.'), 'sid'), null);
});

test('seal: a value cannot be moved to another session id', () => {
  const sealed = seal('{"role":"admin"}', 'admins-session');
  assert.equal(unseal(sealed, 'someone-elses-session'), null);
  assert.equal(unseal(sealed, 'admins-session'), '{"role":"admin"}');
});

test('seal: sessions from older formats are rejected (readable text, and sealed ones from before email accounts)', () => {
  assert.equal(unseal('{"user":{"username":"admin","role":"admin"}}', 'sid'), null); // the first, readable format
  const v1 = seal('{"user":{"username":"admin","role":"admin"}}', 'sid').replace('v2.', 'v1.');
  assert.equal(unseal(v1, 'sid'), null); // a correctly sealed value, but in the old version
});

test('seal: things that are not sealed values (junk, truncated tags) give null, not an error', () => {
  for (const junk of ['', 'v2', 'v2...', 'v3.a.b.c', 'a.b.c.d', undefined, null, 'v2.AAAA.AAAA.AAAA']) assert.equal(unseal(junk, 'sid'), null);
  const [v, iv, , ct] = seal('x', 'sid').split('.');
  assert.equal(unseal([v, iv, 'AAAA', ct].join('.'), 'sid'), null); // a shortened authentication tag is not accepted
});

test('csrf: a token made from a secret verifies against that secret', () => {
  const secret = csrf.newSecret();
  assert.equal(csrf.verifyToken(secret, csrf.makeToken(secret)), true);
});

test('csrf: every token is different, yet all of them verify (several tabs, back button)', () => {
  const secret = csrf.newSecret();
  const tokens = Array.from({ length: 5 }, () => csrf.makeToken(secret));
  assert.equal(new Set(tokens).size, 5);
  for (const t of tokens) assert.equal(csrf.verifyToken(secret, t), true);
});

test('csrf: a token only works for its own session (another secret is refused)', () => {
  const a = csrf.newSecret();
  const b = csrf.newSecret();
  assert.notEqual(a, b);
  assert.equal(csrf.verifyToken(b, csrf.makeToken(a)), false);
});

test('csrf: the token does not contain the secret', () => {
  const secret = csrf.newSecret();
  assert.ok(!csrf.makeToken(secret).includes(secret));
});

test('csrf: altered, truncated or malformed tokens are refused', () => {
  const secret = csrf.newSecret();
  const [salt, tag] = csrf.makeToken(secret).split('.');
  const flip = (v) => (v[0] === 'A' ? 'B' : 'A') + v.slice(1);
  assert.equal(csrf.verifyToken(secret, flip(salt) + '.' + tag), false);
  assert.equal(csrf.verifyToken(secret, salt + '.' + flip(tag)), false);
  assert.equal(csrf.verifyToken(secret, salt + '.' + tag.slice(0, -1)), false);
  assert.equal(csrf.verifyToken(secret, salt + '.' + tag + 'x'), false);
  for (const bad of ['', '.', salt, salt + '.', '.' + tag, salt + '.' + tag + '.extra', 'a.b.c']) {
    assert.equal(csrf.verifyToken(secret, bad), false, 'should refuse: ' + bad);
  }
});

test('csrf: missing values and non-strings are refused, not an error', () => {
  const secret = csrf.newSecret();
  const token = csrf.makeToken(secret);
  for (const bad of [undefined, null, 0, {}, [token], [token, token]]) assert.equal(csrf.verifyToken(secret, bad), false);
  for (const noSecret of [undefined, null, '', 123]) assert.equal(csrf.verifyToken(noSecret, token), false);
});

test('csrf: a token cannot be forged without the secret', () => {
  const secret = csrf.newSecret();
  const forged = 'someSalt.' + Buffer.alloc(32).toString('base64url');
  assert.equal(csrf.verifyToken(secret, forged), false);
});

const host = 'shop.example.com';

test('same-origin: requests from our own host pass, from other hosts or ports do not', () => {
  assert.equal(csrf.isSameOrigin({ origin: 'https://shop.example.com', host }), true);
  assert.equal(csrf.isSameOrigin({ origin: 'http://shop.example.com', host }), true); // the scheme is not compared, the host is
  assert.equal(csrf.isSameOrigin({ origin: 'https://evil.example', host }), false);
  assert.equal(csrf.isSameOrigin({ origin: 'https://shop.example.com.evil.example', host }), false);
  assert.equal(csrf.isSameOrigin({ origin: 'https://evil.example/shop.example.com', host }), false);
  assert.equal(csrf.isSameOrigin({ origin: 'https://shop.example.com:8443', host }), false); // another port is another origin
  assert.equal(csrf.isSameOrigin({ origin: 'http://localhost:3000', host: 'localhost:3000' }), true);
});

test('same-origin: "null", junk and empty Origin values are refused', () => {
  for (const origin of ['null', '', 'not a url', 'javascript:alert(1)', 'https://']) {
    assert.equal(csrf.isSameOrigin({ origin, host }), false, 'should refuse: ' + origin);
  }
});

test('same-origin: with no Origin and no Sec-Fetch-Site the token alone decides (curl, old browsers)', () => {
  assert.equal(csrf.isSameOrigin({ host }), true);
});

test('same-origin: Sec-Fetch-Site must say same-origin or none', () => {
  assert.equal(csrf.isSameOrigin({ secFetchSite: 'same-origin', host }), true);
  assert.equal(csrf.isSameOrigin({ secFetchSite: 'none', host }), true);
  assert.equal(csrf.isSameOrigin({ secFetchSite: 'cross-site', host }), false);
  assert.equal(csrf.isSameOrigin({ secFetchSite: 'same-site', host }), false); // a sibling subdomain may not be ours
  assert.equal(csrf.isSameOrigin({ secFetchSite: '', host }), false);
});

test('same-origin: both headers have to agree (one honest header does not excuse a bad one)', () => {
  assert.equal(csrf.isSameOrigin({ origin: 'https://evil.example', secFetchSite: 'same-origin', host }), false);
  assert.equal(csrf.isSameOrigin({ origin: 'https://shop.example.com', secFetchSite: 'cross-site', host }), false);
  assert.equal(csrf.isSameOrigin({ origin: 'https://shop.example.com', secFetchSite: 'same-origin', host }), true);
});

// a stand-in for the database counter, with the same contract as models/rateLimit.hit
const fakeHit = () => {
  const windows = new Map();
  return async (key, windowMs) => {
    const now = Date.now();
    let w = windows.get(key);
    if (!w || w.resetAt <= now) { w = { count: 0, resetAt: now + windowMs }; windows.set(key, w); }
    w.count += 1;
    return { count: w.count, resetAt: new Date(w.resetAt) };
  };
};
const mockRes = () => ({ headers: {}, set(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, render(view, locals) { this.view = view; this.locals = locals; } });
// runs the middleware once and reports whether the request was let through
const attempt = async (mw, req = { ip: '203.0.113.5' }) => {
  const res = mockRes();
  let passed = false;
  await mw(req, res, () => { passed = true; });
  return { passed, res };
};

test('rate limit: lets max requests through, then answers 429 with Retry-After and an error page', async () => {
  const mw = limit('t1', 60000, 3, undefined, fakeHit());
  for (let i = 0; i < 3; i += 1) assert.equal((await attempt(mw)).passed, true);
  const { passed, res } = await attempt(mw);
  assert.equal(passed, false);
  assert.equal(res.code, 429);
  assert.equal(res.view, 'error');
  assert.match(res.locals.message, /Please wait/);
  const retry = Number(res.headers['Retry-After']);
  assert.ok(retry >= 1 && retry <= 60, 'Retry-After should be within the window, got ' + retry);
  assert.equal((await attempt(mw)).passed, false); // and it stays refused for the rest of the window
});

test('rate limit: each client has its own count', async () => {
  const mw = limit('t2', 60000, 1, undefined, fakeHit());
  assert.equal((await attempt(mw, { ip: '198.51.100.1' })).passed, true);
  assert.equal((await attempt(mw, { ip: '198.51.100.1' })).passed, false);
  assert.equal((await attempt(mw, { ip: '198.51.100.2' })).passed, true);
});

test('rate limit: different limiters do not share a count, even for the same client', async () => {
  const hit = fakeHit();
  const a = limit('login', 60000, 1, undefined, hit);
  const b = limit('register', 60000, 1, undefined, hit);
  assert.equal((await attempt(a)).passed, true);
  assert.equal((await attempt(a)).passed, false);
  assert.equal((await attempt(b)).passed, true);
});

test('rate limit: can count by something other than the address, such as a user id', async () => {
  const mw = limit('pw', 60000, 1, (req) => req.session.user.id, fakeHit());
  const same = (id) => ({ ip: '203.0.113.9', session: { user: { id } } }); // same address, different users
  assert.equal((await attempt(mw, same('u1'))).passed, true);
  assert.equal((await attempt(mw, same('u1'))).passed, false);
  assert.equal((await attempt(mw, same('u2'))).passed, true);
});

test('rate limit: a new window starts when the old one ends', async () => {
  const mw = limit('t3', 30, 1, undefined, fakeHit());
  assert.equal((await attempt(mw)).passed, true);
  assert.equal((await attempt(mw)).passed, false);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal((await attempt(mw)).passed, true);
});

test('rate limit: the wait is told in seconds when short and minutes when long', async () => {
  const fixed = (secondsLeft) => async () => ({ count: 99, resetAt: new Date(Date.now() + secondsLeft * 1000) });
  assert.match((await attempt(limit('t4', 1, 1, undefined, fixed(30)))).res.locals.message, /wait [0-9]+ seconds?/);
  assert.match((await attempt(limit('t5', 1, 1, undefined, fixed(600)))).res.locals.message, /wait [0-9]+ minutes/);
});

test('rate limit: a failing counter is an error for the caller, not a free pass', async () => {
  const broken = async () => { throw new Error('database down'); };
  await assert.rejects(attempt(limit('t6', 1000, 1, undefined, broken)), /database down/);
});
