const mongoose = require('mongoose');

const chatsSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Chats must have a name'] },
  lastUpdatedAt: { type: Date, default: Date.now() },
  chatHistory: { type: [[String]], select: false },
  vectorName: { type: String, required: [true, 'Chat must have a vectorName'] },
  indexName: { type: String, required: [true, 'Chat must have a name'] },
  numOfDocs: {
    type: Number,
    default: 1,
    min: 1,
  },
});

chatsSchema.pre(/^find/, function (next) {
  this.sort('lastUpdatedAt');

  next();
});

module.exports = chatsSchema;

// TODO: ALLOW USERS TO SET THERI OWN API KEY
