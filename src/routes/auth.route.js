const express = require('express');
const router = express.Router();
const { firebaseLoginController, autoLoginController } = require('../controllers/auth.controller');

router.post('/firebase-login', firebaseLoginController);
router.post('/auto-login', autoLoginController);

module.exports = router;
