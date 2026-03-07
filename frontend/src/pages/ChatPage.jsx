import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import RoomList from "../components/RoomList";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import OnlineUsers from "../components/OnlineUsers";
import WallpaperPicker from "../components/WallpaperPicker";
import CallWindow from "../components/CallWindow";
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
    const [showSidebar, setShowSidebar] = useState(false);
    const [callState, setCallState] = useState(null); // null = no call

    const [wallpaper, setWallpaper] = useState(() => {
        try { return JSON.parse(localStorage.getItem("chat_wallpaper")); }
        catch { return null; }
    });
    const prevRoom = useRef(null);

    const wallpaperStyle = wallpaper
        ? wallpaper.type === "image"
            ? { backgroundImage: `url(${wallpaper.value})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: wallpaper.value }
        : {};

    const handleWallpaperChange = (w) => {
        setWallpaper(w);
        w ? localStorage.setItem("chat_wallpaper", JSON.stringify(w)) : localStorage.removeItem("chat_wallpaper");
    };

    // ===== CALL HANDLERS =====
    const initiateCall = useCallback((targetUsername, callType) => {
        if (!socket) return;
        socket.emit("call_user", { targetUsername, callType });
        setCallState({
            status: "outgoing",
            callType,
            remoteUser: targetUsername,
            remoteSocketId: null, // filled when accepted
            initiator: true,
        });
    }, [socket]);

    const closeCall = useCallback(() => {
        setCallState(null);
    }, []);

    // ===== SOCKET EFFECTS =====
    useEffect(() => {
        if (!socket) return;

        if (prevRoom.current && prevRoom.current !== activeRoom) {
            socket.emit("leave_room", { room: prevRoom.current });
        }
        socket.emit("join_room", { room: activeRoom });
        prevRoom.current = activeRoom;
        setTypingUsers((prev) => ({ ...prev, [activeRoom]: [] }));

        const handleHistory = ({ room, messages: msgs }) =>
            setMessages((prev) => ({ ...prev, [room]: msgs }));

        const handleNewMessage = (msg) =>
            setMessages((prev) => ({
                ...prev,
                [msg.room]: [...(prev[msg.room] || []), msg],
            }));

        const handleMessageEdited = ({ _id, content, edited, editedAt }) =>
            setMessages((prev) => {
                const updated = {};
                for (const r in prev) {
                    updated[r] = prev[r].map((m) =>
                        m._id === _id ? { ...m, content, edited, editedAt } : m
                    );
                }
                return updated;
            });

        const handleTyping = ({ username, room }) =>
            setTypingUsers((prev) => ({
                ...prev,
                [room]: [...new Set([...(prev[room] || []), username])].filter((u) => u !== user.username),
            }));

        const handleStopTyping = ({ username, room }) =>
            setTypingUsers((prev) => ({
                ...prev,
                [room]: (prev[room] || []).filter((u) => u !== username),
            }));

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

    // ===== CALL SOCKET EVENTS (separate effect) =====
    useEffect(() => {
        if (!socket) return;

        // Incoming call
        const onIncomingCall = ({ callerUsername, callerSocketId, callType }) => {
            setCallState({
                status: "incoming",
                callType,
                remoteUser: callerUsername,
                callerSocketId,
                initiator: false,
            });
        };

        // Our outgoing call was accepted
        const onCallAccepted = ({ answererSocketId, answererUsername, callType }) => {
            setCallState((prev) => ({
                ...prev,
                status: "active",
                remoteSocketId: answererSocketId,
            }));
        };

        // Our call was rejected
        const onCallRejected = ({ by }) => {
            setCallState(null);
            alert(`${by} declined your call.`);
        };

        // Remote ended the call
        const onCallEnded = ({ by }) => {
            setCallState(null);
        };

        // Call error (user offline etc.)
        const onCallError = ({ message }) => {
            setCallState(null);
            alert(message);
        };

        socket.on("incoming_call", onIncomingCall);
        socket.on("call_accepted", onCallAccepted);
        socket.on("call_rejected", onCallRejected);
        socket.on("call_ended", onCallEnded);
        socket.on("call_error", onCallError);

        return () => {
            socket.off("incoming_call", onIncomingCall);
            socket.off("call_accepted", onCallAccepted);
            socket.off("call_rejected", onCallRejected);
            socket.off("call_ended", onCallEnded);
            socket.off("call_error", onCallError);
        };
    }, [socket]);

    const handleLogout = () => {
        if (socket && prevRoom.current) socket.emit("leave_room", { room: prevRoom.current });
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
        setShowSidebar(false);
    };

    const currentTyping = typingUsers[activeRoom] || [];

    return (
        <div className="chat-page">
            {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}

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
                <OnlineUsers
                    users={onlineUsers}
                    currentUser={user?.username}
                    onCall={initiateCall}
                />
                <button id="logout-btn" className="logout-btn" onClick={handleLogout}>Sign Out</button>
            </aside>

            <main className="chat-main">
                <div className="chat-header">
                    <div className="room-info">
                        <button className="hamburger-btn" onClick={() => setShowSidebar(true)}>☰</button>
                        <span className="room-hash">#</span>
                        <h2 className="room-name">{activeRoom}</h2>
                    </div>
                    <div className="header-right">
                        <span className="online-count">{onlineUsers.length} online</span>
                        <button className="wallpaper-header-btn" onClick={() => setShowWallpaperPicker(true)} title="Wallpaper">🖼️</button>
                    </div>
                </div>

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

                <MessageInput onSend={sendMessage} socket={socket} room={activeRoom} username={user?.username} />
            </main>

            {showWallpaperPicker && (
                <WallpaperPicker
                    wallpaper={wallpaper}
                    onWallpaperChange={handleWallpaperChange}
                    onClose={() => setShowWallpaperPicker(false)}
                />
            )}

            {/* Call Window */}
            {callState && (
                <CallWindow
                    socket={socket}
                    callState={callState}
                    onClose={closeCall}
                />
            )}
        </div>
    );
};

export default ChatPage;
