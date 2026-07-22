const { createNewDay, getTodayClases    , markAttendance } = require('../services/attendance.service');
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


module.exports = {
    newDayController,
    getTodayClassesController,
    markAttendanceController
}
