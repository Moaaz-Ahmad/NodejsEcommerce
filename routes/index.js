// All URL routes, in one place.
// Public routes come first, then the admin area (admin only), then everything else, which needs a signed-in user.

const { Router } = require('express');
const auth = require('../controllers/auth');
const account = require('../controllers/account');
const shop = require('../controllers/shop');
const admin = require('../controllers/admin');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const limit = require('../middleware/rateLimit');

const router = Router();

// Request limits per client (see middleware/rateLimit.js). Each stops one kind of abuse:
const MINUTE = 60 * 1000;
const loginLimit = limit('login', 15 * MINUTE, 10); // guessing passwords
const registerLimit = limit('register', 60 * MINUTE, 5); // mass-creating accounts
const formPageLimit = limit('form-page', 15 * MINUTE, 60); // each visit to these pages stores a small anonymous session
// guessing the current password with someone else's session: counted per user, so one user can't lock out another
const passwordLimit = limit('password', 15 * MINUTE, 5, (req) => req.session.user.id);

// public
router.get('/login', formPageLimit, auth.getLogin);
router.post('/login', loginLimit, auth.postLogin);
router.get('/register', formPageLimit, auth.getRegister);
router.post('/register', registerLimit, auth.postRegister);
router.post('/logout', auth.postLogout);

// admin only, mounted at /admin
const adminRouter = Router();
adminRouter.use(requireLogin, requireAdmin);
adminRouter.get('/products', admin.getProducts);
adminRouter.get('/add-product', admin.getAddProduct);
adminRouter.post('/add-product', admin.postAddProduct);
adminRouter.get('/edit-product/:id', admin.getEditProduct);
adminRouter.post('/edit-product/:id', admin.postEditProduct);
adminRouter.post('/delete-product/:id', admin.postDeleteProduct);
router.use('/admin', adminRouter);

// everything below needs a logged-in user (anonymous visitors, even to unknown URLs, are sent to /login)
router.use(requireLogin);
router.get('/profile', account.getProfile);
router.get('/change-password', account.getChangePassword);
router.post('/change-password', passwordLimit, account.postChangePassword);
router.get('/', shop.getShop);
router.get('/products/:id', shop.getProduct);
router.get('/cart', shop.getCart);
router.post('/cart', shop.postCart);
router.post('/cart/delete', shop.postCartDelete);
router.get('/checkout', shop.getCheckout);
router.post('/checkout', shop.postCheckout);

module.exports = router;
