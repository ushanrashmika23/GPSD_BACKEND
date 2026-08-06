const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { newMaterial, getSignedUploadUrl, getMaterials, updateMaterial, deleteMaterial } = require("../services/material.service");

const createMaterial = async (req, res) => {
    try {
        const material = await newMaterial({
            ...req.body,
            lesson: req.body.lesson || req.body.lesson_id,  // accept either field name
            file: req.file,
        });
        sendResponse(res, material);
    } catch (error) {
        console.log(error);
        sendResponse(res, prepareResponse(500, false, "Failed to create material", error?.message || error));
    }
};

const getSignedUploadUrlController = async (req, res) => {
    try {
        const { key, contentType } = req.query;
        const result = await getSignedUploadUrl(key, contentType);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error generating signed URL", error?.message || error));
    }
};

const getMaterialsController = async (req, res) => {
    try {
        const result = await getMaterials(req.query);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error fetching materials", error?.message || error));
    }
};

const updateMaterialController = async (req, res) => {
    try {
        const result = await updateMaterial(req.params.id, req.body);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error updating material", error?.message || error));
    }
};

const deleteMaterialController = async (req, res) => {
    try {
        const result = await deleteMaterial(req.params.id);
        sendResponse(res, result);
    } catch (error) {
        sendResponse(res, prepareResponse(500, false, "Error deleting material", error?.message || error));
    }
};

module.exports = {
    createMaterial,
    getSignedUploadUrl: getSignedUploadUrlController,
    getMaterials: getMaterialsController,
    updateMaterial: updateMaterialController,
    deleteMaterial: deleteMaterialController,
};
