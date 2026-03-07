import React, { useRef, useState, useEffect, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";

/**
 * CallWindow handles three states:
 *  - "incoming"  : someone is calling us
 *  - "outgoing"  : we are calling someone (ringing)
 *  - "active"    : call is connected
 */
const CallWindow = ({ socket, callState, onClose }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const durationRef = useRef(null);
    const pendingOfferRef = useRef(null); // store offer until user answers

    const {
        startCall,
        answerCall,
        handleAnswer,
        handleIceCandidate,
        endCall,
    } = useWebRTC({ socket, localVideoRef, remoteVideoRef });

    const { status, callType, remoteUser, callerSocketId, remoteSocketId, offer } = callState;
    const isVideo = callType === "video";

    // Store incoming offer for when user accepts
    useEffect(() => {
        if (offer) pendingOfferRef.current = offer;
    }, [offer]);

    // Start call timer when active
    useEffect(() => {
        if (status === "active") {
            durationRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
        }
        return () => clearInterval(durationRef.current);
    }, [status]);

    // Socket event listeners for this call session
    useEffect(() => {
        if (!socket) return;

        const onOffer = async ({ offer: incomingOffer, fromSocketId }) => {
            pendingOfferRef.current = incomingOffer;
        };

        const onAnswer = ({ answer }) => handleAnswer({ answer });
        const onIce = ({ candidate }) => handleIceCandidate({ candidate });

        socket.on("webrtc_offer", onOffer);
        socket.on("webrtc_answer", onAnswer);
        socket.on("ice_candidate", onIce);

        return () => {
            socket.off("webrtc_offer", onOffer);
            socket.off("webrtc_answer", onAnswer);
            socket.off("ice_candidate", onIce);
        };
    }, [socket, handleAnswer, handleIceCandidate]);

    // If outgoing call is accepted → start WebRTC
    useEffect(() => {
        if (status === "active" && remoteSocketId && callState.initiator) {
            startCall({ targetSocketId: remoteSocketId, callType });
        }
    }, [status, remoteSocketId, callState.initiator]);

    const handleAccept = async () => {
        await answerCall({
            callerSocketId,
            offer: pendingOfferRef.current,
            callType,
        });
        socket.emit("call_answered", { callerSocketId, callType });
        if (callState.onAccepted) callState.onAccepted();
    };

    const handleReject = () => {
        socket.emit("call_rejected", { callerSocketId });
        onClose();
    };

    const handleEndCall = useCallback(() => {
        const targetId = remoteSocketId || callerSocketId;
        if (targetId) socket.emit("end_call", { targetSocketId: targetId });
        endCall();
        onClose();
    }, [socket, remoteSocketId, callerSocketId, endCall, onClose]);

    const handleMute = () => {
        const nowMuted = toggleMuteLocal();
        setMuted(nowMuted);
    };

    // Direct stream toggle (no hook needed here)
    const toggleMuteLocal = () => {
        if (localVideoRef.current?.srcObject) {
            const audio = localVideoRef.current.srcObject.getAudioTracks()[0];
            if (audio) { audio.enabled = !audio.enabled; return !audio.enabled; }
        }
        return false;
    };

    const handleCamera = () => {
        if (localVideoRef.current?.srcObject) {
            const video = localVideoRef.current.srcObject.getVideoTracks()[0];
            if (video) { video.enabled = !video.enabled; setCameraOff(!video.enabled); }
        }
    };

    const formatDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div className={`call-window ${isVideo ? "call-video-mode" : "call-audio-mode"}`}>
            {/* Video streams */}
            {isVideo && (
                <div className="call-video-area">
                    <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
                    <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
                </div>
            )}

            {/* Audio-only avatar */}
            {!isVideo && (
                <div className="call-audio-avatar">
                    <div className="call-avatar-circle">
                        {remoteUser?.[0]?.toUpperCase()}
                    </div>
                    {status === "active" && <div className="call-pulse-ring" />}
                </div>
            )}

            {/* Call info */}
            <div className="call-info">
                <div className="call-remote-name">{remoteUser}</div>
                {status === "incoming" && (
                    <div className="call-status-text">
                        Incoming {isVideo ? "📹 Video" : "📞 Voice"} Call...
                    </div>
                )}
                {status === "outgoing" && <div className="call-status-text">Calling... 🔔</div>}
                {status === "active" && (
                    <div className="call-status-text call-active-badge">
                        🟢 {formatDuration(callDuration)}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="call-controls">
                {status === "incoming" && (
                    <>
                        <button className="call-btn accept-btn" onClick={handleAccept} title="Accept">
                            📞
                        </button>
                        <button className="call-btn reject-btn" onClick={handleReject} title="Decline">
                            📵
                        </button>
                    </>
                )}

                {(status === "outgoing" || status === "active") && (
                    <>
                        {status === "active" && (
                            <button
                                className={`call-btn control-btn ${muted ? "btn-active" : ""}`}
                                onClick={handleMute}
                                title={muted ? "Unmute" : "Mute"}
                            >
                                {muted ? "🔇" : "🎤"}
                            </button>
                        )}
                        {status === "active" && isVideo && (
                            <button
                                className={`call-btn control-btn ${cameraOff ? "btn-active" : ""}`}
                                onClick={handleCamera}
                                title={cameraOff ? "Camera On" : "Camera Off"}
                            >
                                {cameraOff ? "📵" : "📹"}
                            </button>
                        )}
                        <button className="call-btn reject-btn" onClick={handleEndCall} title="End Call">
                            📵
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CallWindow;
