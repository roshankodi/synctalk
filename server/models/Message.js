const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
    },

    room: {
      type: String,
      required: true,
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    // ===============================
    // DELETE FOR EVERYONE
    // ===============================

    deleted: {
      type: Boolean,
      default: false,
    },

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    deletedMessage: {
      type: String,
      default: "This message was deleted",
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model(
  "Message",
  MessageSchema
);