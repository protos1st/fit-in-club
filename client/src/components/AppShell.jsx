import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import fitinLogo from '../assets/fitin-logo-green.png';

const links = [
  { to: '/', label: 'My Schedule' },
  { to: '/find', label: 'Find Buddies' },
  { to: '/live', label: 'Live Now' },
  { to: '/requests', label: 'Requests' },
  { to: '/connections', label: 'Messages' }
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={fitinLogo} alt="Fit In Club" className="sidebar-logo" />
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
          <button className="sidebar-logout" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
