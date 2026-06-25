import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr ago`;
}

export default function LiveNowPage() {
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState(new Set());
  const [connectedTo, setConnectedTo] = useState(new Set());
  const [pendingTo, setPendingTo] = useState(new Set());
  const showToast = useToast();

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [trainingFilter, setTrainingFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  function load() {
    api.getLive().then((data) => setLive(data.live || [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    Promise.all([api.getConnections(), api.getOutgoing()]).then(([conn, out]) => {
      setConnectedTo(new Set((conn.connections || []).map((c) => c.user_id)));
      setPendingTo(new Set((out.outgoing || []).map((r) => r.user_id)));
    });
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const trainingTypes = useMemo(() => {
    const types = new Set();
    live.forEach((p) => { if (p.training_type) types.add(p.training_type); });
    return Array.from(types).sort();
  }, [live]);

  const genders = useMemo(() => {
    const g = new Set();
    live.forEach((p) => { if (p.gender && p.gender !== 'Prefer not to say') g.add(p.gender); });
    return Array.from(g).sort();
  }, [live]);

  const filtered = useMemo(() => {
    let result = [...live];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (genderFilter) {
      result = result.filter((p) => p.gender === genderFilter);
    }
    if (trainingFilter) {
      result = result.filter((p) => p.training_type === trainingFilter);
    }
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [live, search, genderFilter, trainingFilter, sortBy]);

  async function sendRequest(userId) {
    try {
      await api.sendBuddyRequest(userId);
      setSentTo((prev) => new Set(prev).add(userId));
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const activeFilters = (genderFilter ? 1 : 0) + (trainingFilter ? 1 : 0);

  if (loading) return <div className="spinner-text">Checking who's in…</div>;

  return (
    <div>
      <div className="page-eyebrow">Right now</div>
      <h1 className="page-title">Live Now</h1>
      <p className="page-sub">{live.length} member{live.length !== 1 ? 's' : ''} checked in at the gym.</p>

      {live.length > 0 && (
        <div className="filter-bar">
          <div className="filter-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search members"
            />
          </div>
          <div className="filter-chips">
            {genders.length > 0 && (
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="filter-select"
                aria-label="Filter by gender"
              >
                <option value="">All genders</option>
                {genders.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            {trainingTypes.length > 0 && (
              <select
                value={trainingFilter}
                onChange={(e) => setTrainingFilter(e.target.value)}
                className="filter-select"
                aria-label="Filter by training type"
              >
                <option value="">All training</option>
                {trainingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              aria-label="Sort order"
            >
              <option value="recent">Most recent</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          {activeFilters > 0 && (
            <button className="filter-clear" onClick={() => { setGenderFilter(''); setTrainingFilter(''); setSearch(''); }}>
              Clear filters ({activeFilters})
            </button>
          )}
        </div>
      )}

      <div className="card">
        {live.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No one's checked in right now</div>
            <p>When members toggle "I'm here now" on their schedule page, they'll show up here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No matches</div>
            <p>No one matches your current filters. Try broadening your search.</p>
          </div>
        ) : (
          filtered.map((p) => (
            <div className="person-row" key={p.user_id}>
              <div className="person-avatar">{initials(p.name)}</div>
              <div className="person-info">
                <div className="person-name"><span className="pulse-dot" />{p.name}</div>
                <div className="person-meta">
                  {p.training_type && <span className="tag tag-spaced">{p.training_type}</span>}
                  {p.gender && p.gender !== 'Prefer not to say' && <span className="tag tag-spaced">{p.gender}</span>}
                  checked in {timeAgo(p.checked_in_at)}
                </div>
              </div>
              {connectedTo.has(p.user_id) ? (
                <span className="btn btn-ghost btn-sm" style={{ cursor: 'default' }}>Connected</span>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => sendRequest(p.user_id)}
                  disabled={sentTo.has(p.user_id) || pendingTo.has(p.user_id)}
                >
                  {sentTo.has(p.user_id) || pendingTo.has(p.user_id) ? 'Sent' : 'Send request'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
