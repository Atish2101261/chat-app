import axios from "axios";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("chat_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authAPI = {
    register: (data) => axiosInstance.post("/auth/register", data),
    login: (data) => axiosInstance.post("/auth/login", data),
};

export const messagesAPI = {
    getRoomMessages: (room) => axiosInstance.get(`/messages/${room}`),
};

export default axiosInstance;
