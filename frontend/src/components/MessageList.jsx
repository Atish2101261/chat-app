import React, { useEffect, useRef, useState } from "react";

const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

const MessageBubble = ({ msg, isOwn, onEditMessage }) => {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(msg.content);
    const editRef = useRef(null);

    const startEdit = () => {
        setEditText(msg.content);
        setEditing(true);
        setTimeout(() => editRef.current?.focus(), 50);
    };

    const saveEdit = () => {
        if (editText.trim() && editText.trim() !== msg.content) {
            onEditMessage(msg._id, editText.trim());
        }
        setEditing(false);
    };

    const cancelEdit = () => {
        setEditText(msg.content);
        setEditing(false);
    };

    const handleEditKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
        if (e.key === "Escape") cancelEdit();
    };

    return (
        <div className={`message-bubble ${isOwn ? "bubble-own" : "bubble-other"}`}>
            {/* Media content */}
            {msg.mediaUrl && msg.mediaType === "image" && (
                <img
                    src={msg.mediaUrl}
                    alt="shared image"
                    className="msg-media-img"
                    onClick={() => window.open(msg.mediaUrl, "_blank")}
                />
            )}
            {msg.mediaUrl && msg.mediaType === "video" && (
                <video controls className="msg-media-video">
                    <source src={msg.mediaUrl} />
                </video>
            )}

            {/* Text content */}
            {editing ? (
                <div className="edit-form">
                    <textarea
                        ref={editRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="edit-textarea"
                        rows={2}
                    />
                    <div className="edit-actions">
                        <button className="edit-save-btn" onClick={saveEdit}>Save</button>
                        <button className="edit-cancel-btn" onClick={cancelEdit}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    {msg.content && <span className="msg-text">{msg.content}</span>}
                    {msg.edited && <span className="edited-badge"> (edited)</span>}
                    {isOwn && msg.content && (
                        <button className="edit-btn" onClick={startEdit} title="Edit message">✏️</button>
                    )}
                </>
            )}
        </div>
    );
};

const MessageList = ({ messages, currentUser, onEditMessage }) => {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="message-list empty">
                <div className="empty-state">
                    <span className="empty-icon">💬</span>
                    <p>No messages yet. Be the first to say hello!</p>
                </div>
            </div>
        );
    }

    let lastDate = null;

    return (
        <div className="message-list">
            {messages.map((msg, idx) => {
                const isOwn = msg.sender?.username === currentUser;
                const msgDate = formatDate(msg.timestamp);
                const showDateSeparator = msgDate !== lastDate;
                lastDate = msgDate;

                const prevMsg = messages[idx - 1];
                const isGrouped =
                    prevMsg &&
                    prevMsg.sender?.username === msg.sender?.username &&
                    new Date(msg.timestamp) - new Date(prevMsg.timestamp) < 120000 &&
                    msgDate === formatDate(prevMsg.timestamp);

                return (
                    <React.Fragment key={msg._id || idx}>
                        {showDateSeparator && (
                            <div className="date-separator">
                                <span>{msgDate}</span>
                            </div>
                        )}
                        <div className={`message-wrapper ${isOwn ? "own" : "other"} ${isGrouped ? "grouped" : ""}`}>
                            {!isOwn && !isGrouped && (
                                <div className="msg-avatar">{msg.sender?.username?.[0]?.toUpperCase()}</div>
                            )}
                            {isGrouped && !isOwn && <div className="msg-avatar-spacer" />}
                            <div className="message-bubble-container">
                                {!isGrouped && (
                                    <div className="msg-meta">
                                        {!isOwn && <span className="msg-sender">{msg.sender?.username}</span>}
                                        <span className="msg-time">{formatTime(msg.timestamp)}</span>
                                    </div>
                                )}
                                <MessageBubble
                                    msg={msg}
                                    isOwn={isOwn}
                                    onEditMessage={onEditMessage}
                                />
                                {isGrouped && (
                                    <span className="msg-time-small">{formatTime(msg.timestamp)}</span>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
};

export default MessageList;
