const express = require('express');
const router = express.Router();
const  {baseController} = require('../controller/loan');
// const auth = require('../controller/auth');
const auth = require('../controller/appAuth');
const {insuranceController} = require('../controller/insurance');
const {creditController} = require('../controller/credit');
// const authController = require('../controller/auth');
const authController = require('../controller/appAuth')
const cibilController = require('../controller/cibil');
const notificationController = require('../controller/notification')
const InsuranceRenewalController = require('../controller/InsuranceRenewal');
const bannerController = require('../controller/Banner')
const categoryController = require('../controller/LoanCategory');

router.use(auth.authenticateToken)
router.use(authController.authorizeRole('customer'));
//loan
router.post('/loan',baseController.createLoan);
router.get('/loan',baseController.get);
router.get('/loan/:id',baseController.getById);
router.put('/loan/:id',baseController.updateById);

//Insurance.......
router.post('/insurance',insuranceController.createLoan);
router.get('/insurance/:id',insuranceController.getById);
router.get('/insurance',insuranceController.get);

//credit
router.post('/credit-card',creditController.createCredit)
router.get('/credit-card',creditController.get)
router.get('/credit-card/:id',creditController.getById)
router.put('/credit-card/:id',creditController.updateById)

//cibil
router.post('/cibil',cibilController.create)
router.get('/cibil',cibilController.get)

//InsuranceRenewal..
router.get('/insurance-renewal',InsuranceRenewalController.get)
router.get('/insurance-renewal/:id',InsuranceRenewalController.getById)
router.post('/insurance-renewal',InsuranceRenewalController.create)

//notify
router.get('/notification',notificationController.getCustomerNotification)

//Banner..
router.get('/banner',bannerController.get);
router.get('/banner/:id',bannerController.getById);

//Category..
router.get('/category',categoryController.get);
router.get('/category/:id',categoryController.getById);

module.exports = router
