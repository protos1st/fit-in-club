import { useEffect, useState } from 'react';
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

  async function sendRequest(userId) {
    try {
      await api.sendBuddyRequest(userId);
      setSentTo((prev) => new Set(prev).add(userId));
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <div className="spinner-text">Checking who's in…</div>;

  return (
    <div>
      <div className="page-eyebrow">Right now</div>
      <h1 className="page-title">Live Now</h1>
      <p className="page-sub">Members currently checked in at the gym.</p>

      <div className="card">
        {live.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No one's checked in right now</div>
            <p>When members toggle "I'm here now" on their schedule page, they'll show up here.</p>
          </div>
        ) : (
          live.map((p) => (
            <div className="person-row" key={p.user_id}>
              <div className="person-avatar">{initials(p.name)}</div>
              <div className="person-info">
                <div className="person-name"><span className="pulse-dot" />{p.name}</div>
                <div className="person-meta">
                  {p.training_type && <span className="tag tag-spaced">{p.training_type}</span>}
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
