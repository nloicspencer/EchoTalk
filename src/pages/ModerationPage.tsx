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
import { useAuth } from '../context/AuthContext';
import { supprimerEchoBouteille, validerEchoBouteille } from '../hooks/useEchoBouteille';
import { masquerEchoRep, modererCompte, modererEcho, recupererEchoRep } from '../hooks/useModeration';
import { db } from '../services/firebase';
import './ModerationPage.css';

const DUREES_SUSPENSION = [
  { label: '24 heures', heures: 24 },
  { label: '48 heures', heures: 48 },
  { label: '7 jours', heures: 168 },
];

// Ressources d'aide incluses dans le mail de soutien envoyé depuis la
// rubrique Détresse. Vérifiées à jour (2026) — à revérifier périodiquement.
const RESSOURCES_SOUTIEN_SUJET = "Un message de l'équipe EchoTalk";
const RESSOURCES_SOUTIEN_CORPS = `Bonjour,

Nous avons remarqué qu'un de vos partages récents sur EchoTalk exprimait une grande souffrance. Nous ne savons pas précisément ce que vous traversez, mais nous voulions vous dire que vous n'êtes pas seul(e), et qu'il existe des personnes prêtes à vous écouter, à tout moment :

- 3114 — Numéro national de prévention du suicide, gratuit et accessible 24h/24 et 7j/7
- SOS Amitié — 09 72 39 40 50, écoute anonyme et gratuite, 24h/24 et 7j/7
- En cas de danger immédiat, appelez le 15 (SAMU) ou le 112

Prenez soin de vous.

L'équipe EchoTalk`;

function genererTexteSoutien(email: string): string {
  return `Destinataire : ${email}\nObjet : ${RESSOURCES_SOUTIEN_SUJET}\n\n${RESSOURCES_SOUTIEN_CORPS}`;
}

interface Signalement {
  id: string; echoId: string; echoRepId?: string; echoBouteilleId?: string;
  auteurContenuId: string; auteurContenuPseudo: string;
  contenu: string; raison: string; raisonsAlgo?: string[];
  type: string; source: 'utilisateur' | 'algorithme';
  statut: string; decision?: string; createdAt: Date;
  identiteReelle?: { prenom: string; nom: string; email: string };
}

export default function ModerationPage() {
  const { user, profile } = useAuth();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [onglet, setOnglet] = useState<'en_attente' | 'traites' | 'detresse'>('en_attente');
  const [detresseEnAttenteCount, setDetresseEnAttenteCount] = useState(0);
  const [suspensionModal, setSuspensionModal] = useState<{ signalement: Signalement; action: 'temp' | 'def' } | null>(null);
  const [dureeSuspension, setDureeSuspension] = useState(24);
  const estModerateur = profile?.role === 'admin' || profile?.role === 'moderateur';

  // Cache d'identité : évite de re-interroger Firestore pour un même auteur à
  // chaque rafraîchissement (avant, chaque snapshot refaisait tous les getDoc).
  const identiteCacheRef = useRef<Map<string, { prenom: string; nom: string; email: string }>>(new Map());
  // Compteur de requête : si un nouveau snapshot arrive avant que le
  // précédent ait fini de charger les identités, on ignore le résultat
  // obsolète au lieu de laisser une réponse en retard écraser une plus
  // récente (c'était la cause du "ça ne marche pas" par intermittence).
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

  const construireSignalements = async (
    docs: QueryDocumentSnapshot<DocumentData>[],
    exclureDetresse: boolean
  ): Promise<Signalement[]> => {
    const filtres = docs.filter(d => {
      const data = d.data();
      if (data.statut === 'archive') return false;
      if (exclureDetresse && data.type === 'detresse') return false;
      return true;
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        identiteReelle,
      } as Signalement;
    }));
  };

  useEffect(() => {
    if (!estModerateur) return;

    // Onglet Détresse : tous les signalements de type "detresse", peu importe
    // leur statut (en attente ou déjà traité), pour garder l'historique visible
    // dans une seule rubrique dédiée plutôt que mélangés à la modération classique.
    if (onglet === 'detresse') {
      const q = query(
        collection(db, 'signalements'),
        where('type', '==', 'detresse'),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        const requeteId = ++requeteIdRef.current;
        construireSignalements(snap.docs, false).then(items => {
          if (requeteId !== requeteIdRef.current) return; // une requête plus récente est en cours, on jette celle-ci
          setSignalements(items);
          setLoading(false);
        });
      });
      return unsub;
    }

    // Onglets En attente / Traités : modération classique, la Détresse est
    // exclue côté client pour ne pas la mélanger avec les vrais signalements.
    const statut = onglet === 'en_attente' ? 'en_attente' : 'traite';
    const q = query(
      collection(db, 'signalements'),
      where('statut', '==', statut),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const requeteId = ++requeteIdRef.current;
      construireSignalements(snap.docs, true).then(items => {
        if (requeteId !== requeteIdRef.current) return;
        setSignalements(items);
        setLoading(false);
      });
    });
    return unsub;
  }, [estModerateur, onglet]);

  // Compteur du badge "Détresse", actif en permanence quel que soit l'onglet
  // affiché, pour que le modérateur voie tout de suite s'il y a du nouveau.
  useEffect(() => {
    if (!estModerateur) return;
    const q = query(
      collection(db, 'signalements'),
      where('type', '==', 'detresse'),
      where('statut', '==', 'en_attente')
    );
    const unsub = onSnapshot(q, (snap) => {
      setDetresseEnAttenteCount(snap.docs.length);
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
    } else if (s.type === 'echorep' && s.echoRepId) {
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

  const handleSoutenir = async (s: Signalement) => {
    const email = s.identiteReelle?.email;
    if (!email || email === '—') {
      afficher("❌ Aucune adresse email connue pour ce compte — vérifiez manuellement.");
      return;
    }
    try {
      await navigator.clipboard.writeText(genererTexteSoutien(email));
      window.open('https://webmail.gandi.net/', '_blank');
      marquerTraite(s.id, 'Ressources de soutien proposées par email');
      afficher('✅ Texte du mail copié dans le presse-papier — collez-le dans un nouveau message depuis votre webmail.');
    } catch {
      afficher("❌ Impossible de copier le texte automatiquement — vérifiez les permissions du navigateur.");
    }
  };

  const handleValiderBouteille = async (s: Signalement) => {
    if (!s.echoBouteilleId) return;
    await validerEchoBouteille(s.echoBouteilleId, s.auteurContenuId);
    await marquerTraite(s.id, 'Écho-Bouteille validée — envoyée');
    afficher('✅ Écho-Bouteille validée et envoyée.');
  };

  const handleMasquer = async (s: Signalement) => {
    if (s.type === 'echorep' && s.echoRepId) {
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
    if (!s.echoRepId) {
      await updateDoc(doc(db, 'echos', s.echoId), { masque: false, raisonModeration: null });
    } else {
      await recupererEchoRep(s.echoId, s.echoRepId);
    }
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
  const estBouteilleEnAttente = (s: Signalement) => estBouteille(s) && s.source === 'algorithme' && s.statut === 'en_attente';

  const typeLabel = (type: string) => {
    if (type === 'echo') return '🕊️ Écho';
    if (type === 'echorep') return '💬 ÉchoRep';
    if (type === 'echo_bouteille') return '🍾 Écho-Bouteille';
    if (type === 'detresse') return '🫂 Détresse';
    return '👤 Compte';
  };

  // Un signalement de détresse a toujours type === "detresse", quel que soit
  // le canal d'origine — on déduit ce canal à partir des IDs disponibles pour
  // pouvoir retrouver le contenu exact (Écho, EchoRep ou Écho-Bouteille) dans
  // Firestore si besoin.
  const origineDetresse = (s: Signalement) => {
    if (s.echoRepId) return { label: '💬 ÉchoRep', id: s.echoRepId };
    if (s.echoBouteilleId) return { label: '🍾 Écho-Bouteille', id: s.echoBouteilleId };
    return { label: '🕊️ Écho', id: s.echoId };
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

      <div className="modo-onglets">
        <button className={onglet === 'en_attente' ? 'active' : ''} onClick={() => setOnglet('en_attente')}>
          En attente {enAttenteCount > 0 && onglet === 'en_attente' && <span className="badge">{enAttenteCount}</span>}
        </button>
        <button className={onglet === 'traites' ? 'active' : ''} onClick={() => setOnglet('traites')}>Traités</button>
        <button className={onglet === 'detresse' ? 'active' : ''} onClick={() => setOnglet('detresse')}>
          🫂 Détresse {detresseEnAttenteCount > 0 && <span className="badge">{detresseEnAttenteCount}</span>}
        </button>
      </div>

      {loading ? <p className="modo-vide">Chargement...</p>
        : signalements.length === 0
          ? <p className="modo-vide">
              {onglet === 'detresse' ? 'Aucun signal de détresse pour le moment.' : `Aucun signalement ${onglet === 'en_attente' ? 'en attente' : 'traité'}.`}
            </p>
          : (
            <div className="modo-liste">
              {signalements.map(s => (
                <div key={s.id} className={`modo-card ${s.source === 'algorithme' ? 'algo' : 'user'} ${s.type === 'detresse' ? 'detresse' : ''}`}>
                  <div className="modo-card-header">
                    <span className={`modo-source ${s.source}`}>
                      {s.source === 'algorithme' ? '🤖 Détection auto' : '🚩 Signalement'}
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
                    {s.type === 'detresse' && (
                      <span className="modo-identite">
                        {origineDetresse(s).label} — ID : {origineDetresse(s).id}
                      </span>
                    )}
                  </div>
                  <p className="modo-contenu">"{s.contenu}"</p>
                  <div className="modo-raison">
                    <strong>Raison :</strong> {s.raison}
                    {s.raisonsAlgo && s.raisonsAlgo.length > 0 && (
                      <ul>{s.raisonsAlgo.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    )}
                  </div>

                  {s.statut === 'en_attente' && s.type === 'detresse' && (
                    <div className="modo-actions">
                      <button className="btn-ignorer" onClick={() => handleIgnorer(s.id)}>Ignorer</button>
                      <button className="btn-soutenir" onClick={() => handleSoutenir(s)}>🤍 Soutenir</button>
                    </div>
                  )}

                  {s.statut === 'en_attente' && s.type !== 'detresse' && (
                    <div className="modo-actions">
                      {/* Écho-Bouteille algo : Valider ou Supprimer uniquement */}
                      {estBouteilleEnAttente(s) ? (
                        <>
                          <button className="btn-valider-bouteille" onClick={() => handleValiderBouteille(s)}>
                            ✅ Valider — envoyer
                          </button>
                          <button className="btn-supprimer" onClick={() => handleSupprimer(s)}>Supprimer</button>
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
    </div>
  );
}
