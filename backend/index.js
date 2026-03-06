require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const socketHandler = require("./socket/socketHandler");

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io server with CORS
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json());

// REST API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
});

// Socket.io event handler (separated from API logic)
socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
