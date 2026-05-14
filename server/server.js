require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Message = require("./models/Message");

const app = express();

const server = http.createServer(app);

// ===============================
// SOCKET.IO CONFIG
// ===============================

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// ===============================
// ACTIVE ROOMS STORAGE
// ===============================

const activeRooms = {};

// ===============================
// MONGODB CONNECTION
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
// ROUTES
// ===============================

// Health Check
app.get("/", (req, res) => {
  res.send("✅ SyncTalk backend is running");
});

// Get All Active Rooms
app.get("/rooms", (req, res) => {
  const rooms = Object.keys(activeRooms).map(
    (roomName) => ({
      room: roomName,
      users: activeRooms[roomName],
      totalUsers:
        activeRooms[roomName].length,
    })
  );

  res.json(rooms);
});

// ===============================
// SOCKET CONNECTION
// ===============================

io.on("connection", (socket) => {
  console.log(
    "🟢 User connected:",
    socket.id
  );

  // ===============================
  // JOIN ROOM
  // ===============================

  socket.on(
    "join_room",
    async ({ username, room }) => {
      try {
        // Save user data
        socket.username = username;
        socket.room = room;

        // Join room
        socket.join(room);

        console.log(
          `👤 ${username} joined room: ${room}`
        );

        // Create room if not exists
        if (!activeRooms[room]) {
          activeRooms[room] = [];
        }

        // Prevent duplicate usernames
        if (
          !activeRooms[room].includes(
            username
          )
        ) {
          activeRooms[room].push(
            username
          );
        }

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

        // Send system join message
        const joinMessage =
          new Message({
            text: `${username} joined the room`,
            username: "System",
            room,
            timestamp: new Date(),
          });

        await joinMessage.save();

        io.to(room).emit(
          "message",
          joinMessage
        );

        // Update active users
        io.to(room).emit(
          "room_users",
          activeRooms[room]
        );

        // Update active rooms
        io.emit(
          "active_rooms",
          Object.keys(activeRooms)
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
  // SEND MESSAGE
  // ===============================

  socket.on(
    "message",
    async (messageData) => {
      try {
        const newMessage =
          new Message({
            text: messageData.text,
            username:
              messageData.username,
            room: messageData.room,
            timestamp:
              messageData.timestamp ||
              new Date(),
          });

        await newMessage.save();

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
  // CLEAR ROOM CHAT
  // ===============================

  socket.on(
    "clear_room",
    async (room) => {
      try {
        await Message.deleteMany({
          room,
        });

        // Notify frontend
        io.to(room).emit(
          "room_cleared"
        );

        // Send system message
        io.to(room).emit("message", {
          text: "Chat history cleared",
          username: "System",
          room,
          timestamp: new Date(),
        });

        console.log(
          `🧹 Cleared messages for room: ${room}`
        );
      } catch (error) {
        console.log(
          "❌ Clear room error:",
          error
        );
      }
    }
  );

  // ===============================
  // DISCONNECT
  // ===============================

  socket.on("disconnect", async () => {
    try {
      const username =
        socket.username;
      const room = socket.room;

      if (username && room) {
        console.log(
          `🔴 ${username} left room: ${room}`
        );

        // Remove user
        if (activeRooms[room]) {
          activeRooms[room] =
            activeRooms[room].filter(
              (user) =>
                user !== username
            );

          // Remove empty room
          if (
            activeRooms[room].length ===
            0
          ) {
            delete activeRooms[room];
          }
        }

        // Save leave message
        const leaveMessage =
          new Message({
            text: `${username} left the room`,
            username: "System",
            room,
            timestamp: new Date(),
          });

        await leaveMessage.save();

        // Notify room
        io.to(room).emit(
          "message",
          leaveMessage
        );

        // Update users list
        io.to(room).emit(
          "room_users",
          activeRooms[room] || []
        );

        // Update active rooms
        io.emit(
          "active_rooms",
          Object.keys(activeRooms)
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
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});