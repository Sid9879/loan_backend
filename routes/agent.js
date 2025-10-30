const express = require('express');
const router = express.Router()
const authController = require('../controller/auth');
const {agentbaseController} = require('../controller/loan');
const{agentInsuranceController} = require('../controller/insurance')
const {agentbaseControllercredit} = require('../controller/credit')
const notificationController = require('../controller/notification');
const bannerController = require('../controller/Banner');
const InsuranceRenewal = require('../controller/InsuranceRenewal');
const categoryController = require('../controller/LoanCategory');

router.use(authController.authenticateToken);
router.use(authController.authorizeRole('agent'));
//loan
router.get('/loan',agentbaseController.get);
router.get('/loan/:id',agentbaseController.getById);
router.get("/pending", agentbaseController.getPendingLoansForAgent);
router.get("/accepted", agentbaseController.getAcceptedLoansForAgent);
router.get("/accepted/percentage", agentbaseController.getAcceptedLoanPercentageForAgent);
router.get("/missing", agentbaseController.getMissingDocumentCount);
router.put('/loan/:id',agentbaseController.updateLoanById);
router.delete('/loan/:id',agentbaseController.deleteById);

//insurance...
router.get('/insurance',agentInsuranceController.get)
router.get('/insurance/:id',agentInsuranceController.getById)
router.put('/insurance/:id',agentInsuranceController.updateInsuranceById)
router.delete('/insurance/:id',agentInsuranceController.deleteById)

//credit
router.get('/credit',agentbaseControllercredit.get)
router.get('/credit/:id',agentbaseControllercredit.getById)
router.put('/credit/:id',agentbaseControllercredit.updateCreditById)
router.delete('/credit/:id',agentbaseControllercredit.deleteById)

//cibil

//notification...
router.get('/notification',notificationController.getCustomerNotification)

//Banner..
router.get('/banner',bannerController.get);
router.get('/banner/:id',bannerController.getById);

//InsuranceRenewal..
router.get('/insurance-renewal',InsuranceRenewal.get);
router.get('/insurance-renewal/:id',InsuranceRenewal.getById);
router.put('/insurance-renewal/:id',InsuranceRenewal.updateById);
router.delete('/insurance-renewal/:id',InsuranceRenewal.deleteById);

//Category..
router.get('/category',categoryController.get);
router.get('/category/:id',categoryController.getById);

module.exports = router;