const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { prepareResponse } = require("../utils/responseEntity");
const { auth } = require("../config/firebase.config");

// Strip sensitive fields before sending a user back to the client
const toSafeUser = (u) => ({
    id: u.id,
    email: u.email,
    roles: u.roles,
    first_name: u.first_name,
    last_name: u.last_name,
    mobile: u.mobile,
    address: u.address,
    is_active: u.is_active,
    lastLogin: u.lastLogin,
});

const signToken = (user) => {
    // No refresh token — single long-lived access token (30d)
    return jwt.sign(
        { id: user.id, email: user.email, roles: user.roles },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

// Login with a Firebase ID token (Google popup or email/password sign-in) obtained by the frontend Firebase SDK
const firebaseLogin = async (idToken) => {
    if (!idToken) {
        return prepareResponse(400, false, "Firebase ID token is required");
    }

    try {
        // 1. Verify the Firebase ID token
        const decoded = await auth.verifyIdToken(idToken);
        const { uid } = decoded;
        console.log("Firebase token verified for UID:", uid);

        // 2. Find the linked user in DB
        let user = await prisma.user.findUnique({ where: { gAuthID: uid } });

        // Fallback: link by email — covers accounts created by the admin before
        // ever signing in with Google (their Google UID differs from the
        // email/password UID assigned at creation time).
        if (!user && decoded.email) {
            const byEmail = await prisma.user.findUnique({ where: { email: decoded.email } });
            if (byEmail) {
                user = await prisma.user.update({
                    where: { id: byEmail.id },
                    data: { gAuthID: uid },
                });
                console.log("Linked Google UID", uid, "to existing user", user.id);
            }
        }

        if (!user) {
            return prepareResponse(404, false, "No account linked to this Google account. Contact an administrator.");
        }
        if (!user.is_active) {
            return prepareResponse(403, false, "Account is deactivated. Contact an administrator.");
        }

        // 3. Issue JWT and persist it (single active session per user)
        const token = signToken(user);
        await prisma.user.update({
            where: { id: user.id },
            data: { jwt: token, lastLogin: new Date() },
        });

        return prepareResponse(200, true, "Login successful", {
            token,
            user: toSafeUser(user),
        });
    } catch (err) {
        console.error("Firebase login error:", err);
        if (err?.code === "auth/id-token-expired") {
            return prepareResponse(401, false, "Firebase session expired. Please sign in again.");
        }
        if (err?.code === "auth/argument-error" || err?.code === "auth/invalid-id-token") {
            return prepareResponse(401, false, "Invalid Firebase token.");
        }
        return prepareResponse(500, false, "Login failed", String(err?.message || err));
    }
};

// Restore a session from an existing JWT (no refresh token involved)
const autoLogin = async (token) => {
    if (!token) {
        return prepareResponse(401, false, "Token is required");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return prepareResponse(401, false, "User no longer exists");
        }
        if (!user.is_active) {
            return prepareResponse(403, false, "Account is deactivated. Contact an administrator.");
        }
        // The token must match the one issued at login — logging in elsewhere invalidates this one
        if (user.jwt !== token) {
            return prepareResponse(401, false, "Session is no longer valid. Please sign in again.");
        }

        return prepareResponse(200, true, "Session restored", { user: toSafeUser(user) });
    } catch (err) {
        console.error("Auto login error:", err);
        if (err.name === "TokenExpiredError") {
            return prepareResponse(401, false, "Session expired. Please sign in again.");
        }
        if (err.name === "JsonWebTokenError") {
            return prepareResponse(401, false, "Invalid session.");
        }
        return prepareResponse(500, false, "Auto login failed", String(err?.message || err));
    }
};

module.exports = {
    firebaseLogin,
    autoLogin,
};
