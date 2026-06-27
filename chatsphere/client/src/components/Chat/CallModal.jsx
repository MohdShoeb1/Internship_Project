import { useEffect, useState } from 'react';
import './CallModal.css';

export default function CallModal({ callState, callType, remoteUser, localVideoRef, remoteVideoRef, isMuted, isCamOff, onEnd, onToggleMute, onToggleCam, onAnswer, onReject, incomingOffer }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (callState !== 'active') { setSeconds(0); return; }
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (callState === 'idle') return null;

  return (
    <div className="call-overlay">
      {callType === 'video' && (
        <div className="video-area">
          <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
          <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
        </div>
      )}

      <div className="call-card">
        <div className="call-av">
          {remoteUser?.name?.slice(0, 2).toUpperCase() || '??'}
        </div>
        <div className="call-name">{remoteUser?.name || 'Unknown'}</div>

        {callState === 'calling' && <div className="call-status">📡 Calling…</div>}
        {callState === 'incoming' && (
          <div className="call-status">
            📞 Incoming {callType === 'video' ? 'video' : 'voice'} call
          </div>
        )}
        {callState === 'active' && (
          <div className="call-status active">
            <span className="pulse"></span> {formatTime(seconds)}
          </div>
        )}

        {callState === 'incoming' ? (
          <div className="call-btns">
            <button className="call-ctrl ctrl-accept" onClick={onAnswer} title="Accept">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.92a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>
            </button>
            <button className="call-ctrl ctrl-end" onClick={onReject} title="Reject">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
            </button>
          </div>
        ) : (
          <div className="call-btns">
            <button className={`call-ctrl ctrl-mute ${isMuted ? 'active-ctrl' : ''}`} onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? '🔇' : '🎤'}
            </button>
            {callType === 'video' && (
              <button className={`call-ctrl ctrl-cam ${isCamOff ? 'active-ctrl' : ''}`} onClick={onToggleCam} title={isCamOff ? 'Camera on' : 'Camera off'}>
                {isCamOff ? '📵' : '📷'}
              </button>
            )}
            <button className="call-ctrl ctrl-end" onClick={onEnd} title="End call">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
            </button>
          </div>
        )}
        <div className="call-footer">WebRTC · peer-to-peer · encrypted</div>
      </div>
    </div>
  );
}
