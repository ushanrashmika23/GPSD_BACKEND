const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");
const { auth } = require("../config/firebase.config");

const newStudent = async (studentData) => {
    const {
        email = "",
        password = "",
        mobile = "",
        firstName = "",
        lastName = "",
        address = "",
        callUpNo = "",
        school = "",
        parentName = "",
        parentMobile = "",
        batchId = "",
    } = studentData;

    let firebaseUser = null;

    try {
        // 1. Create user in Firebase Authentication (outside Prisma transaction)
        firebaseUser = await auth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
        });
        console.log("Firebase user created:", firebaseUser.uid);

        // 2. Create user + student in Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password,
                    jwt: "",
                    gAuthID: firebaseUser.uid,
                    mobile,
                    first_name: firstName,
                    last_name: lastName,
                    address,
                },
            });

            const student = await tx.student.create({
                data: {
                    call_up_no: callUpNo,
                    school,
                    parent_name: parentName,
                    parent_mobile: parentMobile,
                    user_id: user.id,
                    batch_id: batchId,
                },
            });

            return { user, student };
        });

        return prepareResponse(201, true, "Student created successfully", result);
    } catch (err) {
        // 3. Rollback: delete Firebase user if Prisma failed after Firebase creation
        if (firebaseUser) {
            try {
                await auth.deleteUser(firebaseUser.uid);
                console.log("Firebase user rolled back:", firebaseUser.uid);
            } catch (deleteErr) {
                console.error("Failed to rollback Firebase user:", firebaseUser.uid, deleteErr);
            }
        }
        console.error("Create student error:", err);
        return prepareResponse(500, false, "Failed to create student", err);
    }
}

//list all students paginated
const getStudents = async ({
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
                    call_up_no: {
                        contains: search,
                    },
                },
                {
                    school: {
                        contains: search,
                    },
                },
                // {
                //     parent_name: {
                //         contains: search,
                //     },
                // },
                // {
                //     parent_mobile: {
                //         contains: search,
                //     },
                // },
                {
                    user: {
                        first_name: {
                            contains: search,
                        },
                    },
                },
                {
                    user: {
                        last_name: {
                            contains: search,
                        },
                    },
                },
                {
                    user: {
                        email: {
                            contains: search,
                        },
                    },
                },
                {
                    user: {
                        mobile: {
                            contains: search,
                        },
                    },
                },
            ],
        }
        : {};

    // Run queries in parallel
    const [students, total] = await Promise.all([
        prisma.student.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                user: {
                    createdAt: "desc",
                },
            },
            include: {
                user: true,
                batch: true, // Optional. Remove if batch details are not needed.
            },
        }),
        prisma.student.count({
            where,
        }),
    ]);

    return prepareResponse(200, true, "Students retrieved successfully", {
        data: students,
        meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: skip + students.length < total,
            hasPrevious: page > 1,
        },
    });
};


const getStudentById = async (studentId) => {
    try {
        const student = await prisma.student.findUnique({
            where: { call_up_no: studentId },
            include: {
                user: true,
                batch: true,
                attendance: true,
                payment: true,
                student_marks: true,
            },
        });
        if (!student) {
            return prepareResponse(404, false, "Student not found");
        }
        return prepareResponse(200, true, "Student retrieved successfully", student);
    } catch (error) {
        console.error("Get student by ID error:", error);
        return prepareResponse(500, false, "Failed to retrieve student", String(error?.message || error));
    }
};

const updateStudent = async (studentId, studentData) => {
    const {
        mobile = "",
        firstName = "",
        lastName = "",
        address = "",
        callUpNo = "",
        school = "",
        parentName = "",
        parentMobile = "",
        batchId = "",
        isActive,
    } = studentData;

    try {
        const existing = await prisma.student.findUnique({
            where: { call_up_no: studentId },
            include: { user: true },
        });
        if (!existing) {
            return prepareResponse(404, false, "Student not found");
        }

        const result = await prisma.$transaction(async (tx) => {
            // Update user record
            const userData = {
                mobile: mobile || existing.user.mobile,
                first_name: firstName || existing.user.first_name,
                last_name: lastName || existing.user.last_name,
                address: address || existing.user.address,
            };
            // Only include is_active if explicitly provided
            if (typeof isActive === "boolean") {
                userData.is_active = isActive;
            }
            const user = await tx.user.update({
                where: { id: existing.user_id },
                data: userData,
            });

            // Update student record
            const student = await tx.student.update({
                where: { call_up_no: studentId },
                data: {
                    call_up_no: callUpNo || existing.call_up_no,
                    school: school || existing.school,
                    parent_name: parentName || existing.parent_name,
                    parent_mobile: parentMobile || existing.parent_mobile,
                    batch_id: batchId || existing.batch_id,
                },
            });

            return { user, student };
        });

        return prepareResponse(200, true, "Student updated successfully", result);
    } catch (err) {
        console.error("Update student error:", err);
        return prepareResponse(500, false, "Failed to update student", String(err?.message || err));
    }
};

const deleteStudent = async (studentId) => {
    try {
        const existing = await prisma.student.findUnique({
            where: { call_up_no: studentId },
            include: { user: true },
        });
        if (!existing) {
            return prepareResponse(404, false, "Student not found");
        }

        // Delete related records first, then student, then user
        await prisma.$transaction(async (tx) => {
            await tx.attendance.deleteMany({ where: { call_up_no: studentId } });
            await tx.payment.deleteMany({ where: { call_up_no: studentId } });
            await tx.student_marks.deleteMany({ where: { call_up_no: studentId } });
            await tx.student.delete({ where: { call_up_no: studentId } });
            await tx.user.delete({ where: { id: existing.user_id } });
        });

        // Try to delete Firebase user (non-critical)
        if (existing.user.gAuthID && existing.user.gAuthID !== "none") {
            try {
                await auth.deleteUser(existing.user.gAuthID);
            } catch (fbErr) {
                console.warn("Firebase user cleanup failed (non-critical):", fbErr.message);
            }
        }

        return prepareResponse(200, true, "Student deleted successfully");
    } catch (err) {
        console.error("Delete student error:", err);
        return prepareResponse(500, false, "Failed to delete student", String(err?.message || err));
    }
};

module.exports = {
    newStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent
}