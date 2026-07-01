const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");

const newLesson = async (lessonData) => {
    const { title, description, type } = lessonData;
    if (!title || !type) {
        return prepareResponse(400, false, "Title and type are required fields", null);
    }
    try {
        const lesson = await prisma.lesson.create({
            data: lessonData,
        });
        return prepareResponse(201, true, "Lesson created successfully", lesson);
    } catch (err) {
        return prepareResponse(500, false, "Failed to create lesson", err);
    }
};

const updateLesson = async (lessonId, lessonData) => {
    const { title, description, type } = lessonData;
    if (!title || !type) {
        return prepareResponse(400, false, "Title and type are required fields", null);
    }
    try {
        const lesson = await prisma.lesson.update({
            where: { id: lessonId },
            data: lessonData,
        });
        return prepareResponse(200, true, "Lesson updated successfully", lesson);
    } catch (err) {
        return prepareResponse(500, false, "Failed to update lesson", err);
    }
};

const deleteLesson = async (lessonId) => {
    try {
        await prisma.lesson.delete({
            where: { id: lessonId },
        });
        return prepareResponse(200, true, "Lesson deleted successfully", null);
    } catch (err) {
        return prepareResponse(500, false, "Failed to delete lesson", err);
    }
}

const getLessons = async ({
    page = 1,
    limit = 10000,
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
                    title: {
                        contains: search,
                    }
                },
                {
                    id: {
                        contains: search,
                    }
                }
            ]
        }
        : {};
    // Run queries in parallel
    const [lessons, total] = await Promise.all([
        prisma.lesson.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                created_at: "desc"
            }
        }),
        prisma.lesson.count({
            where
        })
    ]);
    return prepareResponse(200, true, "Lessons fetched successfully", {
        data: lessons,
        meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: skip + lessons.length < total,
            hasPrevious: page > 1
        }
    });
};

module.exports = {
    newLesson,
    updateLesson,
    deleteLesson,
    getLessons
};
