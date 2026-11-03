import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { ROLE_LABELS } from '../constants.js';

function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#f97316" />
      <path d="M6 17h10l-3 4 9-7-9-7 3 4H6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout, isManager } = useAuth();
  const { connected } = useSocket();

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <Logo className="brand-logo" />
            <span className="brand-name">Sprint<span>Board</span></span>
          </NavLink>

          <nav className="nav" aria-label="Main navigation">
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/issues">Issues</NavLink>
            {isManager && <NavLink to="/team">Team</NavLink>}
          </nav>

          <div className="topbar-user">
            <span
              className={`live-dot ${connected ? 'on' : ''}`}
              title={connected ? 'Live updates active' : 'Reconnecting…'}
              aria-hidden="true"
            />
            <div className="user-chip">
              <span className="user-avatar" aria-hidden="true">{initials}</span>
              <span className="user-name">{user?.name}</span>
              {user?.role && user.role !== 'member' && (
                <span className="role-tag">{ROLE_LABELS[user.role] || user.role}</span>
              )}
            </div>
            <button type="button" className="btn btn-small" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer className="site-footer" aria-label="Site footer">
        <div className="footer-inner">
          <div className="footer-left">
            <span>&copy; 2026 SprintBoard. All rights reserved.</span>
          </div>
          <ul className="footer-links">
            <li><a href="/projects">Projects</a></li>
            <li><a href="/issues">Issues</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
