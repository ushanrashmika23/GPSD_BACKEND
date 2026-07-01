const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");

const newBatch = async (batchData) => {
    try {
        // console.log("batchData received:", JSON.stringify(batchData, null, 2));
        const { name, exam_date, class_fee, start_time, end_time,day } = batchData;
        const data = {
            name,
            exam_date: new Date(exam_date),
            class_fee: Number(class_fee),
            start_time,
            end_time,
            day
        };
        // console.log("data being sent to Prisma:", JSON.stringify(data, null, 2));
        const batch = await prisma.batch.create({ data });
        return prepareResponse(201, true, "Batch created successfully", batch);
    } catch (error) {
        console.error("Prisma error:", error);
        return prepareResponse(500, false, "Failed to create batch", error.message || error);
    }
};

const updateBatch = async (batchId, batchData) => {
    try {
        const { name, exam_date, class_fee, start_time, end_time, day, is_active } = batchData;
        const batch = await prisma.batch.update({
            where: { id: batchId },
            data: {
                name,
                exam_date: exam_date ? new Date(exam_date) : undefined,
                class_fee: class_fee !== undefined ? Number(class_fee) : undefined,
                start_time,
                end_time,
                day,
                is_active: is_active !== undefined ? is_active : undefined,
            },
        });
        return prepareResponse(200, true, "Batch updated successfully", batch);
    }
    catch (error) {
        return prepareResponse(500, false, "Failed to update batch", error.message || error);
    }
};

const deleteBatch = async (batchId) => {
    try {
        await prisma.batch.delete({
            where: { id: batchId },
        });
        return prepareResponse(200, true, "Batch deleted successfully", null);
    } catch (error) {
        return prepareResponse(500, false, "Failed to delete batch", error.message || error);
    }
};

const getBatches = async ({
    page = 1,
    limit = 10,
    search = ""
}) => {
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    // Build filter dynamically
    const where = search
        ? {
            OR: [
                {
                    name: {
                        contains: search,
                    }
                }
            ]
        }
        : {};

    // Run queries in parallel
    const [batches, total] = await Promise.all([
        prisma.batch.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                created_at: "desc"
            }
        }),
        prisma.batch.count({
            where
        })
    ]);

    return prepareResponse(200, true, "Batches retrieved successfully", {
        data: batches,
        meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: skip + batches.length < total,
            hasPrevious: page > 1
        }
    });
};

module.exports = {
    newBatch,
    updateBatch,
    deleteBatch,
    getBatches,
};