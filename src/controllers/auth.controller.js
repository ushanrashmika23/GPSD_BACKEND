const { sendResponse, prepareResponse } = require("../utils/responseEntity");
const { firebaseLogin, autoLogin } = require("../services/auth.service");

const firebaseLoginController = async (req, res) => {
    const { idToken } = req.body;
    try {
        const result = await firebaseLogin(idToken);
        sendResponse(res, result);
    } catch (err) {
        console.error("Firebase login controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Login failed", String(err?.message || err)));
    }
}

const autoLoginController = async (req, res) => {
    // Accept the token from the Authorization header or the request body
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : req.body?.token;

    try {
        const result = await autoLogin(token);
        sendResponse(res, result);
    } catch (err) {
        console.error("Auto login controller error:", err);
        sendResponse(res, prepareResponse(500, false, "Auto login failed", String(err?.message || err)));
    }
}

module.exports = {
    firebaseLoginController,
    autoLoginController,
};
