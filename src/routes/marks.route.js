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

module.exports = router;

