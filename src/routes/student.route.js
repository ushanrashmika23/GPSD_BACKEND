const express = require('express');
const router = express.Router();
const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { newStudentController, getStudentsController, getStudentByIdController, updateStudentController, deleteStudentController } = require('../controllers/student.controller');

router.post('/', newStudentController);
router.get('/', getStudentsController);
router.get('/:id', getStudentByIdController);
router.put('/:id', updateStudentController);
router.delete('/:id', deleteStudentController);
module.exports = router;