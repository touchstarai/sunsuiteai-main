const express = require('express');

const authController = require('../controllers/authController');
const pdfController = require('../controllers/pdfController');
// const chatController = require('../controllers/chatController');

const router = express.Router();

router.use(authController.protect);
// router.ws('/chat/:chatId', authController.chat);

router
  .route('/processpdf')
  .post(
    pdfController.checkNumOfChats,
    pdfController.uploadPdf,
    pdfController.parseDoc,
    pdfController.checkTokenLimit,
    pdfController.processDocument
  );

router
  .route('/adddocument/:chatId')
  .post(
    pdfController.uploadPdf,
    pdfController.parseDoc,
    pdfController.checkTokenLimit,
    pdfController.addPdfIntoChat
  );

router
  .route('/apikey/:chatId')
  .get(pdfController.passChat, pdfController.generateApiKey)
  .patch(pdfController.passChat, pdfController.revokeApi);

router
  .route('/chat/:chatId')
  // .post(chatController.getApiKey)
  .get(pdfController.getChat)
  .patch(pdfController.clearChatHistory)
  .delete(pdfController.deleteChat);

module.exports = router;
