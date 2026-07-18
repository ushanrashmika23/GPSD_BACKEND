const admin = require("firebase-admin");
const {getAuth} = require("firebase-admin/auth");

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require("./firebaseServiceAccountKey.json");

admin.initializeApp({
    credential: admin.cert(serviceAccount),
});

const auth = getAuth();

module.exports = { admin, auth };
