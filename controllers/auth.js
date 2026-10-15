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

// Check the submitted email and password. On success, start a new session holding the user (a long-lived one when
// "Keep me signed in" was ticked); on failure, show the form again with one message for both a wrong email and
// a wrong password, so the page never reveals which addresses have accounts
exports.postLogin = async (req, res) => {
  const user = await auth.authenticate(req.body.email, req.body.password);
  if (!user) {
    return res.status(401).render('auth/login', { title: 'Login', error: 'Invalid email or password.' });
  }
  await signIn(req, user, { remember: Boolean(req.body.remember) });
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
  res.render('auth/register', { title: 'Register', error: null, email: '' });
};

// Create a regular user and sign them in, kept signed in like the login box's default. The admin address is reserved,
// and the role is always "user" (the form cannot choose it)
exports.postRegister = async (req, res) => {
  if (req.session.user) return res.redirect('/');
  const { value, error } = validateRegistration(req.body);
  const fail = (message) => res.status(400).render('auth/register', { title: 'Register', error: message, email: value.email });

  if (error) return fail(error);
  const created = await auth.register(value.email, value.password);
  if (!created) return fail('An account with that email address already exists.');

  await signIn(req, created, { flash: `Welcome, ${created.email}!`, remember: true });
  res.redirect('/');
};
