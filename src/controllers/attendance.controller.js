const { createNewDay, getTodayClases    , markAttendance, unmarkAttendance, getAttendanceHistory, deleteClassDay } = require('../services/attendance.service');
const { sendResponse, prepareResponse } = require('../utils/responseEntity');

const newDayController = async (req, res) => {
    try {
        const result = await createNewDay(req.body);
        return sendResponse(res, result);
    } catch (err) {
        console.error("newDayController error:", err);
        return sendResponse(res, prepareResponse(500, false, 'Error creating day', String(err?.message || err)));
    }
}

const getTodayClassesController = async (req, res) => {
    try {
        const { day } = req.query;
        const result = await getTodayClases(day);
        return sendResponse(res, result);
    } catch (err) {
        console.error("getTodayClassesController error:", err);
        return sendResponse(res, prepareResponse(500, false, 'Error fetching today classes', String(err?.message || err)));
    }
}

const markAttendanceController = async (req, res) => {
    try {
        const attendanceData = req.body;
        const result = await markAttendance(attendanceData);
        return sendResponse(res, result);
    } catch (err) {
        console.error("markAttendanceController error:", err);
        return sendResponse(res, prepareResponse(500, false, 'Error marking attendance', String(err?.message || err)));
    }
}


const unmarkAttendanceController = async (req, res) => {
    try {
        const attendanceData = req.body;
        const result = await unmarkAttendance(attendanceData);
        return sendResponse(res, result);
    } catch (err) {
        console.error("unmarkAttendanceController error:", err);
        return sendResponse(res, prepareResponse(500, false, 'Error unmarking attendance', String(err?.message || err)));
    }
}


const getAttendanceHistoryController = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await getAttendanceHistory({ page, limit });
        return sendResponse(res, result);
    } catch (err) {
        console.error("getAttendanceHistoryController error:", err);
        return sendResponse(res, prepareResponse(500, false, 'Error fetching attendance history', String(err?.message || err)));
    }
}

const deleteClassDayController = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteClassDay(id);
        return sendResponse(res, result);
    } catch (err) {
        console.error("deleteClassDayController error:", err);
        return sendResponse(res, prepareResponse(500, false, 'Error deleting class day', String(err?.message || err)));
    }
}


module.exports = {
    newDayController,
    getTodayClassesController,
    markAttendanceController,
    unmarkAttendanceController,
    getAttendanceHistoryController,
    deleteClassDayController
}
