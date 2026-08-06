const {createPaymentController,getAllPaymentsController, getStudentPaymentDataController, getPaymentsByStudentController, getPaymentByIdController, updatePaymentController, deletePaymentController, searchPaymentsController} = require('../controllers/fees.controller');
const express = require('express');
const router = express.Router();

// CRUD
router.post('/payments', createPaymentController);
router.get('/payments', getAllPaymentsController);
router.get('/payments/search', searchPaymentsController);
router.get('/payments/student/:call_up_no', getStudentPaymentDataController);
router.get('/payments/student/:call_up_no/list', getPaymentsByStudentController);
router.get('/payments/:id', getPaymentByIdController);
router.put('/payments/:id', updatePaymentController);
router.delete('/payments/:id', deletePaymentController);

module.exports = router;