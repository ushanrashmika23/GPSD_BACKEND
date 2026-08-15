const express = require('express');
const router = express.Router();
const materialController = require('../controllers/material.controller');
const upload = require("../middlewares/multer.middleware.js");

router.post('/', upload.single('file'), materialController.createMaterial);
router.get('/', materialController.getMaterials);
// GET /api/materials/student/:userId — all non-expired materials accessible to
// the student's batch, newest first.
// Role: student (own batch materials only), staff/admin. NOT protected yet; when
// auth middleware is added, restrict students to their own userId (JWT id === :userId).
router.get('/student/:userId', materialController.getStudentMaterials);
// GET /api/materials/:id/signed-url — a short-lived signed R2 URL for viewing
// a material's file (used by the student PDF viewer and video player).
// Role: student (own batch materials only), staff/admin. NOT protected yet; when
// auth middleware is added, verify the student's batch has non-expired access
// to this material before issuing the URL.
router.get('/:id/signed-url', materialController.getMaterialSignedUrl);
router.put('/:id', materialController.updateMaterial);
router.delete('/:id', materialController.deleteMaterial);
router.get('/signed-upload-url', materialController.getSignedUploadUrl);

module.exports = router;