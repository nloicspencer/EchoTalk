import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

const ONGLETS = [
  { path: '/', label: 'Fil', icon: 'ti-home' },
  { path: '/decouverte', label: 'Découverte', icon: 'ti-compass' },
  { path: '/profil', label: 'EchoProfil', icon: 'ti-user-circle' },
  { path: '/identite', label: 'Identité', icon: 'ti-feather' },
];

export default function NavBar() {
  const { pathname } = useLocation();

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
    </nav>
  );
}
