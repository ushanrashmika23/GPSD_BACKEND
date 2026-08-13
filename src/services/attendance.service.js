const { prepareResponse } = require('../utils/responseEntity');
const prisma = require("../config/prisma");

/**
 * Build start-of-day and start-of-next-day Date objects in LOCAL time.
 * Uses the `new Date(year, month, date)` constructor which always produces
 * midnight in the local timezone — no string parsing, no UTC conversion.
 */
const getDayBoundaries = (d) => {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    return { startOfDay: start, startOfNextDay: next };
};

const createNewDay = async (dayData) => {

    try {
        const { date, batch_id } = dayData;

        // Validate the date
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
            return prepareResponse(400, false, 'Invalid date provided', null);
        }

        const { startOfDay, startOfNextDay } = getDayBoundaries(parsed);

        console.log('createNewDay — checking range:', {
            localDate: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`,
            startOfDay: startOfDay.toISOString(),
            startOfNextDay: startOfNextDay.toISOString(),
            batch_id,
        });

        // Check for an existing class_day whose date falls on the same day
        const existingDay = await prisma.class_day.findFirst({
            where: {
                date: {
                    gte: startOfDay,
                    lt: startOfNextDay,
                },
                batch_id: batch_id,
            },
        });
        if (existingDay) {
            return prepareResponse(400, false, 'Day already exists for this batch', null);
        }

        const day = await prisma.class_day.create({
            data: {
                date: startOfDay,
                batch_id,
            },
        });
        return prepareResponse(200, true, 'Day created successfully', day);
    } catch (err) {
        console.error("createNewDay error:", err);
        return prepareResponse(500, false, 'Error creating day', String(err?.message || err));
    }

}

const getTodayClases = async (day) => {
    try {
        // Default to today if no date provided; validate the parsed date
        const parsed = day ? new Date(day) : new Date();
        if (isNaN(parsed.getTime())) {
            return prepareResponse(400, false, 'Invalid date provided', null);
        }
        const { startOfDay, startOfNextDay } = getDayBoundaries(parsed);

        const todayClasses = await prisma.class_day.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lt: startOfNextDay,
                },
            },
            include: {
                batch: true,
                attendance: {
                    select: { call_up_no: true },
                },
                _count: {
                    select: { attendance: true },
                },
            },
        });

        // Get total student count per batch for unmarked calculation
        const batchIds = [...new Set(todayClasses.map((cd) => cd.batch_id))];
        const studentCountMap = {};
        if (batchIds.length > 0) {
            const counts = await Promise.all(
                batchIds.map((batchId) =>
                    prisma.student.count({ where: { batch_id: batchId } })
                )
            );
            batchIds.forEach((batchId, i) => {
                studentCountMap[batchId] = counts[i];
            });
        }

        // Enrich each class_day with present / unmarked counts + marked call-up list
        const enriched = todayClasses.map((cd) => {
            const presentCount = cd._count.attendance;
            const totalStudents = studentCountMap[cd.batch_id] || 0;
            const markedCallUpNos = cd.attendance.map((a) => a.call_up_no);
            return {
                id: cd.id,
                date: cd.date,
                batch_id: cd.batch_id,
                batch: cd.batch,
                presentCount,
                totalStudents,
                unmarkedCount: totalStudents - presentCount,
                markedCallUpNos,
            };
        });

        return prepareResponse(200, true, 'Today classes fetched successfully', enriched);
    } catch (err) {
        console.error("getTodayClases error:", err);
        return prepareResponse(500, false, 'Error fetching today classes', String(err?.message || err));
    }
}

const markAttendance = async (attendanceData) => {
    try {
        const { call_up_no } = attendanceData;
        //find the student by idnode
        const student = await prisma.student.findUnique({
            where: { call_up_no: call_up_no },
        });

        if (!student) {
            return prepareResponse(404, false, 'Student not found', null);
        }

        const today = new Date();
        const { startOfDay, startOfNextDay } = getDayBoundaries(today);

        //find the class_day for today for the student's batch
        const classDay = await prisma.class_day.findFirst({
            where: {
                date: {
                    gte: startOfDay,
                    lt: startOfNextDay,
                },
                batch_id: student.batch_id,
            },
        });

        if (!classDay) {
            return prepareResponse(404, false, 'No class day found for today for this student\'s batch', null);
        }

        // Check if attendance already marked for this student on this day
        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                call_up_no: student.call_up_no,
                class_day_id: classDay.id,
            },
        });

        if (existingAttendance) {
            return prepareResponse(400, false, 'Attendance already marked for this student today', null);
        }

        // Create attendance record
        const attendance = await prisma.attendance.create({
            data: {
                call_up_no: student.call_up_no,
                class_day_id: classDay.id,
            },
        });

        return prepareResponse(200, true, 'Attendance marked successfully', attendance);


    } catch (err) {
        console.error("markAttendance error:", err);
        return prepareResponse(500, false, 'Error marking attendance', String(err?.message || err));
    }
}

const unmarkAttendance = async (attendanceData) => {
    try {
        const { call_up_no } = attendanceData;

        //find the student by call_up_no
        const student = await prisma.student.findUnique({
            where: { call_up_no: call_up_no },
        });

        if (!student) {
            return prepareResponse(404, false, 'Student not found', null);
        }

        const today = new Date();
        const { startOfDay, startOfNextDay } = getDayBoundaries(today);

        //find the class_day for today for the student's batch
        const classDay = await prisma.class_day.findFirst({
            where: {
                date: {
                    gte: startOfDay,
                    lt: startOfNextDay,
                },
                batch_id: student.batch_id,
            },
        });

        if (!classDay) {
            return prepareResponse(404, false, 'No class day found for today for this student\'s batch', null);
        }

        // Check if attendance is marked for this student on this day
        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                call_up_no: student.call_up_no,
                class_day_id: classDay.id,
            },
        });

        if (!existingAttendance) {
            return prepareResponse(400, false, 'Attendance is not marked for this student today', null);
        }

        // Remove attendance record
        await prisma.attendance.delete({
            where: { id: existingAttendance.id },
        });

        return prepareResponse(200, true, 'Attendance unmarked successfully', existingAttendance);
    } catch (err) {
        console.error("unmarkAttendance error:", err);
        return prepareResponse(500, false, 'Error unmarking attendance', String(err?.message || err));
    }
}

const getAttendanceHistory = async ({ page = 1, limit = 12 } = {}) => {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    try {
        const [classDays, total] = await Promise.all([
            prisma.class_day.findMany({
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    batch: true,
                    _count: {
                        select: { attendance: true },
                    },
                },
            }),
            prisma.class_day.count(),
        ]);

        // Get total student count per batch for unmarked calculation
        const batchIds = [...new Set(classDays.map((cd) => cd.batch_id))];
        const studentCountMap = {};
        if (batchIds.length > 0) {
            const counts = await Promise.all(
                batchIds.map((batchId) =>
                    prisma.student.count({ where: { batch_id: batchId } })
                )
            );
            batchIds.forEach((batchId, i) => {
                studentCountMap[batchId] = counts[i];
            });
        }

        // Enrich each class_day with present / unmarked counts
        const enriched = classDays.map((cd) => {
            const presentCount = cd._count.attendance;
            const totalStudents = studentCountMap[cd.batch_id] || 0;
            return {
                id: cd.id,
                date: cd.date,
                batch_id: cd.batch_id,
                batch: cd.batch,
                presentCount,
                totalStudents,
                unmarkedCount: totalStudents - presentCount,
            };
        });

        return prepareResponse(200, true, 'Attendance history fetched successfully', {
            data: enriched,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("getAttendanceHistory error:", err);
        return prepareResponse(500, false, 'Error fetching attendance history', String(err?.message || err));
    }
}

const deleteClassDay = async (classDayId) => {
    try {
        const classDay = await prisma.class_day.findUnique({
            where: { id: classDayId },
        });

        if (!classDay) {
            return prepareResponse(404, false, 'Class day not found', null);
        }

        // The attendance relation has no cascade — remove attendance records
        // first, then the class day itself
        await prisma.$transaction([
            prisma.attendance.deleteMany({ where: { class_day_id: classDayId } }),
            prisma.class_day.delete({ where: { id: classDayId } }),
        ]);

        return prepareResponse(200, true, 'Class day deleted successfully', classDay);
    } catch (err) {
        console.error("deleteClassDay error:", err);
        return prepareResponse(500, false, 'Error deleting class day', String(err?.message || err));
    }
}

module.exports = {
    createNewDay,
    getTodayClases,
    markAttendance,
    unmarkAttendance,
    getAttendanceHistory,
    deleteClassDay
}
