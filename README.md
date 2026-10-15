# SimpleCom

A small e-commerce web app built with Express, EJS and MongoDB, following the
Model-View-Controller pattern. Shoppers browse products, manage a cart, check out
and see their order history. Admins add, edit and delete products.

## Features

- **Shop:** product grid with images, product detail pages, and a cart badge in the header.
- **Cart and checkout:** add and remove items, then place an order. Orders keep the
  title and price from the time of purchase.
- **Accounts:** people register and sign in with an email address and a password, and can log out and change
  their password. Passwords are salted and hashed with scrypt, a one-way hash, so they can never be read back.
  Email addresses are stored as readable text, so accounts can be looked up and shown.
- **Persistent login:** the login form has a "Keep me signed in" box (ticked by default). Ticked, the
  login lasts 30 days from your last visit and survives closing the browser and restarting the server.
  Unticked, it ends when the browser closes. Sessions are stored in MongoDB.
- **CSRF protection:** every form carries a secret token, and any request that changes something is refused
  without a valid one and a matching same-site origin (see Security notes).
- **Request limits:** login, registration, password change and the login and register pages are rate limited per
  client, to slow password guessing and mass account creation (see Security notes).
- **Admin:** the account whose email is `ADMIN_EMAIL` can add, edit and delete products.
  Product titles are unique (case-insensitive), so adding an existing title updates that
  product instead of creating a duplicate.

## Requirements

- Node.js (a current LTS release)
- A MongoDB server: local, or a hosted cluster such as MongoDB Atlas

## Getting started

```bash
git clone https://github.com/Moaaz-Ahmad/NodejsEcommerce.git
cd NodejsEcommerce
npm install
cp .env.example .env     # then edit .env (see Configuration)
npm start
```

Open http://localhost:3000. On start the app makes sure the admin account exists: email
`admin@example.com` unless you set `ADMIN_EMAIL`, with the password `admin123` unless you set
`ADMIN_PASSWORD`. Change both before real use. Anyone else can register from the Register page. Logins are remembered for 30 days if you leave "Keep me signed in" ticked,
and they survive restarting the server.

## Configuration

Settings are read from environment variables, or from a `.env` file in the project root.
Never commit `.env`; it is listed in `.gitignore`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string, including the database name. Defaults to `mongodb://127.0.0.1:27017/node-complete`. |
| `SESSION_SECRET` | yes | The secret that signs the session cookie and encrypts the sessions kept in the database. Generate one with `node -p "require('crypto').randomBytes(32).toString('hex')"`. It must stay the same between starts, or everyone is logged out; changing it signs everyone out. `USERNAME_PEPPER`, the name older versions used for this secret, is still accepted when `SESSION_SECRET` is not set. |
| `ADMIN_EMAIL` | no | Email address of the admin account. Default `admin@example.com`. Nobody else can register this address. Whoever signs in with it is the admin (see Security notes). |
| `ADMIN_PASSWORD` | no | Password for the admin account, used only when that account is first created. Default `admin123`. Set a real one before deploying. |
| `SESSION_DAYS` | no | How long "Keep me signed in" lasts, counted from the last visit. Default `30`. |
| `COOKIE_SECURE` | no | Set `true` once the site is served over HTTPS, so the session cookie is only ever sent over HTTPS. Default `false` (plain HTTP works for local development). |
| `TRUST_PROXY` | no | Set `true` when a reverse proxy ends HTTPS in front of the app. It makes secure cookies work, and it is what lets the rate limits see each visitor's real address (otherwise everyone behind the proxy shares one limit) and the Origin check see the real host. The proxy must set `X-Forwarded-For` and pass the original host on. Default `false`. |
| `RATE_LIMIT` | no | Set to `off` to disable the request limits. For load testing only; leave it unset. |
| `PORT` | no | HTTP port. Default `3000`. |

## Project structure

```
server.js              Entry point (npm start): checks settings, connects to MongoDB, seeds the admin, listens
app.js                 Builds the Express app around a session store: views, static files, sessions, routes, error pages
config.js              The only place that reads environment variables / .env
routes/index.js        All URL routes, grouped as public, admin-only and logged-in
controllers/           Request handlers; each reads the request and picks the response
                         auth.js (login, logout, register), account.js (profile, change password),
                         shop.js (products, cart, checkout), admin.js (product management)
services/              Business rules that span models
                         auth.js (log in, register, change password, who is admin),
                         cart.js (cart view, checkout), products.js (delete with cart cleanup)
models/                Data access only
                         schemas.js (Mongoose schemas), user.js, product.js, cart.js, order.js,
                         sessionStore.js (login sessions kept in MongoDB), rateLimit.js (request counts)
lib/                   Small single-purpose helpers
                         validators.js (form checks), credentials.js (password hashing),
                         seal.js (encryption of stored sessions), csrf.js (CSRF tokens, same-origin check), session.js (sign in / out),
                         database.js (connect)
middleware/            auth.js (route guards), session.js (session cookie setup), locals.js (data for every
                       view), csrf.js (CSRF token and same-origin check on every POST), rateLimit.js (request limits),
                       errors.js (404 and 500)
views/                 EJS templates; partials/ holds the shared header, footer and
                       reusable image and cart-item blocks
Public/css/main.css    The single stylesheet (Material Design 3 inspired)
test/                  Unit tests and source guard tests (npm test)
```

Request flow: a route picks a controller. The controller checks input with `lib/validators`,
asks a service (or a model, for a plain read) for the result, and renders a view or redirects.
Each layer has one job and only calls downwards: controllers use services and models, services use
models and helpers, models use only the schemas. Models and services know nothing about HTTP, and
views contain no database calls.

## Routes

| Method | Path | Who | What |
| --- | --- | --- | --- |
| GET | `/login`, `/register` | anyone | Sign-in and sign-up forms |
| POST | `/login`, `/register` | anyone | Submit them |
| POST | `/logout` | signed in | End the session |
| GET | `/` | signed in | Shop |
| GET | `/products/:id` | signed in | Product details |
| GET, POST | `/cart` | signed in | View cart; add a product |
| POST | `/cart/delete` | signed in | Remove a product from the cart |
| GET, POST | `/checkout` | signed in | Review and place an order |
| GET | `/profile` | signed in | Account details and order history |
| GET, POST | `/change-password` | signed in | Change password |
| GET | `/admin/products` | admin | Manage products |
| GET, POST | `/admin/add-product` | admin | Add a product |
| GET, POST | `/admin/edit-product/:id` | admin | Edit a product |
| POST | `/admin/delete-product/:id` | admin | Delete a product |

Every POST must carry the session's CSRF token, as the `_csrf` form field or an `X-CSRF-Token` header, or it is
refused with a 403 before the route runs. The limited routes answer `429 Too Many Requests` with a `Retry-After`
header when a client goes over its limit. Anonymous visitors are redirected to `/login`. Signed-in users who open an admin page get a 403.

## Data

- **products:** `_id`, `title` (unique, case-insensitive), `price`, `imageUrl`, `createdAt`.
- **users:** `_id`, `email` (unique, stored lower-case and readable), `salt`, `passwordHash`, `createdAt`. The password
  itself is never stored. No role is stored: the admin is the account whose email is `ADMIN_EMAIL`.
- **carts:** one document per user and product, with a quantity.
- **orders:** user, total, time, and an embedded list of items (title, price, quantity).
- **ratelimits:** one small document per client and limiter with the request count and when its window ends. MongoDB
  deletes ended windows automatically.
- **sessions:** one document per signed-in browser session: the session id, an opaque user id, an expiry time,
  and the session data, which is **encrypted** (AES-256-GCM), so the database holds no readable email or role.
  MongoDB deletes expired sessions automatically. Sessions hold no passwords. A visitor who has only opened the
  login or register page gets a short-lived session (2 hours) that holds nothing but a CSRF secret. Sessions saved by older versions
  in an older format are deleted when the server starts.

## Upgrading from the username version

Earlier versions identified accounts by a hash of a username, so there is no email address to convert. After
upgrading:

- Accounts made by the old version stay in the database but cannot sign in (they have no email). Their carts and
  orders stay too, but nobody can reach them. People register again with an email address.
- The admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` when the server starts.
- Everyone is signed out once: sessions from the old version are deleted at startup.
- The old unique index on the username hash is dropped automatically at startup (indexes are made to match the
  schemas), which is what lets new accounts be created.
- `SESSION_SECRET` is now the setting. An existing `USERNAME_PEPPER` keeps working in its place, so nothing
  breaks, but rename it when convenient (the value can stay the same, but the derived secret will differ, which
  signs everyone out once more).

## Known limitations

These are deliberate simplifications, not bugs to hide:

- **Request limits are per address.** People who share an address (an office, a campus) share a limit, and an
  attacker with many addresses (a botnet, or the many addresses of one IPv6 range) is not slowed much. There is no
  per-account lockout on purpose: it would let anyone lock a victim out of their own account by guessing wrongly.
  Behind a proxy the limits only work correctly with `TRUST_PROXY=true`. Browsing, the cart and the admin pages are
  not limited.
- **Checkout** saves the order and then clears the cart in two steps. If clearing the cart
  fails, a retry would create a second order. MongoDB only supports multi-document
  transactions on replica sets (Atlas has them).
- **Single admin account.** Admins cannot be created or promoted from the UI.
- **No email verification or password reset.** Anyone can register any address, including one that is not theirs,
  and registration says when an address already has an account. Sign-in does not reveal which addresses exist:
  an unknown address and a wrong password get the same answer and take the same time.
- **Registration is open** to anyone. Add rate limiting before running it on the public internet.

## Security notes

- Passwords use scrypt with a random per-user salt; comparisons are constant-time. Only the hash is stored.
- Email addresses are personal data and are stored as readable text in the `users` collection, because accounts
  are found by them. Protect database access and backups accordingly.
- The admin role is not stored: it is whoever signs in with `ADMIN_EMAIL`. If you change that setting, the new
  address becomes admin (it is created at startup), and the old address becomes an ordinary account at its next
  sign-in. Anyone who registers first could claim an unused address, so set it to an address you control.
- Session cookies are signed, `httpOnly` and `SameSite=Lax`, and `Secure` when `COOKIE_SECURE=true`. A new
  session id is issued at every sign-in, which prevents session fixation.
- Sessions are stored server-side; the cookie holds only a signed random id. Logging out deletes the stored
  session, and expired sessions are rejected and removed.
- Stored sessions are encrypted and authenticated (AES-256-GCM, with a key derived from the session secret and
  the session id bound into each record). Someone who can only read the database sees no emails or roles in sessions, and
  someone who can write to it cannot change a role or copy one session's data into another: the altered
  session simply fails to open and its owner is signed out. The session id, expiry time and an opaque user id
  stay readable on purpose (they are needed for lookups, clean-up and signing a user out everywhere); the id is
  useless without the secret that signs the cookie. Changing `SESSION_SECRET` makes stored sessions
  unreadable, which signs everyone out.
- Changing a password signs out every other device that user was logged in on.
- **Request limits** (stored in MongoDB, so they hold across restarts and several processes; no extra package).
  Per address: 10 login attempts per 15 minutes, 5 registrations per hour, and 60 loads of the login and register
  pages per 15 minutes (each load stores a small anonymous session, so this caps how many a single address can make).
  Per user: 5 password-change attempts per 15 minutes (guessing the current password with a stolen session).
  Counting is one atomic database update, so simultaneous requests cannot slip past. Over the limit, the request
  gets a 429 before any password is checked. Login attempts count whether or not they succeed. Requests refused by
  the CSRF check are not counted, so they cannot be used to use up someone else's limit.
- **CSRF protection** (synchronizer tokens, no extra package). Each session has a random secret, kept inside the
  encrypted session. Every form includes a token made from a fresh random salt plus an HMAC of it under that
  secret. The server refuses any POST (or other non-GET request) whose token is missing, altered, repeated, or made
  for a different session, with a 403, before any route runs, and compares in constant time. Details:
  - Tokens differ on every page render, so compression attacks such as BREACH cannot learn them, yet every token
    stays valid for the session, so several tabs and the back button keep working.
  - Login and registration are protected too, which stops an attacker signing a victim in to the attacker's account.
  - Signing in or out replaces the session, so a token seen before that is useless afterwards.
  - A second check runs before the token: the browser's own `Sec-Fetch-Site` and `Origin` headers must say the
    request came from this site. `cross-site` and `same-site` (a sibling subdomain) are refused, as is an Origin
    of `null` or another host or port, even when the token and cookie are right. Requests that send neither header
    (curl, old browsers) are decided by the token alone. This is in addition to `SameSite=Lax` cookies, which keep
    browsers from sending the cookie on cross-site POSTs.
  - Nothing that changes data may use GET, because GET requests are not checked. `npm test` enforces the rules
    that keep this true: it fails if a POST form is missing its token, if a GET handler writes anything, if a route
    uses any method but GET and POST, if the CSRF check is moved after the routes, or if a limited route loses its
    limit.
  - A form left open longer than its session lives (2 hours for visitors who have not signed in) is refused with a
    "Form expired" page; reloading the page gives a fresh token.
- A "Keep me signed in" cookie is a long-lived credential: anyone who copies it can act as that user until it
  expires or the user logs out or changes their password. Serve the site over HTTPS and set `COOKIE_SECURE=true`.
- User-provided text is HTML-escaped by EJS.
- Image URLs must start with `http://` or `https://`.
- Form input is checked on the server, not only in the browser.

For production, set `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `MONGODB_URI`, serve the app over
HTTPS with `COOKIE_SECURE=true`, and address the limitations above.

## Development

```bash
npm start    # runs server.js on port 3000 (or PORT)
npm test     # unit tests (validators, hashing, encryption, CSRF tokens, same-origin check, rate limiting) and source guards (no database needed)
```

The unit tests cover the pure modules only. For everything else, check changes by running the app and
exercising the flows above (log in as admin and as a regular user, add a product, add it to a cart,
check out, and try an admin page as a regular user).

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report bugs,
propose changes and submit a pull request.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text and
[NOTICE](NOTICE) for copyright and third-party attributions.
