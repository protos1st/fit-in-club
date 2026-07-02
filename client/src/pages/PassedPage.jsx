import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import Avatar from '../components/Avatar';

export default function PassedPage() {
  const [passed, setPassed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.getPassed().then((data) => setPassed(data.passed || [])).finally(() => setLoading(false));
  }, []);

  async function handleUnpass(userId, name) {
    try {
      await api.unpassProfile(userId);
      setPassed((prev) => prev.filter((p) => p.user_id !== userId));
      showToast(`${name} will show up in Discover again`, 'info');
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
      <h1 className="page-title">Passed Profiles</h1>
      <p className="page-sub">{passed.length} passed profile{passed.length !== 1 ? 's' : ''}</p>

      {passed.length > 0 && (
        <div className="filter-bar">
          <div className="filter-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search passed profiles…"
              aria-label="Search passed profiles"
            />
          </div>
        </div>
      )}

      <div className="card">
        {passed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No passed profiles</div>
            <p>Profiles you pass on in Discover show up here so you can bring them back.</p>
          </div>
        ) : (
          passed.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())).map((p) => (
            <div className="person-row" key={p.user_id}>
              <Avatar name={p.name} photo={p.avatar_url} size={40} />
              <div className="person-info">
                <div className="person-name">{p.name}</div>
                {p.training_type && <div className="person-meta">{p.training_type}</div>}
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => handleUnpass(p.user_id, p.name)}>Undo pass</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
