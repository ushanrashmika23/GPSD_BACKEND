const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { r2 } = require("../config/r2.js");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Upload a file to R2
exports.uploadFile = async (req, res) => {

    const file = req.file;

    const key = `docs/${Date.now()}-${file.originalname}`;

    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
    }));

    res.json({
        success: true,
        key,
        url: `${process.env.R2_PUBLIC_URL}/${key}`
    });
};

// Generate a signed URL for downloading the file
exports.downloadFile = async (req, res) => {

    const key = req.body.key;

    // TODO:
    // Verify JWT
    // Check this user owns the file

    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key
    });

    const signedUrl = await getSignedUrl(r2, command, {
        expiresIn: 300
    });

    res.json({
        success: true,
        url: signedUrl
    });
};

// Generate a signed URL for the CDN
// exports.getSignedCdnUrl = async (req, res) => {
//     const SECRET = process.env.CDN_SECRET;
//     const data = `${req.body.key}${SECRET}`;
//     const signature = require("crypto").createHash("sha256").update(data).digest("hex");
//     const signedUrl = {
//         url: `${process.env.CDN_PUBLIC_URL}`,
//         body: {
//             key: req.body.key,
//             hash: signature
//         }
//     };

//     res.json({
//         success: true,
//         signedUrl
//     });
// }

