import React, { useRef } from "react";

const PRESETS = [
    { id: "none", label: "None", value: null },
    { id: "dark", label: "Dark", value: "linear-gradient(135deg, #0d0f14 0%, #161922 100%)" },
    { id: "purple", label: "Purple", value: "linear-gradient(135deg, #1a0533 0%, #2d1b5e 50%, #0d1a44 100%)" },
    { id: "ocean", label: "Ocean", value: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
    { id: "forest", label: "Forest", value: "linear-gradient(135deg, #0f1c0d 0%, #1a3a1f 50%, #112a0e 100%)" },
    { id: "sunset", label: "Sunset", value: "linear-gradient(135deg, #2d1b4e 0%, #4a1942 50%, #7b1e3a 100%)" },
    { id: "midnight", label: "Midnight", value: "linear-gradient(135deg, #000428 0%, #004e92 100%)" },
    { id: "aurora", label: "Aurora", value: "linear-gradient(135deg, #051937 0%, #004d7a 33%, #008793 66%, #00bf72 100%)" },
    { id: "galaxy", label: "Galaxy", value: "radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" },
    { id: "neon", label: "Neon", value: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a1a0a 100%)" },
];

const WallpaperPicker = ({ wallpaper, onWallpaperChange, onClose }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            onWallpaperChange({ type: "image", value: ev.target.result });
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handlePreset = (preset) => {
        if (preset.value === null) {
            onWallpaperChange(null);
        } else {
            onWallpaperChange({ type: "gradient", value: preset.value });
        }
    };

    const handleRemove = () => {
        onWallpaperChange(null);
    };

    return (
        <div className="wallpaper-modal-overlay" onClick={onClose}>
            <div className="wallpaper-modal" onClick={(e) => e.stopPropagation()}>
                <div className="wallpaper-modal-header">
                    <h3>Chat Wallpaper</h3>
                    <button className="wallpaper-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="wallpaper-section-title">Preset Themes</div>
                <div className="wallpaper-presets">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            className={`wallpaper-preset-btn ${!wallpaper && preset.id === "none" ? "active" : wallpaper?.value === preset.value ? "active" : ""}`}
                            style={{ background: preset.value || "var(--bg-elevated)" }}
                            onClick={() => handlePreset(preset)}
                            title={preset.label}
                        >
                            {preset.id === "none" && <span className="preset-none-icon">✕</span>}
                        </button>
                    ))}
                </div>

                <div className="wallpaper-divider" />
                <div className="wallpaper-section-title">Custom Image</div>
                <div className="wallpaper-custom-row">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                    <button className="wallpaper-upload-btn" onClick={() => fileInputRef.current?.click()}>
                        📁 Choose Image
                    </button>
                    {wallpaper && (
                        <button className="wallpaper-remove-btn" onClick={handleRemove}>
                            🗑️ Remove Wallpaper
                        </button>
                    )}
                </div>

                {wallpaper?.type === "image" && (
                    <div className="wallpaper-preview">
                        <img src={wallpaper.value} alt="Current wallpaper" />
                        <span>Current wallpaper</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WallpaperPicker;
