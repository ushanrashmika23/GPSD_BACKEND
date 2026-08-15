const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");
const { auth } = require("../config/firebase.config");

// User management covers system-access accounts only (admin & staff).
// Student accounts are created through the student module.
const ALLOWED_ROLES = ["admin", "staff"];

//list all users (admin/staff) paginated
const getUsers = async ({
    page = 1,
    limit = 10,
    search = "",
}) => {
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    // Build filter dynamically
    const where = {
        roles: { in: ALLOWED_ROLES },
    };

    if (search) {
        where.AND = [
            {
                OR: [
                    { first_name: { contains: search } },
                    { last_name: { contains: search } },
                    { email: { contains: search } },
                    { mobile: { contains: search } },
                ],
            },
        ];
    }

    // Run queries in parallel
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            // Never expose password / jwt / gAuthID
            select: {
                id: true,
                email: true,
                roles: true,
                is_active: true,
                mobile: true,
                first_name: true,
                last_name: true,
                address: true,
                lastLogin: true,
                createdAt: true,
            },
        }),
        prisma.user.count({ where }),
    ]);

    return prepareResponse(200, true, "Users retrieved successfully", {
        data: users,
        meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: skip + users.length < total,
            hasPrevious: page > 1,
        },
    });
};

const createUser = async (userData) => {
    const {
        email = "",
        password = "",
        mobile = "",
        firstName = "",
        lastName = "",
        address = "",
        role = "",
    } = userData;

    // --- early validation: Firebase & DB both need these ---
    const missing = [];
    if (!email || !email.includes("@")) missing.push("valid email");
    if (!password || password.length < 6) missing.push("password (min 6 characters)");
    if (!mobile) missing.push("mobile");
    if (!firstName) missing.push("firstName");
    if (!lastName) missing.push("lastName");
    if (!address) missing.push("address");
    if (!ALLOWED_ROLES.includes(role)) missing.push(`role (must be one of: ${ALLOWED_ROLES.join(", ")})`);

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

        // 2. Create user record in DB
        dbUser = await prisma.user.create({
            data: {
                email,
                password: "pwd-not-stored", // Password is not stored in DB; Firebase handles authentication
                jwt: "",
                gAuthID: firebaseUser.uid,
                mobile,
                first_name: firstName,
                last_name: lastName,
                address,
                roles: role,
            },
        });
        console.log("DB user created:", dbUser.id);

        return prepareResponse(201, true, "User created successfully", {
            id: dbUser.id,
            email: dbUser.email,
            roles: dbUser.roles,
            is_active: dbUser.is_active,
            mobile: dbUser.mobile,
            first_name: dbUser.first_name,
            last_name: dbUser.last_name,
            address: dbUser.address,
            lastLogin: dbUser.lastLogin,
            createdAt: dbUser.createdAt,
        });
    } catch (err) {
        // --- figure out which step failed for targeted cleanup ---
        const phase = !firebaseUser
            ? "firebase-createUser"
            : "prisma-user-create";

        console.error(`[createUser] ${phase} failed:`, err);

        // --- cleanup: remove Firebase user if it was created ---
        if (firebaseUser) {
            await auth.deleteUser(firebaseUser.uid).catch((deleteErr) =>
                console.error("Failed to rollback Firebase user:", firebaseUser.uid, deleteErr)
            );
            console.log("Firebase user rolled back:", firebaseUser.uid);
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
};

const updateUser = async (userId, userData) => {
    const {
        email = "",
        firstName = "",
        lastName = "",
        mobile = "",
        address = "",
        role = "",
        isActive,
    } = userData;

    if (role && !ALLOWED_ROLES.includes(role)) {
        return prepareResponse(400, false, `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}`);
    }

    try {
        const existing = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!existing) {
            return prepareResponse(404, false, "User not found");
        }

        // --- Firebase sync: email change and/or displayName change ---
        const firebaseUpdates = {};
        if (email && email !== existing.email) {
            firebaseUpdates.email = email;
        }
        if (firstName || lastName) {
            firebaseUpdates.displayName =
                `${firstName || existing.first_name} ${lastName || existing.last_name}`;
        }

        if (existing.gAuthID && existing.gAuthID !== "none" && Object.keys(firebaseUpdates).length > 0) {
            try {
                await auth.updateUser(existing.gAuthID, firebaseUpdates);
                console.log("Firebase user updated:", existing.gAuthID);
            } catch (fbErr) {
                console.error("Firebase update failed:", fbErr);
                return prepareResponse(400, false, `Firebase update failed: ${fbErr?.message || fbErr}`);
            }
        }

        // --- DB update ---
        const data = {
            email: email || existing.email,
            mobile: mobile || existing.mobile,
            first_name: firstName || existing.first_name,
            last_name: lastName || existing.last_name,
            address: address || existing.address,
            roles: role || existing.roles,
        };
        // Only include is_active if explicitly provided
        if (typeof isActive === "boolean") {
            data.is_active = isActive;
        }

        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data,
            });

            return prepareResponse(200, true, "User updated successfully", {
                id: user.id,
                email: user.email,
                roles: user.roles,
                is_active: user.is_active,
                mobile: user.mobile,
                first_name: user.first_name,
                last_name: user.last_name,
                address: user.address,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
            });
        } catch (dbErr) {
            // Best-effort: revert the Firebase email so auth and DB stay in sync
            if (firebaseUpdates.email) {
                await auth.updateUser(existing.gAuthID, { email: existing.email }).catch((revertErr) =>
                    console.error("Failed to revert Firebase email:", existing.gAuthID, revertErr)
                );
            }
            throw dbErr;
        }
    } catch (err) {
        console.error("Update user error:", err);
        if (err?.code === "P2002") {
            const target = err.meta?.target;
            const field = Array.isArray(target) ? target.join(", ") : "field";
            return prepareResponse(409, false, `Duplicate value for ${field}. A record with this ${field} already exists.`);
        }
        return prepareResponse(500, false, "Failed to update user", String(err?.message || err));
    }
};

const resetUserPassword = async (userId, newPassword) => {
    if (!newPassword || newPassword.length < 6) {
        return prepareResponse(400, false, "Password must be at least 6 characters");
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return prepareResponse(404, false, "User not found");
        }
        if (!user.gAuthID || user.gAuthID === "none") {
            return prepareResponse(400, false, "User has no Firebase account linked");
        }

        await auth.updateUser(user.gAuthID, { password: newPassword });
        console.log("Password reset for Firebase user:", user.gAuthID);

        return prepareResponse(200, true, "Password reset successfully");
    } catch (err) {
        console.error("Reset user password error:", err);
        return prepareResponse(500, false, "Failed to reset password", String(err?.message || err));
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    resetUserPassword,
};
