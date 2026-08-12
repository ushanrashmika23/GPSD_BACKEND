const fs = require("fs");
const path = require("path");

let admin = null;
let auth = null;

function loadServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    const keyPath = path.join(__dirname, "firebaseServiceAccountKey.json");
    if (fs.existsSync(keyPath)) {
        return require(keyPath);
    }
    return null;
}

try {
    const serviceAccount = loadServiceAccount();
    if (serviceAccount) {
        admin = require("firebase-admin");
        const { getAuth } = require("firebase-admin/auth");
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
        auth = getAuth();
    } else {
        console.warn("Firebase not configured — student create will use local DB only.");
    }
} catch (err) {
    console.warn("Firebase init skipped:", err.message);
}

module.exports = { admin, auth };
