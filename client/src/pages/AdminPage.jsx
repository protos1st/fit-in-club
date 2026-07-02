import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import fitinLogo from '../assets/fitin-logo-green.png';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NAV_SECTIONS = [
  {
    id: 'overview', label: 'Overview',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    id: 'trends', label: 'Trends',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  },
  {
    id: 'community', label: 'Community',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    id: 'members', label: 'Members',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
];

function SectionHead({ kicker, title, sub }) {
  return (
    <div className="ad-sec-head">
      <div>
        <div className="ad-sec-kicker">{kicker}</div>
        <h2 className="ad-sec-title">{title}</h2>
      </div>
      {sub && <span className="ad-sec-sub">{sub}</span>}
    </div>
  );
}

function formatDate(d) {
  const date = new Date(d);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}
function formatHour(h) {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return val;
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function StatCard({ icon, label, value, delta, sub, color, index }) {
  const animVal = useCountUp(value);
  return (
    <div className="ad-stat" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="ad-stat-top">
        <div className="ad-stat-icon" style={{ background: color + '15', color }}>{icon}</div>
        {delta !== undefined && delta !== null && (
          <span className={`ad-delta ${delta >= 0 ? 'up' : 'down'}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              {delta >= 0
                ? <path d="M5 1L9 6H1z" />
                : <path d="M5 9L1 4h8z" />}
            </svg>
            {delta >= 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <div className="ad-stat-val">{fmtNum(animVal)}</div>
      <div className="ad-stat-label">{label}</div>
      {sub && <div className="ad-stat-sub">{sub}</div>}
    </div>
  );
}

function Sparkline({ data, color, height = 32 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 100, h = height;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.count / max) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

function fillDays(data, days = 30) {
  const map = {};
  data.forEach(d => { map[d.date?.slice(0, 10)] = d.count; });
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map[key] || 0 });
  }
  return result;
}

function TrendCard({ title, data, color }) {
  const [tooltip, setTooltip] = useState(null);
  const filled = fillDays(data || []);
  const total = filled.reduce((s, d) => s + d.count, 0);

  const max = Math.max(...filled.map(d => d.count), 1);
  const w = 400, h = 120;
  const pts = filled.map((d, i) => {
    const x = (i / Math.max(filled.length - 1, 1)) * w;
    const y = h - (d.count / max) * (h - 20) - 10;
    return `${x},${y}`;
  });

  return (
    <div className="ad-card">
      <div className="ad-card-head">
        <h3>{title}</h3>
        <span className="ad-card-metric">{total}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="ad-chart-svg">
          <defs>
            <linearGradient id={`tg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#tg-${color.replace('#','')})`} />
          <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          {filled.map((d, i) => {
            const x = (i / Math.max(filled.length - 1, 1)) * w;
            const y = h - (d.count / max) * (h - 20) - 10;
            const pctX = (x / w) * 100;
            const pctY = (y / h) * 100;
            return (
              <g key={i}
                onMouseEnter={() => setTooltip({ i, pctX, pctY, date: d.date, count: d.count })}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={() => setTooltip(t => t?.i === i ? null : { i, pctX, pctY, date: d.date, count: d.count })}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={x} cy={y} r="14" fill="transparent" />
                <circle cx={x} cy={y} r={tooltip?.i === i ? 5 : 3} fill="var(--color-card)" stroke={color} strokeWidth="2" className="ad-dot" />
              </g>
            );
          })}
        </svg>
        {tooltip && (
          <div className="ad-tooltip" style={{
            left: `clamp(4px, calc(${tooltip.pctX}% - 44px), calc(100% - 92px))`,
            top: tooltip.pctY < 40 ? '28%' : '2px',
          }}>
            <div className="ad-tooltip-date">{formatDate(tooltip.date)}</div>
            <div className="ad-tooltip-val">{tooltip.count}</div>
          </div>
        )}
      </div>
      <div className="ad-chart-axis">
        <span>{formatDate(filled[0].date)}</span>
        <span>{formatDate(filled[Math.floor(filled.length / 2)].date)}</span>
        <span>{formatDate(filled[filled.length - 1].date)}</span>
      </div>
    </div>
  );
}

function FunnelChart({ funnel }) {
  const steps = [
    { label: 'Signed up', value: funnel.signedUp, color: '#53603E' },
    { label: 'Set schedule', value: funnel.scheduled, color: '#7C8A6E' },
    { label: 'Checked in', value: funnel.checkedIn, color: '#FBA327' },
    { label: 'Connected', value: funnel.connected, color: '#D4922A' },
    { label: 'Messaged', value: funnel.messaged, color: '#6D412A' },
  ];
  const max = Math.max(steps[0].value, 1);

  return (
    <div className="ad-card">
      <div className="ad-card-head"><h3>Engagement funnel</h3></div>
      <div className="ad-funnel">
        {steps.map((s, i) => {
          const pct = max > 0 ? (s.value / max) * 100 : 0;
          const convRate = i > 0 && steps[i - 1].value > 0
            ? Math.round((s.value / steps[i - 1].value) * 100) : null;
          return (
            <div key={i} className="ad-funnel-step">
              <div className="ad-funnel-label">
                <span>{s.label}</span>
                <span className="ad-funnel-val">{s.value}</span>
              </div>
              <div className="ad-funnel-bar-bg">
                <div className="ad-funnel-bar" style={{ width: `${Math.max(pct, 3)}%`, background: s.color }} />
              </div>
              {convRate !== null && (
                <span className="ad-funnel-rate">{convRate}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Heatmap({ data }) {
  const today = new Date();
  const days = 30;
  const grid = [];
  const dateMap = {};
  data.forEach(d => { dateMap[new Date(d.date).toISOString().slice(0, 10)] = d.count; });

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    grid.push({ date: key, count: dateMap[key] || 0, day: date.getDay() });
  }
  const max = Math.max(...grid.map(g => g.count), 1);

  function intensity(count) {
    if (count === 0) return 'var(--color-line)';
    const level = Math.ceil((count / max) * 4);
    const colors = ['#c6d5a0', '#9ab86b', '#6d9b37', '#4a7c1b'];
    return colors[Math.min(level - 1, 3)];
  }

  const weeks = [];
  let week = [];
  grid.forEach((g, i) => {
    week.push(g);
    if (week.length === 7 || i === grid.length - 1) {
      weeks.push(week);
      week = [];
    }
  });

  return (
    <div className="ad-card">
      <div className="ad-card-head"><h3>Check-in activity</h3><span className="ad-card-sub">Last 30 days</span></div>
      <div className="ad-heatmap">
        {weeks.map((w, wi) => (
          <div key={wi} className="ad-heatmap-week">
            {w.map((d, di) => (
              <div
                key={di}
                className="ad-heatmap-cell"
                style={{ background: intensity(d.count) }}
                title={`${d.date}: ${d.count} check-in${d.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="ad-heatmap-legend">
        <span>Less</span>
        <div className="ad-heatmap-cell" style={{ background: 'var(--color-line)' }} />
        <div className="ad-heatmap-cell" style={{ background: '#c6d5a0' }} />
        <div className="ad-heatmap-cell" style={{ background: '#9ab86b' }} />
        <div className="ad-heatmap-cell" style={{ background: '#6d9b37' }} />
        <div className="ad-heatmap-cell" style={{ background: '#4a7c1b' }} />
        <span>More</span>
      </div>
    </div>
  );
}

function PeakHours({ data }) {
  const hours = Array.from({ length: 24 }, (_, h) => {
    const found = data.find(p => Number(p.hour) === h);
    return { hour: h, count: found ? found.count : 0 };
  });
  const max = Math.max(...hours.map(h => h.count), 1);

  return (
    <div className="ad-card">
      <div className="ad-card-head"><h3>Peak hours</h3></div>
      <div className="ad-peak">
        {hours.map((h, i) => (
          <div key={i} className="ad-peak-col" title={`${formatHour(h.hour)}: ${h.count}`}>
            <div className="ad-peak-bar-wrap">
              <div
                className="ad-peak-bar"
                style={{
                  height: `${max > 0 ? (h.count / max) * 100 : 0}%`,
                  background: h.count === max && h.count > 0 ? '#FBA327' : '#53603E',
                  opacity: h.count === 0 ? 0.15 : 0.4 + (h.count / max) * 0.6
                }}
              />
            </div>
            {h.hour % 4 === 0 && <span className="ad-peak-label">{formatHour(h.hour)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ title, data, colors }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div className="ad-card"><div className="ad-card-head"><h3>{title}</h3></div><div className="ad-empty">No data</div></div>;
  let cum = 0;
  const segs = data.map((d, i) => {
    const pct = d.count / total;
    const start = cum;
    cum += pct;
    return { ...d, pct, start, color: colors[i % colors.length] };
  });
  const r = 42, sw = 14, circ = 2 * Math.PI * r;

  return (
    <div className="ad-card">
      <div className="ad-card-head"><h3>{title}</h3></div>
      <div className="ad-donut-wrap">
        <svg width="110" height="110" viewBox="0 0 110 110">
          {segs.map((s, i) => (
            <circle key={i} cx="55" cy="55" r={r} fill="none" stroke={s.color} strokeWidth={sw}
              strokeDasharray={`${s.pct * circ} ${circ}`}
              strokeDashoffset={-s.start * circ}
              transform="rotate(-90 55 55)"
              className="ad-donut-seg" />
          ))}
          <text x="55" y="55" textAnchor="middle" dominantBaseline="central" className="ad-donut-total">{total}</text>
        </svg>
        <div className="ad-donut-list">
          {segs.map((s, i) => (
            <div key={i} className="ad-donut-item">
              <span className="ad-donut-dot" style={{ background: s.color }} />
              <span className="ad-donut-name">{s.type || s.gender}</span>
              <span className="ad-donut-pct">{Math.round(s.pct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberModal({ member, onClose, adminPassword }) {
  if (!member) return null;
  const joined = new Date(member.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const [resetPw, setResetPw] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);

  async function handleReset() {
    if (resetPw.length < 8) { setResetMsg({ type: 'error', text: 'Min 8 characters' }); return; }
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ userId: member.id, newPassword: resetPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetMsg({ type: 'success', text: `Password reset. Tell ${member.name.split(' ')[0]} their new password.` });
      setResetPw('');
    } catch (err) {
      setResetMsg({ type: 'error', text: err.message });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ad-member-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="ad-member-top">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="ad-member-avatar ad-avatar-img" />
          ) : (
            <div className="ad-member-avatar">
              {member.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )}
          <h2 className="ad-member-name">{member.name}</h2>
          {member.is_live && <span className="ad-member-live-tag"><span className="pulse-dot" />At gym now</span>}
        </div>
        {member.bio && <p className="ad-member-bio">{member.bio}</p>}
        <div className="ad-member-grid">
          <div className="ad-member-field"><span className="ad-member-label">Email</span><span className="ad-member-val">{member.email}</span></div>
          <div className="ad-member-field"><span className="ad-member-label">Gender</span><span className="ad-member-val">{member.gender || 'Not set'}</span></div>
          <div className="ad-member-field"><span className="ad-member-label">Training</span><span className="ad-member-val">{member.training_type || 'Not set'}</span></div>
          <div className="ad-member-field"><span className="ad-member-label">Joined</span><span className="ad-member-val">{joined}</span></div>
        </div>
        <div className="ad-member-stats">
          <div className="ad-member-stat"><span className="ad-member-stat-val">{member.total_checkins}</span><span className="ad-member-stat-label">Check-ins</span></div>
          <div className="ad-member-stat"><span className="ad-member-stat-val">{member.connections}</span><span className="ad-member-stat-label">Connections</span></div>
          <div className="ad-member-stat"><span className="ad-member-stat-val">{member.messages_sent}</span><span className="ad-member-stat-label">Messages</span></div>
        </div>

        <div className="ad-reset-section">
          <div className="ad-reset-label">Reset password</div>
          <div className="ad-reset-row">
            <input
              type="text"
              value={resetPw}
              onChange={e => setResetPw(e.target.value)}
              placeholder="New temporary password"
              className="ad-reset-input"
              maxLength={64}
            />
            <button className="ad-reset-btn" onClick={handleReset} disabled={resetting || !resetPw}>
              {resetting ? '…' : 'Reset'}
            </button>
          </div>
          {resetMsg && <div className={`ad-reset-msg ad-reset-msg-${resetMsg.type}`}>{resetMsg.text}</div>}
        </div>
      </div>
    </div>
  );
}

function LiveMembersCard({ liveMembers, onSelect }) {
  if (!liveMembers || liveMembers.length === 0) return null;
  return (
    <div className="ad-card ad-full ad-live-card">
      <div className="ad-card-head">
        <h3><span className="pulse-dot" />Live at gym now</h3>
        <span className="ad-card-sub">{liveMembers.length} member{liveMembers.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="ad-live-list">
        {liveMembers.map(m => {
          const mins = Math.max(0, Math.round((new Date(m.expires_at) - Date.now()) / 60000));
          return (
            <div key={m.id} className="ad-live-member" onClick={() => onSelect(m.id)}>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.name} className="ad-live-avatar ad-avatar-img" />
              ) : (
                <div className="ad-live-avatar">{m.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}</div>
              )}
              <div className="ad-live-info">
                <div className="ad-live-name">{m.name}</div>
                <div className="ad-live-meta">
                  {m.status_tag && <span>{m.status_tag} · </span>}
                  {mins > 0 ? `${mins}m left` : 'Expiring soon'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoginGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminStats(pw);
      onAuth(pw, data);
    } catch {
      setError('Invalid admin password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <img src={fitinLogo} alt="FitIn" className="admin-login-logo" />
        <h1 className="admin-login-title">Admin dashboard</h1>
        <p className="admin-login-sub">Enter the admin password to view analytics.</p>
        <form onSubmit={handleSubmit}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Admin password" className="admin-login-input" autoFocus />
          {error && <div className="admin-login-error">{error}</div>}
          <button type="submit" className="btn btn-primary admin-login-btn" disabled={loading || !pw}>
            {loading ? 'Checking...' : 'Enter dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  function handleAuth(pw, data) { setPassword(pw); setStats(data); setLastUpdated(new Date()); }

  useEffect(() => {
    if (!stats) return;
    const sections = document.querySelectorAll('[data-adsection]');
    if (!sections.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.dataset.adsection); });
    }, { rootMargin: '-25% 0px -65% 0px' });
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [stats]);

  useEffect(() => {
    if (!password) return;
    const interval = setInterval(() => {
      api.getAdminStats(password).then(d => { setStats(d); setLastUpdated(new Date()); }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [password]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { const d = await api.getAdminStats(password); setStats(d); setLastUpdated(new Date()); } catch {}
    setRefreshing(false);
  }, [password]);

  if (!password) return <LoginGate onAuth={handleAuth} />;
  if (!stats) return <div className="spinner-text">Loading dashboard...</div>;

  const { overview, trends, topMembers, trainingBreakdown, genderBreakdown, peakHours, recentSignups, funnel, heatmap, weeklyDelta, liveMembers, allMembers } = stats;

  function selectMemberById(id) {
    const member = (allMembers || []).find(m => m.id === id);
    if (member) setSelectedMember(member);
  }

  const filteredMembers = (allMembers || []).filter(m =>
    !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );
  const trainingColors = ['#53603E', '#FBA327', '#6D412A', '#7C8A6E', '#D4922A', '#8B5E3C', '#A3B08E', '#E8B94D'];
  const genderColors = ['#53603E', '#FBA327', '#6D412A', '#999'];

  const icons = {
    users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    active: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    connect: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
    msg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  };

  function scrollToSection(id) {
    document.getElementById(`ad-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="ad-page">
      <aside className="ad-side">
        <div className="ad-side-brand">
          <div className="ad-side-logo-chip"><img src={fitinLogo} alt="FitIn" /></div>
          <div>
            <div className="ad-side-name">FitIn Club</div>
            <div className="ad-side-role">Admin console</div>
          </div>
        </div>
        <nav className="ad-side-nav">
          {NAV_SECTIONS.map(n => (
            <button key={n.id} className={`ad-side-link ${activeSection === n.id ? 'active' : ''}`} onClick={() => scrollToSection(n.id)}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="ad-side-foot">
          {overview.liveNow > 0 && (
            <div className="ad-side-live"><span className="pulse-dot" />{overview.liveNow} at gym now</div>
          )}
          <button className="ad-side-logout" onClick={() => setPassword(null)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log out
          </button>
        </div>
      </aside>

      <div className="ad-main">
      <header className="ad-header">
        <div className="ad-header-left">
          <img src={fitinLogo} alt="FitIn" className="ad-header-logo" />
          <div>
            <h1 className="ad-header-title">Dashboard</h1>
            <p className="ad-header-sub">
              {todayStr}{lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <div className="ad-header-right">
          {overview.liveNow > 0 && (
            <span className="ad-live"><span className="pulse-dot" />{overview.liveNow} at gym now</span>
          )}
          {overview.totalReports > 0 && (
            <span className="ad-reports-badge">{overview.totalReports} report{overview.totalReports !== 1 ? 's' : ''}</span>
          )}
          <button className="btn btn-outline btn-sm ad-refresh" onClick={refresh} disabled={refreshing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={refreshing ? 'ad-spin' : ''}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
          <button className="btn btn-ghost btn-sm ad-logout" onClick={() => setPassword(null)} title="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      <div className="ad-content">
      <section id="ad-overview" data-adsection="overview" className="ad-section">
      <SectionHead kicker="Pulse" title="Overview" sub={todayStr} />
      <div className="ad-stats">
        <StatCard icon={icons.users} label="Total members" value={overview.totalUsers} delta={weeklyDelta.newUsers} color="#53603E" index={0} />
        <StatCard icon={icons.active} label="Active this week" value={overview.activeThisWeek}
          sub={overview.totalUsers > 0 ? `${Math.round((overview.activeThisWeek / overview.totalUsers) * 100)}% engagement` : ''} color="#FBA327" index={1} />
        <StatCard icon={icons.connect} label="Connections" value={overview.totalConnections} delta={weeklyDelta.newConnections} color="#53603E" index={2} />
        <StatCard icon={icons.msg} label="Messages" value={overview.totalMessages} delta={weeklyDelta.newMessages} color="#6D412A" index={3} />
      </div>

      <LiveMembersCard liveMembers={liveMembers} onSelect={selectMemberById} />
      </section>

      <section id="ad-trends" data-adsection="trends" className="ad-section">
      <SectionHead kicker="Analytics" title="Trends" sub="Last 30 days" />
      <div className="ad-row-2">
        <TrendCard title="New signups" data={trends.signups} color="#53603E" />
        <TrendCard title="Check-ins" data={trends.checkins} color="#FBA327" />
      </div>

      <div className="ad-row-2">
        <TrendCard title="Messages" data={trends.messages} color="#6D412A" />
        <PeakHours data={peakHours} />
      </div>
      </section>

      <section id="ad-community" data-adsection="community" className="ad-section">
      <SectionHead kicker="Engagement" title="Community" />
      <div className="ad-row-2">
        <FunnelChart funnel={funnel} />
        <Heatmap data={heatmap} />
      </div>

      <div className="ad-row-2">
        <DonutChart title="Training types" data={trainingBreakdown} colors={trainingColors} />
        <DonutChart title="Gender split" data={genderBreakdown} colors={genderColors} />
      </div>
      </section>

      <section id="ad-members" data-adsection="members" className="ad-section">
      <SectionHead kicker="Directory" title="Members" sub={`${(allMembers || []).length} total`} />
      <div className="ad-card ad-full">
        <div className="ad-card-head"><h3>Top members</h3><span className="ad-card-sub">Last 30 days</span></div>
        {topMembers.length === 0 ? <div className="ad-empty">No check-ins yet</div> : (
          <div className="ad-tbl-wrap">
            <table className="ad-tbl">
              <thead><tr><th>#</th><th>Name</th><th>Training</th><th>Check-ins</th><th>Consistency</th></tr></thead>
              <tbody>
                {topMembers.map((m, i) => (
                  <tr key={m.id} className="ad-clickable" onClick={() => selectMemberById(m.id)}>
                    <td><span className={`ad-rank ${i < 3 ? `ad-rank-${i+1}` : ''}`}>{i + 1}</span></td>
                    <td className="ad-name">{m.name}</td>
                    <td className="ad-meta">{m.training_type || '—'}</td>
                    <td className="ad-bold">{m.checkins}</td>
                    <td><div className="ad-bar-bg"><div className="ad-bar-fill" style={{ width: `${(m.checkins / topMembers[0].checkins) * 100}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ad-card ad-full">
        <div className="ad-card-head">
          <h3>All members</h3>
          <span className="ad-card-sub">{(allMembers || []).length} total</span>
        </div>
        <div className="ad-member-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members..." className="ad-member-search-input" />
        </div>
        {filteredMembers.length === 0 ? <div className="ad-empty">No members found</div> : (
          <div className="ad-tbl-wrap">
            <table className="ad-tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Training</th><th>Check-ins</th><th>Connections</th><th>Status</th></tr></thead>
              <tbody>
                {filteredMembers.map(u => (
                  <tr key={u.id} className="ad-clickable" onClick={() => setSelectedMember(u)}>
                    <td className="ad-name">
                      <span className="ad-name-cell">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="ad-tbl-avatar ad-avatar-img" />
                        ) : (
                          <span className="ad-tbl-avatar">{u.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}</span>
                        )}
                        {u.name}
                      </span>
                    </td>
                    <td className="ad-meta">{u.email}</td>
                    <td className="ad-meta">{u.training_type || '—'}</td>
                    <td className="ad-bold">{u.total_checkins}</td>
                    <td className="ad-meta">{u.connections}</td>
                    <td>{u.is_live ? <span className="ad-status-live"><span className="pulse-dot" />Live</span> : <span className="ad-status-off">Offline</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </section>

      {selectedMember && <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} adminPassword={password} />}
      </div>
      </div>
    </div>
  );
}
