const multer = require('multer');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const User = require('../model/userModel');

const { pineconeClient, loadDoc, storeToPinecone } = require('../util/ReadAndFormatPdf');
const catchAsync = require('../util/catchAsync');
const multerFilter = require('../util/multerFilter');
const AppError = require('../util/AppError');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = `${__dirname}/../temp/uploads`;

    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const name = `document-${Date.now()}.${req.type}`;

    req.fileName = name;
    req.originalName = file.originalname || req.originalname;
    // console.log(req.fileName);
    cb(null, name);
  },
});

const upload = multer({ storage: storage, fileFilter: multerFilter });

// --------------------- UPLOAD PDF
exports.uploadPdf = upload.single('document');

// ---------------- parse docs
exports.parseDoc = catchAsync(async function (req, res, next) {
  const file = req.fileName || req.body.text;

  const opt = {
    file: file,
    fileType: req.type,
    originalName: req.originalName || req.body.originalName,
  };

  // console.log(req.body.originalName);

  const { splitted: parsedDoc, tokens } = await loadDoc(opt);

  req.parsedDoc = parsedDoc;
  req.tokens = tokens;

  next();
});

// ------------------------ Check Token LImit
exports.checkTokenLimit = catchAsync(async function (req, res, next) {
  const { tokens, user } = req;
  const { question } = req.body;

  if (!req.user.subscription)
    return next(new AppError('Please Subscribe to one of our plans to get going.', 400));

  if (
    user.subscriptionUpdatedAt.getTime() / 1000 <=
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
  ) {
    req.user = await user.resetUser();
  }

  if (tokens) {
    if (user.uploadTokens < tokens)
      return next(
        new AppError('You have finished tokens for upload please upgrade your plan.', 400)
      );

    return next();
  }

  if (user.conversationTokens < question.length / 4)
    return next(
      new AppError(
        'You have finished your conversational tokens, Please upgrade to continue',
        400
      )
    );

  next();
});

// ------------------- CHECK NUM OF CHATS A USER HAVE
exports.checkNumOfChats = function (req, res, next) {
  if (!req.user.subscription)
    return next(new AppError('Please Subscribe to one of our plans to get going.', 400));

  if (req.user.chats.length >= req.user.subscription.maxChats)
    return next(
      new AppError(
        'You have reached your max chat windown. Please delete atleast one chat to proceed.',
        400
      )
    );

  next();
};

// ----------------------- PROCESS pdf
exports.processDocument = catchAsync(async function (req, res, next) {
  const originalName =
    req.originalName?.trim() || req.body.originalName || `document-${Date.now()}`;

  const { parsedDoc, tokens } = req;
  const openAIApiKey = req.cookies.openAIApiKey;

  const fileNameOnPine = await storeToPinecone({
    docs: parsedDoc,
    openAIApiKey: openAIApiKey,
  });

  // store the new chat
  const user = await User.findById(req.user._id).select('+chats.chatHistory');
  user.chats.push({
    name: originalName,
    vectorName: fileNameOnPine,
    indexName: process.env.PINECONE_INDEX_NAME,
  });

  const updatedUser = await user.updateUploadTokens(tokens);

  res.status(200).json({
    status: 'success',
    docName: fileNameOnPine,
    chatTitle: originalName,
    _id: updatedUser.chats.slice(-1)[0]._id,
  });
});

// ------------ Add a document oto analready exsted document
exports.addPdfIntoChat = catchAsync(async function (req, res, next) {
  const { chatId } = req.params;
  const { user, parsedDoc, tokens } = req;

  const { vectorName: nameSpace, indexName } = await user.chats.id(chatId);
  const openAIApiKey = req.cookies.openAIApiKey;

  await storeToPinecone({
    docs: parsedDoc,
    nameSpace,
    indexName,
    openAIApiKey: openAIApiKey,
  });

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Document added to your chat successFully',
  });
  // const file = req.
});

// ------------------------- GET CHAT BY ID
exports.getChat = catchAsync(async function (req, res, next) {
  const { chatId } = req.params;
  const { chats } = await User.findById(req.user._id).select('+chats.chatHistory');

  const chat = chats.id(chatId);
  if (!chat)
    return next(
      new AppError('There is no chat in your chats collection with this chat Id', 404)
    );

  res.status(200).json({
    status: 'success',
    data: chat,
  });
});

// ------------------- delete chat
exports.deleteChat = catchAsync(async function (req, res, next) {
  const { chatId } = req.params;
  const user = await User.findById(req.user._id).select('+chats.chatHistory');
  const vectorName = user.chats.id(chatId)?.vectorName;
  const pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX_NAME);

  const index = user.chats.findIndex((chat) => {
    return chat.id === chatId;
  });

  await pineconeIndex.delete1({ deleteAll: true, namespace: vectorName });

  if (index !== -1) user.chats.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  res.status(203).json({ message: 'success' });
});

// ------------------- EDIT CHAT TITLE
exports.editChatTitle = catchAsync(async function (req, res, next) {
  const { chatId } = req.params;
  const { user } = req;
  const chat = user.chats.id(chatId);

  if (!chat) return next(new AppError('No chat with this Id', 404));

  user.chats.id(chatId).name = req.body.chatTitle || chat.name;

  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json({ status: 'success', message: 'Your chat Title has changed successfully' });
});

// ------------ Clear history
exports.clearChatHistory = catchAsync(async function (req, res, next) {
  const { chatId } = req.params;
  const user = await User.findById(req.user._id).select('+chats.chatHistory');

  const chat = user.chats.id(chatId);
  if (!chat) return next(new AppError('No chat with this Id', 404));

  user.chats.id(chatId).chatHistory = [];
  await user.save({ validateBeforeSave: false });

  res.status(203).json({
    status: 'success',
    message: 'Chat history cleared successfully',
  });
});

// ------------------------------ Create Apikey for a chat
exports.generateApiKey = catchAsync(async function (req, res, next) {
  const { chatId } = req.params;
  const { user, chat } = req;

  const apiKey = signApiToken({ chatId, id: user._id });

  chat.apiGenerationDate = Date.now();

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', data: { apiKey } });
});

exports.revokeApi = catchAsync(async function (req, res, next) {
  const { user, chat } = req;

  chat.apiGenerationDate = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', message: 'api key revoked' });
});

exports.passChat = catchAsync(async function (req, res, next) {
  const { chatId } = req.params;
  const { user } = req;

  const chat = user.chats.id(chatId);

  if (!chat) return next(new AppError('No chat with this id.', 404));

  req.chat = chat;

  next();
});

// // --------------------- Helpers
function signApiToken({ chatId, id }) {
  return jwt.sign(
    { id: id, chatId, iat: Date.now() / 1000 + 50 },
    process.env.JWT_SECRET
  );
}
