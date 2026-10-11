const router = require('express').Router();
const admin = require('../controllers/admin');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin, requireAdmin);
router.get('/products', admin.getProducts);
router.get('/add-product', admin.getAddProduct);
router.post('/add-product', admin.postAddProduct);
router.get('/edit-product/:id', admin.getEditProduct);
router.post('/edit-product/:id', admin.postEditProduct);
router.post('/delete-product/:id', admin.postDeleteProduct);

module.exports = router;
