const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");

const login = async (data) => {

    const { username, password } = data;
    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            return prepareResponse(404, false, "User not found", null);
        }

        

    } catch (err) {
        console.error(err);
        return prepareResponse(500, false, "Error logging in", err?.message || err);
    }
}