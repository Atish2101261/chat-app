import React from "react";

const OnlineUsers = ({ users, currentUser, onCall }) => {
    return (
        <div className="online-users">
            <h3 className="section-title">Online — {users.length}</h3>
            <ul className="users-list">
                {users.map((u) => (
                    <li key={u.userId} className="user-item">
                        <div className="user-avatar-sm">
                            {u.username[0].toUpperCase()}
                        </div>
                        <span className="user-name">
                            {u.username}
                            {u.username === currentUser && (
                                <span className="you-badge"> (you)</span>
                            )}
                        </span>
                        {u.username !== currentUser && (
                            <div className="call-btns">
                                <button
                                    className="user-call-btn"
                                    onClick={() => onCall(u.username, "audio")}
                                    title={`Voice call ${u.username}`}
                                >📞</button>
                                <button
                                    className="user-call-btn"
                                    onClick={() => onCall(u.username, "video")}
                                    title={`Video call ${u.username}`}
                                >📹</button>
                            </div>
                        )}
                        {u.username === currentUser && (
                            <span className="online-dot" title="Online" />
                        )}
                    </li>
                ))}
                {users.length === 0 && (
                    <li className="no-users">No users online</li>
                )}
            </ul>
        </div>
    );
};

export default OnlineUsers;
