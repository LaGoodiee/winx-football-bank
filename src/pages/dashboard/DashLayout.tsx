import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Icon, type IconName } from '../../components/Icons';
import { api } from '../../lib/api';
import { PROFILE_TYPE_LABEL } from '../../../shared/domain';

const LINKS: { to: string; icon: IconName; label: string; end?: boolean }[] = [
  { to: '/dashboard', icon: 'home', label: 'Overview', end: true },
  { to: '/dashboard/applications', icon: 'doc', label: 'Applications' },
  { to: '/dashboard/savings', icon: 'save', label: 'Savings' },
  { to: '/dashboard/team', icon: 'card', label: 'Team' },
  { to: '/dashboard/notifications', icon: 'send', label: 'Notifications' },
];

export default function DashLayout() {
  const { user, profiles, profile, selectProfile, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    api.notifications().then((r) => setUnread(r.unread)).catch(() => undefined);
  }, [pathname]);

  const staff = user?.role === 'reviewer' || user?.role === 'admin';

  return (
    <div className="wrap dash">
      <aside className="side">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'on' : undefined)}>
            <Icon name={l.icon} />
            {l.label}
            {l.label === 'Notifications' && unread > 0 && <span className="count">{unread}</span>}
          </NavLink>
        ))}
        {staff && (
          <NavLink to="/admin">
            <Icon name="shield" />
            Staff area
          </NavLink>
        )}
        <a onClick={() => void logout()} role="button">
          <Icon name="send" />
          Log out
        </a>
      </aside>
      <div className="dm">
        {profiles.length > 1 && profile && (
          <div className="switcher">
            <label htmlFor="pf">Acting for</label>
            <select id="pf" value={profile.id} onChange={(e) => selectProfile(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({PROFILE_TYPE_LABEL[p.type]})
                </option>
              ))}
            </select>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
