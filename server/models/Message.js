const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },

  username: {
    type: String,
    required: true,
  },

  room: {
    type: String,
    required: true,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "Message",
  MessageSchema
);

the above is my message.js