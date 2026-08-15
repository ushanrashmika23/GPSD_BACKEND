const marksService = require("../services/marks.service");
const { sendResponse, prepareResponse } = require("../utils/responseEntity");

const createPaperController = async (req, res) => {
    try {
        const result = await marksService.newPaper(req.body);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error creating paper", error?.message || error));
    }
};

const getPapersController = async (req, res) => {
    try {
        const result = await marksService.getPapers(req.params.batchId);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error fetching papers", error?.message || error));
    }
};

const createMarkController = async (req, res) => {
    try {
        const result = await marksService.newMark(req.body);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error creating mark", error?.message || error));
    }
};

const updateMarkController = async (req, res) => {
    try {
        const result = await marksService.updateMark(req.body);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error updating mark", error?.message || error));
    }
};

const getAllPapersController = async (req, res) => {
    try {
        const { page, limit, batch_id } = req.query;
        const result = await marksService.getAllPapers({ page, limit, batch_id });
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error fetching papers", error?.message || error));
    }
};

const getMarksByPaperController = async (req, res) => {
    try {
        const result = await marksService.getMarksByPaper(req.params.paperId);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error fetching marks", error?.message || error));
    }
};

const togglePublishController = async (req, res) => {
    try {
        const result = await marksService.toglePublishMark(req.params.paperId);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error toggling publish", error?.message || error));
    }
};

const updatePaperController = async (req, res) => {
    try {
        const result = await marksService.updatePaper(req.params.paperId, req.body);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error updating paper", error?.message || error));
    }
};

const deletePaperController = async (req, res) => {
    try {
        const result = await marksService.deletePaper(req.params.paperId);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error deleting paper", error?.message || error));
    }
};

// GET /api/marks/student-performance/:userId
// Returns a student's released marks, per-paper ranks and summary stats.
// Role: student (own performance), staff/admin — NOT protected yet; once auth
// middleware is applied, students must only be able to fetch their own performance.
const getStudentPerformanceController = async (req, res) => {
    try {
        const result = await marksService.getStudentPerformance(req.params.userId);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error fetching student performance", error?.message || error));
    }
};

module.exports = {
    createPaperController,
    getPapersController,
    getAllPapersController,
    createMarkController,
    updateMarkController,
    getMarksByPaperController,
    togglePublishController,
    updatePaperController,
    deletePaperController,
    getStudentPerformanceController,
};