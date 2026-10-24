import {
  collection,
  doc, DocumentData, getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supprimerEchoBouteille, validerEchoBouteille } from '../hooks/useEchoBouteille';
import { masquerEchoRep, modererCompte, modererEcho } from '../hooks/useModeration';
import { TEXTE_MASQUE } from '../services/moderation';
import { creerNotification } from '../hooks/useNotifications';
import { supprimerEcholegue, validerEcholegue } from '../hooks/useEcholegue';
import { db } from '../services/firebase';
import './ModerationPage.css';

const DUREES_SUSPENSION = [
  { label: '24 heures', heures: 24 },
  { label: '48 heures', heures: 48 },
  { label: '7 jours', heures: 168 },
];

interface Signalement {
  id: string; echoId: string; echoRepId?: string; echoBouteilleId?: string;
  auteurContenuId: string; auteurContenuPseudo: string;
  contenu: string; raison: string; raisonsAlgo?: string[];
  type: string; source: 'utilisateur' | 'algorithme' | 'ia';
  statut: string; decision?: string; createdAt: Date;
  identiteReelle?: { prenom: string; nom: string; email: string };
  // Coordonnées personnelles (19/10/2026) : le contenu a été masqué (ou la
  // proposition d'EchoRep retenue) automatiquement, en attente de décision.
  coordonnees?: boolean;
  // Proposition d'EchoRep retenue avant validation (pas encore une EchoRep).
  echoRepAttenteId?: string;
}

// Type d'une EchoRep (19/10/2026) : le filtre de l'appli écrit « echorep »,
// l'agent IA écrit « echo_rep ». Avant, seul « echorep » était reconnu :
// sur une EchoRep signalée par l'IA, « Masquer » masquait l'Écho parent
// entier et « Supprimer » ne supprimait rien.
const estEchoRep = (s: Signalement) => s.type === 'echorep' || s.type === 'echo_rep';

// Écholègue en attente de modération, lu DIRECTEMENT depuis la collection
// `echolegues` (statut === 'en_attente_moderation') plutôt que via
// `signalements` : publierEcholegue() écrit les deux documents dans deux
// addDoc() séparés (pas de transaction), donc si le second échoue on se
// retrouve avec un Écholègue en attente sans aucun signalement associé —
// invisible pour toujours dans l'ancien système. Ce panneau ne dépend que
// de la collection `echolegues` elle-même et ne peut donc pas rater un
// Écholègue en attente.
interface EcholegueEnAttente {
  id: string;
  auteurPseudo: string;
  recit: string;
  lecon: string;
  createdAt: Date;
}

// Cette page ne gère QUE la modération classique (signalements utilisateur
// et détection auto sur Écho / EchoRep / Écho-Bouteille / Écholègue). Le
// volet Détresse vit désormais dans sa propre page (ModerationDetressePage.tsx),
// séparée pour éviter tout couplage entre les deux logiques.
export default function ModerationPage() {
  const { user, profile } = useAuth();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [echoleguesEnAttente, setEcholeguesEnAttente] = useState<EcholegueEnAttente[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [onglet, setOnglet] = useState<'en_attente' | 'traites'>('en_attente');
  const [suspensionModal, setSuspensionModal] = useState<{ signalement: Signalement; action: 'temp' | 'def' } | null>(null);
  const [dureeSuspension, setDureeSuspension] = useState(24);
  const estModerateur = profile?.role === 'admin' || profile?.role === 'moderateur';

  const identiteCacheRef = useRef<Map<string, { prenom: string; nom: string; email: string }>>(new Map());
  const requeteIdRef = useRef(0);

  const chargerIdentite = async (auteurContenuId?: string) => {
    if (!auteurContenuId || auteurContenuId === 'systeme') return undefined;
    const cache = identiteCacheRef.current;
    if (cache.has(auteurContenuId)) return cache.get(auteurContenuId);
    try {
      const userDoc = await getDoc(doc(db, 'users', auteurContenuId));
      if (userDoc.exists()) {
        const ud = userDoc.data();
        const identite = { prenom: ud.prenom || '—', nom: ud.nom || '—', email: ud.email || '—' };
        cache.set(auteurContenuId, identite);
        return identite;
      }
    } catch {}
    return undefined;
  };

  const construireSignalements = async (docs: QueryDocumentSnapshot<DocumentData>[]): Promise<Signalement[]> => {
    const filtres = docs.filter(d => {
      const data = d.data();
      // Les signalements Écholègue sont gérés par le panneau dédié
      // ci-dessous (branché directement sur `echolegues`), pas ici.
      return data.statut !== 'archive' && data.type !== 'detresse' && data.type !== 'echolegue';
    });
    return Promise.all(filtres.map(async d => {
      const data = d.data();
      const identiteReelle = await chargerIdentite(data.auteurContenuId);
      return {
        id: d.id, echoId: data.echoId || '', echoRepId: data.echoRepId,
        echoBouteilleId: data.echoBouteilleId,
        auteurContenuId: data.auteurContenuId, auteurContenuPseudo: data.auteurContenuPseudo,
        contenu: data.contenu, raison: data.raison, raisonsAlgo: data.raisonsAlgo,
        type: data.type, source: data.source, statut: data.statut,
        decision: data.decision || '',
        coordonnees: data.coordonnees === true
          || (Array.isArray(data.raisonsAlgo) && data.raisonsAlgo.includes('coordonnees')),
        echoRepAttenteId: data.echoRepAttenteId || undefined,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        identiteReelle,
      } as Signalement;
    }));
  };

  useEffect(() => {
    if (!estModerateur) return;
    setLoading(true);
    const statut = onglet === 'en_attente' ? 'en_attente' : 'traite';
    const q = query(
      collection(db, 'signalements'),
      where('statut', '==', statut),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const requeteId = ++requeteIdRef.current;
      construireSignalements(snap.docs).then(items => {
        if (requeteId !== requeteIdRef.current) return;
        setSignalements(items);
        setLoading(false);
      });
    });
    return unsub;
  }, [estModerateur, onglet]);

  // Panneau Écholègues en attente — indépendant de l'onglet et de la
  // collection `signalements` (voir commentaire sur EcholegueEnAttente).
  useEffect(() => {
    if (!estModerateur) return;
    const q = query(collection(db, 'echolegues'), where('statut', '==', 'en_attente_moderation'));
    const unsub = onSnapshot(q, (snap) => {
      const items: EcholegueEnAttente[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          auteurPseudo: data.auteurPseudo || '—',
          recit: data.recit || '',
          lecon: data.lecon || '',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setEcholeguesEnAttente(items);
    });
    return unsub;
  }, [estModerateur]);

  const afficher = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 5000); };
  const marquerTraite = async (id: string, decision: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'traite', decision });
  };

  const supprimerContenu = async (s: Signalement) => {
    if (s.type === 'echo_bouteille' && s.echoBouteilleId) {
      await supprimerEchoBouteille(s.echoBouteilleId);
    } else if (s.echoRepAttenteId) {
      // Proposition retenue avant validation : elle n'est jamais publiée.
      await updateDoc(doc(db, 'echoreps_attente', s.echoRepAttenteId), { statut: 'refuse' });
    } else if (estEchoRep(s) && s.echoRepId) {
      const autresReps = await getDocs(query(
        collection(db, 'echos', s.echoId, 'echoreps'),
        where('auteurId', '==', s.auteurContenuId), where('supprime', '==', false)
      ));
      const etaitSeuleRep = autresReps.docs.filter(d => d.id !== s.echoRepId).length === 0;
      await updateDoc(doc(db, 'echos', s.echoId, 'echoreps', s.echoRepId), {
        supprime: true, suppressionAt: serverTimestamp(),
        contenu: 'ÉchoRep supprimée suite à une modération.',
      });
      if (etaitSeuleRep) {
        const echoSnap = await getDoc(doc(db, 'echos', s.echoId));
        if (echoSnap.exists()) {
          await updateDoc(doc(db, 'echos', s.echoId), {
            placesOccupees: Math.max(0, (echoSnap.data().placesOccupees || 0) - 1),
          });
        }
      }
    } else if (s.type === 'echo') {
      await modererEcho(s.echoId, 'supprimer', user!.uid, s.raison);
    }
  };

  const handleIgnorer = async (id: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'ignore', decision: 'Ignoré — signalement non fondé' });
    afficher('✅ Signalement ignoré.');
  };

  const handleValiderBouteille = async (s: Signalement) => {
    if (!s.echoBouteilleId) return;
    await validerEchoBouteille(s.echoBouteilleId, s.auteurContenuId);
    await marquerTraite(s.id, 'Écho-Bouteille validée — envoyée');
    afficher('✅ Écho-Bouteille validée et envoyée.');
  };

  const handleValiderEcholegue = async (legue: EcholegueEnAttente) => {
    await validerEcholegue(legue.id);
    afficher('✅ Écholègue validé et publié dans la bibliothèque.');
  };

  const handleSupprimerEcholegue = async (legue: EcholegueEnAttente) => {
    if (!confirm('Supprimer définitivement cet Écholègue ?')) return;
    await supprimerEcholegue(legue.id);
    afficher('✅ Écholègue supprimé définitivement.');
  };

  const handleMasquer = async (s: Signalement) => {
    if (estEchoRep(s) && s.echoRepId) {
      await masquerEchoRep(s.echoId, s.echoRepId, user!.uid, s.raison);
      await marquerTraite(s.id, 'ÉchoRep masquée — récupérable par admin');
      afficher('✅ ÉchoRep masquée.');
    } else if (s.type === 'echo_bouteille' && s.echoBouteilleId) {
      await supprimerEchoBouteille(s.echoBouteilleId);
      await marquerTraite(s.id, 'Écho-Bouteille supprimée');
      afficher('✅ Écho-Bouteille supprimée.');
    } else {
      await modererEcho(s.echoId, 'masquer', user!.uid, s.raison);
      await marquerTraite(s.id, 'Écho masqué — récupérable par admin');
      afficher('✅ Écho masqué.');
    }
  };

  // Masquage automatique (19/10/2026) — deux décisions possibles :
  //
  // « Rétablir » : faux positif. Le contenu redevient visible (ou la
  // proposition d'EchoRep revient dans la liste de validation du
  // propriétaire, qui est alors prévenu), et le signalement est classé.
  // Remet un Écho ou une EchoRep masqué en ligne (24/10/2026). Si son texte
  // a été remplacé par TEXTE_MASQUE (masquage automatique des coordonnées),
  // l'original est repris du signalement. Un masquage manuel ne touche pas
  // au texte : seul « masque » est alors levé.
  const restaurerContenu = async (s: Signalement) => {
    const ref = estEchoRep(s) && s.echoRepId
      ? doc(db, 'echos', s.echoId, 'echoreps', s.echoRepId)
      : s.type === 'echo' && s.echoId ? doc(db, 'echos', s.echoId) : null;
    if (!ref) return;
    const snap = await getDoc(ref);
    const texteRemplace = snap.exists() && snap.data().contenu === TEXTE_MASQUE
      && !!s.contenu && s.contenu !== TEXTE_MASQUE;
    await updateDoc(ref, {
      masque: false, raisonModeration: null,
      ...(estEchoRep(s) && { masqueAt: null }),
      ...(texteRemplace && { contenu: s.contenu }),
    });
  };

  const handleRetablir = async (s: Signalement) => {
    if (!confirm('Rétablir ce contenu ? Il redeviendra visible.')) return;
    try {
      if (s.echoRepAttenteId) {
        await updateDoc(doc(db, 'echoreps_attente', s.echoRepAttenteId), { statut: 'en_attente' });
        const echoSnap = await getDoc(doc(db, 'echos', s.echoId));
        const proprietaireId = echoSnap.exists() ? (echoSnap.data().auteurId as string | undefined) : undefined;
        if (proprietaireId) {
          await creerNotification({
            destinataireId: proprietaireId, type: 'echoRep',
            expediteurId: s.auteurContenuId, expediteurPseudo: s.auteurContenuPseudo,
            echoId: s.echoId, contenuApercu: s.contenu,
          });
        }
      } else {
        await restaurerContenu(s);
      }
      await updateDoc(doc(db, 'signalements', s.id), { statut: 'ignore', decision: 'Faux positif — contenu rétabli' });
      afficher('✅ Contenu rétabli.');
    } catch { afficher('❌ Erreur lors du rétablissement.'); }
  };

  // « Confirmer » : le contenu reste masqué. Pas de nouvelle écriture sur le
  // contenu et pas de notification à l'auteur (choix du 19/10/2026) ; la
  // décision reste récupérable depuis l'onglet « Traités ».
  const handleConfirmerMasquage = async (s: Signalement) => {
    if (s.echoRepAttenteId) {
      await updateDoc(doc(db, 'echoreps_attente', s.echoRepAttenteId), { statut: 'refuse' });
      await marquerTraite(s.id, 'Proposition d\'EchoRep bloquée — coordonnées personnelles');
    } else if (estEchoRep(s)) {
      await marquerTraite(s.id, 'ÉchoRep masquée — récupérable par admin');
    } else {
      await marquerTraite(s.id, 'Écho masqué — récupérable par admin');
    }
    afficher('✅ Masquage confirmé.');
  };

  const handleSupprimer = async (s: Signalement) => {
    if (!confirm('Supprimer définitivement ce contenu ?')) return;
    await supprimerContenu(s);
    await marquerTraite(s.id, 'Contenu supprimé définitivement');
    afficher('✅ Contenu supprimé définitivement.');
  };

  const handleSuspendre = async () => {
    if (!suspensionModal) return;
    const { signalement, action } = suspensionModal;
    try {
      if (action === 'temp') {
        await modererCompte(signalement.auteurContenuId, 'suspendre_temp', user!.uid, signalement.raison, dureeSuspension);
        await supprimerContenu(signalement);
        await marquerTraite(signalement.id, `Compte suspendu ${dureeSuspension}h — contenu supprimé`);
        afficher(`✅ Compte suspendu ${dureeSuspension}h et contenu supprimé.`);
      } else {
        await modererCompte(signalement.auteurContenuId, 'suspendre_def', user!.uid, signalement.raison);
        await supprimerContenu(signalement);
        await marquerTraite(signalement.id, 'Compte banni — contenu supprimé');
        afficher('✅ Compte banni et contenu supprimé.');
      }
    } catch { afficher('❌ Erreur lors de la suspension.'); }
    setSuspensionModal(null);
  };

  const handleArchiver = async (id: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'archive' });
    afficher('✅ Signalement archivé.');
  };

  const handleRecuperer = async (s: Signalement) => {
    await restaurerContenu(s);
    await updateDoc(doc(db, 'signalements', s.id), { decision: 'Contenu récupéré par admin' });
    afficher('✅ Contenu récupéré.');
  };

  if (!estModerateur) {
    return (
      <div className="moderation-page">
        <div className="modo-header"><h1>⚠️ Accès refusé</h1><p>Réservé aux modérateurs EchoTalk.</p></div>
      </div>
    );
  }

  const enAttenteCount = signalements.filter(s => s.statut === 'en_attente').length;
  const estRecuperable = (s: Signalement) => s.decision?.includes('masqué') || s.decision?.includes('masquée');
  const estBouteille = (s: Signalement) => s.type === 'echo_bouteille';
  // Bouteille retenue : par le filtre de l'appli, ou par l'IA quand elle
  // contient des coordonnées (19/10/2026).
  const estBouteilleEnAttente = (s: Signalement) => estBouteille(s) && s.statut === 'en_attente'
    && (s.source === 'algorithme' || !!s.coordonnees);

  const typeLabel = (type: string) => {
    if (type === 'echo') return '🕊️ Écho';
    if (type === 'echorep' || type === 'echo_rep') return '💬 ÉchoRep';
    if (type === 'echo_bouteille') return '🍾 Écho-Bouteille';
    if (type === 'echolegue') return '📖 Écholègue';
    return '👤 Compte';
  };

  return (
    <div className="moderation-page">
      <div className="modo-header">
        <h1>🛡️ Modération EchoTalk</h1>
        <p>Accès restreint — modérateurs EchoTalk</p>
      </div>

      {message && <div className="modo-message">{message}</div>}

      {suspensionModal && (
        <div className="suspension-overlay" onClick={() => setSuspensionModal(null)}>
          <div className="suspension-modal" onClick={e => e.stopPropagation()}>
            <h3>{suspensionModal.action === 'temp' ? '⏸️ Suspendre temporairement' : '🚫 Bannir définitivement'}</h3>
            <p><strong>{suspensionModal.signalement.auteurContenuPseudo}</strong></p>
            <p className="suspension-avertissement">⚠️ Le contenu signalé sera également supprimé.</p>
            {suspensionModal.action === 'temp' && (
              <div className="duree-choix">
                <p>Durée de suspension :</p>
                {DUREES_SUSPENSION.map(d => (
                  <button key={d.heures} className={`duree-btn ${dureeSuspension === d.heures ? 'active' : ''}`}
                    onClick={() => setDureeSuspension(d.heures)}>{d.label}</button>
                ))}
              </div>
            )}
            {suspensionModal.action === 'def' && (
              <p className="suspension-avertissement">🚫 Bannissement irréversible.</p>
            )}
            <div className="suspension-actions">
              <button onClick={() => setSuspensionModal(null)}>Annuler</button>
              <button className="btn-confirmer" onClick={handleSuspendre}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {echoleguesEnAttente.length > 0 && (
        <div className="modo-liste" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem' }}>
            📖 Écholègues en attente de modération
            <span className="badge" style={{ marginLeft: '0.5rem' }}>{echoleguesEnAttente.length}</span>
          </h2>
          {echoleguesEnAttente.map(legue => (
            <div key={legue.id} className="modo-card algo">
              <div className="modo-card-header">
                <span className="modo-source algorithme">🤖 Détection auto</span>
                <span className="modo-type">📖 Écholègue</span>
                <span className="modo-date">
                  {legue.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="modo-auteur">
                <span className="modo-pseudo">{legue.auteurPseudo}</span>
              </div>
              <p className="modo-contenu"><strong>Récit :</strong> "{legue.recit}"</p>
              <p className="modo-contenu"><strong>Leçon :</strong> "{legue.lecon}"</p>
              <div className="modo-actions">
                <button className="btn-valider-bouteille" onClick={() => handleValiderEcholegue(legue)}>
                  ✅ Valider — publier
                </button>
                <button className="btn-supprimer" onClick={() => handleSupprimerEcholegue(legue)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="modo-onglets">
        <button className={onglet === 'en_attente' ? 'active' : ''} onClick={() => setOnglet('en_attente')}>
          En attente {enAttenteCount > 0 && onglet === 'en_attente' && <span className="badge">{enAttenteCount}</span>}
        </button>
        <button className={onglet === 'traites' ? 'active' : ''} onClick={() => setOnglet('traites')}>Traités</button>
      </div>

      {loading ? <p className="modo-vide">Chargement...</p>
        : signalements.length === 0
          ? <p className="modo-vide">Aucun signalement {onglet === 'en_attente' ? 'en attente' : 'traité'}.</p>
          : (
            <div className="modo-liste">
              {signalements.map(s => (
                <div key={s.id} className={`modo-card ${s.source === 'utilisateur' ? 'user' : 'algo'}`}>
                  <div className="modo-card-header">
                    <span className={`modo-source ${s.source === 'utilisateur' ? 'utilisateur' : 'algorithme'}`}>
                      {s.source === 'algorithme' ? '🤖 Détection auto' : s.source === 'ia' ? '🤖 IA' : '🚩 Signalement'}
                    </span>
                    <span className="modo-type">{typeLabel(s.type)}</span>
                    <span className="modo-date">
                      {s.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="modo-auteur">
                    <span className="modo-pseudo">{s.auteurContenuPseudo}</span>
                    {s.identiteReelle && (
                      <span className="modo-identite">👤 {s.identiteReelle.prenom} {s.identiteReelle.nom} — {s.identiteReelle.email}</span>
                    )}
                  </div>
                  {s.coordonnees && s.statut === 'en_attente' && !estBouteille(s) && (
                    <div className="modo-masque-auto">
                      🔒 {s.echoRepAttenteId
                        ? 'Proposition retenue automatiquement — coordonnées personnelles. Le propriétaire de l\'Écho ne l\'a pas vue.'
                        : 'Masqué automatiquement — coordonnées personnelles. Invisible pour tous en attendant ta décision.'}
                    </div>
                  )}
                  <p className="modo-contenu">"{s.contenu}"</p>
                  <div className="modo-raison">
                    <strong>Raison :</strong> {s.raison}
                    {s.raisonsAlgo && s.raisonsAlgo.length > 0 && (
                      <ul>{s.raisonsAlgo.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    )}
                  </div>

                  {s.statut === 'en_attente' && (
                    <div className="modo-actions">
                      {estBouteilleEnAttente(s) ? (
                        <>
                          <button className="btn-valider-bouteille" onClick={() => handleValiderBouteille(s)}>
                            ✅ Valider — envoyer
                          </button>
                          <button className="btn-supprimer" onClick={() => handleSupprimer(s)}>Supprimer</button>
                        </>
                      ) : s.coordonnees ? (
                        <>
                          <button className="btn-retablir" onClick={() => handleRetablir(s)}>↩️ Rétablir (erreur)</button>
                          <button className="btn-masquer" onClick={() => handleConfirmerMasquage(s)}>
                            {s.echoRepAttenteId ? 'Confirmer le blocage' : 'Confirmer le masquage'}
                          </button>
                          <button className="btn-supprimer" onClick={() => handleSupprimer(s)}>Supprimer</button>
                          <button className="btn-suspendre-temp" onClick={() => setSuspensionModal({ signalement: s, action: 'temp' })}>Suspendre</button>
                          <button className="btn-suspendre-def" onClick={() => setSuspensionModal({ signalement: s, action: 'def' })}>Bannir</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-ignorer" onClick={() => handleIgnorer(s.id)}>Ignorer</button>
                          {s.type !== 'compte' && (
                            <>
                              <button className="btn-masquer" onClick={() => handleMasquer(s)}>Masquer</button>
                              <button className="btn-supprimer" onClick={() => handleSupprimer(s)}>Supprimer</button>
                            </>
                          )}
                          <button className="btn-suspendre-temp" onClick={() => setSuspensionModal({ signalement: s, action: 'temp' })}>Suspendre</button>
                          <button className="btn-suspendre-def" onClick={() => setSuspensionModal({ signalement: s, action: 'def' })}>Bannir</button>
                        </>
                      )}
                    </div>
                  )}

                  {s.statut !== 'en_attente' && (
                    <div className="modo-traite-row">
                      <div className="modo-traite-info">
                        <span className="modo-traite">✅ Traité</span>
                        {s.decision && <span className="modo-decision">— {s.decision}</span>}
                      </div>
                      <div className="modo-traite-actions">
                        {estRecuperable(s) && (
                          <button className="btn-recuperer" onClick={() => handleRecuperer(s)}>
                            <i className="ti ti-rotate" /> Récupérer
                          </button>
                        )}
                        <button className="btn-archiver" onClick={() => handleArchiver(s.id)}>
                          <i className="ti ti-archive" /> Archiver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

      <Link to="/moderation-detresse" className="btn-admin btn-moderation">🫂 Modération Détresse</Link>
    </div>
  );
}
