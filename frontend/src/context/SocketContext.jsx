import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { token, user } = useAuth();
    const socketRef = useRef(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (token && user) {
            // Create socket connection with JWT auth
            socketRef.current = io("http://localhost:5000", {
                auth: { token },
                transports: ["websocket"],
            });

            socketRef.current.on("connect", () => {
                setConnected(true);
                console.log("🔌 Socket connected:", socketRef.current.id);
            });

            socketRef.current.on("disconnect", () => {
                setConnected(false);
                console.log("🔌 Socket disconnected");
            });

            socketRef.current.on("users_online", (users) => {
                setOnlineUsers(users);
            });

            socketRef.current.on("connect_error", (err) => {
                console.error("Socket connection error:", err.message);
            });

            return () => {
                socketRef.current.disconnect();
                socketRef.current = null;
                setConnected(false);
                setOnlineUsers([]);
            };
        }
    }, [token, user]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
