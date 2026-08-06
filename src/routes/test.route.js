const express = require("express");
const upload = require("../middlewares/multer.middleware.js");
const { uploadFile, downloadFile } = require("../controllers/test.controller.js");

const router = express.Router();

router.post("/", upload.single("file"), uploadFile);
router.get("/download", downloadFile);
// router.get("/cdn", getSignedCdnUrl);

module.exports = router;