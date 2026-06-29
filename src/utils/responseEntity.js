const prepareResponse = (code, status, message, data) => {
    if (status === true) {
        return {
            code: code,
            response: {
                success: status,
                msg: message,
                data: data
            }
        }
    }
    return {
        code: code,
        response: {
            success: status,
            msg: message,
            error: data
        }
    }
}

const sendResponse = (res, preparedResponse) => {
    return res.status(preparedResponse.code).json(preparedResponse.response);
}

module.exports = {
    prepareResponse,
    sendResponse
}