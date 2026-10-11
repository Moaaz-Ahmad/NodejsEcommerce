const router = require('express').Router();
const shop = require('../controllers/shop');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);
router.get('/', shop.getShop);
router.get('/products/:id', shop.getProduct);
router.get('/cart', shop.getCart);
router.post('/cart', shop.postCart);
router.post('/cart/delete', shop.postCartDelete);
router.get('/checkout', shop.getCheckout);
router.post('/checkout', shop.postCheckout);

module.exports = router;
