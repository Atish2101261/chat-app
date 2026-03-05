import React, { useEffect, useRef } from "react";

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

const MessageList = ({ messages, currentUser }) => {
    const bottomRef = useRef(null);

    // Auto-scroll to latest message
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

    // Group messages by date
    let lastDate = null;

    return (
        <div className="message-list">
            {messages.map((msg, idx) => {
                const isOwn = msg.sender?.username === currentUser;
                const msgDate = formatDate(msg.timestamp);
                const showDateSeparator = msgDate !== lastDate;
                lastDate = msgDate;

                // Group consecutive messages from same sender
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
                                <div className={`message-bubble ${isOwn ? "bubble-own" : "bubble-other"}`}>
                                    {msg.content}
                                </div>
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
