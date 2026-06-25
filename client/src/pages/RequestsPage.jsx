import { useEffect, useState } from 'react';
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

  if (loading) return <div className="spinner-text">Loading requests…</div>;

  return (
    <div>
      <div className="page-eyebrow">Buddy Requests</div>
      <h1 className="page-title">Requests</h1>
      <p className="page-sub">Accept a request to start chatting with your gym buddy.</p>

      <div className="section-title">Incoming ({incoming.length})</div>
      <div className="card">
        {incoming.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Nothing waiting on you</div>
            <p>Requests from other members will show up here.</p>
          </div>
        ) : (
          incoming.map((r) => (
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
          ))
        )}
      </div>

      <div className="section-title mt-md">Sent ({outgoing.length})</div>
      <div className="card">
        {outgoing.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No pending sent requests</div>
            <p>Find a buddy and send a request from the Discover page.</p>
          </div>
        ) : (
          outgoing.map((r) => (
            <div className="person-row" key={r.id}>
              <div className="person-avatar">{initials(r.name)}</div>
              <div className="person-info">
                <div className="person-name">{r.name}</div>
                <div className="person-meta">Waiting for response…</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
