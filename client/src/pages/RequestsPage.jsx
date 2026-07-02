import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { initials } from '../lib/utils';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Portal from '../components/Portal';
import { PersonRowSkeleton } from '../components/Skeleton';

function ProfileModal({ person, kind, onClose, onAccept, onDecline, onCancel }) {
  if (!person) return null;
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card req-profile-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Profile</div>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="req-profile-top">
            <Avatar name={person.name} photo={person.avatar_url || null} size={72} />
            <div className="req-profile-name">
              {person.name}
              {person.gender && person.gender !== 'Prefer not to say' && (
                <span className="req-profile-gender">{person.gender}</span>
              )}
            </div>
          </div>

          {person.training_type && (
            <div className="req-profile-training">
              {person.training_type.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}

          {person.bio && <p className="req-profile-bio">{person.bio}</p>}

          <div className="req-profile-actions">
            {kind === 'incoming' && (
              <>
                <button className="btn btn-primary btn-block" onClick={() => { onAccept(); onClose(); }}>Accept</button>
                <button className="btn btn-danger-outline btn-block" onClick={() => { onDecline(); onClose(); }}>Decline</button>
              </>
            )}
            {kind === 'outgoing' && (
              <button className="btn btn-danger-outline btn-block" onClick={() => { onCancel(); onClose(); }}>Cancel request</button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function RequestsPage() {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null); // { person, kind, requestId }
  const showToast = useToast();
  const navigate = useNavigate();

  function load() {
    Promise.allSettled([api.getIncoming(), api.getOutgoing()])
      .then(([incRes, outRes]) => {
        if (incRes.status === 'fulfilled') setIncoming(incRes.value.incoming || []);
        if (outRes.status === 'fulfilled') setOutgoing(outRes.value.outgoing || []);
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

  if (loading) return (
    <div>
      <h1 className="page-title">Requests</h1>
      <div className="card">{PersonRowSkeleton({ count: 3 })}</div>
    </div>
  );

  const isEmpty = incoming.length === 0 && outgoing.length === 0;

  if (isEmpty) {
    return (
      <div>
        <h1 className="page-title">Requests</h1>
        <div className="card">
          <EmptyState
            type="requests"
            title="No requests yet"
            message="Send a buddy request from Discover, or wait for someone to find you."
            action="Find buddies"
            onAction={() => navigate('/discover')}
          />
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
              <div className="person-row person-row-clickable" key={r.id} onClick={() => setViewing({ person: r, kind: 'incoming', requestId: r.id })}>
                <Avatar name={r.name} photo={r.avatar_url || null} size={40} />
                <div className="person-info">
                  <div className="person-name">{r.name}</div>
                  {r.training_type && <div className="person-meta"><span className="tag">{r.training_type}</span></div>}
                </div>
                <div className="row-gap-sm" onClick={e => e.stopPropagation()}>
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
              <div className="person-row person-row-clickable" key={r.id} onClick={() => setViewing({ person: r, kind: 'outgoing', requestId: r.id })}>
                <Avatar name={r.name} photo={r.avatar_url || null} size={40} />
                <div className="person-info">
                  <div className="person-name">{r.name}</div>
                  <div className="person-meta">Waiting for response…</div>
                </div>
                <button className="btn btn-danger-outline btn-sm" onClick={(e) => { e.stopPropagation(); cancel(r.id); }}>Cancel</button>
              </div>
            ))}
          </div>
        </>
      )}

      {viewing && (
        <ProfileModal
          person={viewing.person}
          kind={viewing.kind}
          onClose={() => setViewing(null)}
          onAccept={() => respond(viewing.requestId, 'accept')}
          onDecline={() => respond(viewing.requestId, 'decline')}
          onCancel={() => cancel(viewing.requestId)}
        />
      )}
    </div>
  );
}
