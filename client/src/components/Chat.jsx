import {
  useState,
  useEffect,
  useRef,
} from "react";

import io from "socket.io-client";

const socket = io(
  "https://synctalk-backend-w7lj.onrender.com"
);

function Chat() {
  const [messages, setMessages] =
    useState([]);

  const [messageInput, setMessageInput] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [room, setRoom] =
    useState("");

  const [joined, setJoined] =
    useState(false);

  const [darkMode, setDarkMode] =
    useState(true);

  const [roomUsers, setRoomUsers] =
    useState([]);

  const [typingUser, setTypingUser] =
    useState("");

  const messagesEndRef = useRef(null);

  const notificationSound = useRef(
    new Audio(
      "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3"
    )
  );

  // ===============================
  // SOCKET LISTENERS
  // ===============================

  useEffect(() => {
    socket.on("message", (message) => {
      setMessages((prev) => [
        ...prev,
        message,
      ]);

      if (
        message.username !== username
      ) {
        notificationSound.current.play();
      }
    });

    socket.on(
      "previous_messages",
      (previousMessages) => {
        setMessages(previousMessages);
      }
    );

    socket.on("room_users", (users) => {
      setRoomUsers(users);
    });

    socket.on("room_cleared", () => {
      setMessages([]);
    });

    socket.on("typing", (user) => {
      setTypingUser(user);
    });

    socket.on("stop_typing", () => {
      setTypingUser("");
    });

    socket.on(
      "message_deleted_everyone",
      ({ messageId }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  text:
                    "This message was deleted",
                  deleted: true,
                }
              : msg
          )
        );
      }
    );

    socket.on("room_deleted", () => {
      alert("Room deleted");

      setMessages([]);
      setJoined(false);
      setRoom("");
      setRoomUsers([]);
    });

    return () => {
      socket.off("message");
      socket.off(
        "previous_messages"
      );
      socket.off("room_users");
      socket.off("room_cleared");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off(
        "message_deleted_everyone"
      );
      socket.off("room_deleted");
    };
  }, [username]);

  // ===============================
  // AUTO SCROLL
  // ===============================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // ===============================
  // JOIN ROOM
  // ===============================

  const joinRoom = () => {
    if (
      !username.trim() ||
      !room.trim()
    )
      return;

    setJoined(true);

    socket.emit("join_room", {
      username,
      room,
    });
  };

  // ===============================
  // SEND MESSAGE
  // ===============================

  const sendMessage = () => {
    if (!messageInput.trim())
      return;

    socket.emit("message", {
      text: messageInput,
      username,
      room,
      timestamp: new Date(),
    });

    setMessageInput("");

    socket.emit(
      "stop_typing",
      room
    );
  };

  // ===============================
  // CLEAR CHAT
  // ===============================

  const clearChat = () => {
    const confirmClear =
      window.confirm(
        "Clear all messages?"
      );

    if (!confirmClear) return;

    socket.emit("clear_room", room);
  };

  // ===============================
  // DELETE ROOM
  // ===============================

  const deleteRoom = () => {
    const confirmDelete =
      window.confirm(
        "Delete this room permanently?"
      );

    if (!confirmDelete) return;

    socket.emit("delete_room", room);
  };

  // ===============================
  // DELETE MESSAGE
  // ===============================

  const deleteMessage = (
    messageId,
    type
  ) => {
    if (type === "me") {
      setMessages((prev) =>
        prev.filter(
          (msg) =>
            msg._id !== messageId
        )
      );
    } else {
      socket.emit(
        "delete_message_everyone",
        {
          messageId,
          room,
        }
      );
    }
  };

  // ===============================
  // JOIN SCREEN
  // ===============================

  if (!joined) {
    return (
      <div className="flex justify-center items-center min-h-screen px-4 bg-[#020817]">
        <div className="w-full max-w-md rounded-3xl shadow-2xl p-8 bg-[#111827] text-white">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">
              SyncTalk
            </h1>

            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-400 text-black"
            >
              ☀️
            </button>
          </div>

          <p className="text-center mb-8 text-gray-300">
            Join a realtime chat room
          </p>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                )
              }
              className="w-full px-4 py-4 rounded-2xl bg-gray-700 border border-gray-600 outline-none"
            />

            <input
              type="text"
              placeholder="Room Name"
              value={room}
              onChange={(e) =>
                setRoom(e.target.value)
              }
              className="w-full px-4 py-4 rounded-2xl bg-gray-700 border border-gray-600 outline-none"
            />

            <button
              onClick={joinRoom}
              className="w-full bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-semibold"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // CHAT SCREEN
  // ===============================

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#020817]">
      <div className="w-full h-screen lg:h-[850px] flex flex-col lg:flex-row bg-[#111827] text-white overflow-hidden">
        {/* SIDEBAR */}

        <div className="w-full lg:w-[320px] border-b lg:border-b-0 lg:border-r border-gray-700 p-5 bg-[#0f172a]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              SyncTalk
            </h1>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-400">
              Room
            </p>

            <h2 className="text-2xl font-semibold">
              #{room}
            </h2>
          </div>

          <button
            onClick={clearChat}
            className="w-full mb-3 bg-slate-600 hover:bg-slate-700 py-3 rounded-2xl"
          >
            Clear Chat
          </button>

          <button
            onClick={deleteRoom}
            className="w-full mb-6 bg-stone-600 hover:bg-stone-700 py-3 rounded-2xl"
          >
            Delete Room
          </button>

          <p className="text-sm mb-3 text-gray-400">
            Active Users (
            {roomUsers.length})
          </p>

          <div className="space-y-2">
            {roomUsers.map(
              (user, index) => (
                <div
                  key={index}
                  className="px-4 py-3 rounded-xl bg-gray-800"
                >
                  {user}
                </div>
              )
            )}
          </div>
        </div>

        {/* CHAT */}

        <div className="flex flex-col flex-1">
          {/* MESSAGES */}

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-[#020617]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.username ===
                  username
                    ? "items-end"
                    : "items-start"
                }`}
              >
                <span className="text-xs mb-1 text-gray-400">
                  {msg.username}
                </span>

                <div
                  className={`px-5 py-3 rounded-2xl max-w-[90%] lg:max-w-[75%] break-words ${
                    msg.username ===
                    username
                      ? "bg-indigo-500"
                      : msg.username ===
                        "System"
                      ? "bg-emerald-500"
                      : "bg-gray-700"
                  }`}
                >
                  {msg.text}
                </div>

                <span className="text-xs mt-1 text-gray-400">
                  {new Date(
                    msg.timestamp
                  ).toLocaleTimeString()}
                </span>

                {msg.username ===
                  username &&
                  !msg.deleted &&
                  msg.username !==
                    "System" && (
                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={() =>
                          deleteMessage(
                            msg._id,
                            "me"
                          )
                        }
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Delete for me
                      </button>

                      <button
                        onClick={() =>
                          deleteMessage(
                            msg._id,
                            "everyone"
                          )
                        }
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Delete for everyone
                      </button>
                    </div>
                  )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* TYPING */}

          {typingUser && (
            <div className="px-5 pb-2 text-sm italic text-gray-400">
              {typingUser} is typing...
            </div>
          )}

          {/* INPUT */}

          <div className="p-4 lg:p-5 border-t border-gray-700 bg-[#111827]">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Message..."
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(
                    e.target.value
                  );

                  socket.emit(
                    "typing",
                    {
                      room,
                      username,
                    }
                  );

                  setTimeout(() => {
                    socket.emit(
                      "stop_typing",
                      room
                    );
                  }, 1000);
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  sendMessage()
                }
                className="flex-1 px-6 py-4 rounded-2xl bg-gray-700 border border-gray-600 outline-none"
              />

              <button
                onClick={sendMessage}
                className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 px-10 py-4 rounded-2xl font-semibold"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;