const express = require('express');
const router = express.Router();
const { newDayController,getTodayClassesController, markAttendanceController, unmarkAttendanceController, getAttendanceHistoryController, deleteClassDayController } = require('../controllers/attendance.controller');

router.post('/new-day', newDayController);
router.get('/today', getTodayClassesController);
router.post('/mark-attendance', markAttendanceController);
router.post('/unmark-attendance', unmarkAttendanceController);
router.get('/history', getAttendanceHistoryController);
router.delete('/class-day/:id', deleteClassDayController);

module.exports = router;