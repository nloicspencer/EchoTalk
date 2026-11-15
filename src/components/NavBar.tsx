import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompteurNotificationsNonLues } from '../hooks/useNotifications';
import './NavBar.css';

// Barre de navigation flottante (15/11/2026) : capsule détachée du bas de
// l'écran, icône + petit nom pour chaque onglet (les icônes Découverte et
// Identité ne se devinent pas seules), onglet actif mis en valeur par une
// pastille.
const ONGLETS = [
  { path: '/', label: 'Fil', icon: 'ti-home' },
  { path: '/decouverte', label: 'Découverte', icon: 'ti-compass' },
  { path: '/profil', label: 'EchoProfil', icon: 'ti-user-circle' },
  { path: '/identite', label: 'Identité', icon: 'ti-feather' },
  { path: '/notifications', label: 'Notifs', icon: 'ti-bell' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  // Compteur léger, en direct — juste le nombre de non-lues, pas la liste
  // complète des notifications (voir useNotifications.ts).
  const nonLues = useCompteurNotificationsNonLues(profile?.uid);

  return (
    <nav className="navbar" aria-label="Navigation principale">
      {ONGLETS.map((o) => {
        const actif = pathname === o.path;
        const estCloche = o.path === '/notifications';
        const libelle = estCloche && nonLues > 0
          ? `Notifications (${nonLues >= 99 ? '99 ou plus' : nonLues} non lue${nonLues > 1 ? 's' : ''})`
          : o.label;
        return (
          <Link
            key={o.path}
            to={o.path}
            className={`nav-item ${actif ? 'active' : ''}`}
            aria-label={libelle}
            aria-current={actif ? 'page' : undefined}
          >
            <span className="nav-icon">
              <i className={`ti ${o.icon}`} aria-hidden="true" />
              {estCloche && nonLues > 0 && <span className="nav-badge" aria-hidden="true" />}
            </span>
            <span className="nav-label" aria-hidden="true">{o.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
