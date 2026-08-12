const dotenv = require("dotenv");
dotenv.config();

const hasR2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY;

let r2 = null;
if (hasR2) {
    const { S3Client } = require("@aws-sdk/client-s3");
    r2 = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY,
            secretAccessKey: process.env.R2_SECRET_KEY,
        },
    });
}

module.exports = { r2 };
