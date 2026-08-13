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

    // --- early validation: Firebase & DB both need these ---
    const missing = [];
    if (!email || !email.includes("@")) missing.push("valid email");
    if (!password || password.length < 6) missing.push("password (min 6 characters)");
    if (!mobile) missing.push("mobile");
    if (!firstName) missing.push("firstName");
    if (!lastName) missing.push("lastName");
    if (!callUpNo) missing.push("callUpNo");
    if (!batchId) missing.push("batchId");

    if (missing.length > 0) {
        return prepareResponse(400, false, `Missing or invalid fields: ${missing.join(", ")}`);
    }

    let firebaseUser = null;
    let dbUser = null;

    try {
        // 1. Create user in Firebase Authentication
        firebaseUser = await auth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
        });

        if (!firebaseUser || !firebaseUser.uid) {
            throw new Error(
                "Firebase createUser returned successfully but uid is missing — " +
                JSON.stringify({ email, displayName: `${firstName} ${lastName}` })
            );
        }
        console.log("Firebase user created:", firebaseUser.uid);

        // 2. Create user record directly (no transaction wrapper)
        dbUser = await prisma.user.create({
            data: {
                email,
                password:"pwd-not-stored", // Password is not stored in DB; Firebase handles authentication
                jwt: "",
                gAuthID: firebaseUser.uid,
                mobile,
                first_name: firstName,
                last_name: lastName,
                address,
            },
        });
        console.log("DB user created:", dbUser.id);

        // 3. Create student record directly
        const student = await prisma.student.create({
            data: {
                call_up_no: callUpNo,
                school,
                parent_name: parentName,
                parent_mobile: parentMobile,
                user_id: dbUser.id,
                batch_id: batchId,
            },
        });
        console.log("DB student created:", student.call_up_no);

        return prepareResponse(201, true, "Student created successfully", {
            user: dbUser,
            student,
        });
    } catch (err) {
        // --- figure out which step failed for targeted cleanup ---
        const phase = !firebaseUser
            ? "firebase-createUser"
            : !dbUser
            ? "prisma-user-create"
            : "prisma-student-create";

        console.error(`[newStudent] ${phase} failed:`, err);

        // --- cleanup: remove Firebase user if it was created ---
        if (firebaseUser) {
            await auth.deleteUser(firebaseUser.uid).catch((deleteErr) =>
                console.error("Failed to rollback Firebase user:", firebaseUser.uid, deleteErr)
            );
            console.log("Firebase user rolled back:", firebaseUser.uid);
        }

        // --- cleanup: remove DB user if student creation was the failing step ---
        if (dbUser && phase === "prisma-student-create") {
            await prisma.user.delete({ where: { id: dbUser.id } }).catch((deleteErr) =>
                console.error("Failed to rollback DB user:", dbUser.id, deleteErr)
            );
            console.log("DB user rolled back:", dbUser.id);
        }

        // --- Prisma unique-constraint violation (P2002) → friendly message ---
        if (err?.code === "P2002") {
            const target = err.meta?.target;
            const field = Array.isArray(target) ? target.join(", ") : "field";
            return prepareResponse(
                409,
                false,
                `Duplicate value for ${field}. A record with this ${field} already exists.`
            );
        }

        const message =
            phase === "firebase-createUser"
                ? `Firebase user creation failed: ${err?.message || err}`
                : `Database error (${phase}): ${err?.message || err}`;

        return prepareResponse(500, false, message);
    }
}

//list all students paginated
const getStudents = async ({
    page = 1,
    limit = 10,
    search = "",
    batch_id = "",
}) => {
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    // Build filter dynamically
    const where = {};
    const conditions = [];

    if (batch_id) {
        conditions.push({ batch_id });
    }

    if (search) {
        conditions.push({
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
        });
    }

    if (conditions.length > 0) {
        where.AND = conditions;
    }

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

const resetStudentPassword = async (callUpNo, newPassword) => {
    try {
        // Find student with user record to get gAuthID (Firebase UID)
        const student = await prisma.student.findUnique({
            where: { call_up_no: callUpNo },
            include: { user: true },
        });
        if (!student) {
            return prepareResponse(404, false, "Student not found");
        }
        if (!student.user.gAuthID || student.user.gAuthID === "none") {
            return prepareResponse(400, false, "Student has no Firebase account linked");
        }

        await auth.updateUser(student.user.gAuthID, { password: newPassword });
        console.log("Password reset for Firebase user:", student.user.gAuthID);

        return prepareResponse(200, true, "Password reset successfully");
    } catch (err) {
        console.error("Reset student password error:", err);
        return prepareResponse(500, false, "Failed to reset password", String(err?.message || err));
    }
};

module.exports = {
    newStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    resetStudentPassword,
}