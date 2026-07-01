const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { newBatch, updateBatch, deleteBatch, getBatches } = require("../services/batch.service");

const addBatchController = async (req, res) => {
    try {
        const batch = await newBatch(req.body);
        sendResponse(res, batch);
        return;
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Failed to create batch controller", error));
    }
};

const updateBatchController = async (req, res) => {
    try {
        const batchId = req.params.id;
        const batch = await updateBatch(batchId, req.body);
        sendResponse(res, batch);
        return;
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Failed to update batch controller", error));
    }
};

const deleteBatchController = async (req, res) => {
    try {
        const batchId = req.params.id;
        const batch = await deleteBatch(batchId);
        sendResponse(res, batch);
        return;
    }
    catch (error) {
        sendResponse(res, prepareResponse(500, false, "Failed to delete batch controller", error));
    }
};

const getBatchesController = async (req, res) => {
    try {
        const result = await getBatches(req.query);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Failed to fetch batches controller", error));
    }
};

module.exports = {
    addBatchController,
    updateBatchController,
    deleteBatchController,
    getBatchesController,
};