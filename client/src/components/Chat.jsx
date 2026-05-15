```jsx
import {
  useEffect,
  useRef,
  useState,
} from "react";

import io from "socket.io-client";

const socket = io(
  "https://synctalk-backend-w7lj.onrender.com",
  {
    transports: ["websocket"],
  }
);

function Chat() {
  // ===============================
  // STATES
  // ===============================

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

  const [roomUsers, setRoomUsers] =
    useState([]);

  const [typingUser, setTypingUser] =
    useState("");

  const [darkMode, setDarkMode] =
    useState(true);

  const [showSidebar, setShowSidebar] =
    useState(false);

  const [showMenu, setShowMenu] =
    useState(false);

  const [replyMessage, setReplyMessage] =
    useState(null);

  const [messageMenu, setMessageMenu] =
    useState({
      visible: false,
      message: null,
    });

  // ===============================
  // THEME
  // ===============================

  const theme = darkMode
    ? {
        bg: "bg-[#020817]",
        card: "bg-[#111827]",
        sidebar: "bg-[#0f172a]",
        text: "text-white",
        border: "border-gray-700",
        input:
          "bg-gray-700 text-white",
        myMsg: "bg-indigo-500",
        otherMsg: "bg-gray-700",
        systemMsg: "bg-emerald-500",
      }
    : {
        bg: "bg-gray-100",
        card: "bg-white",
        sidebar: "bg-gray-200",
        text: "text-black",
        border: "border-gray-300",
        input:
          "bg-white text-black",
        myMsg:
          "bg-indigo-500 text-white",
        otherMsg:
          "bg-gray-300 text-black",
        systemMsg:
          "bg-emerald-500 text-white",
      };

  // ===============================
  // REFS
  // ===============================

  const messagesEndRef = useRef(null);

  const typingTimeoutRef = useRef(null);

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
  // SOCKET EVENTS
  // ===============================

  useEffect(() => {
    socket.on("message", (msg) => {
      setMessages((prev) => {
        const exists = prev.find(
          (m) => m._id === msg._id
        );

        if (exists) return prev;

        return [...prev, msg];
      });
    });

    socket.on(
      "previous_messages",
      (msgs) => {
        setMessages(msgs);
      }
    );

    socket.on(
      "room_users",
      (users) => {
        setRoomUsers(users);
      }
    );

    socket.on("typing", (user) => {
      setTypingUser(user);
    });

    socket.on("stop_typing", () => {
      setTypingUser("");
    });

    socket.on("room_cleared", () => {
      setMessages([]);
    });

    socket.on(
      "message_deleted_everyone",
      ({ messageId }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  deleted: true,
                  text:
                    "This message was deleted",
                }
              : msg
          )
        );
      }
    );

    socket.on("room_deleted", () => {
      alert("Room deleted");

      setJoined(false);
      setMessages([]);
      setRoom("");
    });

    return () => {
      socket.removeAllListeners();
    };
  }, []);

  // ===============================
  // JOIN ROOM
  // ===============================

  const joinRoom = () => {
    if (
      !username.trim() ||
      !room.trim()
    )
      return;

    socket.emit("join_room", {
      username,
      room,
    });

    setJoined(true);
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

      replyTo: replyMessage
        ? {
            message:
              replyMessage.text,
            username:
              replyMessage.username,
          }
        : null,
    });

    setMessageInput("");

    setReplyMessage(null);

    socket.emit(
      "stop_typing",
      room
    );
  };

  // ===============================
  // TYPING
  // ===============================

  const handleTyping = (value) => {
    setMessageInput(value);

    socket.emit("typing", {
      room,
      username,
    });

    clearTimeout(
      typingTimeoutRef.current
    );

    typingTimeoutRef.current =
      setTimeout(() => {
        socket.emit(
          "stop_typing",
          room
        );
      }, 1000);
  };

  // ===============================
  // DELETE
  // ===============================

  const deleteMessage = (
    id,
    type
  ) => {
    if (type === "me") {
      setMessages((prev) =>
        prev.filter(
          (m) => m._id !== id
        )
      );
    } else {
      socket.emit(
        "delete_message_everyone",
        {
          messageId: id,
          room,
        }
      );
    }

    setMessageMenu({
      visible: false,
      message: null,
    });
  };

  // ===============================
  // JOIN PAGE
  // ===============================

  if (!joined) {
    return (
      <div
        className={`h-screen flex items-center justify-center px-4 ${theme.bg}`}
      >
        <div
          className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${theme.card} ${theme.text}`}
        >
          <h1 className="text-4xl font-bold text-center mb-8">
            SyncTalk
          </h1>

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
              className={`w-full rounded-2xl px-4 py-4 outline-none ${theme.input}`}
            />

            <input
              type="text"
              placeholder="Room Name"
              value={room}
              onChange={(e) =>
                setRoom(
                  e.target.value
                )
              }
              className={`w-full rounded-2xl px-4 py-4 outline-none ${theme.input}`}
            />

            <button
              onClick={joinRoom}
              className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-2xl py-4 font-semibold text-white"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // MAIN UI
  // ===============================

  return (
    <div
      className={`h-screen flex overflow-hidden ${theme.bg} ${theme.text}`}
    >
      {/* MOBILE SIDEBAR */}

      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
          <div
            className={`w-[280px] h-full p-5 ${theme.sidebar}`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Room Info
              </h2>

              <button
                onClick={() =>
                  setShowSidebar(false)
                }
              >
                ✕
              </button>
            </div>

            <p className="text-sm opacity-70">
              Room
            </p>

            <h2 className="text-2xl font-bold mb-6">
              #{room}
            </h2>

            <p className="text-sm opacity-70 mb-3">
              Users (
              {roomUsers.length})
            </p>

            <div className="space-y-2">
              {roomUsers.map(
                (user, index) => (
                  <div
                    key={index}
                    className="bg-black/20 rounded-xl px-4 py-3"
                  >
                    {user}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}

      <div
        className={`hidden lg:flex w-[280px] flex-col p-5 border-r ${theme.sidebar} ${theme.border}`}
      >
        <h1 className="text-3xl font-bold mb-6">
          SyncTalk
        </h1>

        <p className="text-sm opacity-70">
          Room
        </p>

        <h2 className="text-2xl font-bold mb-6">
          #{room}
        </h2>

        <p className="text-sm opacity-70 mb-3">
          Users (
          {roomUsers.length})
        </p>

        <div className="space-y-2">
          {roomUsers.map(
            (user, index) => (
              <div
                key={index}
                className="bg-black/20 rounded-xl px-4 py-3"
              >
                {user}
              </div>
            )
          )}
        </div>
      </div>

      {/* CHAT AREA */}

      <div className="flex-1 flex flex-col">
        {/* TOPBAR */}

        <div
          className={`h-[70px] px-4 flex items-center justify-between border-b shrink-0 ${theme.card} ${theme.border}`}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-2xl"
              onClick={() =>
                setShowSidebar(true)
              }
            >
              ☰
            </button>

            <div>
              <h1 className="text-xl font-bold">
                SyncTalk
              </h1>

              <p className="text-xs opacity-70">
                #{room}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* DARK MODE */}

            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className="w-10 h-10 rounded-full bg-yellow-400 text-black flex items-center justify-center"
            >
              {darkMode
                ? "☀️"
                : "🌙"}
            </button>

            {/* 3 DOTS */}

            <button
              onClick={() =>
                setShowMenu(!showMenu)
              }
              className="text-2xl"
            >
              ⋮
            </button>

            {showMenu && (
              <div
                className={`absolute top-14 right-0 w-52 rounded-2xl overflow-hidden border z-50 ${theme.card} ${theme.border}`}
              >
                <button
                  onClick={() => {
                    socket.emit(
                      "clear_room",
                      room
                    );

                    setShowMenu(false);
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-black/10"
                >
                  Clear Chat
                </button>

                <button
                  onClick={() => {
                    socket.emit(
                      "delete_room",
                      room
                    );

                    setShowMenu(false);
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-black/10"
                >
                  Delete Room
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex flex-col ${
                msg.username === username
                  ? "items-end"
                  : "items-start"
              }`}
              onContextMenu={(e) => {
                e.preventDefault();

                if (
                  msg.username !==
                  "System"
                ) {
                  setMessageMenu({
                    visible: true,
                    message: msg,
                  });
                }
              }}
            >
              <span className="text-xs opacity-70 mb-1">
                {msg.username}
              </span>

              <div
                className={`px-4 py-3 rounded-2xl max-w-[85%] break-words ${
                  msg.username === username
                    ? theme.myMsg
                    : msg.username ===
                      "System"
                    ? theme.systemMsg
                    : theme.otherMsg
                }`}
              >
                {msg.replyTo &&
                  msg.replyTo
                    .message && (
                    <div className="bg-black/20 rounded-xl p-2 mb-2 border-l-4 border-white">
                      <p className="font-semibold text-sm">
                        {
                          msg.replyTo
                            .username
                        }
                      </p>

                      <p className="text-sm truncate">
                        {
                          msg.replyTo
                            .message
                        }
                      </p>
                    </div>
                  )}

                <p>
                  {msg.deleted
                    ? "This message was deleted"
                    : msg.text}
                </p>
              </div>

              <span className="text-xs opacity-70 mt-1">
                {new Date(
                  msg.timestamp
                ).toLocaleTimeString()}
              </span>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* TYPING */}

        <div className="h-7 px-4 text-sm italic opacity-70">
          {typingUser &&
            `${typingUser} is typing...`}
        </div>

        {/* REPLY */}

        {replyMessage && (
          <div
            className={`px-4 py-3 border-t flex justify-between items-center ${theme.card} ${theme.border}`}
          >
            <div>
              <p className="text-sm text-indigo-400 font-semibold">
                Replying to{" "}
                {
                  replyMessage.username
                }
              </p>

              <p className="text-sm opacity-70">
                {replyMessage.text}
              </p>
            </div>

            <button
              onClick={() =>
                setReplyMessage(null)
              }
            >
              ✕
            </button>
          </div>
        )}

        {/* INPUT */}

        <div
          className={`p-3 border-t ${theme.card} ${theme.border}`}
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Message"
              value={messageInput}
              onChange={(e) =>
                handleTyping(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  sendMessage();
                }
              }}
              className={`flex-1 rounded-2xl px-5 py-4 outline-none ${theme.input}`}
            />

            <button
              onClick={sendMessage}
              className="bg-indigo-500 hover:bg-indigo-600 rounded-2xl px-6 py-4 font-semibold text-white"
            >
              Send
            </button>
          </div>
        </div>

        {/* MESSAGE MENU */}

        {messageMenu.visible &&
          messageMenu.message && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center px-4">
              <div
                className={`w-full max-w-sm rounded-3xl overflow-hidden border ${theme.card} ${theme.border}`}
              >
                <button
                  onClick={() => {
                    setReplyMessage(
                      messageMenu.message
                    );

                    setMessageMenu({
                      visible: false,
                      message: null,
                    });
                  }}
                  className="w-full text-left px-6 py-5 hover:bg-black/10"
                >
                  Reply
                </button>

                {messageMenu.message
                  .username ===
                  username && (
                  <>
                    <button
                      onClick={() =>
                        deleteMessage(
                          messageMenu
                            .message
                            ._id,
                          "me"
                        )
                      }
                      className="w-full text-left px-6 py-5 hover:bg-black/10"
                    >
                      Delete For Me
                    </button>

                    <button
                      onClick={() =>
                        deleteMessage(
                          messageMenu
                            .message
                            ._id,
                          "everyone"
                        )
                      }
                      className="w-full text-left px-6 py-5 hover:bg-black/10"
                    >
                      Delete For Everyone
                    </button>
                  </>
                )}

                <button
                  onClick={() =>
                    setMessageMenu({
                      visible: false,
                      message: null,
                    })
                  }
                  className="w-full text-left px-6 py-5 hover:bg-black/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export default Chat;
```
