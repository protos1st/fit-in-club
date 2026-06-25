import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import fitinLogo from '../assets/fitin-logo-green.png';

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

const sidebarLinks = [
  { to: '/', label: 'My Schedule' },
  { to: '/find', label: 'Find Buddies' },
  { to: '/live', label: 'Live Now' },
  { to: '/requests', label: 'Requests' },
  { to: '/connections', label: 'Messages' },
  { to: '/profile', label: 'Profile' }
];

const bottomTabs = [
  { to: '/', label: 'Schedule', icon: 'cal' },
  { to: '/find', label: 'Find', icon: 'search' },
  { to: '/live', label: 'Live', icon: 'live' },
  { to: '/connections', label: 'Messages', icon: 'chat' },
  { to: '/profile', label: 'More', icon: 'more' }
];

function TabIcon({ icon, active }) {
  const color = active ? 'var(--color-accent)' : 'var(--color-hint)';
  const size = 22;
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (icon) {
    case 'cal': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'live': return <svg {...props}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" strokeDasharray="2 3"/></svg>;
    case 'chat': return <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
    case 'more': return <svg {...props}><circle cx="12" cy="5" r="1" fill={color} stroke="none"/><circle cx="12" cy="12" r="1" fill={color} stroke="none"/><circle cx="12" cy="19" r="1" fill={color} stroke="none"/></svg>;
    default: return null;
  }
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const [dark, toggleTheme] = useTheme();
  const location = useLocation();

  const isRequestsOrChat = location.pathname === '/requests' || location.pathname.startsWith('/connections/');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <a href="https://fitin.club/" target="_blank" rel="noopener noreferrer">
            <img src={fitinLogo} alt="Fit In Club" className="sidebar-logo" />
          </a>
        </div>
        <nav className="sidebar-nav">
          {sidebarLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
              end={l.to === '/'}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">{user?.name}</div>
          <button className="sidebar-theme-toggle" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? '☀ Light' : '● Dark'}</button>
          <button className="sidebar-logout" onClick={logout} aria-label="Log out">Log out</button>
        </div>
      </aside>

      <main className="app-main">
        {children}
        <footer className="powered-by">
          Powered by <a href="https://fitin.club/" target="_blank" rel="noopener noreferrer">FitIn</a>
        </footer>
      </main>

      <nav className="bottom-bar" aria-label="Main navigation">
        {bottomTabs.map((tab) => {
          const isActive = tab.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.to);
          const isMore = tab.icon === 'more';
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`bottom-tab ${isActive ? 'bottom-tab-active' : ''}`}
              end={tab.to === '/'}
              aria-label={tab.label}
            >
              <TabIcon icon={tab.icon} active={isActive} />
              <span className="bottom-tab-label">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
