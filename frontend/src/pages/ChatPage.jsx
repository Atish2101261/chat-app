import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import RoomList from "../components/RoomList";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import OnlineUsers from "../components/OnlineUsers";
import "../styles/ChatPage.css";

const ROOMS = ["general", "tech", "random"];

const ChatPage = () => {
    const { user, logout } = useAuth();
    const { socket, onlineUsers, connected } = useSocket();
    const navigate = useNavigate();

    const [activeRoom, setActiveRoom] = useState("general");
    const [messages, setMessages] = useState({});
    const [typingUsers, setTypingUsers] = useState({});
    const prevRoom = useRef(null);

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

    const currentTyping = typingUsers[activeRoom] || [];

    return (
        <div className="chat-page">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span className="logo-sm">💬</span>
                    <span className="brand">ChatSphere</span>
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
                <RoomList rooms={ROOMS} activeRoom={activeRoom} onRoomSelect={setActiveRoom} />
                <OnlineUsers users={onlineUsers} currentUser={user?.username} />
                <button id="logout-btn" className="logout-btn" onClick={handleLogout}>
                    Sign Out
                </button>
            </aside>

            <main className="chat-main">
                <div className="chat-header">
                    <div className="room-info">
                        <span className="room-hash">#</span>
                        <h2 className="room-name">{activeRoom}</h2>
                    </div>
                    <div className="header-right">
                        <span className="online-count">{onlineUsers.length} online</span>
                    </div>
                </div>

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

                <MessageInput
                    onSend={sendMessage}
                    socket={socket}
                    room={activeRoom}
                    username={user?.username}
                />
            </main>
        </div>
    );
};

export default ChatPage;
