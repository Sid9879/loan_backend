const express = require('express');
const router = express.Router();
const appAuth = require('../controller/appAuth');
const addressController = require('../controller/address');


router.post('/otp',appAuth.sendOtp)
router.post('/login', appAuth.otpLogin);


router.use(appAuth.authenticateToken)
router.put('/profile',appAuth.updateUser);
router.get('/user',appAuth.getUser);

router.get('/address/:pinCode', addressController.getAddressByPin);

module.exports = router;
