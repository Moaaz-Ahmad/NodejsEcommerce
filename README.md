# SimpleCom

A small e-commerce web app built with Express, EJS and MongoDB, following the
Model-View-Controller pattern. Shoppers browse products, manage a cart, check out
and see their order history. Admins add, edit and delete products.

## Features

- **Shop:** product grid with images, product detail pages, and a cart badge in the header.
- **Cart and checkout:** add and remove items, then place an order. Orders keep the
  title and price from the time of purchase.
- **Accounts:** public registration, login, logout and password change. Passwords are
  salted and hashed with scrypt; usernames are stored as an HMAC so the database never
  holds them in plain text for lookup.
- **Persistent login:** the login form has a "Keep me signed in" box (ticked by default). Ticked, the
  login lasts 30 days from your last visit and survives closing the browser and restarting the server.
  Unticked, it ends when the browser closes. Sessions are stored in MongoDB.
- **Admin:** the account named by `ADMIN_USERNAME` can add, edit and delete products.
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

Open http://localhost:3000. On first start the app creates the admin account
(username `admin` unless you set `ADMIN_USERNAME`). Anyone else can register from the
Register page. Logins are remembered for 30 days if you leave "Keep me signed in" ticked,
and they survive restarting the server.

## Configuration

Settings are read from environment variables, or from a `.env` file in the project root.
Never commit `.env`; it is listed in `.gitignore`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string, including the database name. Defaults to `mongodb://127.0.0.1:27017/node-complete`. |
| `USERNAME_PEPPER` | yes | Secret key for hashing usernames. Generate one with `node -p "require('crypto').randomBytes(32).toString('hex')"`. **Changing it after accounts exist locks those users out.** |
| `ADMIN_USERNAME` | no | Name of the admin account. Default `admin`. This name cannot be registered by anyone else. |
| `ADMIN_PASSWORD` | no | Password for the admin account, used only when it is first created. Default `admin123`. Set a real one before deploying. |
| `SESSION_SECRET` | no | Secret for signing session cookies. If unset, it is derived from `USERNAME_PEPPER`, so it is the same on every start and logins survive restarts. Set it to use a separate secret. Changing it logs everyone out. |
| `SESSION_DAYS` | no | How long "Keep me signed in" lasts, counted from the last visit. Default `30`. |
| `COOKIE_SECURE` | no | Set `true` once the site is served over HTTPS, so the session cookie is only ever sent over HTTPS. Default `false` (plain HTTP works for local development). |
| `TRUST_PROXY` | no | Set `true` when a reverse proxy ends HTTPS in front of the app, so secure cookies work. Default `false`. |
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
                         sessionStore.js (login sessions kept in MongoDB)
lib/                   Small single-purpose helpers
                         validators.js (form checks), credentials.js (password and username hashing),
                         session.js (sign in / out), database.js (connect)
middleware/            auth.js (route guards), session.js (session cookie setup), locals.js (data for every
                       view), errors.js (404 and 500)
views/                 EJS templates; partials/ holds the shared header, footer and
                       reusable image and cart-item blocks
Public/css/main.css    The single stylesheet (Material Design 3 inspired)
test/                  Unit tests (npm test)
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

Anonymous visitors are redirected to `/login`. Signed-in users who open an admin page get a 403.

## Data

- **products:** `_id`, `title` (unique, case-insensitive), `price`, `imageUrl`, `createdAt`.
- **users:** `_id`, `usernameHash`, `salt`, `passwordHash`, `createdAt`. No username or role is stored in plain text.
- **carts:** one document per user and product, with a quantity.
- **orders:** user, total, time, and an embedded list of items (title, price, quantity).
- **sessions:** one document per signed-in browser session: the session id, the user it belongs to, the stored
  session data and an expiry time. MongoDB deletes expired sessions automatically. Sessions hold no passwords.

## Known limitations

These are deliberate simplifications, not bugs to hide:

- **No rate limiting** on login or registration.
- **Checkout** saves the order and then clears the cart in two steps. If clearing the cart
  fails, a retry would create a second order. MongoDB only supports multi-document
  transactions on replica sets (Atlas has them).
- **Single admin account.** Admins cannot be created or promoted from the UI.
- **No email verification or password reset.**
- **Registration is open** to anyone. Add rate limiting before running it on the public internet.

## Security notes

- Passwords use scrypt with a random per-user salt; comparisons are constant-time.
- Session cookies are signed, `httpOnly` and `SameSite=Lax`, and `Secure` when `COOKIE_SECURE=true`. A new
  session id is issued at every sign-in, which prevents session fixation.
- Sessions are stored server-side; the cookie holds only a signed random id. Logging out deletes the stored
  session, and expired sessions are rejected and removed.
- Changing a password signs out every other device that user was logged in on.
- A "Keep me signed in" cookie is a long-lived credential: anyone who copies it can act as that user until it
  expires or the user logs out or changes their password. Serve the site over HTTPS and set `COOKIE_SECURE=true`.
- User-provided text is HTML-escaped by EJS.
- Image URLs must start with `http://` or `https://`.
- Form input is checked on the server, not only in the browser.

For production, set `USERNAME_PEPPER`, `ADMIN_PASSWORD` and `MONGODB_URI` (and optionally a separate
`SESSION_SECRET`), serve the app over HTTPS with `COOKIE_SECURE=true`, and address the limitations above.

## Development

```bash
npm start    # runs server.js on port 3000 (or PORT)
npm test     # unit tests for the validators and the password/username hashing (no database needed)
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
