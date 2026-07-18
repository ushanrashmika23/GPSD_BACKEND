const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const batchController = require("../controllers/batch.controller");

router.post("/", batchController.addBatchController);
router.get("/", batchController.getBatchesController);
router.put("/:id", batchController.updateBatchController);
router.delete("/:id", batchController.deleteBatchController);
router.get("/active", batchController.getActiveBatchesController);

module.exports = router;