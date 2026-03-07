import React, { useState, useRef, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";

const TYPING_DEBOUNCE = 1500;

const MessageInput = ({ onSend, socket, room, username }) => {
    const [message, setMessage] = useState("");
    const [mediaPreview, setMediaPreview] = useState(null); // { url, type, file }
    const [uploading, setUploading] = useState(false);
    const typingTimeout = useRef(null);
    const isTyping = useRef(false);
    const fileInputRef = useRef(null);

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

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isVideo = file.type.startsWith("video/");
        const previewUrl = URL.createObjectURL(file);
        setMediaPreview({ url: previewUrl, type: isVideo ? "video" : "image", file });
        e.target.value = "";
    };

    const removeMediaPreview = () => {
        if (mediaPreview?.url) URL.revokeObjectURL(mediaPreview.url);
        setMediaPreview(null);
    };

    const handleSend = async () => {
        if (!message.trim() && !mediaPreview) return;

        if (mediaPreview) {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append("media", mediaPreview.file);
                const res = await axiosInstance.post("/messages/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                onSend(message.trim(), res.data.mediaUrl, res.data.mediaType);
                removeMediaPreview();
                setMessage("");
            } catch (err) {
                console.error("Upload failed:", err);
                alert("Upload failed. Try a smaller file (max 10MB).");
            } finally {
                setUploading(false);
            }
        } else {
            onSend(message);
            setMessage("");
        }

        clearTimeout(typingTimeout.current);
        emitTypingStop();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = (message.trim() || mediaPreview) && !uploading;

    return (
        <div className="message-input-wrapper">
            {/* Media Preview */}
            {mediaPreview && (
                <div className="media-preview">
                    {mediaPreview.type === "image" ? (
                        <img src={mediaPreview.url} alt="preview" className="media-preview-img" />
                    ) : (
                        <video src={mediaPreview.url} className="media-preview-video" controls />
                    )}
                    <button
                        className="media-remove-btn"
                        onClick={removeMediaPreview}
                        title="Remove media"
                    >✕</button>
                </div>
            )}

            <div className="message-input-container">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                    id="media-file-input"
                />

                {/* Attach button */}
                <button
                    className="attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image or video"
                    disabled={uploading}
                >
                    📎
                </button>

                <textarea
                    id="message-input"
                    className="message-input"
                    placeholder={`Message #${room}...`}
                    value={message}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={uploading}
                />

                <button
                    id="send-btn"
                    className={`send-btn ${canSend ? "active" : ""}`}
                    onClick={handleSend}
                    disabled={!canSend}
                    title={uploading ? "Uploading..." : "Send message"}
                >
                    {uploading ? (
                        <span className="upload-spinner">⏳</span>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    )}
                </button>
            </div>
            <p className="input-hint">Press Enter to send • Shift+Enter for new line • 📎 to attach image/video</p>
        </div>
    );
};

export default MessageInput;
