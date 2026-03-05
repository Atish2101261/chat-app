import React from "react";

const ROOM_ICONS = {
    general: "🌐",
    tech: "⚙️",
    random: "🎲",
};

const RoomList = ({ rooms, activeRoom, onRoomSelect }) => {
    return (
        <div className="room-list">
            <h3 className="section-title">Rooms</h3>
            {rooms.map((room) => (
                <button
                    key={room}
                    id={`room-${room}`}
                    className={`room-item ${activeRoom === room ? "active" : ""}`}
                    onClick={() => onRoomSelect(room)}
                >
                    <span className="room-icon">{ROOM_ICONS[room] || "💬"}</span>
                    <span className="room-label"># {room}</span>
                    {activeRoom === room && <span className="active-dot" />}
                </button>
            ))}
        </div>
    );
};

export default RoomList;
