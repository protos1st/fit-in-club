import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { initials } from '../lib/utils';
import Avatar from '../components/Avatar';

export default function BlockedPage() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.getBlocked().then((data) => setBlocked(data.blocked || [])).finally(() => setLoading(false));
  }, []);

  async function handleUnblock(userId, name) {
    try {
      await api.unblockUser(userId);
      setBlocked((prev) => prev.filter((b) => b.user_id !== userId));
      showToast(`${name} unblocked`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <div className="spinner-text">Loading…</div>;

  return (
    <div>
      <button className="chat-back-btn" onClick={() => navigate('/profile')} aria-label="Back to profile">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Profile
      </button>
      <h1 className="page-title">Blocked Users</h1>
      <p className="page-sub">{blocked.length} blocked user{blocked.length !== 1 ? 's' : ''}</p>

      {blocked.length > 0 && (
        <div className="filter-bar">
          <div className="filter-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blocked users…"
              aria-label="Search blocked users"
            />
          </div>
        </div>
      )}

      <div className="card">
        {blocked.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No blocked users</div>
            <p>You haven't blocked anyone.</p>
          </div>
        ) : (
          blocked.filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase())).map((b) => (
            <div className="person-row" key={b.user_id}>
              <Avatar name={b.name} size={40} />
              <div className="person-info">
                <div className="person-name">{b.name}</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => handleUnblock(b.user_id, b.name)}>Unblock</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
