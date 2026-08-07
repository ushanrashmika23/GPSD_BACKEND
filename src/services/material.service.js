const prisma = require('../config/prisma');
const { prepareResponse } = require('../utils/responseEntity');
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { r2 } = require("../config/r2.js");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { onlyLettersAndNumbers } = require('../utils/sanitizeInput.js');


// Create a new material and upload the file to R2 --- use the backend service to upload the file to R2 and store the key in the database
const newMaterial = async (material) => {
    const { type, title, description, lesson, file } = material;
    try {

        if (!file) {
            return prepareResponse(400, false, "No file uploaded");
        }

        if (!material.lesson) {
            return prepareResponse(400, false, "Lesson ID is required");
        }


        //return prepareResponse(400, false, "Material creation is not implemented yet");

        const key = `${type}/${Date.now()}-${onlyLettersAndNumbers(file.originalname)}`;

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));

        const data = {
            type,
            title,
            description,
            lesson_id: lesson,
            material_url: key,
        };

        const newMaterial = await prisma.material.create({ data });

        return prepareResponse(201, true, "Material created successfully", newMaterial);

    } catch (e) {
        return prepareResponse(500, false, "Error creating material", e?.message || e);
    }

}

//create signed url for uploading a file to R2
const getSignedUploadUrl = async (key, contentType) => {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            ContentType: contentType
        });
        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
        return prepareResponse(200, true, "Signed URL generated successfully", { signedUrl });
    } catch (e) {
        return prepareResponse(500, false, "Error generating signed URL", e?.message || e);
    }
};

// Get all materials from the database only (no R2)
const getMaterials = async ({ page = 1, limit = 12, search = "", batch_id = "", content_type = "" }) => {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    try {
        const where = {};

        if (search) {
            where.title = { contains: search };
        }

        if (content_type) {
            where.type = content_type;
        }

        if (batch_id) {
            where.material_access = {
                some: { batch_id },
            };
        }

        const [materials, total] = await Promise.all([
            prisma.material.findMany({
                where,
                skip,
                take: limit,
                include: {
                    lesson: { select: { id: true, title: true, type: true } },
                    material_access: {
                        where: {
                            expiry_date: { gte: new Date() },
                        },
                        include: { batch: { select: { id: true, name: true } } },
                    },
                },
                orderBy: { title: "asc" },
            }),
            prisma.material.count({ where }),
        ]);

        return prepareResponse(200, true, "Materials fetched successfully", {
            data: materials,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: skip + materials.length < total,
                hasPrevious: page > 1,
            },
        });
    } catch (e) {
        return prepareResponse(500, false, "Error fetching materials", e?.message || e);
    }
};

// Update material metadata only (no file upload)
const updateMaterial = async (materialId, data) => {
    const { title, description, type, lesson_id } = data;

    try {
        const existing = await prisma.material.findUnique({ where: { id: materialId } });
        if (!existing) {
            return prepareResponse(404, false, "Material not found");
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type;
        if (lesson_id !== undefined) updateData.lesson_id = lesson_id;

        const updated = await prisma.material.update({
            where: { id: materialId },
            data: updateData,
            include: {
                lesson: { select: { id: true, title: true } },
            },
        });

        return prepareResponse(200, true, "Material updated successfully", updated);
    } catch (e) {
        return prepareResponse(500, false, "Error updating material", e?.message || e);
    }
};

// Delete a material
const deleteMaterial = async (materialId) => {
    try {
        const existing = await prisma.material.findUnique({ where: { id: materialId } });
        if (!existing) {
            return prepareResponse(404, false, "Material not found");
        }

        // Delete related material_access records first to avoid FK constraint errors
        await prisma.material_access.deleteMany({
            where: { material_id: materialId },
        });

        // Also delete papers referencing this material
        await prisma.paper.deleteMany({
            where: { material_id: materialId },
        });

        await prisma.material.delete({ where: { id: materialId } });

        return prepareResponse(200, true, "Material deleted successfully");
    } catch (e) {
        return prepareResponse(500, false, "Error deleting material", e?.message || e);
    }
};

module.exports = {
    newMaterial,
    getSignedUploadUrl,
    getMaterials,
    updateMaterial,
    deleteMaterial,
}