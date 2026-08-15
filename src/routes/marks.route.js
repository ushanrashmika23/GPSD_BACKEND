const express=  require('express');
const router = express.Router();
const markController = require('../controllers/marks.controller');

router.get('/papers', markController.getAllPapersController);
router.post('/paper', markController.createPaperController);
router.get('/paper/:batchId', markController.getPapersController);
router.put('/paper/:paperId/publish', markController.togglePublishController);
router.put('/paper/:paperId', markController.updatePaperController);
router.delete('/paper/:paperId', markController.deletePaperController);
router.post('/mark', markController.createMarkController);
router.put('/mark', markController.updateMarkController);
router.get('/mark/:paperId', markController.getMarksByPaperController);
// GET /api/marks/student-performance/:userId — a student's own performance
// (released marks, per-paper ranks, summary stats).
// Role: student (own performance), staff/admin. NOT protected yet; when auth
// middleware is added, restrict students to their own userId (JWT id === :userId).
router.get('/student-performance/:userId', markController.getStudentPerformanceController);

module.exports = router;

