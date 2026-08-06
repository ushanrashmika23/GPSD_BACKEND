const {newPayment, getAllPayments, getStudentPaymentData, getPaymentsByStudent, getPaymentById, updatePayment, deletePayment, searchPayments} = require('../services/fees.service');
const {sendResponse,prepareResponse} = require("./../utils/responseEntity")

const createPaymentController = async (req, res) => {
    try {
        const paymentData = req.body;
        const response = await newPayment(paymentData);
        sendResponse(res, response);
    } catch (err) {
        console.error("createPayment error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error creating payment', String(err?.message || err)));
    }
}

const getStudentPaymentDataController = async (req, res) => {
    try {
        const { call_up_no } = req.params;
        const response = await getStudentPaymentData(call_up_no);
        sendResponse(res, response);
    } catch (err) {
        console.error("getStudentPaymentData error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error retrieving student payment data', String(err?.message || err)));
    }
}

const getAllPaymentsController = async (req, res) => {
    try {
        const { page, limit, search, call_up_no, month } = req.query;
        const response = await getAllPayments({ page, limit, search, call_up_no, month });
        sendResponse(res, response);
    } catch (err) {
        console.error("getAllPayments error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error retrieving payments', String(err?.message || err)));
    }
}

const getPaymentsByStudentController = async (req, res) => {
    try {
        const { call_up_no } = req.params;
        const response = await getPaymentsByStudent(call_up_no);
        sendResponse(res, response);
    } catch (err) {
        console.error("getPaymentsByStudent error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error retrieving payments', String(err?.message || err)));
    }
}

const getPaymentByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await getPaymentById(Number(id));
        sendResponse(res, response);
    } catch (err) {
        console.error("getPaymentById error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error retrieving payment', String(err?.message || err)));
    }
}

const updatePaymentController = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await updatePayment(Number(id), req.body);
        sendResponse(res, response);
    } catch (err) {
        console.error("updatePayment error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error updating payment', String(err?.message || err)));
    }
}

const deletePaymentController = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await deletePayment(Number(id));
        sendResponse(res, response);
    } catch (err) {
        console.error("deletePayment error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error deleting payment', String(err?.message || err)));
    }
}

const searchPaymentsController = async (req, res) => {
    try {
        const { call_up_no, month, batch, page, limit } = req.query;
        const response = await searchPayments({ call_up_no, month, batch, page, limit });
        sendResponse(res, response);
    } catch (err) {
        console.error("searchPayments error:", err);
        sendResponse(res, prepareResponse(500, false, 'Error searching payments', String(err?.message || err)));
    }
}

module.exports = {
    createPaymentController,
    getAllPaymentsController,
    getStudentPaymentDataController,
    getPaymentsByStudentController,
    getPaymentByIdController,
    updatePaymentController,
    deletePaymentController,
    searchPaymentsController
};