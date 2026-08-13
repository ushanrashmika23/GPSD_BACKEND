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
        const updatedMark = await prisma.student_marks.update({
            where: { call_up_no_paper_id: { call_up_no, paper_id } },
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
};