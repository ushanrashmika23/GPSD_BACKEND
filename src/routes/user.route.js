const express = require('express');
const router = express.Router();
const { getUsersController, createUserController, updateUserController, resetPasswordController } = require('../controllers/user.controller');

router.get('/', getUsersController);
router.post('/', createUserController);
router.put('/:id', updateUserController);
router.put('/:id/reset-password', resetPasswordController);

module.exports = router;
