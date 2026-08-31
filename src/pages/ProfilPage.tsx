import { deleteDoc, doc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BoutonPartage from '../components/BoutonPartage';
import EchoBouteille from '../components/EchoBouteille';
import EchoCard from '../components/EchoCard';
import EcholegueForm from '../components/EcholegueForm';
import JarreIcon from '../components/JarreIcon';
import PaiementFacadeModal from '../components/PaiementFacadeModal';
import ValidationEchoReps from '../components/ValidationEchoReps';
import { useAuth } from '../context/AuthContext';
import { useEchos } from '../hooks/useEchos';
import { acquerirPack, PRIX_PACKS_ROSES, useStockJarres } from '../hooks/useReactions';
import { db } from '../services/firebase';
import { FEATURES } from '../config/appVersion';
import './ProfilPage.css';

const PLAFOND_JARRES = 50;
// Fenêtre de récupération de la façade paiement (V3) : le délai qu'un
// utilisateur a, après la sortie du statut Écho Solidaire du mois, pour
// récupérer son soutien avant qu'il ne bascule dans le Portefeuille
// solidaire (récupérable à tout moment, sans limite de temps).
const DELAI_RECUPERATION_JOURS = 30;

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

  const maintenant = Date.now();
  const millisecondesDelai = DELAI_RECUPERATION_JOURS * 24 * 60 * 60 * 1000;
  const entreesPortefeuille = FEATURES.ECHO_SOLIDAIRE_MONETISE
    ? historiqueSolidaire.filter(e => {
        if (!(e.solidaireTermineAt instanceof Date)) return false;
        return maintenant - e.solidaireTermineAt.getTime() >= millisecondesDelai;
      })
    : [];
  const totalPortefeuille = entreesPortefeuille.reduce((sum, e) => sum + (e.jarresRoses || 0), 0);

  const mesEchos = echos
    .filter(e => e.auteurId === profile?.uid && !e.supprime)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const [mesEchosVisible, setMesEchosVisible] = useState(false);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [erreurPack, setErreurPack] = useState<string>('');
  const [stockAnim, setStockAnim] = useState<{ bleues: boolean; roses: boolean }>({ bleues: false, roses: false });
  const stockPrecedent = useRef({ bleues: stock.jarresBleues, roses: stock.jarresRoses });

  const [modalAchat, setModalAchat] = useState<{ quantite: 5 | 10 | 15 } | null>(null);
  const [modalRecuperation, setModalRecuperation] = useState<{ jarres: number } | null>(null);

  const [modalSuppression, setModalSuppression] = useState(false);
  const [etapeReauth, setEtapeReauth] = useState(false);
  const [motDePasse, setMotDePasse] = useState('');
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState('');

  const supprimerCompteDefinitivement = async () => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
  };

  const handleSupprimerCompte = async () => {
    if (!user) return;
    setSuppressionEnCours(true);
    setErreurSuppression('');
    try {
      await supprimerCompteDefinitivement();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        setEtapeReauth(true);
      } else {
        setErreurSuppression('Une erreur est survenue. Réessayez, ou contactez contact@echotalk.fr.');
      }
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const handleReauthentifierEtSupprimer = async () => {
    if (!user || !user.email) return;
    setSuppressionEnCours(true);
    setErreurSuppression('');
    try {
      const credential = EmailAuthProvider.credential(user.email, motDePasse);
      await reauthenticateWithCredential(user, credential);
      await supprimerCompteDefinitivement();
    } catch {
      setErreurSuppression('Mot de passe incorrect, ou erreur de connexion.');
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const fermerModalSuppression = () => {
    setModalSuppression(false);
    setEtapeReauth(false);
    setMotDePasse('');
    setErreurSuppression('');
  };

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

    if (FEATURES.ECHO_BOUTEILLE) {
      const qBouteillesEnv = query(
        collection(db, 'echos_bouteille'),
        where('expediteurId', '==', profile.uid)
      );
      const unsubBouteillesEnv = onSnapshot(qBouteillesEnv, (snap) => {
        const actives = snap.docs.filter(d => d.data().statut === 'envoyee');
        setStats(prev => ({ ...prev, bouteillesEnvoyees: actives.length }));
      });
      unsubs.push(unsubBouteillesEnv);

      const qBouteillesRec = query(
        collection(db, 'echos_bouteille'),
        where('destinataireId', '==', profile.uid)
      );
      const unsubBouteillesRec = onSnapshot(qBouteillesRec, (snap) => {
        const actives = snap.docs.filter(d => d.data().statut === 'envoyee');
        setStats(prev => ({ ...prev, bouteillesRecues: actives.length }));
      });
      unsubs.push(unsubBouteillesRec);
    }

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
    setErreurPack('');
    try {
      const stockActuel = type === 'bleues' ? stock.jarresBleues : stock.jarresRoses;
      await acquerirPack(profile.uid, type, quantite, stockActuel);
    } catch (e: unknown) {
      setErreurPack(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setLoadingPack(null);
    }
  };

  const handleClickPackRose = (quantite: 5 | 10 | 15) => {
    if (FEATURES.ECHO_SOLIDAIRE_MONETISE) {
      setModalAchat({ quantite });
    } else {
      handleAcquerirPack('roses', quantite);
    }
  };

  const handleContinuerTestAchat = async () => {
    if (!modalAchat) return;
    await handleAcquerirPack('roses', modalAchat.quantite);
    setModalAchat(null);
  };

  if (!profile) return null;

  const dateInscription = profile.createdAt instanceof Date
    ? profile.createdAt
    : new Date((profile.createdAt as { seconds: number }).seconds * 1000);

  const badges = calcBadges(stats);
  const placeRestanteBleues = PLAFOND_JARRES - stock.jarresBleues;
  const placeRestanteRoses = PLAFOND_JARRES - stock.jarresRoses;

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
            {historiqueSolidaire.map((echo) => {
              const estRecuperable = FEATURES.ECHO_SOLIDAIRE_MONETISE
                && echo.solidaireTermineAt instanceof Date
                && maintenant - echo.solidaireTermineAt.getTime() < millisecondesDelai;
              return (
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
                  {estRecuperable && (
                    <div className="recuperation-bandeau">
                      <span>Vous pouvez récupérer votre soutien</span>
                      <button onClick={() => setModalRecuperation({ jarres: echo.jarresRoses || 0 })}>
                        Récupérer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {FEATURES.ECHO_SOLIDAIRE_MONETISE && entreesPortefeuille.length > 0 && (
        <div className="profil-section portefeuille-solidaire">
          <h3>💚 Portefeuille solidaire</h3>
          <p className="portefeuille-note">
            Soutiens reçus dont le délai de récupération de 30 jours est dépassé — toujours disponibles, sans limite de temps.
          </p>
          <div className="portefeuille-total">
            <JarreIcon color="rose" size="m" />
            <span className="portefeuille-nombre">{totalPortefeuille}</span>
            <span className="portefeuille-label">jarres roses en attente de récupération</span>
          </div>
          <button
            className="portefeuille-btn-recuperer"
            onClick={() => setModalRecuperation({ jarres: totalPortefeuille })}
          >
            Récupérer mon soutien
          </button>
        </div>
      )}

      <div className="profil-section">
        <h3>Acquérir des jarres bleues</h3>
        <p className="pack-note">Les jarres bleues permettent de soutenir les échos de la communauté.</p>
        <div className="packs-liste">
          {PACKS.map(pack => {
            const indisponible = pack.quantite > placeRestanteBleues;
            return (
              <button key={pack.quantite} className="pack-btn pack-bleu"
                onClick={() => handleAcquerirPack('bleues', pack.quantite)}
                disabled={loadingPack === `bleues-${pack.quantite}` || indisponible}
                title={indisponible ? `Dépasserait le plafond de ${PLAFOND_JARRES} jarres` : undefined}>
                <span className="pack-quantite">+{pack.quantite}</span>
                <span className="pack-label">jarres bleues</span>
                <span className="pack-gratuit">{indisponible ? 'Indisponible' : 'Gratuit'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {FEATURES.ECHO_SOLIDAIRE && (
        <div className="profil-section">
          <h3>Acquérir des jarres roses</h3>
          <p className="pack-note">
            {FEATURES.ECHO_SOLIDAIRE_MONETISE
              ? "Les jarres roses soutiennent l'Écho Solidaire du mois — 50 % reversés au bénéficiaire, 50 % au fonctionnement d'EchoTalk."
              : "Les jarres roses soutiennent l'Écho Solidaire du mois."}
          </p>
          <div className="packs-liste">
            {PACKS.map(pack => {
              const indisponible = pack.quantite > placeRestanteRoses;
              return (
                <button key={pack.quantite} className="pack-btn pack-rose"
                  onClick={() => handleClickPackRose(pack.quantite)}
                  disabled={loadingPack === `roses-${pack.quantite}` || indisponible}
                  title={indisponible ? `Dépasserait le plafond de ${PLAFOND_JARRES} jarres` : undefined}>
                  <span className="pack-quantite">+{pack.quantite}</span>
                  <span className="pack-label">jarres roses</span>
                  <span className={`pack-gratuit ${FEATURES.ECHO_SOLIDAIRE_MONETISE ? 'pack-prix' : ''}`}>
                    {indisponible ? 'Indisponible' : FEATURES.ECHO_SOLIDAIRE_MONETISE ? `${PRIX_PACKS_ROSES[pack.quantite]} €` : 'Gratuit'}
                  </span>
                </button>
              );
            })}
          </div>
          {erreurPack && <p className="pack-erreur">{erreurPack}</p>}
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

      {(FEATURES.ECHO_BOUTEILLE || FEATURES.ECHOLEGUE) && (
        <div className="profil-section">
          <h3>Transmission</h3>
          <div className="stats-grid">
            {FEATURES.ECHO_BOUTEILLE && (
              <>
                <div className="stat-row"><span className="stat-label">Écho-Bouteilles envoyées</span><span className="stat-val">{stats.bouteillesEnvoyees}</span></div>
                <div className="stat-row"><span className="stat-label">Écho-Bouteilles reçues</span><span className="stat-val">{stats.bouteillesRecues}</span></div>
              </>
            )}
            {FEATURES.ECHOLEGUE && (
              <div className="stat-row"><span className="stat-label">Écholègues publiés</span><span className="stat-val">{stats.leguesPublies}</span></div>
            )}
          </div>
        </div>
      )}

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

      <div className="profil-invitation">
        <span className="profil-invitation-icon" aria-hidden="true">🫙</span>
        <div className="profil-invitation-texte">
          <h3>Inviter à résonner</h3>
          <p>Vous connaissez quelqu'un qui pourrait trouver ici un espace d'écoute ? Invitez-le à découvrir EchoTalk.</p>
        </div>
        <BoutonPartage
          titre="EchoTalk"
          texte="Découvre EchoTalk avec moi — un espace pour être entendu, pas pour être vu."
          url="https://echotalk.fr"
          libelle="Inviter"
        />
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

      <div className="profil-zone-sensible">
        <button className="btn-supprimer-compte" onClick={() => setModalSuppression(true)}>
          Supprimer mon compte
        </button>
      </div>

      {modalSuppression && (
        <div className="suppression-compte-overlay" onClick={fermerModalSuppression}>
          <div className="suppression-compte-modal" onClick={e => e.stopPropagation()}>
            {!etapeReauth ? (
              <>
                <h3>Supprimer votre compte ?</h3>
                <p>
                  Votre identité et votre accès à EchoTalk seront définitivement supprimés. Vos Échos, EchoReps, Écholègues et Écho-Bouteilles déjà publiés resteront visibles tels quels, sous votre pseudonyme — ils font partie des échanges de la communauté.
                </p>
                <p className="suppression-compte-avertissement">Cette action est irréversible.</p>
                {erreurSuppression && <p className="suppression-compte-erreur">{erreurSuppression}</p>}
                <div className="suppression-compte-actions">
                  <button onClick={fermerModalSuppression} disabled={suppressionEnCours}>Annuler</button>
                  <button className="btn-confirmer-suppression" onClick={handleSupprimerCompte} disabled={suppressionEnCours}>
                    {suppressionEnCours ? '...' : 'Supprimer définitivement'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Confirmez votre mot de passe</h3>
                <p>Pour des raisons de sécurité, veuillez ressaisir votre mot de passe avant de continuer.</p>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={motDePasse}
                  onChange={e => setMotDePasse(e.target.value)}
                  className="suppression-compte-input"
                />
                {erreurSuppression && <p className="suppression-compte-erreur">{erreurSuppression}</p>}
                <div className="suppression-compte-actions">
                  <button onClick={fermerModalSuppression} disabled={suppressionEnCours}>Annuler</button>
                  <button className="btn-confirmer-suppression" onClick={handleReauthentifierEtSupprimer} disabled={suppressionEnCours || !motDePasse}>
                    {suppressionEnCours ? '...' : 'Confirmer la suppression'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modalAchat && (
        <PaiementFacadeModal
          titre={`Pack de ${modalAchat.quantite} jarres roses — ${PRIX_PACKS_ROSES[modalAchat.quantite]} €`}
          description="Le paiement sécurisé de ce pack sera géré par notre prestataire de paiement dès son intégration."
          boutonTestLabel="Créditer quand même (mode test)"
          onFermer={() => setModalAchat(null)}
          onContinuerTest={handleContinuerTestAchat}
        />
      )}

      {modalRecuperation && (
        <PaiementFacadeModal
          titre="Récupérer votre soutien"
          description={`${modalRecuperation.jarres} jarre${modalRecuperation.jarres > 1 ? 's' : ''} rose${modalRecuperation.jarres > 1 ? 's' : ''} reçue${modalRecuperation.jarres > 1 ? 's' : ''}. Le montant exact sera calculé et versé par virement une fois notre prestataire de paiement intégré.`}
          onFermer={() => setModalRecuperation(null)}
        />
      )}
    </div>
  );
}
