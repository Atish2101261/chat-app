import React, { useState, useRef, useCallback } from "react";

const TYPING_DEBOUNCE = 1500;

const MessageInput = ({ onSend, socket, room, username }) => {
    const [message, setMessage] = useState("");
    const typingTimeout = useRef(null);
    const isTyping = useRef(false);

    const emitTypingStop = useCallback(() => {
        if (isTyping.current && socket) {
            socket.emit("typing_stop", { room });
            isTyping.current = false;
        }
    }, [socket, room]);

    const handleChange = (e) => {
        setMessage(e.target.value);
        if (!socket) return;

        if (!isTyping.current) {
            socket.emit("typing_start", { room });
            isTyping.current = true;
        }

        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(emitTypingStop, TYPING_DEBOUNCE);
    };

    const handleSend = () => {
        if (!message.trim()) return;
        onSend(message);
        setMessage("");
        clearTimeout(typingTimeout.current);
        emitTypingStop();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="message-input-wrapper">
            <div className="message-input-container">
                <textarea
                    id="message-input"
                    className="message-input"
                    placeholder={`Message #${room}...`}
                    value={message}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    id="send-btn"
                    className={`send-btn ${message.trim() ? "active" : ""}`}
                    onClick={handleSend}
                    disabled={!message.trim()}
                    title="Send message"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
            <p className="input-hint">Press Enter to send • Shift+Enter for new line</p>
        </div>
    );
};

export default MessageInput;
