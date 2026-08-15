const express = require('express');
const router = express.Router();
const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { newStudentController, getStudentsController, getStudentByIdController, updateStudentController, deleteStudentController, resetPasswordController, getStudentProfileController } = require('../controllers/student.controller');

router.post('/', newStudentController);
router.get('/', getStudentsController);
// GET /api/students/profile/:userId — logged-in student's own profile.
// Role: student (own profile), staff/admin. NOT protected yet; when auth
// middleware is added, restrict students to their own userId (JWT id === :userId).
router.get('/profile/:userId', getStudentProfileController);
router.get('/:id', getStudentByIdController);
router.put('/:id', updateStudentController);
router.put('/:id/reset-password', resetPasswordController);
router.delete('/:id', deleteStudentController);
module.exports = router;