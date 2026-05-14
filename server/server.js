require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Message = require("./models/Message");
const Room = require("./models/Room");

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
// ACTIVE USERS STORAGE
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

app.get("/", (req, res) => {
  res.send("✅ SyncTalk backend is running");
});

// ===============================
// GET ALL ROOMS EVER CREATED
// ===============================

app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find().sort({
      createdAt: -1,
    });

    res.json(rooms);
  } catch (error) {
    console.log("❌ Rooms fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch rooms",
    });
  }
});

// ===============================
// SOCKET CONNECTION
// ===============================

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // ===============================
  // JOIN ROOM
  // ===============================

  socket.on(
    "join_room",
    async ({ username, room }) => {
      try {
        socket.username = username;
        socket.room = room;

        socket.join(room);

        console.log(
          `👤 ${username} joined room: ${room}`
        );

        // CREATE ROOM IF NOT EXISTS

        const existingRoom =
          await Room.findOne({
            roomName: room,
          });

        if (!existingRoom) {
          await Room.create({
            roomName: room,
          });

          console.log(
            `🏠 Room created: ${room}`
          );
        }

        // ACTIVE USERS

        if (!activeRooms[room]) {
          activeRooms[room] = [];
        }

        if (
          !activeRooms[room].includes(
            username
          )
        ) {
          activeRooms[room].push(
            username
          );
        }

        // PREVIOUS MESSAGES

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

        // JOIN MESSAGE

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

        // UPDATE USERS

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
  // CLEAR CHAT
  // ===============================

  socket.on(
    "clear_room",
    async (room) => {
      try {
        await Message.deleteMany({
          room,
        });

        io.to(room).emit(
          "room_cleared"
        );

        console.log(
          `🧹 Cleared chat for room: ${room}`
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
  // DELETE ROOM
  // ===============================

  socket.on(
    "delete_room",
    async (room) => {
      try {
        // DELETE MESSAGES
        await Message.deleteMany({
          room,
        });

        // DELETE ROOM
        await Room.deleteOne({
          roomName: room,
        });

        // REMOVE ACTIVE USERS
        delete activeRooms[room];

        // NOTIFY USERS
        io.to(room).emit(
          "room_deleted"
        );

        // FORCE USERS OUT
        const sockets =
          await io.in(room).fetchSockets();

        sockets.forEach((s) => {
          s.leave(room);
        });

        console.log(
          `🗑️ Room deleted: ${room}`
        );
      } catch (error) {
        console.log(
          "❌ Delete room error:",
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

        if (activeRooms[room]) {
          activeRooms[room] =
            activeRooms[room].filter(
              (user) =>
                user !== username
            );

          io.to(room).emit(
            "room_users",
            activeRooms[room]
          );

          // LEAVE MESSAGE

          const leaveMessage =
            new Message({
              text: `${username} left the room`,
              username: "System",
              room,
              timestamp: new Date(),
            });

          await leaveMessage.save();

          io.to(room).emit(
            "message",
            leaveMessage
          );
        }
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