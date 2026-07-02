import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { SOCKET_URL } from '../../utils/api';

const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

export default function MessageBubble({
  message: msg, isMe, prevMsg, currentUser,
  onReact, onDelete, onEdit, onPin, onReply
}) {
  const [showMenu, setShowMenu]     = useState(false);
  const [showReacts, setShowReacts] = useState(false);
  const [editing, setEditing]       = useState(false);
  const [editText, setEditText]     = useState(msg.content || '');
  const menuRef = useRef(null);

  if (msg.isDeleted) {
    return (
      <div className={`msg-group ${isMe ? 'me' : 'them'}`}>
        <div className="msg-row-inner">
          <div className="bubble deleted-bubble">🗑 This message was deleted</div>
        </div>
      </div>
    );
  }

  const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);
  const time = msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : '';
  const readCount = (msg.readBy || []).filter(id => id !== currentUser?.id).length;

  const handleEditSave = () => {
    if (editText.trim()) onEdit(msg.id, editText.trim());
    setEditing(false);
  };

  return (
    <div className={`msg-group ${isMe ? 'me' : 'them'}`}>
      {msg.replyTo && (
        <div className={`reply-context ${isMe ? 'me' : ''}`}>
          <span className="reply-name">{msg.replyTo.sender?.name}</span>
          <span className="reply-text">{msg.replyTo.content?.slice(0, 60) || '[media]'}</span>
        </div>
      )}

      <div className="msg-row-inner">
        {!isMe && (
          <div className="msg-av">
            {showAvatar
              ? <div className="av av-purple" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {msg.sender?.name?.slice(0, 2).toUpperCase()}
                </div>
              : <div style={{ width: 28 }} />
            }
          </div>
        )}

        <div className="bubble-col">
          {showAvatar && !isMe && (
            <div className="sender-name">{msg.sender?.name}</div>
          )}

          {editing ? (
            <div className="edit-wrap">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                autoFocus rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <div className="edit-btns">
                <button onClick={handleEditSave}>Save</button>
                <button onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div
              className={`bubble ${isMe ? 'me' : 'them'}`}
              onDoubleClick={() => setShowReacts(r => !r)}
              onContextMenu={e => { e.preventDefault(); setShowMenu(true); }}
            >
              {msg.type === 'image' && msg.fileUrl && (
                <img
                  src={`${SOCKET_URL}${msg.fileUrl}`}
                  alt="shared"
                  className="msg-image"
                  onClick={() => window.open(`${SOCKET_URL}${msg.fileUrl}`, '_blank')}
                />
              )}
              {msg.type === 'file' && msg.fileUrl && (
                <a href={`${SOCKET_URL}${msg.fileUrl}`} target="_blank" rel="noreferrer" className="file-attachment">
                  <span className="file-icon-wrap">📄</span>
                  <div>
                    <div className="file-name">{msg.fileName}</div>
                    <div className="file-size">{msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : ''}</div>
                  </div>
                </a>
              )}
              {msg.type === 'audio' && msg.fileUrl && (
                <audio controls src={`${SOCKET_URL}${msg.fileUrl}`} className="msg-audio" />
              )}
              {msg.type === 'video' && msg.fileUrl && (
                <video controls src={`${SOCKET_URL}${msg.fileUrl}`} className="msg-video" />
              )}
              {msg.content && <p className="bubble-text">{msg.content}</p>}
              {msg.isEdited && <span className="edited-tag"> (edited)</span>}
            </div>
          )}

          <div className="bubble-meta">
            <span className="time">{time}</span>
            {isMe && (
              <span className="read-ticks">
                {readCount > 0
                  ? <span style={{ color: '#9d98f8' }}>✓✓</span>
                  : <span style={{ color: '#5c5c72' }}>✓</span>
                }
              </span>
            )}
          </div>

          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className="reactions-row">
              {Object.entries(msg.reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  className={`reaction-pill ${users.includes(currentUser?.id) ? 'reacted' : ''}`}
                  onClick={() => onReact(msg.id, emoji)}
                  title={`${users.length} ${users.length === 1 ? 'person' : 'people'}`}
                >
                  {emoji} {users.length}
                </button>
              ))}
            </div>
          )}

          {showReacts && (
            <div className="quick-reacts">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setShowReacts(false); }}>{e}</button>
              ))}
            </div>
          )}
        </div>

        <div className={`msg-actions ${isMe ? 'me' : 'them'}`}>
          <button title="React"  onClick={() => setShowReacts(r => !r)}>😊</button>
          <button title="Reply"  onClick={() => onReply(msg)}>↩</button>
          {isMe && <button title="Edit" onClick={() => { setEditing(true); setEditText(msg.content); }}>✏️</button>}
          <button title="Pin"    onClick={() => onPin(msg.id)}>📌</button>
          {isMe && <button title="Delete" className="del-btn" onClick={() => onDelete(msg.id)}>🗑</button>}
        </div>
      </div>

      {showMenu && (
        <div className="context-menu" ref={menuRef} onMouseLeave={() => setShowMenu(false)}>
          <button onClick={() => { setShowReacts(true); setShowMenu(false); }}>😊 React</button>
          <button onClick={() => { onReply(msg); setShowMenu(false); }}>↩ Reply</button>
          {isMe && <button onClick={() => { setEditing(true); setEditText(msg.content); setShowMenu(false); }}>✏️ Edit</button>}
          <button onClick={() => { onPin(msg.id); setShowMenu(false); }}>📌 Pin</button>
          <button onClick={() => { navigator.clipboard.writeText(msg.content || ''); setShowMenu(false); }}>📋 Copy</button>
          {isMe && <button className="danger" onClick={() => { onDelete(msg.id); setShowMenu(false); }}>🗑 Delete</button>}
        </div>
      )}
    </div>
  );
}
