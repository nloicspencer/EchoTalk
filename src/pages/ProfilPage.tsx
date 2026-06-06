import { useAuth } from '../hooks/useAuth';
import './ProfilPage.css';

export default function ProfilPage() {
  const { profile, user, deconnexion } = useAuth();

  if (!profile) return null;

  const dateInscription = profile.createdAt instanceof Date
    ? profile.createdAt
    : new Date((profile.createdAt as { seconds: number }).seconds * 1000);

  return (
    <div className="profil-page">

      {/* En-tête profil */}
      <div className="profil-header">
        <div className="profil-avatar">🫙</div>
        <h2 className="profil-pseudo">{profile.pseudo}</h2>
        <p className="profil-depuis">
          Membre depuis le {dateInscription.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Statistiques */}
      <div className="profil-stats">
        <div className="stat-card">
          <span className="stat-valeur">{profile.echosPublies}</span>
          <span className="stat-label">Échos publiés</span>
        </div>
        <div className="stat-card">
          <span className="stat-valeur">🫙 {profile.jarresBleuesRecues}</span>
          <span className="stat-label">Jarres reçues</span>
        </div>
        <div className="stat-card">
          <span className="stat-valeur">🫙 {profile.jarresBleuesPartagees}</span>
          <span className="stat-label">Jarres partagées</span>
        </div>
        <div className="stat-card">
          <span className="stat-valeur">❤️ {profile.coeursRecus}</span>
          <span className="stat-label">Cœurs reçus</span>
        </div>
      </div>

      {/* Identité privée */}
      <div className="profil-section">
        <h3>Identité privée</h3>
        <p className="profil-note">
          Votre identité réelle (nom, prénom, date de naissance) est strictement confidentielle
          et ne sera jamais visible par les autres utilisateurs.
        </p>
        <div className="profil-email">
          <span>📧</span>
          <span>{user?.email}</span>
        </div>
      </div>

      {/* Déconnexion */}
      <button className="btn-deconnexion" onClick={deconnexion}>
        Se déconnecter
      </button>

    </div>
  );
}
