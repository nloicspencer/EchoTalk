import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EchoBouteille from '../components/EchoBouteille';
import EchoCard from '../components/EchoCard';
import EcholegueForm from '../components/EcholegueForm';
import JarreIcon from '../components/JarreIcon';
import ValidationEchoReps from '../components/ValidationEchoReps';
import { useAuth } from '../context/AuthContext';
import { useEchos } from '../hooks/useEchos';
import { acquerirPack, useStockJarres } from '../hooks/useReactions';
import { db } from '../services/firebase';
import { FEATURES } from '../config/features';
import './ProfilPage.css';

interface Stats {
  echosTotal: number; echosLibres: number; echosOuverts: number;
  echosRejoints: number; echoRepsPubliees: number;
  jarresBleuesRecues: number; jarresRosesRecues: number;
  jarresBleuesDonnees: number; jarresRosesDonnees: number;
  echosAvecResonance: number; participantsTotal: number;
  bouteillesEnvoyees: number; bouteillesRecues: number; leguesPublies: number;
}

function calcBadges(stats: Stats) {
  const badges = [];
  if (stats.echosTotal >= 1) badges.push({ icon: '🌱', label: 'Premier Écho' });
  if (stats.jarresBleuesRecues >= 100) badges.push({ icon: '💎', label: '100 Jarres Bleues reçues' });
  if (stats.echoRepsPubliees >= 10) badges.push({ icon: '💬', label: 'Contributeur régulier' });
  return badges;
}

const PACKS = [
  { quantite: 5 as const }, { quantite: 10 as const }, { quantite: 15 as const },
];

export default function ProfilPage() {
  const { profile, user, deconnexion } = useAuth();
  const stock = useStockJarres(profile?.uid ?? '');
  const { echos } = useEchos();
  const echoSolidaireProprio = FEATURES.ECHO_SOLIDAIRE
    ? echos.find(e => e.estSolidaire && e.auteurId === profile?.uid)
    : undefined;
  const historiqueSolidaire = FEATURES.ECHO_SOLIDAIRE
    ? echos
        .filter(e => !e.estSolidaire && e.auteurId === profile?.uid && e.solidaireTermineAt)
        .sort((a, b) => {
          const dateA = a.solidaireTermineAt instanceof Date ? a.solidaireTermineAt.getTime() : 0;
          const dateB = b.solidaireTermineAt instanceof Date ? b.solidaireTermineAt.getTime() : 0;
          return dateB - dateA;
        }).slice(0, 3)
    : [];
  const totalJarresRosesHistorique = historiqueSolidaire.reduce((sum, e) => sum + (e.jarresRoses || 0), 0);
  const mesEchos = echos
    .filter(e => e.auteurId === profile?.uid && !e.supprime)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const [mesEchosVisible, setMesEchosVisible] = useState(false);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [stockAnim, setStockAnim] = useState<{ bleues: boolean; roses: boolean }>({ bleues: false, roses: false });
  const stockPrecedent = useRef({ bleues: stock.jarresBleues, roses: stock.jarresRoses });

  useEffect(() => {
    const champsChanges: Array<'bleues' | 'roses'> = [];
    if (stock.jarresBleues !== stockPrecedent.current.bleues) champsChanges.push('bleues');
    if (stock.jarresRoses !== stockPrecedent.current.roses) champsChanges.push('roses');
    if (champsChanges.length === 0) return;
    stockPrecedent.current = { bleues: stock.jarresBleues, roses: stock.jarresRoses };
    setStockAnim(prev => {
      const next = { ...prev };
      champsChanges.forEach(c => { next[c] = true; });
      return next;
    });
    const timer = setTimeout(() => {
      setStockAnim(prev => {
        const next = { ...prev };
        champsChanges.forEach(c => { next[c] = false; });
        return next;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [stock.jarresBleues, stock.jarresRoses]);
  const [stats, setStats] = useState<Stats>({
    echosTotal: 0, echosLibres: 0, echosOuverts: 0,
    echosRejoints: 0, echoRepsPubliees: 0,
    jarresBleuesRecues: 0, jarresRosesRecues: 0,
    echosAvecResonance: 0, participantsTotal: 0,
    jarresBleuesDonnees: 0, jarresRosesDonnees: 0,
    bouteillesEnvoyees: 0, bouteillesRecues: 0, leguesPublies: 0,
  });

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubs: (() => void)[] = [];

    // Mes échos
    const qMesEchos = query(collection(db, 'echos'), where('auteurId', '==', profile.uid));
    const unsubMesEchos = onSnapshot(qMesEchos, (snap) => {
      let libres = 0, ouverts = 0, jarresBleues = 0, jarresRoses = 0;
      let avecResonance = 0, participantsTotal = 0, total = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.supprime) return;
        total++;
        if (data.type === 'libre') libres++;
        if (data.type === 'ouvert') ouverts++;
        jarresBleues += data.jarresBleues || 0;
        jarresRoses += data.jarresRoses || 0;
        if ((data.jarresBleues || 0) + (data.coeurs || 0) + (data.coeursBrises || 0) > 0) avecResonance++;
        participantsTotal += data.placesOccupees || 0;
      });
      setStats(prev => ({
        ...prev,
        echosTotal: total, echosLibres: libres, echosOuverts: ouverts,
        jarresBleuesRecues: jarresBleues, jarresRosesRecues: jarresRoses,
        echosAvecResonance: avecResonance, participantsTotal,
      }));
    });
    unsubs.push(unsubMesEchos);

    // Participation — uniquement pertinent tant qu'Écho Ouvert est actif
    if (FEATURES.ECHO_OUVERT) {
      const qTousEchos = query(collection(db, 'echos'), where('type', '==', 'ouvert'));
      const unsubParticipation = onSnapshot(qTousEchos, async (snap) => {
        let echosRejoints = 0, echoRepsPubliees = 0;
        const echosAutres = snap.docs.filter(d => d.data().auteurId !== profile.uid && !d.data().supprime);
        for (const echoDoc of echosAutres) {
          const repsRef = collection(db, 'echos', echoDoc.id, 'echoreps');
          const qMesReps = query(repsRef, where('auteurId', '==', profile.uid));
          const repsSnap = await getDocs(qMesReps);
          const repsActives = repsSnap.docs.filter(r => !r.data().supprime);
          if (repsActives.length > 0) { echosRejoints++; echoRepsPubliees += repsActives.length; }
        }
        setStats(prev => ({ ...prev, echosRejoints, echoRepsPubliees }));
      });
      unsubs.push(unsubParticipation);
    }

    // Réactions données
    const qReactions = query(collection(db, 'reactions'), where('auteurId', '==', profile.uid));
    const unsubReactions = onSnapshot(qReactions, (snap) => {
      let bleuesDonnees = 0, rosesDonnees = 0;
      snap.docs.forEach(d => {
        if (d.data().type === 'jarreBleu') bleuesDonnees++;
        if (d.data().type === 'jarreRose') rosesDonnees++;
      });
      setStats(prev => ({ ...prev, jarresBleuesDonnees: bleuesDonnees, jarresRosesDonnees: rosesDonnees }));
    });
    unsubs.push(unsubReactions);

    // Écho-Bouteilles envoyées
    const qBouteillesEnv = query(
      collection(db, 'echos_bouteille'),
      where('expediteurId', '==', profile.uid)
    );
    const unsubBouteillesEnv = onSnapshot(qBouteillesEnv, (snap) => {
      const actives = snap.docs.filter(d => d.data().statut === 'envoyee');
      setStats(prev => ({ ...prev, bouteillesEnvoyees: actives.length }));
    });
    unsubs.push(unsubBouteillesEnv);

    // Écho-Bouteilles reçues
    const qBouteillesRec = query(
      collection(db, 'echos_bouteille'),
      where('destinataireId', '==', profile.uid)
    );
    const unsubBouteillesRec = onSnapshot(qBouteillesRec, (snap) => {
      const actives = snap.docs.filter(d => d.data().statut === 'envoyee');
      setStats(prev => ({ ...prev, bouteillesRecues: actives.length }));
    });
    unsubs.push(unsubBouteillesRec);

    // Écholègues publiés — uniquement pertinent tant qu'Écholègue est actif
    if (FEATURES.ECHOLEGUE) {
      const qLegues = query(collection(db, 'echolegues'), where('auteurId', '==', profile.uid));
      const unsubLegues = onSnapshot(qLegues, (snap) => {
        const actifs = snap.docs.filter(d => d.data().statut !== 'supprime');
        setStats(prev => ({ ...prev, leguesPublies: actifs.length }));
      });
      unsubs.push(unsubLegues);
    }

    return () => unsubs.forEach(u => u());
  }, [profile?.uid]);

  const handleAcquerirPack = async (type: 'bleues' | 'roses', quantite: 5 | 10 | 15) => {
    if (!profile) return;
    const key = `${type}-${quantite}`;
    setLoadingPack(key);
    try {
      const stockActuel = type === 'bleues' ? stock.jarresBleues : stock.jarresRoses;
      await acquerirPack(profile.uid, type, quantite, stockActuel);
    } finally { setLoadingPack(null); }
  };

  if (!profile) return null;

  const dateInscription = profile.createdAt instanceof Date
    ? profile.createdAt
    : new Date((profile.createdAt as { seconds: number }).seconds * 1000);

  const badges = calcBadges(stats);

  return (
    <div className="profil-page">
      <div className="profil-header">
        <div className="profil-avatar">
          <svg width="56" height="70" viewBox="0 0 64 84" aria-hidden="true">
            <rect x="20" y="6" width="24" height="8" rx="3" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <rect x="10" y="20" width="44" height="56" rx="8" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <path d="M10 48 Q22 40 32 48 Q42 56 54 48" fill="none" stroke="#7B5EA7" strokeWidth="1.5" opacity="0.5"/>
            <path d="M10 62 Q22 54 32 62 Q42 70 54 62" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.3"/>
            <circle cx="32" cy="34" r="5" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.4"/>
            <line x1="16" y1="14" x2="10" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="14" x2="54" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="profil-pseudo">{profile.pseudo}</h2>
        <p className="profil-depuis">
          Membre depuis {dateInscription.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="profil-section stock-section">
        <h3>Mes jarres</h3>
        <div className="stock-jarres">
          <div className="stock-item stock-bleu">
            <JarreIcon color="blue" size="l" />
            <div><span className={`stock-nombre ${stockAnim.bleues ? 'compteur-pop' : ''}`}>{stock.jarresBleues}</span><span className="stock-label">Jarres bleues</span></div>
          </div>
          {FEATURES.ECHO_SOLIDAIRE && (
            <div className="stock-item stock-rose">
              <JarreIcon color="rose" size="l" />
              <div><span className={`stock-nombre ${stockAnim.roses ? 'compteur-pop' : ''}`}>{stock.jarresRoses}</span><span className="stock-label">Jarres roses</span></div>
            </div>
          )}
        </div>
      </div>

      {FEATURES.ECHO_OUVERT && <ValidationEchoReps proprietaireId={profile.uid} />}

      {echoSolidaireProprio && (
        <div className="profil-section echo-solidaire-proprio">
          <h3>Votre Écho est Solidaire ce mois-ci</h3>
          <p className="solidaire-contenu">{echoSolidaireProprio.contenu}</p>
          <div className="solidaire-compteur">
            <JarreIcon color="rose" size="m" />
            <span className="solidaire-nombre">{echoSolidaireProprio.jarresRoses || 0}</span>
            <span className="solidaire-label">Jarres Roses reçues</span>
          </div>
          <p className="solidaire-note">Ce compteur se met à jour en temps réel.</p>
        </div>
      )}

      {historiqueSolidaire.length > 0 && (
        <div className="profil-section historique-solidaire">
          <h3>Historique Écho Solidaire</h3>
          <p className="historique-note">
            Vos {historiqueSolidaire.length} dernier{historiqueSolidaire.length > 1 ? 's' : ''} écho{historiqueSolidaire.length > 1 ? 's' : ''} solidaire{historiqueSolidaire.length > 1 ? 's' : ''} terminé{historiqueSolidaire.length > 1 ? 's' : ''}.
            Total : <strong>{totalJarresRosesHistorique} jarres roses</strong>
          </p>
          <div className="historique-liste">
            {historiqueSolidaire.map((echo) => (
              <div key={echo.id} className="historique-item">
                <div className="historique-contenu">{echo.contenu.slice(0, 80)}{echo.contenu.length > 80 ? '...' : ''}</div>
                <div className="historique-stats">
                  <span className="historique-reactions">
                    <JarreIcon color="blue" size="s" /> {echo.jarresBleues || 0}
                    &nbsp;❤️ {echo.coeurs || 0}
                    &nbsp;💔 {echo.coeursBrises || 0}
                    &nbsp;<JarreIcon color="rose" size="s" /> {echo.jarresRoses || 0}
                  </span>
                  <span className="historique-date">
                    {echo.solidaireTermineAt instanceof Date
                      ? echo.solidaireTermineAt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                      : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="profil-section">
        <h3>Acquérir des jarres bleues</h3>
        <p className="pack-note">Les jarres bleues permettent de soutenir les échos de la communauté.</p>
        <div className="packs-liste">
          {PACKS.map(pack => (
            <button key={pack.quantite} className="pack-btn pack-bleu"
              onClick={() => handleAcquerirPack('bleues', pack.quantite)}
              disabled={loadingPack === `bleues-${pack.quantite}`}>
              <span className="pack-quantite">+{pack.quantite}</span>
              <span className="pack-label">jarres bleues</span>
              <span className="pack-gratuit">Gratuit</span>
            </button>
          ))}
        </div>
      </div>

      {FEATURES.ECHO_SOLIDAIRE && (
        <div className="profil-section">
          <h3>Acquérir des jarres roses</h3>
          <p className="pack-note">Les jarres roses soutiennent l'Écho Solidaire du mois.</p>
          <div className="packs-liste">
            {PACKS.map(pack => (
              <button key={pack.quantite} className="pack-btn pack-rose"
                onClick={() => handleAcquerirPack('roses', pack.quantite)}
                disabled={loadingPack === `roses-${pack.quantite}`}>
                <span className="pack-quantite">+{pack.quantite}</span>
                <span className="pack-label">jarres roses</span>
                <span className="pack-gratuit">Gratuit</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mesEchos.length > 0 && (
        <div className="profil-section mes-echos-section">
          <button className="mes-echos-toggle" onClick={() => setMesEchosVisible(!mesEchosVisible)}>
            <h3 style={{ margin: 0 }}>Mes Échos ({mesEchos.length})</h3>
            <i className={`ti ${mesEchosVisible ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
          </button>
          {mesEchosVisible && (
            <div className="mes-echos-liste">
              {mesEchos.map((echo) => <EchoCard key={echo.id} echo={echo} />)}
            </div>
          )}
        </div>
      )}

      {FEATURES.ECHO_BOUTEILLE && <EchoBouteille />}
      {FEATURES.ECHOLEGUE && <EcholegueForm />}

      {badges.length > 0 && (
        <div className="profil-section">
          <h3>Distinctions</h3>
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

      <div className="profil-section">
        <h3>Activité</h3>
        <div className="stats-grid">
          <div className="stat-row"><span className="stat-label">Échos publiés</span><span className="stat-val">{stats.echosTotal}</span></div>
          <div className="stat-row"><span className="stat-label">🕊️ Échos Libres</span><span className="stat-val">{stats.echosLibres}</span></div>
          {FEATURES.ECHO_OUVERT && (
            <div className="stat-row"><span className="stat-label">🔓 Échos Ouverts</span><span className="stat-val">{stats.echosOuverts}</span></div>
          )}
        </div>
      </div>

      {FEATURES.ECHO_OUVERT && (
        <div className="profil-section">
          <h3>Participation</h3>
          <div className="stats-grid">
            <div className="stat-row"><span className="stat-label">Échos Ouverts rejoints</span><span className="stat-val">{stats.echosRejoints}</span></div>
            <div className="stat-row"><span className="stat-label">ÉchoReps publiées</span><span className="stat-val">{stats.echoRepsPubliees}</span></div>
          </div>
        </div>
      )}

      <div className="profil-section">
        <h3>Transmission</h3>
        <div className="stats-grid">
          <div className="stat-row"><span className="stat-label">Écho-Bouteilles envoyées</span><span className="stat-val">{stats.bouteillesEnvoyees}</span></div>
          <div className="stat-row"><span className="stat-label">Écho-Bouteilles reçues</span><span className="stat-val">{stats.bouteillesRecues}</span></div>
          {FEATURES.ECHOLEGUE && (
            <div className="stat-row"><span className="stat-label">Écholègues publiés</span><span className="stat-val">{stats.leguesPublies}</span></div>
          )}
        </div>
      </div>

      <div className="profil-section">
        <h3>Résonance</h3>
        <div className="stats-grid">
          <div className="stat-row">
            <span className="stat-label">Jarres Bleues</span>
            <span className="stat-val stat-double">
              <span className="stat-donnees">données {stats.jarresBleuesDonnees}</span>
              <span className="stat-sep">/</span>
              <span className="stat-recues">reçues {stats.jarresBleuesRecues}</span>
            </span>
          </div>
          {FEATURES.ECHO_SOLIDAIRE && (
            <div className="stat-row">
              <span className="stat-label">Jarres Roses</span>
              <span className="stat-val stat-double">
                <span className="stat-donnees">données {stats.jarresRosesDonnees}</span>
                <span className="stat-sep">/</span>
                <span className="stat-recues">reçues {stats.jarresRosesRecues}</span>
              </span>
            </div>
          )}
          <div className="stat-row"><span className="stat-label">Échos ayant résonné</span><span className="stat-val">{stats.echosAvecResonance}</span></div>
          {FEATURES.ECHO_OUVERT && (
            <div className="stat-row"><span className="stat-label">Participants totaux</span><span className="stat-val">{stats.participantsTotal}</span></div>
          )}
        </div>
      </div>

      <div className="profil-principe">
        <p>L'EchoProfil met en valeur votre activité, votre participation, votre soutien aux autres et la résonance de vos Échos au sein de la communauté.</p>
      </div>

      <div className="profil-section">
        <h3>Identité privée</h3>
        <p className="profil-note">Votre identité réelle est strictement confidentielle et ne sera jamais visible par les autres utilisateurs.</p>
        <div className="profil-email"><span>📧</span><span>{user?.email}</span></div>
      </div>

      {profile?.role === 'admin' && (
        <Link to="/admin" className="btn-admin">⚙️ Administration EchoTalk</Link>
      )}
      {(profile?.role === 'admin' || profile?.role === 'moderateur') && (
        <Link to="/moderation" className="btn-admin btn-moderation">🛡️ Modération EchoTalk</Link>
      )}

      <button className="btn-deconnexion" onClick={deconnexion}>Se déconnecter</button>
    </div>
  );
}
