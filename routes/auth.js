const express = require('express');
const router = express.Router();
const  authController = require('../controller/auth');
const addressController = require('../controller/address');

router.post('/register', authController.register);
router.post('/otp',authController.sendOtp)
router.post('/otp-verify',authController.verifyOtp)
router.post('/login', authController.login);

router.use(authController.authenticateToken)
router.put('/profile',authController.updateUser);
router.get('/user',authController.getUser);
router.get('/address/:pinCode', addressController.getAddressByPin);

module.exports = router