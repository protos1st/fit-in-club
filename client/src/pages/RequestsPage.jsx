import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function RequestsPage() {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const navigate = useNavigate();

  function load() {
    Promise.all([api.getIncoming(), api.getOutgoing()])
      .then(([inc, out]) => {
        setIncoming(inc.incoming || []);
        setOutgoing(out.outgoing || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function respond(requestId, action) {
    try {
      await api.respondToRequest(requestId, action);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function cancel(requestId) {
    try {
      await api.cancelRequest(requestId);
      load();
      showToast('Request cancelled', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <div className="spinner-text">Loading requests…</div>;

  const isEmpty = incoming.length === 0 && outgoing.length === 0;

  if (isEmpty) {
    return (
      <div>
        <h1 className="page-title">Requests</h1>
        <div className="card">
          <div className="empty-state empty-state-compact">
            <div className="empty-state-title">No requests yet</div>
            <p>When you send or receive buddy requests, they'll appear here.</p>
            <button className="btn btn-primary" style={{ marginTop: 12, borderRadius: 22 }} onClick={() => navigate('/discover')}>Find Buddies</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Requests</h1>

      {incoming.length > 0 && (
        <>
          <div className="section-title">Incoming ({incoming.length})</div>
          <div className="card">
            {incoming.map((r) => (
              <div className="person-row" key={r.id}>
                <div className="person-avatar">{initials(r.name)}</div>
                <div className="person-info">
                  <div className="person-name">{r.name}</div>
                  {r.training_type && <div className="person-meta"><span className="tag">{r.training_type}</span></div>}
                </div>
                <div className="row-gap-sm">
                  <button className="btn btn-primary btn-sm" onClick={() => respond(r.id, 'accept')}>Accept</button>
                  <button className="btn btn-danger-outline btn-sm" onClick={() => respond(r.id, 'decline')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <div className="section-title mt-md">Sent ({outgoing.length})</div>
          <div className="card">
            {outgoing.map((r) => (
              <div className="person-row" key={r.id}>
                <div className="person-avatar">{initials(r.name)}</div>
                <div className="person-info">
                  <div className="person-name">{r.name}</div>
                  <div className="person-meta">Waiting for response…</div>
                </div>
                <button className="btn btn-danger-outline btn-sm" onClick={() => cancel(r.id)}>Cancel</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
