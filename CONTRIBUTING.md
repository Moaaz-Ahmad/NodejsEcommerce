# Contributing to SimpleCom

Thanks for helping improve SimpleCom. This guide covers how to report problems,
propose changes, and keep the codebase consistent.

## Ground rules

- Be respectful and constructive in issues and reviews.
- Keep changes small and focused: one problem or feature per pull request.
- Never commit secrets. The `.env` file (database connection, `USERNAME_PEPPER`, passwords) is
  listed in `.gitignore` and must stay out of the repository. Use `.env.example` to document new
  settings.

## Reporting bugs

Open an issue and include:

1. What you did, step by step.
2. What you expected to happen and what actually happened.
3. The Node.js version, the MongoDB setup (local or hosted), and any relevant output from the
   server console. Remove passwords and connection strings before pasting.

## Suggesting features

Open an issue describing the problem you want solved before writing code. A short discussion
first avoids wasted effort on changes that don't fit the project's scope.

## Security issues

Please do not report security vulnerabilities in a public issue. Use GitHub's private
vulnerability reporting for this repository if it is enabled, or contact the maintainer
directly. Describe the problem and how to reproduce it; do not publish exploit details until
a fix is available.

## Development setup

```bash
npm install
cp .env.example .env     # set MONGODB_URI and USERNAME_PEPPER at least
npm start
```

You need a running MongoDB instance (local, or a hosted cluster such as MongoDB Atlas).

## Project conventions

Follow the layout already in the repository. The full description is in the README.

Every file should have one reason to change (the single responsibility principle), and layers only call downwards:

- **Routes** (`routes/index.js`) only map URLs to controller functions and guards.
- **Controllers** (`controllers/`) handle HTTP: read the request, get the decision from a validator or service,
  then render a view or redirect. No hashing, no queries, no business rules.
- **Services** (`services/`) hold business rules that span models (log in, checkout, delete a product and clear
  it from carts). They know nothing about HTTP.
- **Models** (`models/`) read and write the database and nothing else. They don't call each other. Schemas are in
  `models/schemas.js`. `models/sessionStore.js` keeps login sessions in MongoDB for express-session.
- **Helpers** (`lib/`) do one small job each: `validators.js` (form checks), `credentials.js` (hashing),
  `seal.js` (encryption of stored data), `session.js`, `database.js`.
- **Configuration** is read only in `config.js`. Import settings from there; don't use `process.env` elsewhere.
- **Middleware** (`middleware/`) is code that runs on requests before or after a route.
- **Views** (`views/`) render HTML. They contain no database calls. Shared pieces go in `views/partials/`.
- **Styles** live in `Public/css/main.css`. Use the `--md-sys-*` colour variables rather than hard-coded colours.

Other conventions:

- **Comments:** explain what a function does and why, especially anything security-related. Keep
  them short and accurate. Update the comment when you change the behaviour.
- **Validation:** check input on the server. Browser-side checks are only a convenience.
- **No new dependencies** unless they solve a real problem that a few lines of code cannot.
  Mention the reason in the pull request.
- **Simplicity:** prefer the standard library and existing helpers over new abstractions.

## Testing your change

Run `npm test` first: it covers the validators and the password and username hashing, and needs no database.
If you add or change logic in `lib/validators.js` or `lib/credentials.js`, add or update a test in `test/`.

The rest has no automated tests yet. Before opening a pull request, run the app and
check the flows that your change touches. At minimum:

- Log in as the admin and as a regular user; log out.
- Admin: add a product, add a product whose title already exists (it should update the existing one),
  edit a product, delete a product.
- Regular user: add to cart (adding the same product again raises its quantity), remove a line, check out, and view
  the order on the profile page.
- Confirm that a regular user cannot open `/admin/...` pages (they should get a 403).

Mention in the pull request which checks you ran.

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your change, following the conventions above.
3. Make sure `npm test` passes and that the app starts.
4. Open a pull request that explains **what** changed and **why**, and lists the checks you ran.
5. Respond to review comments. Push follow-up commits to the same branch.

Keep commit messages short in the first line, with a body if the reason isn't obvious.

## License of contributions

SimpleCom is licensed under the Apache License, Version 2.0. By submitting a contribution you agree
that it is licensed under the same terms, as described in Section 5 of the
[Apache License](LICENSE). You keep the copyright to your own work. No separate contributor
agreement is required.

If your contribution includes code from somewhere else, make sure its license is compatible with
Apache 2.0 and say so in the pull request.
