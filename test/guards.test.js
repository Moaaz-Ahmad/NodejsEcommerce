// Guard rails: tests that read the source and fail when a rule the security of the app depends on is broken.
// They need no database or server. The rules:
//  - every POST form carries the CSRF token (or the server would refuse it, and a future form could forget);
//  - nothing that changes data is reachable by GET (GET requests are not checked for a token);
//  - the CSRF check runs before any route, and the login-type routes keep their request limits.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
// a view's markup with its comments removed: text inside a comment can talk about forms but can't submit one
const withoutViewComments = (html) => html.replace(/<%#[\s\S]*?%>/g, '').replace(/<!--[\s\S]*?-->/g, '');
const withoutComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

// ---------------------------------------------------------------- views

test('guard: every POST form in the views includes the CSRF token', () => {
  const views = walk('views').filter((f) => f.endsWith('.ejs'));
  let postForms = 0;
  for (const file of views) {
    const text = withoutViewComments(read(file));
    for (const match of text.matchAll(/<form\b[^>]*>/gi)) {
      const tag = match[0];
      // a method that is only known at render time can't be checked here, so it isn't allowed
      assert.ok(!/method\s*=\s*["']?\s*<%/i.test(tag), `${file}: write the form method out ("GET" or "POST") so it can be checked`);
      if (!/method\s*=\s*["']?\s*post/i.test(tag)) continue;
      postForms += 1;
      const body = text.slice(match.index, text.indexOf('</form>', match.index));
      assert.match(body, /include\(\s*['"](\.\.\/partials\/)?csrf['"]\s*\)/,
        `${file}: a POST form is missing the CSRF token. Add <%- include('../partials/csrf') %> inside it`);
    }
  }
  assert.ok(postForms >= 10, `expected to find the app's POST forms, found ${postForms} (is the check looking in the right place?)`);
});

test('guard: no page sends data with JavaScript (which would bypass the form token)', () => {
  for (const file of walk('views').filter((f) => f.endsWith('.ejs'))) {
    assert.ok(!/\bfetch\(|XMLHttpRequest|\.ajax\(/.test(withoutViewComments(read(file))), `${file}: uses script requests; they would need to send the CSRF token`);
  }
});

// ---------------------------------------------------------------- routes

// every route in routes/index.js: { method, path, handler, middleware }
const routes = () => [...read('routes/index.js').matchAll(/\b(?:router|adminRouter)\.(get|post|put|patch|delete|all)\(\s*'([^']+)'\s*,([^;]*)\);/g)]
  .map(([, method, route, args]) => {
    const parts = args.split(',').map((p) => p.trim());
    return { method, route, handler: parts.pop(), middleware: parts };
  });

test('guard: routes only use GET and POST, and the handler names say which', () => {
  const all = routes();
  assert.ok(all.length >= 20, `expected to find the app's routes, found ${all.length}`);
  for (const { method, route, handler } of all) {
    assert.ok(method === 'get' || method === 'post', `${method.toUpperCase()} ${route}: only GET and POST are used (PUT, PATCH, DELETE and all() are not)`);
    const name = handler.split('.').pop();
    assert.ok(name.startsWith(method), `${method.toUpperCase()} ${route} is served by ${handler}: name handlers get... for GET and post... for POST`);
  }
});

test('guard: handlers that answer GET never change anything', () => {
  // calls and assignments that write: to the database, the cart, the account, or the session
  const WRITES = ['.create(', '.upsert(', '.update(', '.updateOne(', '.remove(', '.add(', '.clear(', '.deleteOne(', '.deleteMany(',
    '.changePassword(', '.register(', '.checkout(', '.place(', 'signIn(', 'signOut(', 'signOutOtherDevices(',
    'session.destroy', 'session.regenerate', 'session.user =', 'session.flash =', 'session.remember ='];
  let getHandlers = 0;
  for (const file of walk('controllers').filter((f) => f.endsWith('.js'))) {
    const code = withoutComments(read(file));
    const starts = [...code.matchAll(/^exports\.(\w+) = /gm)];
    starts.forEach((m, i) => {
      if (!m[1].startsWith('get')) return;
      getHandlers += 1;
      const body = code.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : code.length);
      for (const write of WRITES) assert.ok(!body.includes(write), `${file}: ${m[1]} answers GET but contains "${write}". Changes must be made by POST`);
    });
  }
  assert.ok(getHandlers >= 9, `expected to find the GET handlers, found ${getHandlers}`);
});

test('guard: the routes that guess-able secrets pass through keep their request limits', () => {
  const byKey = Object.fromEntries(routes().map((r) => [`${r.method} ${r.route}`, r.middleware.join(' ')]));
  const required = {
    'post /login': 'loginLimit',
    'post /register': 'registerLimit',
    'post /change-password': 'passwordLimit',
    'get /login': 'formPageLimit',
    'get /register': 'formPageLimit',
  };
  for (const [route, limiter] of Object.entries(required)) {
    assert.ok((byKey[route] || '').includes(limiter), `${route} must stay behind ${limiter}`);
  }
});

// ---------------------------------------------------------------- app

test('guard: the CSRF check is mounted after the session and form parser, and before any route', () => {
  const app = withoutComments(read('app.js'));
  const at = (needle) => {
    const i = app.indexOf(needle);
    assert.ok(i >= 0, `app.js should contain ${needle}`);
    return i;
  };
  const parser = at('express.urlencoded');
  const session = at('app.use(sessions(');
  const csrf = at('app.use(csrf)');
  const routesMounted = at("app.use(require('./routes'))");
  assert.ok(parser < csrf, 'the form parser must run before the CSRF check (the token is in the form)');
  assert.ok(session < csrf, 'the session must exist before the CSRF check (the secret is in it)');
  assert.ok(csrf < routesMounted, 'the CSRF check must run before the routes');
});

test('guard: the CSRF middleware checks every method except the read-only ones', () => {
  const code = withoutComments(read('middleware/csrf.js'));
  assert.match(code, /new Set\(\['GET', 'HEAD', 'OPTIONS'\]\)/, 'only GET, HEAD and OPTIONS may skip the check');
});
