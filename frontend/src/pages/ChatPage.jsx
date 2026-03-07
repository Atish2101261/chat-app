import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import RoomList from "../components/RoomList";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import OnlineUsers from "../components/OnlineUsers";
import WallpaperPicker from "../components/WallpaperPicker";
import "../styles/ChatPage.css";

const ROOMS = ["general", "tech", "random"];

const ChatPage = () => {
    const { user, logout } = useAuth();
    const { socket, onlineUsers, connected } = useSocket();
    const navigate = useNavigate();

    const [activeRoom, setActiveRoom] = useState("general");
    const [messages, setMessages] = useState({});
    const [typingUsers, setTypingUsers] = useState({});
    const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false); // mobile sidebar toggle
    const [wallpaper, setWallpaper] = useState(() => {
        try {
            const saved = localStorage.getItem("chat_wallpaper");
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const prevRoom = useRef(null);

    // Build wallpaper style
    const wallpaperStyle = wallpaper
        ? wallpaper.type === "image"
            ? { backgroundImage: `url(${wallpaper.value})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: wallpaper.value }
        : {};

    const handleWallpaperChange = (newWallpaper) => {
        setWallpaper(newWallpaper);
        if (newWallpaper) {
            localStorage.setItem("chat_wallpaper", JSON.stringify(newWallpaper));
        } else {
            localStorage.removeItem("chat_wallpaper");
        }
    };

    useEffect(() => {
        if (!socket) return;

        if (prevRoom.current && prevRoom.current !== activeRoom) {
            socket.emit("leave_room", { room: prevRoom.current });
        }
        socket.emit("join_room", { room: activeRoom });
        prevRoom.current = activeRoom;

        setTypingUsers((prev) => ({ ...prev, [activeRoom]: [] }));

        const handleHistory = ({ room, messages: msgs }) => {
            setMessages((prev) => ({ ...prev, [room]: msgs }));
        };

        const handleNewMessage = (msg) => {
            setMessages((prev) => ({
                ...prev,
                [msg.room]: [...(prev[msg.room] || []), msg],
            }));
        };

        const handleMessageEdited = ({ _id, content, edited, editedAt }) => {
            setMessages((prev) => {
                const updated = {};
                for (const room in prev) {
                    updated[room] = prev[room].map((msg) =>
                        msg._id === _id ? { ...msg, content, edited, editedAt } : msg
                    );
                }
                return updated;
            });
        };

        const handleTyping = ({ username, room }) => {
            setTypingUsers((prev) => ({
                ...prev,
                [room]: [...new Set([...(prev[room] || []), username])].filter(
                    (u) => u !== user.username
                ),
            }));
        };

        const handleStopTyping = ({ username, room }) => {
            setTypingUsers((prev) => ({
                ...prev,
                [room]: (prev[room] || []).filter((u) => u !== username),
            }));
        };

        socket.on("message_history", handleHistory);
        socket.on("receive_message", handleNewMessage);
        socket.on("message_edited", handleMessageEdited);
        socket.on("user_typing", handleTyping);
        socket.on("user_stop_typing", handleStopTyping);

        return () => {
            socket.off("message_history", handleHistory);
            socket.off("receive_message", handleNewMessage);
            socket.off("message_edited", handleMessageEdited);
            socket.off("user_typing", handleTyping);
            socket.off("user_stop_typing", handleStopTyping);
        };
    }, [socket, activeRoom, user]);

    const handleLogout = () => {
        if (socket && prevRoom.current) {
            socket.emit("leave_room", { room: prevRoom.current });
        }
        logout();
        navigate("/");
    };

    const sendMessage = (content, mediaUrl = null, mediaType = null) => {
        if (socket && (content?.trim() || mediaUrl)) {
            socket.emit("send_message", { room: activeRoom, content, mediaUrl, mediaType });
        }
    };

    const handleEditMessage = (messageId, newContent) => {
        if (socket && newContent?.trim()) {
            socket.emit("edit_message", { messageId, content: newContent, room: activeRoom });
        }
    };

    const handleRoomSelect = (room) => {
        setActiveRoom(room);
        setShowSidebar(false); // close sidebar on mobile after room select
    };

    const currentTyping = typingUsers[activeRoom] || [];

    return (
        <div className="chat-page">
            {/* Mobile overlay */}
            {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}

            {/* Sidebar */}
            <aside className={`sidebar ${showSidebar ? "sidebar-open" : ""}`}>
                <div className="sidebar-header">
                    <span className="logo-sm">💬</span>
                    <span className="brand">ChatSphere</span>
                    <button className="sidebar-close-btn" onClick={() => setShowSidebar(false)}>✕</button>
                </div>
                <div className="sidebar-user">
                    <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
                    <div className="user-info">
                        <span className="username">{user?.username}</span>
                        <span className={`status-badge ${connected ? "online" : "offline"}`}>
                            {connected ? "● Online" : "● Offline"}
                        </span>
                    </div>
                </div>
                <RoomList rooms={ROOMS} activeRoom={activeRoom} onRoomSelect={handleRoomSelect} />
                <OnlineUsers users={onlineUsers} currentUser={user?.username} />
                <button id="logout-btn" className="logout-btn" onClick={handleLogout}>
                    Sign Out
                </button>
            </aside>

            {/* Main Chat Area */}
            <main className="chat-main">
                <div className="chat-header">
                    <div className="room-info">
                        {/* Hamburger for mobile */}
                        <button className="hamburger-btn" onClick={() => setShowSidebar(true)}>☰</button>
                        <span className="room-hash">#</span>
                        <h2 className="room-name">{activeRoom}</h2>
                    </div>
                    <div className="header-right">
                        <span className="online-count">{onlineUsers.length} online</span>
                        {/* Wallpaper button */}
                        <button
                            className="wallpaper-header-btn"
                            onClick={() => setShowWallpaperPicker(true)}
                            title="Change wallpaper"
                        >
                            🖼️
                        </button>
                    </div>
                </div>

                {/* Chat area with wallpaper */}
                <div className="chat-area-wallpaper" style={wallpaperStyle}>
                    {wallpaper && <div className="wallpaper-overlay" />}
                    <MessageList
                        messages={messages[activeRoom] || []}
                        currentUser={user?.username}
                        onEditMessage={handleEditMessage}
                    />
                    {currentTyping.length > 0 && (
                        <div className="typing-indicator">
                            <span className="typing-dots">
                                <b>{currentTyping.join(", ")}</b>{" "}
                                {currentTyping.length === 1 ? "is" : "are"} typing
                                <span className="dot-anim">...</span>
                            </span>
                        </div>
                    )}
                </div>

                <MessageInput
                    onSend={sendMessage}
                    socket={socket}
                    room={activeRoom}
                    username={user?.username}
                />
            </main>

            {/* Wallpaper Picker Modal */}
            {showWallpaperPicker && (
                <WallpaperPicker
                    wallpaper={wallpaper}
                    onWallpaperChange={handleWallpaperChange}
                    onClose={() => setShowWallpaperPicker(false)}
                />
            )}
        </div>
    );
};

export default ChatPage;
