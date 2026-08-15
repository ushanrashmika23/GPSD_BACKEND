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

// Get all NON-EXPIRED materials accessible to the logged-in student's batch,
// newest first. "Newest" = when access was granted to the batch
// (material_access.created_at) — the material table has no created_at column.
// Role: student (own batch materials only), staff/admin.
// NOT protected yet — when auth middleware is wired up, students must be
// restricted to their own userId (JWT id === :userId).
const getStudentMaterials = async (userId) => {
    try {
        if (!userId || typeof userId !== "string" || !userId.trim()) {
            return prepareResponse(400, false, "userId is required");
        }
        userId = userId.trim();

        // 1. Find the student's batch
        const student = await prisma.student.findUnique({
            where: { user_id: userId },
            select: { call_up_no: true, batch_id: true },
        });
        if (!student) {
            return prepareResponse(404, false, "Student not found");
        }

        // 2. Active access rows for the student's batch (expired access
        //    excluded), newest access first
        const accesses = await prisma.material_access.findMany({
            where: {
                batch_id: student.batch_id,
                expiry_date: { gte: new Date() },
            },
            include: {
                material: {
                    include: {
                        lesson: { select: { id: true, title: true, type: true } },
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });

        const materials = accesses.map((a) => ({
            material_id: a.material.id,
            material_name: a.material.title,
            description: a.material.description,
            type: a.material.type, // "DOCUMENT" | "VIDEO" (admin upload types)
            lesson_id: a.material.lesson_id,
            lesson_title: a.material.lesson?.title ?? "General",
            lesson_type: a.material.lesson?.type ?? null,
            material_url: a.material.material_url, // R2 object key
            date_added: a.created_at, // when access was granted to this batch
            expiry_date: a.expiry_date,
        }));

        return prepareResponse(200, true, "Student materials fetched successfully", {
            batch_id: student.batch_id,
            total: materials.length,
            materials,
        });
    } catch (e) {
        console.error("Get student materials error:", e);
        return prepareResponse(500, false, "Error fetching student materials", e?.message || e);
    }
};

// Generate a short-lived signed URL for VIEWING a material's file from R2
// (the DB only stores the object key, not a public URL). Used by the student
// PDF viewer and video player.
// Role: student (own batch materials only), staff/admin.
// NOT protected yet — when auth middleware is wired up, students must only be
// able to fetch signed URLs for materials their batch still has valid access to.
const getMaterialSignedUrl = async (materialId) => {
    try {
        if (!materialId || typeof materialId !== "string" || !materialId.trim()) {
            return prepareResponse(400, false, "materialId is required");
        }
        materialId = materialId.trim();

        const material = await prisma.material.findUnique({
            where: { id: materialId },
            select: { material_url: true, type: true },
        });
        if (!material) {
            return prepareResponse(404, false, "Material not found");
        }

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: material.material_url,
        });
        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

        return prepareResponse(200, true, "Material signed URL generated successfully", {
            url: signedUrl,
            type: material.type,
        });
    } catch (e) {
        console.error("Get material signed url error:", e);
        return prepareResponse(500, false, "Error generating material signed URL", e?.message || e);
    }
};

module.exports = {
    newMaterial,
    getSignedUploadUrl,
    getMaterials,
    updateMaterial,
    deleteMaterial,
    getStudentMaterials,
    getMaterialSignedUrl,
}