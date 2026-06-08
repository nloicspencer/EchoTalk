import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEchos } from '../hooks/useEchos';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useStockJarres, acquerirPack } from '../hooks/useReactions';
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

function calcBadges(stats: Stats) {
  const badges = [];
  if (stats.echosTotal >= 1) badges.push({ icon: '🌱', label: 'Premier Écho' });
  if (stats.jarresBleuesRecues >= 100) badges.push({ icon: '🫙', label: '100 Jarres Bleues reçues' });
  if (stats.echoRepsPubliees >= 10) badges.push({ icon: '💬', label: 'Contributeur régulier' });
  return badges;
}

const PACKS = [
  { quantite: 5 as const, label: '5 jarres' },
  { quantite: 10 as const, label: '10 jarres' },
  { quantite: 15 as const, label: '15 jarres' },
];

export default function ProfilPage() {
  const { profile, user, deconnexion } = useAuth();
  const stock = useStockJarres(profile?.uid ?? '');
  const { echos } = useEchos();
  const echoSolidaireProprio = echos.find(e => e.estSolidaire && e.auteurId === profile?.uid);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    echosTotal: 0, echosLibres: 0, echosOuverts: 0,
    echosRejoints: 0, echoRepsPubliees: 0,
    jarresBleuesRecues: 0, jarresRosesRecues: 0,
    echosAvecResonance: 0, participantsTotal: 0,
  });

  useEffect(() => {
    if (!profile?.uid) return;
    const qEchos = query(collection(db, 'echos'), where('auteurId', '==', profile.uid));
    const unsubEchos = onSnapshot(qEchos, async (snap) => {
      let libres = 0, ouverts = 0, jarresBleues = 0, jarresRoses = 0;
      let avecResonance = 0, participantsTotal = 0;
      for (const d of snap.docs) {
        const data = d.data();
        if (data.supprime) continue;
        if (data.type === 'libre') libres++;
        if (data.type === 'ouvert') ouverts++;
        jarresBleues += data.jarresBleues || 0;
        jarresRoses += data.jarresRoses || 0;
        if ((data.jarresBleues || 0) + (data.coeurs || 0) + (data.coeursBrises || 0) > 0) avecResonance++;
        participantsTotal += data.placesOccupees || 0;
      }
      let echoRepsCount = 0, echosRejoints = 0;
      const allEchos = await getDocs(collection(db, 'echos'));
      for (const echoDoc of allEchos.docs) {
        if (echoDoc.data().auteurId === profile.uid) continue;
        const repsRef = collection(db, 'echos', echoDoc.id, 'echoreps');
        const reps = await getDocs(query(repsRef, where('auteurId', '==', profile.uid)));
        if (!reps.empty) { echosRejoints++; echoRepsCount += reps.docs.filter(r => !r.data().supprime).length; }
      }
      setStats({ echosTotal: snap.size, echosLibres: libres, echosOuverts: ouverts, echosRejoints, echoRepsPubliees: echoRepsCount, jarresBleuesRecues: jarresBleues, jarresRosesRecues: jarresRoses, echosAvecResonance: avecResonance, participantsTotal });
    });
    return unsubEchos;
  }, [profile?.uid]);

  const handleAcquerirPack = async (type: 'bleues' | 'roses', quantite: 5 | 10 | 15) => {
    if (!profile) return;
    const key = `${type}-${quantite}`;
    setLoadingPack(key);
    try {
      const stockActuel = type === 'bleues' ? stock.jarresBleues : stock.jarresRoses;
      await acquerirPack(profile.uid, type, quantite, stockActuel);
    } finally {
      setLoadingPack(null);
    }
  };

  if (!profile) return null;

  const dateInscription = profile.createdAt instanceof Date
    ? profile.createdAt
    : new Date((profile.createdAt as { seconds: number }).seconds * 1000);

  const badges = calcBadges(stats);

  return (
    <div className="profil-page">

      {/* En-tête */}
      <div className="profil-header">
        <div className="profil-avatar">🫙</div>
        <h2 className="profil-pseudo">{profile.pseudo}</h2>
        <p className="profil-depuis">
          Membre depuis {dateInscription.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stock de jarres */}
      <div className="profil-section stock-section">
        <h3>🫙 Mes jarres</h3>
        <div className="stock-jarres">
          <div className="stock-item stock-bleu">
            <span className="stock-icon">🫙</span>
            <div>
              <span className="stock-nombre">{stock.jarresBleues}</span>
              <span className="stock-label">Jarres bleues</span>
            </div>
          </div>
          <div className="stock-item stock-rose">
            <span className="stock-icon">🌸</span>
            <div>
              <span className="stock-nombre">{stock.jarresRoses}</span>
              <span className="stock-label">Jarres roses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Écho Solidaire du proprio */}
      {echoSolidaireProprio && (
        <div className="profil-section echo-solidaire-proprio">
          <h3>💛 Votre Écho est Solidaire ce mois-ci</h3>
          <p className="solidaire-contenu">{echoSolidaireProprio.contenu}</p>
          <div className="solidaire-compteur">
            <span className="solidaire-nombre">🌸 {echoSolidaireProprio.jarresRoses || 0}</span>
            <span className="solidaire-label">Jarres Roses reçues</span>
          </div>
          <p className="solidaire-note">Ce compteur se met à jour en temps réel.</p>
        </div>
      )}

      {/* Packs jarres bleues */}
      <div className="profil-section">
        <h3>🫙 Acquérir des jarres bleues</h3>
        <p className="pack-note">Les jarres bleues permettent de soutenir les échos de la communauté.</p>
        <div className="packs-liste">
          {PACKS.map(pack => (
            <button
              key={pack.quantite}
              className="pack-btn pack-bleu"
              onClick={() => handleAcquerirPack('bleues', pack.quantite)}
              disabled={loadingPack === `bleues-${pack.quantite}`}
            >
              <span className="pack-quantite">+{pack.quantite}</span>
              <span className="pack-label">jarres bleues</span>
              <span className="pack-gratuit">Gratuit</span>
            </button>
          ))}
        </div>
      </div>

      {/* Packs jarres roses */}
      <div className="profil-section">
        <h3>🌸 Acquérir des jarres roses</h3>
        <p className="pack-note">Les jarres roses soutiennent l'Écho Solidaire du mois.</p>
        <div className="packs-liste">
          {PACKS.map(pack => (
            <button
              key={pack.quantite}
              className="pack-btn pack-rose"
              onClick={() => handleAcquerirPack('roses', pack.quantite)}
              disabled={loadingPack === `roses-${pack.quantite}`}
            >
              <span className="pack-quantite">+{pack.quantite}</span>
              <span className="pack-label">jarres roses</span>
              <span className="pack-gratuit">Gratuit</span>
            </button>
          ))}
        </div>
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

      {/* Activité */}
      <div className="profil-section">
        <h3>📊 Activité</h3>
        <div className="stats-grid">
          <div className="stat-row"><span className="stat-label">Échos publiés</span><span className="stat-val">{stats.echosTotal}</span></div>
          <div className="stat-row"><span className="stat-label">🕊️ Échos Libres</span><span className="stat-val">{stats.echosLibres}</span></div>
          <div className="stat-row"><span className="stat-label">🔓 Échos Ouverts</span><span className="stat-val">{stats.echosOuverts}</span></div>
        </div>
      </div>

      {/* Participation */}
      <div className="profil-section">
        <h3>🤝 Participation</h3>
        <div className="stats-grid">
          <div className="stat-row"><span className="stat-label">Échos Ouverts rejoints</span><span className="stat-val">{stats.echosRejoints}</span></div>
          <div className="stat-row"><span className="stat-label">EchoReps publiées</span><span className="stat-val">{stats.echoRepsPubliees}</span></div>
        </div>
      </div>

      {/* Résonance */}
      <div className="profil-section">
        <h3>🌊 Résonance</h3>
        <div className="stats-grid">
          <div className="stat-row"><span className="stat-label">🫙 Jarres Bleues reçues</span><span className="stat-val">{stats.jarresBleuesRecues}</span></div>
          <div className="stat-row"><span className="stat-label">🌸 Jarres Roses reçues</span><span className="stat-val">{stats.jarresRosesRecues}</span></div>
          <div className="stat-row"><span className="stat-label">Échos ayant résonné</span><span className="stat-val">{stats.echosAvecResonance}</span></div>
          <div className="stat-row"><span className="stat-label">Participants totaux</span><span className="stat-val">{stats.participantsTotal}</span></div>
        </div>
      </div>

      <div className="profil-principe">
        <p>L'EchoProfil met en valeur votre activité, votre participation, votre soutien aux autres et la résonance de vos Échos au sein de la communauté.</p>
      </div>

      {/* Identité privée */}
      <div className="profil-section">
        <h3>Identité privée</h3>
        <p className="profil-note">Votre identité réelle est strictement confidentielle et ne sera jamais visible par les autres utilisateurs.</p>
        <div className="profil-email"><span>📧</span><span>{user?.email}</span></div>
      </div>

      {user?.email === 'loicspencer3@echotalk.com' && (
        <>
          <Link to="/admin" className="btn-admin">⚙️ Administration EchoTalk</Link>
          <Link to="/moderation" className="btn-admin btn-moderation">🛡️ Modération EchoTalk</Link>
        </>
      )}

      <button className="btn-deconnexion" onClick={deconnexion}>Se déconnecter</button>
    </div>
  );
}
