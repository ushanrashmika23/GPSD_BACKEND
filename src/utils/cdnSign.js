const crypto = require("crypto");

const signCdnUrl = (key, ttlSeconds = 3600) => {
    const secret = process.env.CDN_SECRET;
    const base = (process.env.CDN_BASE_URL || "http://localhost:8787").replace(/\/$/, "");
    if (!secret || !key) return null;

    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const data = `${key}:${expires}`;
    const signature = crypto.createHmac("sha256", secret).update(data).digest("hex");
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return `${base}/${encodedKey}?expires=${expires}&signature=${signature}`;
};

module.exports = { signCdnUrl };
