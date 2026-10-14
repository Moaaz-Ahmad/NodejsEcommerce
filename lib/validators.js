// Form validation. Each function takes the raw form body and returns { value, error }:
// value holds the cleaned-up fields (always present, so a form can be shown again), and error is a message for
// the user, or undefined when the input is fine. No database and no HTTP here, so these are easy to test.

// 3 to 32 letters, digits, dots, underscores or hyphens
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;
const validPasswordLength = (password) => typeof password === 'string' && password.length >= 8 && password.length <= 128;

exports.validateRegistration = (body) => {
  const username = String(body.username || '').trim();
  const { password, confirm } = body;
  let error;
  if (!USERNAME_RE.test(username)) error = 'Username must be 3-32 characters: letters, numbers, . _ -';
  else if (!validPasswordLength(password)) error = 'Password must be 8 to 128 characters.';
  else if (password !== confirm) error = 'Password and confirmation do not match.';
  return { value: { username, password }, error };
};

// checks the new password only; whether the current password is correct is for the account service to decide
exports.validatePasswordChange = (body) => {
  const { current, password, confirm } = body;
  let error;
  if (!validPasswordLength(password)) error = 'New password must be 8 to 128 characters.';
  else if (password !== confirm) error = 'New password and confirmation do not match.';
  else if (password === current) error = 'New password must be different from the current one.';
  return { value: { current, password }, error };
};

// trims text, requires a title and a price of zero or more, caps lengths, and allows only http(s) image links or none
exports.validateProduct = (body) => {
  const title = String(body.title || '').trim();
  const price = parseFloat(body.price);
  const imageUrl = String(body.imageUrl || '').trim();
  let error;
  if (!title || !Number.isFinite(price) || price < 0) error = 'Enter a title and a non-negative price.';
  else if (title.length > 200) error = 'Title must be 200 characters or fewer.';
  else if (imageUrl.length > 2048) error = 'Image URL is too long.';
  else if (imageUrl && !/^https?:\/\//i.test(imageUrl)) error = 'Image URL must start with http:// or https://.';
  return { value: { title, price, imageUrl }, error };
};
