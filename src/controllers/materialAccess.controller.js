const { grantBatchAccess, revokeBatchAccess, getMaterialAccesses } = require("../services/materialAccess.service");
const { sendResponse, prepareResponse } = require("../utils/responseEntity");

const grantBatchAccessController = async (req, res) => {
    try {
        const result = await grantBatchAccess(req.body);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error granting material access", error?.message || error));
    }
}

const revokeBatchAccessController = async (req, res) => {
    try {
        const result = await revokeBatchAccess(req.body);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error revoking material access", error?.message || error));
    }
}

const getMaterialAccessesController = async (req, res) => {
    try {
        const result = await getMaterialAccesses(req.params.materialId);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error fetching material accesses", error?.message || error));
    }
};

module.exports = {
    grantBatchAccessController,
    revokeBatchAccessController,
    getMaterialAccessesController,
};