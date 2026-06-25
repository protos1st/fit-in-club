import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import fitinLogo from '../assets/fitin-logo-green.png';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(d) {
  const date = new Date(d);
  return `${DAYS_SHORT[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: accent + '18', color: accent }}>
        {icon}
      </div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

function MiniBar({ data, maxVal, color }) {
  return (
    <div className="admin-minibar-row">
      {data.map((d, i) => (
        <div key={i} className="admin-minibar-col">
          <div
            className="admin-minibar-bar"
            style={{
              height: `${maxVal > 0 ? (d.count / maxVal) * 100 : 0}%`,
              background: color
            }}
            title={`${d.label}: ${d.count}`}
          />
          <span className="admin-minibar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data, color, label }) {
  if (!data || data.length === 0) return <div className="admin-empty">No data yet</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - (d.count / max) * 100;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="admin-trend">
      <div className="admin-trend-header">
        <span className="admin-trend-label">{label}</span>
        <span className="admin-trend-total">{data.reduce((s, d) => s + d.count, 0)} total</span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="admin-trend-svg">
        <polygon points={areaPoints} fill={color} fillOpacity="0.1" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="admin-trend-dates">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

function DonutChart({ data, colors }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div className="admin-empty">No data</div>;
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = d.count / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, color: colors[i % colors.length] };
  });

  const size = 120;
  const cx = size / 2, cy = size / 2, r = 44, strokeW = 16;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="admin-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="admin-donut-svg">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${seg.pct * circumference} ${circumference}`}
            strokeDashoffset={-seg.start * circumference}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="admin-donut-total">{total}</text>
      </svg>
      <div className="admin-donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="admin-donut-legend-item">
            <span className="admin-donut-dot" style={{ background: seg.color }} />
            <span className="admin-donut-name">{seg.type || seg.gender}</span>
            <span className="admin-donut-count">{seg.count}</span>
          </div>
        ))}
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
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin password"
            className="admin-login-input"
            autoFocus
          />
          {error && <div className="admin-login-error">{error}</div>}
          <button type="submit" className="btn btn-primary admin-login-btn" disabled={loading || !pw}>
            {loading ? 'Checking…' : 'Enter dashboard'}
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
  const intervalRef = useRef(null);

  function handleAuth(pw, data) {
    setPassword(pw);
    setStats(data);
  }

  useEffect(() => {
    if (!password) return;
    intervalRef.current = setInterval(() => {
      api.getAdminStats(password).then(setStats).catch(() => {});
    }, 60000);
    return () => clearInterval(intervalRef.current);
  }, [password]);

  async function refresh() {
    setRefreshing(true);
    try {
      const data = await api.getAdminStats(password);
      setStats(data);
    } catch { /* ignore */ }
    setRefreshing(false);
  }

  if (!password) return <LoginGate onAuth={handleAuth} />;
  if (!stats) return <div className="spinner-text">Loading dashboard…</div>;

  const { overview, trends, topMembers, trainingBreakdown, genderBreakdown, peakHours, recentSignups } = stats;

  const peakData = Array.from({ length: 24 }, (_, h) => {
    const found = peakHours.find((p) => Number(p.hour) === h);
    return { label: h % 6 === 0 ? formatHour(h) : '', count: found ? found.count : 0 };
  });
  const peakMax = Math.max(...peakData.map((d) => d.count), 1);

  const trainingColors = ['#53603E', '#FBA327', '#6D412A', '#7C8A6E', '#D4922A', '#8B5E3C', '#A3B08E', '#E8B94D'];
  const genderColors = ['#53603E', '#FBA327', '#6D412A', '#999'];

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <img src={fitinLogo} alt="FitIn" className="admin-header-logo" />
          <div>
            <h1 className="admin-header-title">Dashboard</h1>
            <p className="admin-header-sub">Gym analytics overview</p>
          </div>
        </div>
        <div className="admin-header-right">
          {overview.liveNow > 0 && (
            <span className="admin-live-badge">
              <span className="pulse-dot" />{overview.liveNow} live now
            </span>
          )}
          <button className="btn btn-outline btn-sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="admin-stats-grid">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
          label="Total members"
          value={overview.totalUsers}
          accent="#53603E"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
          label="Active this week"
          value={overview.activeThisWeek}
          sub={overview.totalUsers > 0 ? `${Math.round((overview.activeThisWeek / overview.totalUsers) * 100)}% of members` : ''}
          accent="#FBA327"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
          label="Buddy connections"
          value={overview.totalConnections}
          accent="#53603E"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
          label="Messages sent"
          value={overview.totalMessages}
          accent="#6D412A"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h2 className="admin-card-title">New signups</h2>
          <TrendChart data={trends.signups} color="#53603E" label="Last 30 days" />
        </div>
        <div className="admin-card">
          <h2 className="admin-card-title">Check-ins</h2>
          <TrendChart data={trends.checkins} color="#FBA327" label="Last 30 days" />
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h2 className="admin-card-title">Messages</h2>
          <TrendChart data={trends.messages} color="#6D412A" label="Last 30 days" />
        </div>
        <div className="admin-card">
          <h2 className="admin-card-title">Peak hours</h2>
          <MiniBar data={peakData} maxVal={peakMax} color="#FBA327" />
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h2 className="admin-card-title">Training types</h2>
          <DonutChart data={trainingBreakdown} colors={trainingColors} />
        </div>
        <div className="admin-card">
          <h2 className="admin-card-title">Gender split</h2>
          <DonutChart data={genderBreakdown} colors={genderColors} />
        </div>
      </div>

      <div className="admin-card admin-full">
        <h2 className="admin-card-title">Top members this month</h2>
        {topMembers.length === 0 ? (
          <div className="admin-empty">No check-ins yet</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Training</th>
                  <th>Check-ins</th>
                  <th>Consistency</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((m, i) => (
                  <tr key={m.id}>
                    <td><span className="admin-rank">{i + 1}</span></td>
                    <td className="admin-member-name">{m.name}</td>
                    <td>{m.training_type || '—'}</td>
                    <td className="admin-checkin-count">{m.checkins}</td>
                    <td>
                      <div className="admin-bar-bg">
                        <div
                          className="admin-bar-fill"
                          style={{ width: `${(m.checkins / topMembers[0].checkins) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card admin-full">
        <h2 className="admin-card-title">Recent signups</h2>
        {recentSignups.length === 0 ? (
          <div className="admin-empty">No members yet</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Training</th>
                  <th>Gender</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-member-name">{u.name}</td>
                    <td className="admin-email">{u.email}</td>
                    <td>{u.training_type || '—'}</td>
                    <td>{u.gender || '—'}</td>
                    <td className="admin-date">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {overview.totalReports > 0 && (
        <div className="admin-alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{overview.totalReports} report{overview.totalReports !== 1 ? 's' : ''} submitted — review flagged users</span>
        </div>
      )}
    </div>
  );
}
