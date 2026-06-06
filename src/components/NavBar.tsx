import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

const ONGLETS = [
  { path: '/', label: 'Fil', icon: '🏠' },
  { path: '/decouverte', label: 'Découverte', icon: '🔍' },
  { path: '/profil', label: 'EchoProfil', icon: '👤' },
  { path: '/identite', label: 'Identité', icon: '💡' },
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
          <span className="nav-icon">{o.icon}</span>
          <span className="nav-label">{o.label}</span>
        </Link>
      ))}
    </nav>
  );
}
