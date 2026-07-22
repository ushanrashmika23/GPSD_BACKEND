const express = require('express');
const router = express.Router();
const { newDayController,getTodayClassesController, markAttendanceController } = require('../controllers/attendance.controller');

router.post('/new-day', newDayController);
router.get('/today', getTodayClassesController);
router.post('/mark-attendance', markAttendanceController);

module.exports = router;