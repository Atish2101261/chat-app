const express = require("express");
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/messages/:room
// @desc    Get last 50 messages for a room
router.get("/:room", protect, async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room })
            .sort({ timestamp: -1 })
            .limit(50)
            .populate("sender", "username")
            .lean();

        // Return in chronological order
        res.json(messages.reverse());
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
