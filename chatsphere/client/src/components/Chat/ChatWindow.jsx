import { useState, useEffect, useRef, useCallback } from 'react';
import { messageAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';
import './ChatWindow.css';

export default function ChatWindow({ room, onStartCall }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmoji, setShowEmoji]   = useState(false);
  const [replyTo, setReplyTo]       = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [disappearTime, setDisappearTime] = useState(0);
  const [pinnedMsg, setPinnedMsg]   = useState(null);
  const [uploading, setUploading]   = useState(false);

  const bottomRef  = useRef(null);
  const fileRef    = useRef(null);
  const typingTimer = useRef(null);
  const isTyping   = useRef(false);

  // Load messages
  const loadMessages = useCallback(async (p = 1) => {
    if (!room) return;
    setLoading(true);
    try {
      const res = await messageAPI.getMessages(room.id, p);
      const { messages: msgs, pages } = res.data;
      if (p === 1) {
        setMessages(msgs);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        setMessages(prev => [...msgs, ...prev]);
      }
      setHasMore(p < pages);
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [room]);

  useEffect(() => {
    if (!room) return;
    setMessages([]);
    setPage(1);
    setHasMore(true);
    setReplyTo(null);
    setTypingUsers([]);
    loadMessages(1);
    // Find pinned message
    setPinnedMsg(null);
  }, [room, loadMessages]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !room) return;

    socket.emit('room:join', { roomId: room.id });

    socket.on('message:new', (msg) => {
      if (msg.roomId !== room.id) return;
      setMessages(prev => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      // Mark as read
      socket.emit('message:read', { roomId: room.id, messageId: msg.id });
    });

    socket.on('typing:start', ({ roomId, userId, name }) => {
      if (roomId !== room.id || userId === user.id) return;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
    });

    socket.on('typing:stop', ({ roomId, userId }) => {
      if (roomId !== room.id) return;
      setTypingUsers([]);
    });

    socket.on('message:reacted', ({ messageId, reactions, roomId }) => {
      if (roomId !== room.id) return;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });

    socket.on('message:edited', ({ messageId, content, roomId }) => {
      if (roomId !== room.id) return;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, isEdited: true } : m));
    });

    socket.on('message:deleted', ({ messageId, roomId }) => {
      if (roomId !== room.id) return;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m));
    });

    socket.on('message:pinned', ({ messageId, content, roomId }) => {
      if (roomId !== room.id) return;
      setPinnedMsg({ id: messageId, content });
    });

    socket.on('message:read', ({ roomId, userId }) => {
      if (roomId !== room.id || userId === user.id) return;
      setMessages(prev => prev.map(m => ({
        ...m,
        readBy: m.readBy?.includes(userId) ? m.readBy : [...(m.readBy || []), userId],
      })));
    });

    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('message:reacted');
      socket.off('message:edited');
      socket.off('message:deleted');
      socket.off('message:pinned');
      socket.off('message:read');
    };
  }, [socket, room, user]);

  // Typing events
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket || !room) return;
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing:start', { roomId: room.id });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit('typing:stop', { roomId: room.id });
    }, 1500);
  };

  // Send text message via socket
  const sendTextMessage = () => {
    if (!input.trim() || !socket || !room) return;
    socket.emit('message:send', {
      roomId: room.id,
      content: input.trim(),
      type: 'text',
      replyToId: replyTo?.id || null,
      disappearsIn: disappearTime || null,
    });
    setInput('');
    setReplyTo(null);
    isTyping.current = false;
    socket.emit('typing:stop', { roomId: room.id });
  };

  // Send file via REST (multer)
  const sendFile = async (file) => {
    if (!file || !room) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (replyTo) fd.append('replyToId', replyTo.id);
      if (disappearTime) fd.append('disappearsIn', disappearTime);
      const res = await messageAPI.sendMessage(room.id, fd);
      setMessages(prev => [...prev, res.data.message]);
      setReplyTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      toast.error('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
  };

  const handleReact = (messageId, emoji) => {
    if (socket) socket.emit('message:react', { messageId, emoji });
  };

  const handleDelete = (messageId) => {
    if (socket) socket.emit('message:delete', { messageId });
  };

  const handleEdit = (messageId, content) => {
    if (socket) socket.emit('message:edit', { messageId, content });
  };

  const handlePin = (messageId) => {
    if (socket) socket.emit('message:pin', { messageId });
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    try {
      const res = await messageAPI.searchMessages(room.id, searchQ);
      setSearchResults(res.data.messages);
    } catch (_) { toast.error('Search failed'); }
  };

  if (!room) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-inner">
          <div className="chat-empty-logo">💬</div>
          <h2>Welcome to ChatSphere</h2>
          <p>Select a conversation or start a new one</p>
        </div>
      </div>
    );
  }

  const otherUser = room.type === 'direct' ? room.members?.find(m => m.id !== user?.id) : null;
  const roomName  = room.type === 'direct' ? otherUser?.name : room.name;

  return (
    <div className="chat-window">
      {/* Top Bar */}
      <div className="chat-topbar">
        <div className="topbar-left">
          <div className="av av-green" style={{ width: 38, height: 38, fontSize: 13, flexShrink: 0 }}>
            {roomName?.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div className="topbar-name">{roomName}</div>
            <div className="topbar-sub">
              {room.type === 'direct'
                ? (otherUser?.status === 'online' ? '● Online' : `Last seen ${otherUser?.lastSeen ? new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}`)
                : `${room.members?.length || 0} members`
              }
            </div>
          </div>
        </div>
        <div className="topbar-actions">
          {room.type === 'direct' && (
            <>
              <button className="action-btn" title="Voice call" onClick={() => onStartCall(otherUser, 'voice')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.92a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>
              </button>
              <button className="action-btn" title="Video call" onClick={() => onStartCall(otherUser, 'video')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </button>
            </>
          )}
          <button className="action-btn" title="Search" onClick={() => setSearchOpen(o => !o)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {searchOpen && (
        <div className="search-bar">
          <input placeholder="Search messages…" value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} autoFocus />
          <button onClick={handleSearch}>Search</button>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(m => (
                <div key={m.id} className="search-result-item" onClick={() => { setSearchOpen(false); setSearchResults([]); }}>
                  <span className="sr-sender">{m.sender?.name}</span>
                  <span className="sr-content">{m.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pinned Message */}
      {pinnedMsg && (
        <div className="pinned-banner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m12 17-1-4-4-1 9-9 1 4 4 1z"/><path d="m8 21 4-4"/></svg>
          <span><strong>Pinned:</strong> {pinnedMsg.content?.slice(0, 80)}</span>
          <button onClick={() => setPinnedMsg(null)}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="messages-wrap">
        {hasMore && !loading && (
          <button className="load-more" onClick={() => { const np = page + 1; setPage(np); loadMessages(np); }}>
            Load older messages
          </button>
        )}
        {loading && <div className="loading-msgs">Loading…</div>}

        <div className="e2e-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          End-to-end encrypted
        </div>

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === user?.id || msg.sender?.id === user?.id}
            prevMsg={messages[i - 1]}
            currentUser={user}
            onReact={handleReact}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onPin={handlePin}
            onReply={setReplyTo}
          />
        ))}

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
            <span className="typing-label">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…</span>
          </div>
        )}

        <div ref={bottomRef}></div>
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-preview-inner">
            <span className="reply-to-name">{replyTo.sender?.name}</span>
            <span className="reply-to-text">{replyTo.content?.slice(0, 60)}</span>
          </div>
          <button onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Input Bar */}
      <div className="input-bar">
        <div className="input-row">
          <div className="input-actions-left">
            <button className="input-action" onClick={() => setShowEmoji(e => !e)} title="Emoji">😊</button>
            <button className="input-action" title="Attach file" onClick={() => fileRef.current?.click()}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input ref={fileRef} type="file" hidden onChange={e => sendFile(e.target.files[0])} />
            <select
              className="disappear-select"
              value={disappearTime}
              onChange={e => setDisappearTime(Number(e.target.value))}
              title="Disappearing messages"
            >
              <option value="0">⏱ Never</option>
              <option value="300">5 min</option>
              <option value="3600">1 hour</option>
              <option value="86400">24 hours</option>
              <option value="604800">7 days</option>
            </select>
          </div>

          <textarea
            className="msg-input"
            placeholder="Type a message…"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          <button className="send-btn" onClick={sendTextMessage} disabled={!input.trim() || uploading}>
            {uploading ? '…' : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>

        {showEmoji && (
          <div className="emoji-picker-wrap">
            <EmojiPicker
              onEmojiClick={(e) => { setInput(i => i + e.emoji); setShowEmoji(false); }}
              theme="dark"
              height={350}
            />
          </div>
        )}
      </div>
    </div>
  );
}
