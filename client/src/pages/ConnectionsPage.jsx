import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSocket } from '../lib/SocketContext';
import { initials, timeAgo } from '../lib/utils';

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [conversations, setConversations] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
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

  const totalUnread = useMemo(() => {
    return Object.values(conversations).reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [conversations]);

  const filtered = useMemo(() => {
    let result = connections.map((c) => ({
      ...c,
      conv: conversations[c.user_id] || null,
      unread: conversations[c.user_id]?.unread_count || 0
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    if (filter === 'unread') {
      result = result.filter((c) => c.unread > 0);
    }

    result.sort((a, b) => {
      if (a.unread > 0 && b.unread === 0) return -1;
      if (a.unread === 0 && b.unread > 0) return 1;
      const aTime = a.conv?.last_message?.created_at || '';
      const bTime = b.conv?.last_message?.created_at || '';
      return bTime.localeCompare(aTime);
    });

    return result;
  }, [connections, conversations, search, filter]);

  if (loading) return <div className="spinner-text">Loading your connections…</div>;

  return (
    <div>
      <div className="page-eyebrow">Your Buddies</div>
      <h1 className="page-title">Messages</h1>
      <p className="page-sub">{connections.length} connection{connections.length !== 1 ? 's' : ''}{totalUnread > 0 ? ` · ${totalUnread} unread` : ''}</p>

      {connections.length > 0 && (
        <div className="filter-bar">
          <div className="filter-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
            />
          </div>
          <div className="filter-chips">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
              aria-label="Filter messages"
            >
              <option value="all">All messages</option>
              <option value="unread">Unread{totalUnread > 0 ? ` (${totalUnread})` : ''}</option>
            </select>
          </div>
        </div>
      )}

      <div className="card">
        {connections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No connections yet</div>
            <p>Accept a buddy request to start a conversation.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No matches</div>
            <p>{filter === 'unread' ? 'No unread messages.' : 'No conversations match your search.'}</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              className={`person-row person-row-clickable ${c.unread > 0 ? 'person-row-unread' : ''}`}
              key={c.user_id}
              onClick={() => navigate(`/connections/${c.user_id}`)}
            >
              <div className="person-avatar">{initials(c.name)}</div>
              <div className="person-info">
                <div className="person-name">
                  {c.name}
                  {c.unread > 0 && <span className="badge-count">{c.unread}</span>}
                </div>
                <div className="person-meta person-meta-row">
                  <span className="msg-preview">{c.conv?.last_message ? c.conv.last_message.body : 'Say hello'}</span>
                  {c.conv?.last_message && (
                    <span className="msg-time">{timeAgo(c.conv.last_message.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
