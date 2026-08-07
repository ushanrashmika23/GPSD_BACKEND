const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");

const grantBatchAccess = async (data) => {

    const { expiry_date, batch_id, material_id } = data;
    try {
        // Convert date-only string (YYYY-MM-DD) to full DateTime for Prisma/MySQL
        const expiryDateTime = new Date(expiry_date);
        const materialAccess = await prisma.material_access.create({
            data: {
                expiry_date: expiryDateTime,
                batch: { connect: { id: batch_id } },
                material: { connect: { id: material_id } },
            },
        });

        return prepareResponse(201, true, "Material access created successfully", materialAccess);
    } catch (error) {
        return prepareResponse(500, false, "Error creating material access", error?.message || error);
    }
}

const revokeBatchAccess = async (data) => {
    const { access_id } = data;
    try {
        const materialAccess = await prisma.material_access.update({
            where: { id: access_id },
            data: { expiry_date: new Date() }, // Set expiry_date to current date to revoke access
        });
        return prepareResponse(200, true, "Material access revoked successfully", materialAccess);
    } catch (error) {
        return prepareResponse(500, false, "Error revoking material access", error?.message || error);
    }
}

const getMaterialAccesses = async (material_id) => {
    try {
        const accesses = await prisma.material_access.findMany({
            where: { material_id , expiry_date: { gt: new Date() } },
            include: { batch: { select: { id: true, name: true } } },
            orderBy: { created_at: "desc" },
        });
        return prepareResponse(200, true, "Material accesses fetched successfully", accesses);
    } catch (error) {
        return prepareResponse(500, false, "Error fetching material accesses", error?.message || error);
    }
};

module.exports = {
    grantBatchAccess,
    revokeBatchAccess,
    getMaterialAccesses,
};