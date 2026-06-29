const express = require("express");
const router = express.Router();

const lessonsController = require("../controllers/lessons.controller");

router.post("/", lessonsController.newLessonController);
router.get("/", lessonsController.getLessonsController);
router.put("/:id", lessonsController.updateLessonController);
router.delete("/:id", lessonsController.deleteLessonController);

module.exports = router;