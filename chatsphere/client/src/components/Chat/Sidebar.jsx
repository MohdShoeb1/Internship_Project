import { useState, useEffect, useCallback } from 'react';
import { roomAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import NewChatModal from './NewChatModal';
import './Sidebar.css';

export default function Sidebar({ activeRoomId, onSelectRoom }) {
  const { user, logout } = useAuth();
  const { socket }       = useSocket();
  const [rooms, setRooms]       = useState([]);
  const [search, setSearch]     = useState('');
  const [showNew, setShowNew]   = useState(false);
  const [userStatuses, setUserStatuses] = useState({});

  const loadRooms = useCallback(async () => {
    try {
      const res = await roomAPI.getMyRooms();
      setRooms(res.data.rooms);
    } catch (err) {
      console.error('Load rooms error:', err);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Socket: new message → bump room to top + update preview
  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (msg) => {
      setRooms(prev => {
        const updated = prev.map(r =>
          r.id === msg.roomId
            ? { ...r, lastMessage: msg, updatedAt: new Date().toISOString(), unreadCount: r.id === activeRoomId ? 0 : (r.unreadCount || 0) + 1 }
            : r
        );
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    socket.on('user:status', ({ userId, status }) => {
      setUserStatuses(prev => ({ ...prev, [userId]: status }));
    });

    return () => {
      socket.off('message:new');
      socket.off('user:status');
    };
  }, [socket, activeRoomId]);

  const getRoomDisplay = (room) => {
    if (room.type === 'direct') {
      const other = room.members?.find(m => m.id !== user?.id);
      return {
        name: other?.name || 'Unknown',
        avatar: other?.avatar,
        initials: other?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?',
        status: userStatuses[other?.id] || other?.status,
        subtitle: other?.username ? `@${other.username}` : '',
      };
    }
    return {
      name: room.name,
      avatar: room.avatar,
      initials: room.name?.slice(0, 2).toUpperCase() || 'GR',
      status: null,
      subtitle: `${room.members?.length || 0} members`,
    };
  };

  const getLastMessagePreview = (room) => {
    const msg = room.lastMessage;
    if (!msg) return 'No messages yet';
    if (msg.isDeleted) return '🗑 Message deleted';
    if (msg.type === 'image') return '📷 Image';
    if (msg.type === 'file')  return `📎 ${msg.fileName || 'File'}`;
    if (msg.type === 'audio') return '🎵 Audio';
    if (msg.type === 'video') return '🎬 Video';
    const prefix = msg.sender?.id === user?.id ? 'You: ' : '';
    return `${prefix}${msg.content?.slice(0, 40) || ''}`;
  };

  const filtered = rooms.filter(r => {
    const d = getRoomDisplay(r);
    return d.name.toLowerCase().includes(search.toLowerCase());
  });

  const avatarColors = ['av-purple','av-green','av-amber','av-red','av-blue','av-pink'];
  const getColor = (str) => {
    let hash = 0;
    for (let c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">C</div>
          <span className="brand-name">ChatSphere</span>
          {user?.isPremium && <span className="brand-badge premium">⭐ PRO</span>}
        </div>
        <div className="search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* New Chat Button */}
      <button className="new-chat-btn" onClick={() => setShowNew(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New Conversation
      </button>

      {/* Room List */}
      <div className="contacts-scroll">
        {filtered.length === 0 ? (
          <div className="empty-rooms">
            <p>No conversations yet</p>
            <span>Start a new chat above</span>
          </div>
        ) : (
          filtered.map(room => {
            const d = getRoomDisplay(room);
            const isActive = room.id === activeRoomId;
            return (
              <div
                key={room.id}
                className={`contact-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectRoom(room);
                  setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unreadCount: 0 } : r));
                }}
              >
                <div className="av-wrap">
                  {d.avatar
                    ? <img src={d.avatar} alt={d.name} className="av-img" />
                    : <div className={`av ${getColor(d.name)}`}>{d.initials}</div>
                  }
                  {d.status && (
                    <span className={`status-dot ${d.status === 'online' ? 's-online' : d.status === 'away' ? 's-away' : d.status === 'busy' ? 's-busy' : 's-offline'}`}></span>
                  )}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{d.name}</div>
                  <div className={`contact-preview ${room.lastMessage?.sender?.id !== user?.id && room.unreadCount > 0 ? 'unread-preview' : ''}`}>
                    {getLastMessagePreview(room)}
                  </div>
                </div>
                <div className="contact-right">
                  <span className="contact-time">
                    {room.lastMessage
                      ? formatDistanceToNow(new Date(room.lastMessage.createdAt), { addSuffix: false })
                          .replace('about ', '').replace(' minutes', 'm').replace(' hours', 'h').replace(' days', 'd')
                      : ''}
                  </span>
                  {room.unreadCount > 0 && (
                    <span className="unread-badge">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="my-av">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : user?.name?.slice(0, 2).toUpperCase()
          }
          <span className="status-dot s-online"></span>
        </div>
        <div className="my-info">
          <div className="my-name">{user?.name}</div>
          <div className="my-status">● Online</div>
        </div>
        <button className="icon-btn" title="Logout" onClick={logout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {showNew && (
        <NewChatModal
          onClose={() => setShowNew(false)}
          onRoomCreated={(room) => {
            loadRooms();
            onSelectRoom(room);
            setShowNew(false);
          }}
        />
      )}
    </aside>
  );
}
