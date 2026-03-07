import { useRef, useCallback } from "react";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export const useWebRTC = ({ socket, localVideoRef, remoteVideoRef }) => {
    const peerRef = useRef(null);
    const localStreamRef = useRef(null);

    const getMedia = useCallback(async (callType) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === "video",
        });
        localStreamRef.current = stream;
        if (localVideoRef?.current) {
            localVideoRef.current.srcObject = stream;
        }
        return stream;
    }, [localVideoRef]);

    const createPeer = useCallback((targetSocketId, isInitiator) => {
        const peer = new RTCPeerConnection(ICE_SERVERS);
        peerRef.current = peer;

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peer.addTrack(track, localStreamRef.current);
            });
        }

        // Receive remote stream
        peer.ontrack = (e) => {
            if (remoteVideoRef?.current) {
                remoteVideoRef.current.srcObject = e.streams[0];
            }
        };

        // ICE candidate relay
        peer.onicecandidate = (e) => {
            if (e.candidate && socket) {
                socket.emit("ice_candidate", {
                    targetSocketId,
                    candidate: e.candidate,
                });
            }
        };

        return peer;
    }, [socket, remoteVideoRef]);

    const startCall = useCallback(async ({ targetSocketId, callType }) => {
        const stream = await getMedia(callType);
        const peer = createPeer(targetSocketId, true);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("webrtc_offer", { targetSocketId, offer });
    }, [getMedia, createPeer, socket]);

    const answerCall = useCallback(async ({ callerSocketId, offer, callType }) => {
        const stream = await getMedia(callType);
        const peer = createPeer(callerSocketId, false);

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc_answer", { targetSocketId: callerSocketId, answer });
    }, [getMedia, createPeer, socket]);

    const handleAnswer = useCallback(async ({ answer }) => {
        if (peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }, []);

    const handleIceCandidate = useCallback(async ({ candidate }) => {
        if (peerRef.current && candidate) {
            try {
                await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) { /* ignore */ }
        }
    }, []);

    const endCall = useCallback(() => {
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef?.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef?.current) remoteVideoRef.current.srcObject = null;
    }, [localVideoRef, remoteVideoRef]);

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audio = localStreamRef.current.getAudioTracks()[0];
            if (audio) audio.enabled = !audio.enabled;
            return !audio?.enabled;  // returns isMuted
        }
        return false;
    }, []);

    const toggleCamera = useCallback(() => {
        if (localStreamRef.current) {
            const video = localStreamRef.current.getVideoTracks()[0];
            if (video) video.enabled = !video.enabled;
            return !video?.enabled;  // returns isCameraOff
        }
        return false;
    }, []);

    return { startCall, answerCall, handleAnswer, handleIceCandidate, endCall, toggleMute, toggleCamera };
};
