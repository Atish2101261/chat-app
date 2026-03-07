const express = require("express");
const multer = require("multer");
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Multer: memory storage, limit 10MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only images and videos are allowed"));
    },
});

// @route   GET /api/messages/:room
router.get("/:room", protect, async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room })
            .sort({ timestamp: -1 })
            .limit(50)
            .populate("sender", "username")
            .lean();
        res.json(messages.reverse());
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   POST /api/messages/upload
// @desc    Upload image/video, returns base64 data URL
router.post("/upload", protect, upload.single("media"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const isVideo = req.file.mimetype.startsWith("video/");
        const base64 = req.file.buffer.toString("base64");
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

        res.json({
            mediaUrl: dataUrl,
            mediaType: isVideo ? "video" : "image",
        });
    } catch (error) {
        console.error("Upload error:", error.message);
        res.status(500).json({ message: error.message || "Upload failed" });
    }
});

// @route   PUT /api/messages/:id
// @desc    Edit a message (only by sender)
router.put("/:id", protect, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content cannot be empty" });
        }

        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to edit this message" });
        }

        message.content = content.trim();
        message.edited = true;
        message.editedAt = new Date();
        await message.save();

        res.json({ success: true, message });
    } catch (error) {
        console.error("Edit error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
