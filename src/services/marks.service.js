const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");

const newPaper = async (data) => {
    const { paper_name, paper_date, batch_id, material_id } = data;
    try {
        const paper = await prisma.paper.create({
            data: {
                paper_name,
                paper_date: new Date(paper_date),
                batch_id,
                material_id,
                avg_marks: 0,
            }
        });
        return prepareResponse(201, true, "Paper created successfully", paper);
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error creating paper", err?.message || err);
    }
}

const getPapers = async (batch_id) => {
    try {
        const papers = await prisma.paper.findMany({
            where: { batch_id },
            orderBy: { paper_date: "desc" },
        });
        return prepareResponse(200, true, "Papers fetched successfully", papers);
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error fetching papers", err?.message || err);
    }
}
const newMark = async (data) => {
    const { call_up_no, paper_id, mark, comment } = data;
    try {
        const marks = await prisma.student_marks.create({
            data: {
                call_up_no,
                paper_id,
                marks: mark,
                comments: comment ?? "none",
            }
        });
        return prepareResponse(201, true, "Mark created successfully", marks);
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error creating mark", err?.message || err);
    }
}

const updateMark = async (data) => {
    const { call_up_no, paper_id, mark, comment } = data;
    try {
        // The schema has no compound unique on (call_up_no, paper_id) — only
        // plain indexes — so the Prisma client exposes no `call_up_no_paper_id`
        // where input. Find the row first, then update by its primary id.
        const existing = await prisma.student_marks.findFirst({
            where: { call_up_no, paper_id },
        });
        if (!existing) {
            return prepareResponse(404, false, "Mark not found", null);
        }
        const updatedMark = await prisma.student_marks.update({
            where: { id: existing.id },
            data: { marks: mark, comments: comment ?? "none" }
        });
        return prepareResponse(200, true, "Mark updated successfully", updatedMark);
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error updating mark", err?.message || err);
    }
};

const toglePublishMark = async (paper_id) => {
    try {
        const paper = await prisma.paper.findUnique({
            where: { id: paper_id },
        });
        if (!paper) {
            return prepareResponse(404, false, "Paper not found", null);
        }
        const updatedPaper = await prisma.paper.update({
            where: { id: paper_id },
            data: { is_mark_released: !paper.is_mark_released },
        });
        return prepareResponse(200, true, "Paper publish status updated", updatedPaper);
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error updating paper publish status", err?.message || err);
    }
};

const updatePaper = async (paperId, data) => {
    const { paper_name, paper_date, batch_id, material_id } = data;
    try {
        const updateData = {};
        if (paper_name !== undefined) updateData.paper_name = paper_name;
        if (paper_date !== undefined) updateData.paper_date = new Date(paper_date);
        if (batch_id !== undefined) updateData.batch_id = batch_id;
        if (material_id !== undefined) updateData.material_id = material_id;

        const paper = await prisma.paper.update({
            where: { id: paperId },
            data: updateData,
        });
        return prepareResponse(200, true, "Paper updated successfully", paper);
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error updating paper", err?.message || err);
    }
};

const getAllPapers = async ({ page = 1, limit = 12, batch_id = "" }) => {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;
    try {
        const where = {};
        if (batch_id) where.batch_id = batch_id;

        const [papers, total] = await Promise.all([
            prisma.paper.findMany({
                where,
                skip,
                take: limit,
                include: {
                    batch: { select: { id: true, name: true } },
                    material: { select: { id: true, title: true } },
                    student_marks: { select: { marks: true } },
                },
                orderBy: { paper_date: "desc" },
            }),
            prisma.paper.count({ where }),
        ]);

        const data = papers.map((p) => ({
            ...p,
            marksCount: p.student_marks.length,
            avgMarks: p.student_marks.length > 0
                ? Math.round(p.student_marks.reduce((s, m) => s + m.marks, 0) / p.student_marks.length)
                : null,
        }));

        return prepareResponse(200, true, "Papers fetched successfully", {
            data,
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error fetching papers", err?.message || err);
    }
};

const getMarksByPaper = async (paper_id) => {
    try {
        const marks = await prisma.student_marks.findMany({
            where: { paper_id },
            include: {
                student: {
                    include: { user: { select: { first_name: true, last_name: true } } },
                },
            },
        });
        return prepareResponse(200, true, "Marks fetched successfully", marks);
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error fetching marks", err?.message || err);
    }
};

const deletePaper = async (paperId) => {
    try {
        // Delete associated marks first, then the paper
        await prisma.student_marks.deleteMany({ where: { paper_id: paperId } });
        await prisma.paper.delete({ where: { id: paperId } });
        return prepareResponse(200, true, "Paper deleted successfully");
    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error deleting paper", err?.message || err);
    }
};

// Get a student's performance data (released marks, per-paper ranks, summary
// stats) by the logged-in USER id — the student portal login only carries
// user.id, not call_up_no.
// Role: student (own performance only), staff/admin.
// NOT protected yet — when auth middleware is wired up, students must be
// restricted to their own userId (JWT id === :userId).
const getStudentPerformance = async (userId) => {
    try {
        if (!userId || typeof userId !== "string" || !userId.trim()) {
            return prepareResponse(400, false, "userId is required");
        }
        userId = userId.trim();

        // 1. Find the student by user id (call_up_no + batch needed below)
        const student = await prisma.student.findUnique({
            where: { user_id: userId },
            select: { call_up_no: true, batch_id: true },
        });
        if (!student) {
            return prepareResponse(404, false, "Student not found");
        }

        // 2. This student's marks on RELEASED papers only, oldest → newest
        const myMarks = await prisma.student_marks.findMany({
            where: {
                call_up_no: student.call_up_no,
                paper: { is_mark_released: true },
            },
            include: {
                paper: {
                    include: {
                        material: {
                            include: { lesson: true },
                        },
                    },
                },
            },
            orderBy: { paper: { paper_date: "asc" } },
        });

        // 3. All marks on those papers (the whole class) to compute ranks
        //    and real class averages (paper.avg_marks is not maintained by
        //    the admin flow, so it is computed here from live marks).
        const paperIds = myMarks.map((m) => m.paper_id);
        const classMarks = paperIds.length
            ? await prisma.student_marks.findMany({
                  where: { paper_id: { in: paperIds } },
                  select: { paper_id: true, marks: true },
              })
            : [];

        // Rank = position of the mark in the desc-sorted class list
        // (ties share the same rank, e.g. two tops both rank #1)
        const ranksByPaper = new Map();
        const classAvgByPaper = new Map();
        for (const paperId of paperIds) {
            const marks = classMarks
                .filter((m) => m.paper_id === paperId)
                .map((m) => m.marks)
                .sort((a, b) => b - a);
            if (marks.length === 0) continue;

            const rankForValue = new Map();
            marks.forEach((value, i) => {
                if (!rankForValue.has(value)) rankForValue.set(value, i + 1);
            });
            ranksByPaper.set(paperId, rankForValue);

            const avg = marks.reduce((s, v) => s + v, 0) / marks.length;
            classAvgByPaper.set(paperId, Math.round(avg * 10) / 10);
        }

        // 4. Per-paper rows for the frontend (charts + results list)
        const papers = myMarks.map((m) => ({
            paper_id: m.paper_id,
            paper_name: m.paper.paper_name,
            paper_date: m.paper.paper_date,
            class_avg: classAvgByPaper.get(m.paper_id) ?? null,
            is_mark_released: m.paper.is_mark_released,
            lesson_id: m.paper.material?.lesson?.id ?? null,
            lesson_title: m.paper.material?.lesson?.title ?? "General",
            lesson_type: m.paper.material?.lesson?.type ?? null,
            mark: m.marks,
            rank: ranksByPaper.get(m.paper_id)?.get(m.marks) ?? null,
            comments: m.comments ?? "none",
        }));

        // 5. Summary stats (papers are ordered oldest → newest)
        let currentRank = null;
        let latestMark = null;
        let bestRank = null;
        let averageMark = null;

        if (papers.length > 0) {
            currentRank = papers[papers.length - 1].rank;
            latestMark = papers[papers.length - 1].mark;
            bestRank = Math.min(...papers.map((p) => p.rank).filter((r) => r != null));
            averageMark = Math.round((papers.reduce((s, p) => s + p.mark, 0) / papers.length) * 10) / 10;
        }

        const classSize = await prisma.student.count({
            where: { batch_id: student.batch_id },
        });

        return prepareResponse(200, true, "Student performance retrieved successfully", {
            call_up_no: student.call_up_no,
            batch_id: student.batch_id,
            classSize,
            papers,
            summary: { currentRank, bestRank, averageMark, latestMark },
        });
    } catch (err) {
        console.error("Get student performance error:", err);
        return prepareResponse(500, false, "Error fetching student performance", err?.message || err);
    }
};

module.exports = {
    newPaper,
    getPapers,
    getAllPapers,
    getMarksByPaper,
    newMark,
    updateMark,
    toglePublishMark,
    updatePaper,
    deletePaper,
    getStudentPerformance,
};