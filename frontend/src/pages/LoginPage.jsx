import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import "../styles/LoginPage.css";

const LoginPage = () => {
    const [tab, setTab] = useState("login");
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res =
                tab === "login"
                    ? await authAPI.login(form)
                    : await authAPI.register(form);

            const { _id, username, token } = res.data;
            login({ _id, username }, token);
            navigate("/chat");
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo">
                        <span className="logo-icon">💬</span>
                        <h1>ChatSphere</h1>
                    </div>
                    <p className="tagline">Real-time conversations, reimagined</p>
                </div>

                <div className="tab-switcher">
                    <button
                        className={tab === "login" ? "tab active" : "tab"}
                        onClick={() => { setTab("login"); setError(""); }}
                    >
                        Sign In
                    </button>
                    <button
                        className={tab === "register" ? "tab active" : "tab"}
                        onClick={() => { setTab("register"); setError(""); }}
                    >
                        Register
                    </button>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            id="username"
                            type="text"
                            name="username"
                            placeholder="Enter your username"
                            value={form.username}
                            onChange={handleChange}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && <div className="error-msg">⚠️ {error}</div>}

                    <button id="submit-btn" type="submit" className="btn-primary" disabled={loading}>
                        {loading ? (
                            <span className="spinner" />
                        ) : tab === "login" ? (
                            "Sign In"
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </form>

                <p className="switch-text">
                    {tab === "login" ? "Don't have an account? " : "Already have an account? "}
                    <span onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); }}>
                        {tab === "login" ? "Register" : "Sign In"}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
