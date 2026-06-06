import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import './ProfilPage.css';

interface Stats {
  echosTotal: number;
  echosLibres: number;
  echosOuverts: number;
  echosRejoints: number;
  echoRepsPubliees: number;
  jarresBleuesRecues: number;
  jarresRosesRecues: number;
  echosAvecResonance: number;
  participantsTotal: number;
}

function calcBadges(stats: Stats, membreDepuis: Date) {
  const badges = [];
  const maintenant = new Date();
  const joursDepuisInscription = Math.floor((maintenant.getTime() - membreDepuis.getTime()) / (1000 * 60 * 60 * 24));

  if (stats.echosTotal >= 1) badges.push({ icon: '🌱', label: 'Premier Écho' });
  if (stats.jarresBleuesRecues >= 10) badges.push({ icon: '🤝', label: 'Soutien actif' });
  if (stats.jarresBleuesRecues >= 100) badges.push({ icon: '🫙', label: '100 Jarres Bleues reçues' });
  if (stats.echoRepsPubliees >= 10 || joursDepuisInscription >= 7) badges.push({ icon: '💬', label: 'Contributeur régulier' });
  if (stats.jarresRosesRecues >= 1) badges.push({ icon: '🌸', label: 'Écho Solidaire validé' });

  return badges;
}

export default function ProfilPage() {
  const { profile, user, deconnexion } = useAuth();
  const [stats, setStats] = useState<Stats>({
    echosTotal: 0,
    echosLibres: 0,
    echosOuverts: 0,
    echosRejoints: 0,
    echoRepsPubliees: 0,
    jarresBleuesRecues: 0,
    jarresRosesRecues: 0,
    echosAvecResonance: 0,
    participantsTotal: 0,
  });

  useEffect(() => {
    if (!profile?.uid) return;

    // Échos publiés
    const qEchos = query(collection(db, 'echos'), where('auteurId', '==', profile.uid));
    const unsubEchos = onSnapshot(qEchos, async (snap) => {
      let libres = 0, ouverts = 0, jarresBleues = 0, jarresRoses = 0, avecResonance = 0, participantsTotal = 0;

      for (const d of snap.docs) {
        const data = d.data();
        if (data.type === 'libre') libres++;
        if (data.type === 'ouvert') ouverts++;
        jarresBleues += data.jarresBleues || 0;
        jarresRoses += data.jarresRoses || 0;
        const resonance = (data.jarresBleues || 0) + (data.coeurs || 0) + (data.coeursBrises || 0);
        if (resonance > 0) avecResonance++;
        participantsTotal += data.placesOccupees || 0;
      }

      // EchoReps publiées par l'utilisateur (participation dans échos des autres)
      let echoRepsCount = 0;
      let echosRejoints = 0;
      const allEchos = await getDocs(collection(db, 'echos'));
      for (const echoDoc of allEchos.docs) {
        if (echoDoc.data().auteurId === profile.uid) continue;
        const repsRef = collection(db, 'echos', echoDoc.id, 'echoreps');
        const reps = await getDocs(query(repsRef, where('auteurId', '==', profile.uid)));
        if (!reps.empty) {
          echosRejoints++;
          echoRepsCount += reps.size;
        }
      }

      setStats({
        echosTotal: snap.size,
        echosLibres: libres,
        echosOuverts: ouverts,
        echosRejoints,
        echoRepsPubliees: echoRepsCount,
        jarresBleuesRecues: jarresBleues,
        jarresRosesRecues: jarresRoses,
        echosAvecResonance: avecResonance,
        participantsTotal,
      });
    });

    return unsubEchos;
  }, [profile?.uid]);

  if (!profile) return null;

  const dateInscription = profile.createdAt instanceof Date
    ? profile.createdAt
    : new Date((profile.createdAt as { seconds: number }).seconds * 1000);

  const badges = calcBadges(stats, dateInscription);

  return (
    <div className="profil-page">

      {/* Identité publique */}
      <div className="profil-header">
        <div className="profil-avatar">🫙</div>
        <h2 className="profil-pseudo">{profile.pseudo}</h2>
        <p className="profil-depuis">
          Membre depuis {dateInscription.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="profil-section">
          <h3>✨ Distinctions</h3>
          <div className="badges-liste">
            {badges.map((b, i) => (
              <div key={i} className="badge-item">
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiques d'activité */}
      <div className="profil-section">
        <h3>📊 Activité</h3>
        <div className="stats-grid">
          <div className="stat-row">
            <span className="stat-label">Échos publiés</span>
            <span className="stat-val">{stats.echosTotal}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">🕊️ Échos Libres</span>
            <span className="stat-val">{stats.echosLibres}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">🔓 Échos Ouverts</span>
            <span className="stat-val">{stats.echosOuverts}</span>
          </div>
        </div>
      </div>

      {/* Participation */}
      <div className="profil-section">
        <h3>🤝 Participation</h3>
        <div className="stats-grid">
          <div className="stat-row">
            <span className="stat-label">Échos Ouverts rejoints</span>
            <span className="stat-val">{stats.echosRejoints}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">EchoReps publiées</span>
            <span className="stat-val">{stats.echoRepsPubliees}</span>
          </div>
        </div>
      </div>

      {/* Résonance */}
      <div className="profil-section">
        <h3>🌊 Résonance</h3>
        <div className="stats-grid">
          <div className="stat-row">
            <span className="stat-label">🫙 Jarres Bleues reçues</span>
            <span className="stat-val">{stats.jarresBleuesRecues}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">🌸 Jarres Roses reçues</span>
            <span className="stat-val">{stats.jarresRosesRecues}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Échos ayant résonné</span>
            <span className="stat-val">{stats.echosAvecResonance}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Participants totaux</span>
            <span className="stat-val">{stats.participantsTotal}</span>
          </div>
        </div>
      </div>

      {/* Principe */}
      <div className="profil-principe">
        <p>L'EchoProfil met en valeur votre activité, votre participation, votre soutien aux autres et la résonance de vos Échos au sein de la communauté.</p>
      </div>

      {/* Déconnexion */}
      <button className="btn-deconnexion" onClick={deconnexion}>
        Se déconnecter
      </button>

    </div>
  );
}
