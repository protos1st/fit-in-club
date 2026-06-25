import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function BlockedPage() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
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
      <h1 className="page-title">Blocked users</h1>
      <p className="page-sub">{blocked.length} blocked user{blocked.length !== 1 ? 's' : ''}</p>

      <div className="card">
        {blocked.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No blocked users</div>
            <p>You haven't blocked anyone.</p>
          </div>
        ) : (
          blocked.map((b) => (
            <div className="person-row" key={b.user_id}>
              <div className="person-avatar">{initials(b.name)}</div>
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
