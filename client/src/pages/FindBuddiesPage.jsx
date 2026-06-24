import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function FindBuddiesPage() {
  const [matches, setMatches] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState(new Set());
  const [connectedTo, setConnectedTo] = useState(new Set());
  const [pendingTo, setPendingTo] = useState(new Set());
  const showToast = useToast();

  useEffect(() => {
    Promise.all([api.getOverlap(), api.getConnections(), api.getOutgoing()])
      .then(([overlap, conn, out]) => {
        setMatches(overlap.matches || []);
        setNote(overlap.note || '');
        setConnectedTo(new Set((conn.connections || []).map((c) => c.user_id)));
        setPendingTo(new Set((out.outgoing || []).map((r) => r.user_id)));
      })
      .finally(() => setLoading(false));
  }, []);

  async function sendRequest(userId) {
    try {
      const data = await api.sendBuddyRequest(userId);
      setSentTo((prev) => new Set(prev).add(userId));
      if (data.note) {
        showToast(data.note, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <div className="spinner-text">Finding people who train when you do…</div>;

  return (
    <div>
      <div className="page-eyebrow">Schedule overlap</div>
      <h1 className="page-title">Find Buddies</h1>
      <p className="page-sub">Members whose weekly training times line up with yours.</p>

      {note && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">Set your schedule first</div>
            <p>{note}</p>
          </div>
        </div>
      )}

      {!note && matches.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">No overlaps yet</div>
            <p>No one else trains during your current time slots yet. Check back later, or add more time slots to widen your matches.</p>
          </div>
        </div>
      )}

      {matches.map((m) => (
        <div className="card" key={m.user_id}>
          <div className="person-row person-row-tight">
            <div className="person-avatar">{initials(m.name)}</div>
            <div className="person-info">
              <div className="person-name">{m.name}</div>
              {m.training_type && <div className="person-meta"><span className="tag">{m.training_type}</span></div>}
              {m.bio && <div className="person-meta">{m.bio}</div>}
            </div>
            {connectedTo.has(m.user_id) ? (
              <span className="btn btn-ghost btn-sm" style={{ cursor: 'default' }}>Connected</span>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => sendRequest(m.user_id)}
                disabled={sentTo.has(m.user_id) || pendingTo.has(m.user_id)}
              >
                {sentTo.has(m.user_id) || pendingTo.has(m.user_id) ? 'Request sent' : 'Send request'}
              </button>
            )}
          </div>
          <div className="overlap-slots">
            {m.overlapping_slots.map((s, i) => (
              <span className="match-slot-chip" key={i}>
                {DAYS[s.day_of_week]} {formatTime(s.start_time)}–{formatTime(s.end_time)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
