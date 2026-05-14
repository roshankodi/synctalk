require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Message = require("./models/Message");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// ===============================
// Active Rooms Storage
// ===============================

const activeRooms = {};

// ===============================
// MongoDB Connection
// ===============================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((error) => {
    console.log("❌ MongoDB Error:", error);
  });

// ===============================
// Routes
// ===============================

// Health Route
app.get("/", (req, res) => {
  res.send("✅ SyncTalk backend is running");
});

// Get Active Rooms
app.get("/rooms", (req, res) => {
  res.json(Object.keys(activeRooms));
});

// ===============================
// Socket.IO Connection
// ===============================

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // ===============================
  // Join Room
  // ===============================

  socket.on(
    "join_room",
    async ({ username, room }) => {
      try {
        // Save user info to socket
        socket.username = username;
        socket.room = room;

        // Join room
        socket.join(room);

        console.log(
          `👤 ${username} joined room: ${room}`
        );

        // Add room to active rooms
        if (!activeRooms[room]) {
          activeRooms[room] = [];
        }

        activeRooms[room].push(username);

        // Load previous messages
        const previousMessages =
          await Message.find({
            room,
          }).sort({
            timestamp: 1,
          });

        socket.emit(
          "previous_messages",
          previousMessages
        );

        // Notify room
        io.to(room).emit("message", {
          text: `${username} joined the room`,
          username: "System",
          room,
          timestamp: new Date(),
        });

        // Update users list
        io.to(room).emit(
          "room_users",
          activeRooms[room]
        );
      } catch (error) {
        console.log(
          "❌ Join room error:",
          error
        );
      }
    }
  );

  // ===============================
  // Send Message
  // ===============================

  socket.on(
    "message",
    async (messageData) => {
      try {
        // Save message to MongoDB
        const newMessage = new Message({
          text: messageData.text,
          username: messageData.username,
          room: messageData.room,
          timestamp:
            messageData.timestamp ||
            new Date(),
        });

        await newMessage.save();

        // Emit message to room
        io.to(messageData.room).emit(
          "message",
          newMessage
        );
      } catch (error) {
        console.log(
          "❌ Message save error:",
          error
        );
      }
    }
  );

  // ===============================
  // Disconnect
  // ===============================

  socket.on("disconnect", () => {
    try {
      const username = socket.username;
      const room = socket.room;

      if (username && room) {
        console.log(
          `🔴 ${username} left room: ${room}`
        );

        // Remove user from active rooms
        if (activeRooms[room]) {
          activeRooms[room] =
            activeRooms[room].filter(
              (user) => user !== username
            );

          // Remove empty room
          if (
            activeRooms[room].length === 0
          ) {
            delete activeRooms[room];
          }
        }

        // Notify room
        io.to(room).emit("message", {
          text: `${username} left the room`,
          username: "System",
          room,
          timestamp: new Date(),
        });

        // Update users list
        io.to(room).emit(
          "room_users",
          activeRooms[room] || []
        );
      }

      console.log(
        "🔌 User disconnected:",
        socket.id
      );
    } catch (error) {
      console.log(
        "❌ Disconnect error:",
        error
      );
    }
  });
});

// ===============================
// Start Server
// ===============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});