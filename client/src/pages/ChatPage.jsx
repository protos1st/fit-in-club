import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useSocket } from '../lib/SocketContext';
import { useToast } from '../lib/ToastContext';

export default function ChatPage() {
  const { userId } = useParams();
  const otherId = Number(userId);
  const { user } = useAuth();
  const socketCtx = useSocket();
  const navigate = useNavigate();
  const showToast = useToast();

  const [messages, setMessages] = useState([]);
  const [otherName, setOtherName] = useState('');
  const [otherProfile, setOtherProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const bottomRef = useRef(null);

  function load() {
    api.getMessages(otherId)
      .then((data) => setMessages(data.messages))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    api.getConnections().then((data) => {
      const conn = (data.connections || []).find((c) => c.user_id === otherId);
      if (conn) {
        setOtherName(conn.name);
        setOtherProfile(conn);
      }
    });
  }

  useEffect(() => { load(); }, [otherId]);

  useEffect(() => {
    if (socketCtx?.lastMessage) {
      const m = socketCtx.lastMessage;
      if (m.from_user_id === otherId || m.to_user_id === otherId) {
        setMessages((prev) => [...prev, m]);
      }
    }
  }, [socketCtx?.lastMessage, otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const data = await api.sendMessage(otherId, text);
      setMessages((prev) => [...prev, data.message]);
      setText('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleBlock() {
    if (!confirm(`Block ${otherName}? They won't be able to message you or see you.`)) return;
    try {
      await api.blockUser(otherId);
      showToast(`${otherName} blocked`, 'info');
      navigate('/connections');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleReport() {
    try {
      await api.reportUser(otherId, reportReason);
      showToast('Report submitted. We will review it.', 'success');
      setReportOpen(false);
      setReportReason('');
      setMenuOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <div className="spinner-text">Loading conversation…</div>;

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-title">Can't open this chat</div>
          <p>{error}</p>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/connections')}>Back to Messages</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate('/connections')} aria-label="Back to messages">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="chat-header-name chat-header-name-tap" onClick={() => otherProfile && setProfileOpen(true)}>{otherName || 'Conversation'}</h1>
        <div className="chat-menu-wrap">
          <button className="chat-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Chat options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>
          </button>
          {menuOpen && (
            <div className="chat-menu-dropdown">
              <button onClick={() => { setReportOpen(true); setMenuOpen(false); }}>Report</button>
              <button className="chat-menu-danger" onClick={handleBlock}>Block</button>
            </div>
          )}
        </div>
      </div>

      {reportOpen && (
        <div className="report-bar">
          <p className="report-label">Why are you reporting this person?</p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Describe the issue (optional)"
            rows={2}
            maxLength={1000}
          />
          <div className="report-actions">
            <button className="btn btn-primary btn-sm" onClick={handleReport}>Submit report</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setReportOpen(false); setReportReason(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {profileOpen && otherProfile && (
        <div className="chat-profile-peek">
          <div className="chat-profile-header">
            <div className="chat-profile-avatar">
              {otherProfile.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="chat-profile-name">{otherProfile.name}</div>
              {otherProfile.training_type && <span className="tag">{otherProfile.training_type}</span>}
              {otherProfile.gender && otherProfile.gender !== 'Prefer not to say' && (
                <span className="tag" style={{ marginLeft: 4 }}>{otherProfile.gender}</span>
              )}
            </div>
            <button className="chat-profile-close" onClick={() => setProfileOpen(false)} aria-label="Close profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {otherProfile.bio && <p className="chat-profile-bio">{otherProfile.bio}</p>}
        </div>
      )}

      <div className="chat-window">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>No messages yet. Say hello!</p>
            </div>
          )}
          {messages.map((m) => {
            const mine = m.from_user_id === user.id;
            return (
              <div key={m.id} className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}>
                {m.body}
                <div className="chat-time">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {mine && <span className="chat-read-status">{m.read_at ? ' ✓✓' : ' ✓'}</span>}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)}
          />
          <button type="submit" className="btn btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
}
