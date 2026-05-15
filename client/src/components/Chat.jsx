import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("https://synctalk-backend-w7lj.onrender.com", {
  transports: ["websocket"],
});

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("general");
  const [joined, setJoined] = useState(false);

  const messagesEndRef = useRef(null);

  const randomAvatar = useMemo(() => {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${username || "User"}`;
  }, [username]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = () => {
    if (!username.trim() || !room.trim()) return;

    socket.emit("join_room", room);
    setJoined(true);
  };

  const sendMessage = () => {
    if (!messageInput.trim()) return;

    const messageData = {
      room,
      author: username,
      message: messageInput,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("send_message", messageData);

    setMessages((prev) => [...prev, messageData]);
    setMessageInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  if (!joined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#0f172a",
          padding: "20px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#1e293b",
            padding: "30px",
            borderRadius: "18px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
            color: "white",
          }}
        >
          <h1
            style={{
              marginBottom: "25px",
              textAlign: "center",
              fontSize: "32px",
            }}
          >
            SyncTalk
          </h1>

          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Enter room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            style={{ ...inputStyle, marginTop: "14px" }}
          />

          <button onClick={joinRoom} style={buttonStyle}>
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          height: "90vh",
          background: "#111827",
          borderRadius: "22px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "#1f2937",
            color: "white",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>SyncTalk</h2>
            <p
              style={{
                margin: "4px 0 0",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              Room: {room}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <img
              src={randomAvatar}
              alt="avatar"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "white",
              }}
            />

            <span style={{ color: "white", fontWeight: 600 }}>
              {username}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#0b1220",
          }}
        >
          {messages.map((msg, index) => {
            const isOwnMessage = msg.author === username;

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: isOwnMessage
                    ? "flex-end"
                    : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "420px",
                    width: "fit-content",
                    padding: "12px 16px",
                    borderRadius: "18px",
                    background: isOwnMessage ? "#2563eb" : "#1f2937",
                    color: "white",
                    wordBreak: "break-word",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "13px",
                        opacity: 0.9,
                      }}
                    >
                      {msg.author}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        opacity: 0.7,
                      }}
                    >
                      {msg.time}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "15px",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: "16px",
            background: "#111827",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "12px",
          }}
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: "14px",
              border: "none",
              outline: "none",
              background: "#1f2937",
              color: "white",
              fontSize: "15px",
            }}
          />

          <button onClick={sendMessage} style={sendButtonStyle}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "none",
  outline: "none",
  background: "#334155",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  marginTop: "20px",
  padding: "14px",
  border: "none",
  borderRadius: "12px",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};

const sendButtonStyle = {
  padding: "0 22px",
  border: "none",
  borderRadius: "14px",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "15px",
};

export default Chat;
