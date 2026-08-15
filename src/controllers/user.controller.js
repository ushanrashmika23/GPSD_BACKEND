const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { getUsers, createUser, updateUser, resetUserPassword } = require("../services/user.service");

const getUsersController = async (req, res) => {
    const { page, limit, search } = req.query;
    try {
        const users = await getUsers({ page, limit, search });
        sendResponse(res, users);
    } catch (err) {
        console.error("Get users controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to retrieve users", String(err?.message || err)));
    }
}

const createUserController = async (req, res) => {
    const userData = req.body;
    console.log(userData);

    try {
        const user = await createUser(userData);
        sendResponse(res, user);
    } catch (err) {
        console.error("Create user controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to create user", String(err?.message || err)));
    }
}

const updateUserController = async (req, res) => {
    const { id } = req.params;
    const userData = req.body;
    try {
        const result = await updateUser(id, userData);
        sendResponse(res, result);
    } catch (err) {
        console.error("Update user controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to update user", String(err?.message || err)));
    }
}

const resetPasswordController = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    try {
        const result = await resetUserPassword(id, password);
        sendResponse(res, result);
    } catch (err) {
        console.error("Reset user password controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Failed to reset password", String(err?.message || err)));
    }
}

module.exports = {
    getUsersController,
    createUserController,
    updateUserController,
    resetPasswordController,
};
