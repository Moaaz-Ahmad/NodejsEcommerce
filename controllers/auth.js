// Sign-in handlers: login, logout and registration.
// Each handler reads the request, asks lib/validators and services/auth for the decision, and picks the response.
const auth = require('../services/auth');
const { validateRegistration } = require('../lib/validators');
const { signIn, signOut } = require('../lib/session');

// Login page. Signed-in users are sent to the shop instead
exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login', error: null });
};

// Check the submitted credentials. On success, start a new session holding the user; on failure, show the form again with an error
exports.postLogin = async (req, res) => {
  const user = await auth.authenticate(req.body.username, req.body.password);
  if (!user) {
    return res.status(401).render('auth/login', { title: 'Login', error: 'Invalid username or password.' });
  }
  await signIn(req, user);
  res.redirect('/');
};

// End the session and clear its cookie
exports.postLogout = async (req, res) => {
  await signOut(req, res);
  res.redirect('/login');
};

// Registration form
exports.getRegister = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/register', { title: 'Register', error: null, username: '' });
};

// Create a regular user and sign them in. The admin name is reserved, and the role is always "user" (the form cannot choose it)
exports.postRegister = async (req, res) => {
  if (req.session.user) return res.redirect('/');
  const { value, error } = validateRegistration(req.body);
  const fail = (message) => res.status(400).render('auth/register', { title: 'Register', error: message, username: value.username });

  if (error) return fail(error);
  const created = await auth.register(value.username, value.password);
  if (!created) return fail('That username is already taken.');

  await signIn(req, created, `Welcome, ${created.username}!`);
  res.redirect('/');
};
