import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSocket } from '../lib/SocketContext';

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [conversations, setConversations] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const socketCtx = useSocket();

  function load() {
    Promise.all([api.getConnections(), api.getConversations()])
      .then(([conn, conv]) => {
        setConnections(conn.connections || []);
        const map = {};
        (conv.conversations || []).forEach((c) => { map[c.user_id] = c; });
        setConversations(map);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (socketCtx?.lastMessage) load();
  }, [socketCtx?.lastMessage]);

  if (loading) return <div className="spinner-text">Loading your connections…</div>;

  return (
    <div>
      <div className="page-eyebrow">Your buddies</div>
      <h1 className="page-title">Messages</h1>
      <p className="page-sub">Chat with members you've connected with.</p>

      <div className="card">
        {connections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No connections yet</div>
            <p>Accept a buddy request to start a conversation.</p>
          </div>
        ) : (
          connections.map((c) => {
            const conv = conversations[c.user_id];
            const unread = conv?.unread_count || 0;
            return (
              <div
                className="person-row person-row-clickable"
                key={c.user_id}
                onClick={() => navigate(`/connections/${c.user_id}`)}
              >
                <div className="person-avatar">{initials(c.name)}</div>
                <div className="person-info">
                  <div className="person-name">
                    {c.name}
                    {unread > 0 && <span className="badge-count">{unread}</span>}
                  </div>
                  <div className="person-meta">
                    {conv?.last_message ? conv.last_message.body : 'Say hello 👋'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
