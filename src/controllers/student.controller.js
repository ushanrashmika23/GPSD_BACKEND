const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { newStudent, getStudents, getStudentById, updateStudent, deleteStudent } = require("../services/student.service");

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
    const { page, limit, search } = req.query;
    try{
        const students = await getStudents({ page, limit, search });
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

module.exports = {
    newStudentController,
    getStudentsController,
    getStudentByIdController,
    updateStudentController,
    deleteStudentController
}