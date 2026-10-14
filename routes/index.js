// All URL routes, in one place.
// Public routes come first, then the admin area (admin only), then everything else, which needs a signed-in user.

const { Router } = require('express');
const auth = require('../controllers/auth');
const account = require('../controllers/account');
const shop = require('../controllers/shop');
const admin = require('../controllers/admin');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = Router();

// public
router.get('/login', auth.getLogin);
router.post('/login', auth.postLogin);
router.get('/register', auth.getRegister);
router.post('/register', auth.postRegister);
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
router.post('/change-password', account.postChangePassword);
router.get('/', shop.getShop);
router.get('/products/:id', shop.getProduct);
router.get('/cart', shop.getCart);
router.post('/cart', shop.postCart);
router.post('/cart/delete', shop.postCartDelete);
router.get('/checkout', shop.getCheckout);
router.post('/checkout', shop.postCheckout);

module.exports = router;
