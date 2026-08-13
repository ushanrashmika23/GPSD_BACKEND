const express = require('express');
const router = express.Router();
const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { newStudentController, getStudentsController, getStudentByIdController, updateStudentController, deleteStudentController, resetPasswordController } = require('../controllers/student.controller');

router.post('/', newStudentController);
router.get('/', getStudentsController);
router.get('/:id', getStudentByIdController);
router.put('/:id', updateStudentController);
router.put('/:id/reset-password', resetPasswordController);
router.delete('/:id', deleteStudentController);
module.exports = router;