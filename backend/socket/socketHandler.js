const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

// Track online users in memory: { socketId -> { userId, username } }
const onlineUsers = new Map();

const getOnlineUsersList = () => {
    return Array.from(onlineUsers.values());
};

const socketHandler = (io) => {
    // Socket.io JWT authentication middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");
            if (!user) return next(new Error("Authentication error: User not found"));
            socket.user = user;
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        const user = socket.user;
        console.log(`🟢 ${user.username} connected [${socket.id}]`);

        // Mark user as online in DB and memory
        await User.findByIdAndUpdate(user._id, { isOnline: true });
        onlineUsers.set(socket.id, { userId: user._id.toString(), username: user.username });

        // Broadcast updated online users list to everyone
        io.emit("users_online", getOnlineUsersList());

        // ----- JOIN ROOM -----
        socket.on("join_room", async ({ room }) => {
            socket.join(room);
            console.log(`📌 ${user.username} joined room: ${room}`);

            try {
                // Fetch last 50 messages for the room from MongoDB
                const messages = await Message.find({ room })
                    .sort({ timestamp: -1 })
                    .limit(50)
                    .populate("sender", "username")
                    .lean();

                // Send history only to the requesting socket
                socket.emit("message_history", { room, messages: messages.reverse() });
            } catch (err) {
                console.error("Error fetching message history:", err.message);
            }

            // Notify room that someone joined
            socket.to(room).emit("user_joined", {
                username: user.username,
                room,
                timestamp: new Date(),
            });
        });

        // ----- SEND MESSAGE -----
        socket.on("send_message", async ({ room, content, mediaUrl, mediaType }) => {
            if (!content?.trim() && !mediaUrl) return;

            try {
                const message = await Message.create({
                    sender: user._id,
                    room,
                    content: content?.trim() || "",
                    mediaUrl: mediaUrl || null,
                    mediaType: mediaType || null,
                    timestamp: new Date(),
                });

                const populatedMessage = await message.populate("sender", "username");

                io.to(room).emit("receive_message", {
                    _id: populatedMessage._id,
                    sender: { _id: user._id, username: user.username },
                    room,
                    content: populatedMessage.content,
                    mediaUrl: populatedMessage.mediaUrl,
                    mediaType: populatedMessage.mediaType,
                    edited: false,
                    timestamp: populatedMessage.timestamp,
                });

                console.log(`💬 [${room}] ${user.username}: ${content?.trim() || "[media]"}`);
            } catch (err) {
                console.error("Error saving message:", err.message);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // ----- EDIT MESSAGE -----
        socket.on("edit_message", async ({ messageId, content, room }) => {
            if (!content?.trim()) return;
            try {
                const message = await Message.findById(messageId);
                if (!message) return socket.emit("error", { message: "Message not found" });
                if (message.sender.toString() !== user._id.toString()) {
                    return socket.emit("error", { message: "Not authorized" });
                }

                message.content = content.trim();
                message.edited = true;
                message.editedAt = new Date();
                await message.save();

                io.to(room).emit("message_edited", {
                    _id: messageId,
                    content: message.content,
                    edited: true,
                    editedAt: message.editedAt,
                    room,
                });

                console.log(`✏️ [${room}] ${user.username} edited message ${messageId}`);
            } catch (err) {
                console.error("Error editing message:", err.message);
                socket.emit("error", { message: "Failed to edit message" });
            }
        });

        // ----- LEAVE ROOM -----
        socket.on("leave_room", ({ room }) => {
            socket.leave(room);
            console.log(`📤 ${user.username} left room: ${room}`);
            socket.to(room).emit("user_left", {
                username: user.username,
                room,
                timestamp: new Date(),
            });
        });

        // ----- TYPING INDICATORS -----
        socket.on("typing_start", ({ room }) => {
            socket.to(room).emit("user_typing", { username: user.username, room });
        });

        socket.on("typing_stop", ({ room }) => {
            socket.to(room).emit("user_stop_typing", { username: user.username, room });
        });

        // ----- WEBRTC CALL SIGNALING -----
        // Helper: find socketId by username
        const findSocketIdByUsername = (username) => {
            for (const [sid, u] of onlineUsers.entries()) {
                if (u.username === username) return sid;
            }
            return null;
        };

        // Initiate call: caller → callee
        socket.on("call_user", ({ targetUsername, callType }) => {
            const targetSocketId = findSocketIdByUsername(targetUsername);
            if (!targetSocketId) {
                return socket.emit("call_error", { message: `${targetUsername} is not online` });
            }
            io.to(targetSocketId).emit("incoming_call", {
                callerUsername: user.username,
                callerSocketId: socket.id,
                callType, // "audio" | "video"
            });
            console.log(`📞 ${user.username} calling ${targetUsername} [${callType}]`);
        });

        // Callee accepted
        socket.on("call_answered", ({ callerSocketId, callType }) => {
            io.to(callerSocketId).emit("call_accepted", {
                answererSocketId: socket.id,
                answererUsername: user.username,
                callType,
            });
        });

        // Callee rejected
        socket.on("call_rejected", ({ callerSocketId }) => {
            io.to(callerSocketId).emit("call_rejected", { by: user.username });
        });

        // Relay: WebRTC offer
        socket.on("webrtc_offer", ({ targetSocketId, offer }) => {
            io.to(targetSocketId).emit("webrtc_offer", { offer, fromSocketId: socket.id });
        });

        // Relay: WebRTC answer
        socket.on("webrtc_answer", ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit("webrtc_answer", { answer, fromSocketId: socket.id });
        });

        // Relay: ICE candidate
        socket.on("ice_candidate", ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit("ice_candidate", { candidate, fromSocketId: socket.id });
        });

        // End call
        socket.on("end_call", ({ targetSocketId }) => {
            io.to(targetSocketId).emit("call_ended", { by: user.username });
        });



        // ----- DISCONNECT -----
        socket.on("disconnect", async () => {
            console.log(`🔴 ${user.username} disconnected [${socket.id}]`);

            // Mark offline in DB
            await User.findByIdAndUpdate(user._id, {
                isOnline: false,
                lastSeen: new Date(),
            });

            // Remove from memory
            onlineUsers.delete(socket.id);

            // Broadcast updated list
            io.emit("users_online", getOnlineUsersList());
        });
    });
};

module.exports = socketHandler;
