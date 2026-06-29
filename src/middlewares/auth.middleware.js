const jwt = require("jsonwebtoken");
const { prepareResponse, sendResponse } = require("../utils/responseEntity");

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return sendResponse(
                res,
                prepareResponse(401, false, "Authorization token is required.", null)
            );
        }

        const [type, token] = authHeader.split(" ");

        if (type !== "Bearer" || !token) {
            return sendResponse(
                res,
                prepareResponse(401, false, "Invalid authorization format.", null)
            );
        }

        if (!process.env.JWT_SECRET) {
            return sendResponse(
                res,
                prepareResponse(500, false, "JWT secret is not configured.", null)
            );
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        if (error.name === "TokenExpiredError") {
            return sendResponse(
                res,
                prepareResponse(401, false, "Token has expired.", error)
            );
        }

        if (error.name === "JsonWebTokenError") {
            return sendResponse(
                res,
                prepareResponse(401, false, "Invalid token.", error)
            );
        }

        return sendResponse(
            res,
            prepareResponse(500, false, "Authentication failed.", error)
        );
    }
};

module.exports = { authenticate };