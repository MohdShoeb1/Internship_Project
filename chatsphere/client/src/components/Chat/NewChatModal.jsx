import { useState, useEffect } from 'react';
import { roomAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import './NewChatModal.css';

export default function NewChatModal({ onClose, onRoomCreated }) {
  const [tab, setTab]         = useState('direct');   // direct | group
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await roomAPI.searchUsers(query);
        setResults(res.data.users);
      } catch (_) {}
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const toggleSelect = (u) => {
    setSelected(prev =>
      prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
    );
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      if (tab === 'direct') {
        if (!selected[0]) return toast.error('Select a user');
        const res = await roomAPI.createDirect(selected[0].id);
        onRoomCreated(res.data.room);
      } else {
        if (!groupName.trim()) return toast.error('Enter a group name');
        if (selected.length === 0) return toast.error('Add at least one member');
        const fd = new FormData();
        fd.append('name', groupName);
        fd.append('memberIds', JSON.stringify(selected.map(u => u.id)));
        fd.append('isPremium', isPremium);
        if (isPremium) fd.append('premiumPrice', premiumPrice);
        const res = await roomAPI.createGroup(fd);
        onRoomCreated(res.data.room);
        toast.success('Group created!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Conversation</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button className={tab === 'direct' ? 'active' : ''} onClick={() => setTab('direct')}>Direct Message</button>
          <button className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>Group / Channel</button>
        </div>

        {tab === 'group' && (
          <div className="field">
            <input placeholder="Group name…" value={groupName} onChange={e => setGroupName(e.target.value)} />
          </div>
        )}

        <div className="search-field">
          <input
            placeholder="Search by name, username or email…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {selected.length > 0 && (
          <div className="selected-chips">
            {selected.map(u => (
              <span key={u.id} className="chip">
                {u.name} <button onClick={() => toggleSelect(u)}>✕</button>
              </span>
            ))}
          </div>
        )}

        <div className="user-results">
          {results.map(u => (
            <div
              key={u.id}
              className={`user-row ${selected.find(x => x.id === u.id) ? 'selected' : ''}`}
              onClick={() => tab === 'direct' ? setSelected([u]) : toggleSelect(u)}
            >
              <div className="av av-purple" style={{ width: 36, height: 36, fontSize: 13 }}>
                {u.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>@{u.username}</div>
              </div>
              {selected.find(x => x.id === u.id) && <span className="check">✓</span>}
            </div>
          ))}
          {query && results.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>No users found</p>
          )}
        </div>

        {tab === 'group' && (
          <div className="premium-toggle">
            <label>
              <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} />
              Make this a Premium Channel (paid access)
            </label>
            {isPremium && (
              <input
                type="number"
                placeholder="Price in USD (e.g. 4.99)"
                value={premiumPrice}
                onChange={e => setPremiumPrice(e.target.value)}
                min="0.5" step="0.01"
              />
            )}
          </div>
        )}

        <button className="modal-create-btn" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : tab === 'direct' ? 'Open Chat' : 'Create Group'}
        </button>
      </div>
    </div>
  );
}
