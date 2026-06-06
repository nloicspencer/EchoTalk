import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import './ProfilPage.css';

export default function ProfilPage() {
  const { profile, user, deconnexion } = useAuth();
  const [stats, setStats] = useState({
    echosPublies: 0,
    jarresBleuesRecues: 0,
    coeursRecus: 0,
    echoRepsPubliees: 0,
  });

  useEffect(() => {
    if (!profile?.uid) return;

    // Échos publiés + réactions reçues
    const q = query(collection(db, 'echos'), where('auteurId', '==', profile.uid));
    const unsub = onSnapshot(q, (snap) => {
      let jarres = 0;
      let coeurs = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        jarres += data.jarresBleues || 0;
        coeurs += data.coeurs || 0;
      });
      setStats(s => ({ ...s, echosPublies: snap.size, jarresBleuesRecues: jarres, coeursRecus: coeurs }));
    });

    return unsub;
  }, [profile?.uid]);

  if (!profile) return null;

  const dateInscription = profile.createdAt instanceof Date
    ? profile.createdAt
    : new Date((profile.createdAt as { seconds: number }).seconds * 1000);

  return (
    <div className="profil-page">

      <div className="profil-header">
        <div className="profil-avatar">🫙</div>
        <h2 className="profil-pseudo">{profile.pseudo}</h2>
        <p className="profil-depuis">
          Membre depuis le {dateInscription.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="profil-stats">
        <div className="stat-card">
          <span className="stat-valeur">{stats.echosPublies}</span>
          <span className="stat-label">Échos publiés</span>
        </div>
        <div className="stat-card">
          <span className="stat-valeur">🫙 {stats.jarresBleuesRecues}</span>
          <span className="stat-label">Jarres reçues</span>
        </div>
        <div className="stat-card">
          <span className="stat-valeur">❤️ {stats.coeursRecus}</span>
          <span className="stat-label">Cœurs reçus</span>
        </div>
        <div className="stat-card">
          <span className="stat-valeur">💬 {stats.echoRepsPubliees}</span>
          <span className="stat-label">EchoReps publiées</span>
        </div>
      </div>

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

      <button className="btn-deconnexion" onClick={deconnexion}>
        Se déconnecter
      </button>

    </div>
  );
}
