import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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

const links = [
  { to: '/', label: 'My Schedule' },
  { to: '/find', label: 'Find Buddies' },
  { to: '/live', label: 'Live Now' },
  { to: '/requests', label: 'Requests' },
  { to: '/connections', label: 'Messages' },
  { to: '/profile', label: 'Profile' }
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const [dark, toggleTheme] = useTheme();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <a href="https://fitin.club/" target="_blank" rel="noopener noreferrer">
            <img src={fitinLogo} alt="Fit In Club" className="sidebar-logo" />
          </a>
        </div>
        <nav className="sidebar-nav">
          {links.map((l) => (
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
          <button className="sidebar-theme-toggle" onClick={toggleTheme}>{dark ? '☀ Light' : '● Dark'}</button>
          <button className="sidebar-logout" onClick={logout}>Log out</button>
        </div>
        <button className="sidebar-logout-mobile" onClick={logout}>Log out</button>
      </aside>
      <main className="app-main">
        {children}
        <footer className="powered-by">
          Powered by <a href="https://fitin.club/" target="_blank" rel="noopener noreferrer">FitIn</a>
        </footer>
      </main>
    </div>
  );
}
