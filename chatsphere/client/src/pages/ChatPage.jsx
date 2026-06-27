import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Chat/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import CallModal from '../components/Chat/CallModal';
import { toast } from 'react-toastify';
import './ChatPage.css';

export default function ChatPage() {
  const { user }   = useAuth();
  const { socket } = useSocket();
  const [activeRoom, setActiveRoom] = useState(null);

  const {
    callState, callType, remoteUser,
    localVideoRef, remoteVideoRef,
    isMuted, isCamOff,
    startCall, answerCall, rejectCall, endCall,
    toggleMute, toggleCamera,
    setCallState, setRemoteUser,
  } = useWebRTC(socket, user);

  // Listen for incoming calls
  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', ({ from, offer, callType: type }) => {
      setRemoteUser(from);
      setCallState('incoming');
      // Store offer for answering
      socket._incomingOffer = { offer, from, type };
      toast.info(`📞 Incoming ${type} call from ${from.name}`, { autoClose: false, toastId: 'incoming-call' });
    });

    socket.on('call:ended', ({ by }) => {
      endCall();
      toast.info('Call ended');
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:ended');
    };
  }, [socket, endCall, setCallState, setRemoteUser]);

  const handleAnswerCall = () => {
    const { offer, from, type } = socket._incomingOffer || {};
    if (offer && from) {
      answerCall(from, offer, type);
      toast.dismiss('incoming-call');
    }
  };

  const handleRejectCall = () => {
    if (socket._incomingOffer) {
      rejectCall(socket._incomingOffer.from.id);
      toast.dismiss('incoming-call');
    }
    setCallState('idle');
    setRemoteUser(null);
  };

  return (
    <div className="chat-page">
      <Sidebar activeRoomId={activeRoom?.id} onSelectRoom={setActiveRoom} />
      <ChatWindow room={activeRoom} onStartCall={startCall} />

      <CallModal
        callState={callState}
        callType={callType}
        remoteUser={remoteUser}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        isMuted={isMuted}
        isCamOff={isCamOff}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleCam={toggleCamera}
        onAnswer={handleAnswerCall}
        onReject={handleRejectCall}
      />
    </div>
  );
}
