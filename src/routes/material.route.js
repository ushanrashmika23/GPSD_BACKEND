const express = require('express');
const router = express.Router();
const materialController = require('../controllers/material.controller');
const upload = require("../middlewares/multer.middleware.js");

router.post('/', upload.single('file'), materialController.createMaterial);
router.get('/', materialController.getMaterials);
router.put('/:id', materialController.updateMaterial);
router.delete('/:id', materialController.deleteMaterial);
router.get('/signed-upload-url', materialController.getSignedUploadUrl);

module.exports = router;