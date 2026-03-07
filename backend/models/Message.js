const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        room: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            default: "",
            trim: true,
            maxlength: 5000,
        },
        mediaUrl: {
            type: String,
            default: null,
        },
        mediaType: {
            type: String,
            enum: ["image", "video", null],
            default: null,
        },
        edited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
            default: null,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Index for fast room-based queries
messageSchema.index({ room: 1, timestamp: -1 });

module.exports = mongoose.model("Message", messageSchema);
