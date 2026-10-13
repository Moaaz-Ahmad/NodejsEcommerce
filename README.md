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
Register page.

## Configuration

Settings are read from environment variables, or from a `.env` file in the project root.
Never commit `.env`; it is listed in `.gitignore`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string, including the database name. Defaults to `mongodb://127.0.0.1:27017/node-complete`. |
| `USERNAME_PEPPER` | yes | Secret key for hashing usernames. Generate one with `node -p "require('crypto').randomBytes(32).toString('hex')"`. **Changing it after accounts exist locks those users out.** |
| `ADMIN_USERNAME` | no | Name of the admin account. Default `admin`. This name cannot be registered by anyone else. |
| `ADMIN_PASSWORD` | no | Password for the admin account, used only when it is first created. Default `admin123`. Set a real one before deploying. |
| `SESSION_SECRET` | no | Secret for signing session cookies. If unset, a random one is generated at each start, which logs everyone out on restart. |
| `PORT` | no | HTTP port. Default `3000`. |

## Project structure

```
app.js                 Express setup: middleware, sessions, routes, error pages, startup
routes/index.js        All URL routes, grouped as public, admin-only and logged-in
controllers/           Request handlers: auth.js, shop.js, admin.js
models/                Data access and schemas: db.js (Mongoose models), user.js,
                       product.js, cart.js, order.js
middleware/auth.js     requireLogin and requireAdmin guards
views/                 EJS templates; partials/ holds the shared header, footer and
                       reusable image and cart-item blocks
Public/css/main.css    The single stylesheet (Material Design 3 inspired)
```

Request flow: a route picks a controller; the controller calls the models for data and
renders a view. Models know nothing about HTTP, and views contain no database calls.

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

## Known limitations

These are deliberate simplifications, not bugs to hide:

- **Sessions** are kept in memory, so logins reset when the server restarts and do not
  work across several server processes.
- **No rate limiting** on login or registration.
- **Checkout** saves the order and then clears the cart in two steps. If clearing the cart
  fails, a retry would create a second order. MongoDB only supports multi-document
  transactions on replica sets (Atlas has them).
- **Single admin account.** Admins cannot be created or promoted from the UI.
- **No email verification or password reset.**
- **Registration is open** to anyone. Add rate limiting before running it on the public internet.

## Security notes

- Passwords use scrypt with a random per-user salt; comparisons are constant-time.
- Session cookies are `httpOnly` and `SameSite=Lax`.
- User-provided text is HTML-escaped by EJS.
- Image URLs must start with `http://` or `https://`.
- Form input is checked on the server, not only in the browser.

For production, set `SESSION_SECRET`, `USERNAME_PEPPER`, `ADMIN_PASSWORD` and
`MONGODB_URI`, serve the app over HTTPS, and address the limitations above.

## Development

```bash
npm start    # runs app.js on port 3000 (or PORT)
```

There is no automated test suite yet. Check changes by running the app and exercising
the flows above (log in as admin and as a regular user, add a product, add it to a cart,
check out, and try an admin page as a regular user).

## Contributing

Issues and pull requests are welcome. Keep changes small and focused, follow the existing
MVC layout, and do not commit `.env` or any credentials.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
