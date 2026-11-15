import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompteurNotificationsNonLues } from '../hooks/useNotifications';
import './NavBar.css';

// Barre de navigation flottante (15/11/2026) : capsule détachée du bas de
// l'écran, icônes seules, onglet actif mis en valeur par une pastille.
// Les noms des onglets ne sont plus affichés mais restent lus par les
// lecteurs d'écran (aria-label) et apparaissent au survol sur ordinateur
// (title).
const ONGLETS = [
  { path: '/', label: 'Fil', icon: 'ti-home' },
  { path: '/decouverte', label: 'Découverte', icon: 'ti-compass' },
  { path: '/profil', label: 'EchoProfil', icon: 'ti-user-circle' },
  { path: '/identite', label: 'Identité', icon: 'ti-feather' },
  { path: '/notifications', label: 'Notifications', icon: 'ti-bell' },
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
          ? `${o.label} (${nonLues >= 99 ? '99 ou plus' : nonLues} non lue${nonLues > 1 ? 's' : ''})`
          : o.label;
        return (
          <Link
            key={o.path}
            to={o.path}
            className={`nav-item ${actif ? 'active' : ''}`}
            aria-label={libelle}
            aria-current={actif ? 'page' : undefined}
            title={o.label}
          >
            <span className="nav-icon">
              <i className={`ti ${o.icon}`} aria-hidden="true" />
              {estCloche && nonLues > 0 && <span className="nav-badge" aria-hidden="true" />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
