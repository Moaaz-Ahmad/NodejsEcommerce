const router = require('express').Router();
const auth = require('../controllers/auth');
const { requireLogin } = require('../middleware/auth');

router.get('/login', auth.getLogin);
router.post('/login', auth.postLogin);
router.get('/register', auth.getRegister);
router.post('/register', auth.postRegister);
router.post('/logout', auth.postLogout);
router.get('/profile', requireLogin, auth.getProfile);
router.get('/change-password', requireLogin, auth.getChangePassword);
router.post('/change-password', requireLogin, auth.postChangePassword);

module.exports = router;
