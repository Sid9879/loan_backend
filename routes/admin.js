const express = require('express');
const router = express.Router()
const authController = require('../controller/auth');
const {basecontroller,allloancontroller} = require('../controller/admin')
const {agentbaseController} = require('../controller/loan')
const bannerController = require('../controller/Banner');

const notificationController = require('../controller/notification')
const LoanCategory = require('../controller/LoanCategory');


router.use(authController.authenticateToken);
router.use(authController.authorizeRole('admin'));
// Create agent
router.post('/create',authController.register);
router.put('/agent/:id',basecontroller.updateById);
router.delete('/delete/:id',basecontroller.deleteById);
router.get('/agent',basecontroller.getAgents)



//Banner Curd
router.get("/banner",bannerController.get);
router.get("/banner/:id",bannerController.getById);
router.post("/banner",bannerController.create);
router.put("/banner/:id",bannerController.updateById);
router.delete("/banner/:id",bannerController.deleteById);

//Category Curd..
router.get("/category",LoanCategory.get);
router.get("/category/:id",LoanCategory.getById);
router.post("/category",LoanCategory.create);
router.put("/category/:id",LoanCategory.updateById);
router.delete("/category/:id",LoanCategory.deleteById);

router.get('/dashboard',basecontroller.getLoanStatsApproved)
router.get('/total-loans',basecontroller.getTotalLoanStats)
router.get('/percentage',basecontroller.getLoanPercentage)


router.get('/loan',basecontroller.getAllLoans)
router.get('/:type/:id', basecontroller.getLoanById);
router.put('/update/:type/:id',basecontroller.updateLoanById);
router.delete('/delete/:type/:id', basecontroller.deleteLoanById);


router.post('/send',notificationController.createNotification);
router.get('/message',notificationController.getAllNotificationsWithAgent)

//Block agent...
router.post('/block/:id',basecontroller.toggleBlockUser);
router.get("/loans/pending/:agentId", agentbaseController.getPendingLoansForAgent);
router.get("/loans/missing/:agentId", agentbaseController.getMissingDocumentCount);
router.get("/loans/accepted/:agentId", agentbaseController.getAcceptedLoansForAgent );
router.get("/loans/percentage/:agentId", agentbaseController.getAcceptedLoanPercentageForAgent );



module.exports = router;