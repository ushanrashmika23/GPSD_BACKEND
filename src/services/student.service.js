const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");
const { auth } = require("../config/firebase.config");

// ── Shared validation helpers ─────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Lenient international phone: 7–20 chars of digits, spaces, +, -, ()
const MOBILE_RE = /^[0-9+\-()\s]{7,20}$/;

const NAME_MAX = 100; // first/last name, parent name
const TEXT_MAX = 255; // address
const SCHOOL_MAX = 150;
const SEARCH_MAX = 100;
const CALL_UP_NO_MAX = 50;
const ID_MAX = 100;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 4096; // Firebase max password length

const isText = (v, max) =>
    typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;

// Optional text: empty string allowed (field will keep its current value)
const isOptionalText = (v, max) => typeof v === "string" && v.trim().length <= max;

const isEmail = (v) => typeof v === "string" && EMAIL_RE.test(v.trim());

const isMobile = (v) => typeof v === "string" && MOBILE_RE.test(v.trim());

const isOptionalMobile = (v) =>
    typeof v === "string" && (v.trim() === "" || MOBILE_RE.test(v.trim()));

const isPassword = (v) =>
    typeof v === "string" && v.length >= PASSWORD_MIN && v.length <= PASSWORD_MAX;

// checkFields(checks) → null when every check passes, otherwise a prepared
// 400 response listing the failing labels. Each check is [label, boolean].
const checkFields = (checks) => {
    const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
    if (failed.length > 0) {
        return prepareResponse(400, false, `Invalid fields: ${failed.join(", ")}`);
    }
    return null;
};

// Friendly responses for common Prisma errors
const prismaErrorResponse = (err, fallback) => {
    if (err?.code === "P2002") {
        const target = err.meta?.target;
        const field = Array.isArray(target) ? target.join(", ") : "field";
        return prepareResponse(
            409,
            false,
            `Duplicate value for ${field}. A record with this ${field} already exists.`
        );
    }
    if (err?.code === "P2003") {
        return prepareResponse(400, false, "Referenced record does not exist (e.g. batch).");
    }
    if (err?.code === "P2025") {
        return prepareResponse(404, false, "Record not found");
    }
    return fallback;
};

const newStudent = async (studentData) => {
    studentData = studentData || {};
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

    // --- field validation: Firebase & DB both need these ---
    const invalid = checkFields([
        ["email address", isEmail(email)],
        [`password (min ${PASSWORD_MIN} characters)`, isPassword(password)],
        ["mobile number", isMobile(mobile)],
        [`firstName (max ${NAME_MAX} characters)`, isText(firstName, NAME_MAX)],
        [`lastName (max ${NAME_MAX} characters)`, isText(lastName, NAME_MAX)],
        [`address (max ${TEXT_MAX} characters)`, isOptionalText(address, TEXT_MAX)],
        [`callUpNo (max ${CALL_UP_NO_MAX} characters)`, isText(callUpNo, CALL_UP_NO_MAX)],
        [`school (max ${SCHOOL_MAX} characters)`, isOptionalText(school, SCHOOL_MAX)],
        [`parentName (max ${NAME_MAX} characters)`, isOptionalText(parentName, NAME_MAX)],
        ["parentMobile number", isOptionalMobile(parentMobile)],
        ["batchId", isText(batchId, ID_MAX)],
    ]);
    if (invalid) return invalid;

    // Normalize unique/display fields before creating anything
    const data = {
        email: email.trim(),
        mobile: mobile.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address: address.trim(),
        callUpNo: callUpNo.trim(),
        school: school.trim(),
        parentName: parentName.trim(),
        parentMobile: parentMobile.trim(),
        batchId: batchId.trim(),
    };

    // Verify the batch exists (and is active) BEFORE creating anything —
    // avoids an FK failure after a Firebase user is already created.
    try {
        const batch = await prisma.batch.findUnique({
            where: { id: data.batchId },
            select: { is_active: true },
        });
        if (!batch) {
            return prepareResponse(404, false, "Batch not found");
        }
        if (!batch.is_active) {
            return prepareResponse(400, false, "Batch is inactive");
        }
    } catch (err) {
        console.error("[newStudent] batch lookup failed:", err);
        return prepareResponse(500, false, "Failed to validate batch", String(err?.message || err));
    }

    let firebaseUser = null;
    let dbUser = null;

    try {
        // 1. Create user in Firebase Authentication
        firebaseUser = await auth.createUser({
            email: data.email,
            password,
            displayName: `${data.firstName} ${data.lastName}`,
        });

        if (!firebaseUser || !firebaseUser.uid) {
            throw new Error(
                "Firebase createUser returned successfully but uid is missing — " +
                JSON.stringify({ email: data.email, displayName: `${data.firstName} ${data.lastName}` })
            );
        }
        console.log("Firebase user created:", firebaseUser.uid);

        // 2. Create user record directly (no transaction wrapper)
        dbUser = await prisma.user.create({
            data: {
                email: data.email,
                password: "pwd-not-stored", // Password is not stored in DB; Firebase handles authentication
                jwt: "",
                gAuthID: firebaseUser.uid,
                mobile: data.mobile,
                first_name: data.firstName,
                last_name: data.lastName,
                address: data.address,
            },
        });
        console.log("DB user created:", dbUser.id);

        // 3. Create student record directly
        const student = await prisma.student.create({
            data: {
                call_up_no: data.callUpNo,
                school: data.school,
                parent_name: data.parentName,
                parent_mobile: data.parentMobile,
                user_id: dbUser.id,
                batch_id: data.batchId,
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

        // --- Firebase createUser errors → friendly responses ---
        const firebaseErrorMap = {
            "auth/email-already-exists": [409, "A user with this email already exists."],
            "auth/invalid-email": [400, "Invalid email address."],
            "auth/invalid-password": [400, `Password must be at least ${PASSWORD_MIN} characters.`],
            "auth/weak-password": [400, `Password must be at least ${PASSWORD_MIN} characters.`],
            "auth/operation-not-allowed": [500, "Firebase authentication is not enabled for this project."],
        };
        if (err?.code && firebaseErrorMap[err.code]) {
            const [code, msg] = firebaseErrorMap[err.code];
            return prepareResponse(code, false, msg);
        }

        // --- Prisma errors → friendly responses ---
        const prismaResponse = prismaErrorResponse(err, null);
        if (prismaResponse) return prismaResponse;

        const message =
            phase === "firebase-createUser"
                ? `Firebase user creation failed: ${err?.message || err}`
                : `Database error (${phase}): ${err?.message || err}`;

        return prepareResponse(500, false, message);
    }
}

// list all students paginated
const getStudents = async ({ page = 1, limit = 10, search = "", batch_id = "" } = {}) => {
    try {
        // --- validate pagination & filters ---
        page = Number(page);
        limit = Number(limit);
        if (!Number.isInteger(page) || page < 1) {
            return prepareResponse(400, false, "page must be a positive integer");
        }
        // Admin screens legitimately fetch "all rows" with large limits
        // (MarksPage uses 500 per batch and 9999 for counts), so allow up to
        // 10000 — still bounded, but those calls no longer 400.
        if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
            return prepareResponse(400, false, "limit must be an integer between 1 and 10000");
        }
        if (typeof search !== "string" || search.trim().length > SEARCH_MAX) {
            return prepareResponse(400, false, `search must be a string up to ${SEARCH_MAX} characters`);
        }
        if (typeof batch_id !== "string") {
            return prepareResponse(400, false, "batch_id must be a string");
        }
        search = search.trim();
        batch_id = batch_id.trim();

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
    } catch (error) {
        console.error("Get students error:", error);
        return prepareResponse(500, false, "Failed to retrieve students", String(error?.message || error));
    }
};

const getStudentById = async (studentId) => {
    try {
        if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
            return prepareResponse(400, false, "call_up_no is required");
        }
        studentId = studentId.trim();

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
    try {
        if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
            return prepareResponse(400, false, "call_up_no is required");
        }
        studentId = studentId.trim();

        studentData = studentData || {};
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

        // Only validate fields the caller actually provided (empty = unchanged)
        const invalid = checkFields([
            ["mobile number", isOptionalMobile(mobile)],
            [`firstName (max ${NAME_MAX} characters)`, isOptionalText(firstName, NAME_MAX)],
            [`lastName (max ${NAME_MAX} characters)`, isOptionalText(lastName, NAME_MAX)],
            [`address (max ${TEXT_MAX} characters)`, isOptionalText(address, TEXT_MAX)],
            [`callUpNo (max ${CALL_UP_NO_MAX} characters)`, isOptionalText(callUpNo, CALL_UP_NO_MAX)],
            [`school (max ${SCHOOL_MAX} characters)`, isOptionalText(school, SCHOOL_MAX)],
            [`parentName (max ${NAME_MAX} characters)`, isOptionalText(parentName, NAME_MAX)],
            ["parentMobile number", isOptionalMobile(parentMobile)],
            ["batchId", isOptionalText(batchId, ID_MAX)],
            ["isActive (must be true or false)", typeof isActive === "undefined" || typeof isActive === "boolean"],
        ]);
        if (invalid) return invalid;

        const updates = {
            mobile: mobile.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            address: address.trim(),
            callUpNo: callUpNo.trim(),
            school: school.trim(),
            parentName: parentName.trim(),
            parentMobile: parentMobile.trim(),
            batchId: batchId.trim(),
        };

        const existing = await prisma.student.findUnique({
            where: { call_up_no: studentId },
            include: { user: true },
        });
        if (!existing) {
            return prepareResponse(404, false, "Student not found");
        }

        // Verify the new batch exists (and is active) when it changes
        if (updates.batchId && updates.batchId !== existing.batch_id) {
            const batch = await prisma.batch.findUnique({
                where: { id: updates.batchId },
                select: { is_active: true },
            });
            if (!batch) {
                return prepareResponse(404, false, "Batch not found");
            }
            if (!batch.is_active) {
                return prepareResponse(400, false, "Batch is inactive");
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            // Update user record
            const userData = {
                mobile: updates.mobile || existing.user.mobile,
                first_name: updates.firstName || existing.user.first_name,
                last_name: updates.lastName || existing.user.last_name,
                address: updates.address || existing.user.address,
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
                    call_up_no: updates.callUpNo || existing.call_up_no,
                    school: updates.school || existing.school,
                    parent_name: updates.parentName || existing.parent_name,
                    parent_mobile: updates.parentMobile || existing.parent_mobile,
                    batch_id: updates.batchId || existing.batch_id,
                },
            });

            return { user, student };
        });

        return prepareResponse(200, true, "Student updated successfully", result);
    } catch (err) {
        console.error("Update student error:", err);
        return prismaErrorResponse(
            err,
            prepareResponse(500, false, "Failed to update student", String(err?.message || err))
        );
    }
};

const deleteStudent = async (studentId) => {
    try {
        if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
            return prepareResponse(400, false, "call_up_no is required");
        }
        studentId = studentId.trim();

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
        if (err?.code === "P2003") {
            return prepareResponse(409, false, "Cannot delete: related records still exist");
        }
        if (err?.code === "P2025") {
            return prepareResponse(404, false, "Student not found");
        }
        return prepareResponse(500, false, "Failed to delete student", String(err?.message || err));
    }
};

const resetStudentPassword = async (callUpNo, newPassword) => {
    try {
        if (!callUpNo || typeof callUpNo !== "string" || !callUpNo.trim()) {
            return prepareResponse(400, false, "call_up_no is required");
        }
        if (!isPassword(newPassword)) {
            return prepareResponse(400, false, `newPassword must be at least ${PASSWORD_MIN} characters`);
        }
        callUpNo = callUpNo.trim();

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
        if (err?.code === "auth/user-not-found") {
            return prepareResponse(404, false, "Firebase account not found for this student");
        }
        if (err?.code === "auth/weak-password" || err?.code === "auth/invalid-password") {
            return prepareResponse(400, false, `Password must be at least ${PASSWORD_MIN} characters`);
        }
        return prepareResponse(500, false, "Failed to reset password", String(err?.message || err));
    }
};

// Get a student's own profile (user + student + class/batch details) by the
// logged-in USER id from the JWT — the student portal login response only
// carries user.id, not call_up_no.
// Role: student (own profile only), staff/admin.
// NOT protected yet — when auth middleware is wired up, students must be
// restricted to their own userId (JWT id === :userId).
const getStudentProfileByUserId = async (userId) => {
    try {
        if (!userId || typeof userId !== "string" || !userId.trim()) {
            return prepareResponse(400, false, "userId is required");
        }
        userId = userId.trim();

        const student = await prisma.student.findUnique({
            where: { user_id: userId },
            select: {
                call_up_no: true,
                school: true,
                parent_name: true,
                parent_mobile: true,
                batch_id: true,
                // Sensitive fields (password, jwt, gAuthID) are excluded
                user: {
                    select: {
                        id: true,
                        email: true,
                        roles: true,
                        mobile: true,
                        first_name: true,
                        last_name: true,
                        address: true,
                        is_active: true,
                    },
                },
                batch: {
                    select: {
                        id: true,
                        name: true,
                        day: true,
                        start_time: true,
                        end_time: true,
                    },
                },
            },
        });
        if (!student) {
            return prepareResponse(404, false, "Student profile not found");
        }
        return prepareResponse(200, true, "Student profile retrieved successfully", student);
    } catch (error) {
        console.error("Get student profile error:", error);
        return prepareResponse(500, false, "Failed to retrieve profile", String(error?.message || error));
    }
};

module.exports = {
    newStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    resetStudentPassword,
    getStudentProfileByUserId,
};
