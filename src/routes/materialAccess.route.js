const express= require('express');
const router = express.Router();
const materialAccessController = require('../controllers/materialAccess.controller');

router.get('/:materialId', materialAccessController.getMaterialAccessesController);
router.post('/grant', materialAccessController.grantBatchAccessController);
router.post('/revoke', materialAccessController.revokeBatchAccessController);

module.exports = router;