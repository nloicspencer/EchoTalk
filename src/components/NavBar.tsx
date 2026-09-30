import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompteurNotificationsNonLues } from '../hooks/useNotifications';
import './NavBar.css';

const ONGLETS = [
  { path: '/', label: 'Fil', icon: 'ti-home' },
  { path: '/decouverte', label: 'Découverte', icon: 'ti-compass' },
  { path: '/profil', label: 'EchoProfil', icon: 'ti-user-circle' },
  { path: '/identite', label: 'Identité', icon: 'ti-feather' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  // Compteur léger, en direct — juste le nombre de non-lues, pas la liste
  // complète des notifications (voir useNotifications.ts).
  const nonLues = useCompteurNotificationsNonLues(profile?.uid);

  return (
    <nav className="navbar">
      {ONGLETS.map((o) => (
        <Link
          key={o.path}
          to={o.path}
          className={`nav-item ${pathname === o.path ? 'active' : ''}`}
        >
          <span className="nav-icon">
            <i className={`ti ${o.icon}`} aria-hidden="true" />
          </span>
          <span className="nav-label">{o.label}</span>
        </Link>
      ))}
      <Link
        to="/notifications"
        className={`nav-item ${pathname === '/notifications' ? 'active' : ''}`}
      >
        <span className="nav-icon">
          <i className="ti ti-bell" aria-hidden="true" />
          {nonLues > 0 && <span className="nav-badge" aria-hidden="true" />}
        </span>
        <span className="nav-label">Notifs</span>
      </Link>
    </nav>
  );
}
