const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { newStudent, getStudents, getStudentById, updateStudent, deleteStudent, resetStudentPassword, getStudentProfileByUserId } = require("../services/student.service");

const newStudentController = async (req, res) => {
    const studentData = req.body;
    console.log(studentData);

    try {
        const student = await newStudent(studentData);
        sendResponse(res, student);
    } catch (err) {
        console.error("Create student controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to create student", String(err?.message || err)));
    }
}

const getStudentsController = async (req, res) => {
    const { page, limit, search, batch_id } = req.query;
    try{
        const students = await getStudents({ page, limit, search, batch_id });
        sendResponse(res, students);
    }catch (err) {
        console.error("Get students controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to retrieve students", String(err?.message || err)));
    }
}

const getStudentByIdController = async (req, res) => {
    const { id } = req.params;
    try {
        const student = await getStudentById(id);
        sendResponse(res, student);
    }catch (err) {
        console.error("Get student by ID controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to retrieve student", String(err?.message || err)));
    }
}

const updateStudentController = async (req, res) => {
    const { id } = req.params;
    const studentData = req.body;
    try {
        const result = await updateStudent(id, studentData);
        sendResponse(res, result);
    } catch (err) {
        console.error("Update student controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to update student", String(err?.message || err)));
    }
}

const deleteStudentController = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await deleteStudent(id);
        sendResponse(res, result);
    } catch (err) {
        console.error("Delete student controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to delete student", String(err?.message || err)));
    }
}

const resetPasswordController = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return sendResponse(res, prepareResponse(400, false, "Password must be at least 6 characters"));
    }

    try {
        const result = await resetStudentPassword(id, password);
        sendResponse(res, result);
    } catch (err) {
        console.error("Reset password controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to reset password", String(err?.message || err)));
    }
}

// GET /api/students/profile/:userId
// Returns the logged-in student's own profile (user + student + class).
// Role: student (own profile), staff/admin — NOT protected yet; once auth
// middleware is applied, students must only be able to fetch their own profile.
const getStudentProfileController = async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await getStudentProfileByUserId(userId);
        sendResponse(res, profile);
    } catch (err) {
        console.error("Get student profile controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to retrieve profile", String(err?.message || err)));
    }
}

module.exports = {
    newStudentController,
    getStudentsController,
    getStudentByIdController,
    updateStudentController,
    deleteStudentController,
    resetPasswordController,
    getStudentProfileController,
}