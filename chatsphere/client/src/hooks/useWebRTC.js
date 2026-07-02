/**
 * useWebRTC — Native WebRTC hook (no simple-peer, no process dependency)
 * Uses RTCPeerConnection directly — works in all modern browsers
 */
import { useRef, useState, useCallback } from 'react';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket, currentUser) => {
  const [callState, setCallState]       = useState('idle'); // idle | calling | incoming | active
  const [callType, setCallType]         = useState('voice'); // voice | video
  const [remoteUser, setRemoteUser]     = useState(null);
  const [localStream, setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted]           = useState(false);
  const [isCamOff, setIsCamOff]         = useState(false);

  const pcRef          = useRef(null);   // RTCPeerConnection
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  // ── Get user media ────────────────────────────────────
  const getMedia = useCallback(async (type) => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: 1280, height: 720 } : false,
      });
    } catch (err) {
      console.error('getUserMedia failed:', err);
      throw err;
    }
  }, []);

  // ── Create peer connection ────────────────────────────
  const createPC = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Send ICE candidates to remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Receive remote stream
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // ── Start call (caller side) ──────────────────────────
  const startCall = useCallback(async (targetUser, type = 'voice') => {
    if (!socket) return;
    try {
      setCallType(type);
      setRemoteUser(targetUser);
      setCallState('calling');

      const stream = await getMedia(type);
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPC(targetUser.id);
      pcRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Listen for incoming ICE candidates
      socket.on('call:ice-candidate', ({ candidate }) => {
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:initiate', {
        targetUserId: targetUser.id,
        offer: pc.localDescription,
        callType: type,
      });

      // Wait for answer
      socket.once('call:answered', async ({ answer }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState('active');
        } catch (err) {
          console.error('setRemoteDescription error:', err);
          endCall();
        }
      });

      socket.once('call:rejected', () => {
        endCall();
      });

    } catch (err) {
      console.error('startCall error:', err);
      setCallState('idle');
      setRemoteUser(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, getMedia, createPC]);

  // ── Answer call (receiver side) ───────────────────────
  const answerCall = useCallback(async (from, offer, type) => {
    if (!socket) return;
    try {
      setCallType(type);
      setRemoteUser(from);
      setCallState('active');

      const stream = await getMedia(type);
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPC(from.id);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Listen for ICE candidates
      socket.on('call:ice-candidate', ({ candidate }) => {
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
      });

      // Set remote offer and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', {
        targetUserId: from.id,
        answer: pc.localDescription,
      });

    } catch (err) {
      console.error('answerCall error:', err);
      setCallState('idle');
      setRemoteUser(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, getMedia, createPC]);

  // ── Reject call ───────────────────────────────────────
  const rejectCall = useCallback((targetUserId) => {
    if (socket) socket.emit('call:reject', { targetUserId });
    setCallState('idle');
    setRemoteUser(null);
  }, [socket]);

  // ── End call ──────────────────────────────────────────
  const endCall = useCallback(() => {
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    // Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    // Notify remote user
    if (socket && remoteUser) {
      socket.emit('call:end', { targetUserId: remoteUser.id });
    }
    // Remove ICE candidate listener
    if (socket) {
      socket.off('call:ice-candidate');
    }
    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUser(null);
    setIsMuted(false);
    setIsCamOff(false);
  }, [socket, localStream, remoteUser]);

  // ── Toggle mute ───────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  }, [localStream]);

  // ── Toggle camera ─────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    videoTracks.forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(c => !c);
  }, [localStream]);

  return {
    callState, callType, remoteUser,
    localStream, remoteStream,
    isMuted, isCamOff,
    localVideoRef, remoteVideoRef,
    startCall, answerCall, rejectCall, endCall,
    toggleMute, toggleCamera,
    setCallState, setRemoteUser,
  };
};
