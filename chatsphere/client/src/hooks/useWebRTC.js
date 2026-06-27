import { useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket, currentUser) => {
  const [callState, setCallState]   = useState('idle'); // idle | calling | incoming | active
  const [callType, setCallType]     = useState('voice'); // voice | video
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted]   = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const peerRef       = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const getMedia = useCallback(async (type) => {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
  }, []);

  // Initiate a call
  const startCall = useCallback(async (targetUser, type = 'voice') => {
    if (!socket) return;
    setCallType(type);
    setRemoteUser(targetUser);
    setCallState('calling');

    const stream = await getMedia(type);
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = new SimplePeer({ initiator: true, trickle: false, stream, config: ICE_SERVERS });
    peerRef.current = peer;

    peer.on('signal', (offer) => {
      socket.emit('call:initiate', { targetUserId: targetUser.id, offer, callType: type });
    });

    peer.on('stream', (remote) => {
      setRemoteStream(remote);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    });

    peer.on('close', () => endCall());
    peer.on('error', (err) => { console.error('Peer error:', err); endCall(); });

    // Listen for answer
    socket.once('call:answered', ({ answer }) => {
      peer.signal(answer);
      setCallState('active');
    });

    socket.once('call:rejected', () => {
      endCall();
      setCallState('idle');
    });

    socket.once('call:ice-candidate', ({ candidate }) => {
      if (peerRef.current) peerRef.current.signal(candidate);
    });
  }, [socket, getMedia]);

  // Answer an incoming call
  const answerCall = useCallback(async (from, offer, type) => {
    if (!socket) return;
    setCallType(type);
    setRemoteUser(from);
    setCallState('active');

    const stream = await getMedia(type);
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = new SimplePeer({ initiator: false, trickle: false, stream, config: ICE_SERVERS });
    peerRef.current = peer;

    peer.signal(offer);

    peer.on('signal', (answer) => {
      socket.emit('call:answer', { targetUserId: from.id, answer });
    });

    peer.on('stream', (remote) => {
      setRemoteStream(remote);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    });

    peer.on('close', () => endCall());
    peer.on('error', (err) => { console.error('Peer error:', err); endCall(); });
  }, [socket, getMedia]);

  // Reject incoming call
  const rejectCall = useCallback((targetUserId) => {
    if (socket) socket.emit('call:reject', { targetUserId });
    setCallState('idle');
    setRemoteUser(null);
  }, [socket]);

  // End active call
  const endCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (socket && remoteUser) socket.emit('call:end', { targetUserId: remoteUser.id });
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUser(null);
    setIsMuted(false);
    setIsCamOff(false);
  }, [socket, localStream, remoteUser]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(c => !c);
  }, [localStream]);

  return {
    callState, callType, remoteUser, localStream, remoteStream,
    isMuted, isCamOff,
    localVideoRef, remoteVideoRef,
    startCall, answerCall, rejectCall, endCall,
    toggleMute, toggleCamera,
    setCallState, setRemoteUser,
  };
};
