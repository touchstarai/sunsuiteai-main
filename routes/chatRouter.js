const express = require('express');

const chatController = require('../controllers/chatController');

const router = express.Router();

// router.use(authController.protect);
router.ws('/chat/:chatId', chatController.chat);
router.ws('/apiKey', chatController.chatWithApi);

module.exports = router;
