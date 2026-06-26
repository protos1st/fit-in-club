import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useSocket } from '../lib/SocketContext';
import { useToast } from '../lib/ToastContext';

const STARTERS = [
  "Hey! When do you usually train?",
  "Want to work out together sometime?",
  "What's your routine like?",
  "Looking for a gym buddy!"
];

function formatDateLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function groupByDate(messages) {
  const groups = [];
  let currentDate = null;
  for (const m of messages) {
    const dateStr = new Date(m.created_at).toDateString();
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groups.push({ type: 'date', label: formatDateLabel(m.created_at), key: `date-${dateStr}` });
    }
    groups.push({ type: 'msg', msg: m, key: `msg-${m.id}` });
  }
  return groups;
}

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
  const [selectedMsg, setSelectedMsg] = useState(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const isTyping = socketCtx?.typingUsers?.has(otherId);

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
    if (socketCtx?.deletedMessageId?.id) {
      setMessages(prev => prev.filter(m => m.id !== socketCtx.deletedMessageId.id));
    }
  }, [socketCtx?.deletedMessageId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    if (socketCtx?.emitTyping) {
      socketCtx.emitTyping(otherId, true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketCtx.emitTyping(otherId, false);
      }, 2000);
    }
  }, [otherId, socketCtx]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      if (socketCtx?.emitTyping) socketCtx.emitTyping(otherId, false);
      const data = await api.sendMessage(otherId, text);
      setMessages((prev) => [...prev, data.message]);
      setText('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function sendStarter(msg) {
    setText(msg);
  }

  async function handleDeleteMessage(msgId, mode = 'me') {
    try {
      await api.deleteMessage(msgId, mode);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setSelectedMsg(null);
      showToast(mode === 'everyone' ? 'Deleted for everyone' : 'Message deleted', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function canDeleteForEveryone(msg) {
    if (msg.from_user_id !== user.id) return false;
    const mins = (Date.now() - new Date(msg.created_at).getTime()) / 60000;
    return mins <= 15;
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

  async function handleDisconnect() {
    if (!confirm(`Disconnect from ${otherName}? You won't be able to message each other. They can send a new request.`)) return;
    try {
      await api.disconnectBuddy(otherId);
      showToast(`Disconnected from ${otherName}`, 'info');
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

  const grouped = groupByDate(messages);

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate('/connections')} aria-label="Back to messages">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="chat-header-info" onClick={() => otherProfile && setProfileOpen(true)}>
          <h1 className="chat-header-name chat-header-name-tap">{otherName || 'Conversation'}</h1>
          {isTyping && <span className="chat-typing-indicator">typing...</span>}
        </div>
        <div className="chat-menu-wrap">
          <button className="chat-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Chat options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg>
          </button>
          {menuOpen && (
            <div className="chat-menu-dropdown">
              <button onClick={() => { setReportOpen(true); setMenuOpen(false); }}>Report</button>
              <button onClick={() => { setMenuOpen(false); handleDisconnect(); }}>Disconnect</button>
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
            <div className="chat-starter">
              <p className="chat-starter-text">No messages yet. Break the ice!</p>
              <div className="chat-starter-chips">
                {STARTERS.map((s, i) => (
                  <button key={i} className="chat-starter-chip" onClick={() => sendStarter(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {grouped.map((item) => {
            if (item.type === 'date') {
              return <div key={item.key} className="chat-date-sep"><span>{item.label}</span></div>;
            }
            const m = item.msg;
            const mine = m.from_user_id === user.id;
            return (
              <div
                key={item.key}
                className={`chat-bubble ${mine ? 'mine' : 'theirs'} ${selectedMsg === m.id ? 'chat-bubble-selected' : ''}`}
                onClick={() => setSelectedMsg(selectedMsg === m.id ? null : m.id)}
              >
                {m.body}
                <div className="chat-time">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {mine && <span className="chat-read-status">{m.read_at ? ' ✓✓' : ' ✓'}</span>}
                </div>
                {selectedMsg === m.id && (
                  <div className="chat-delete-menu" onClick={(e) => e.stopPropagation()}>
                    <button className="chat-delete-btn" onClick={() => handleDeleteMessage(m.id, 'me')}>Delete for me</button>
                    {canDeleteForEveryone(m) && (
                      <button className="chat-delete-btn chat-delete-everyone" onClick={() => handleDeleteMessage(m.id, 'everyone')}>Delete for everyone</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && (
            <div className="chat-bubble theirs chat-bubble-typing">
              <span className="typing-dots"><span /><span /><span /></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Type a message…"
            onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)}
          />
          <button type="submit" className="btn btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
}
