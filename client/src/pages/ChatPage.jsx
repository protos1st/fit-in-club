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
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  function load() {
    api.getMessages(otherId)
      .then((data) => setMessages(data.messages))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    api.getConnections().then((data) => {
      const conn = (data.connections || []).find((c) => c.user_id === otherId);
      if (conn) setOtherName(conn.name);
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
    <div>
      <div className="page-eyebrow">Chat</div>
      <h1 className="page-title">{otherName || 'Conversation'}</h1>

      <div className="card chat-window">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>No messages yet. Say hello 👋</p>
            </div>
          )}
          {messages.map((m) => {
            const mine = m.from_user_id === user.id;
            return (
              <div key={m.id} className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}>
                {m.body}
                <div className="chat-time">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          />
          <button type="submit" className="btn btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
}
