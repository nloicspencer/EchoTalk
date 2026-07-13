import {
  collection,
  doc, DocumentData, getDoc,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import './ModerationPage.css';

// Ressources d'aide incluses dans le texte copié pour le mail de soutien.
// Vérifiées à jour (2026) — à revérifier périodiquement.
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

interface SignalementDetresse {
  id: string; echoId: string; echoRepId?: string; echoBouteilleId?: string;
  auteurContenuId: string; auteurContenuPseudo: string;
  contenu: string; raison: string;
  statut: string; decision?: string; createdAt: Date;
  identiteReelle?: { prenom: string; nom: string; email: string };
}

// Page volontairement simple et autonome : une seule requête Firestore, pas
// d'onglets, pas de logique partagée avec la modération classique. Cette
// séparation évite tout couplage entre les deux volets, chacun avec ses
// propres règles (ici : jamais de suppression/suspension de contenu, juste
// Ignorer ou Soutenir).
export default function ModerationDetressePage() {
  const { profile } = useAuth();
  const [signalements, setSignalements] = useState<SignalementDetresse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
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

  const construireSignalements = async (docs: QueryDocumentSnapshot<DocumentData>[]): Promise<SignalementDetresse[]> => {
    const filtres = docs.filter(d => d.data().statut !== 'archive');
    return Promise.all(filtres.map(async d => {
      const data = d.data();
      const identiteReelle = await chargerIdentite(data.auteurContenuId);
      return {
        id: d.id, echoId: data.echoId || '', echoRepId: data.echoRepId,
        echoBouteilleId: data.echoBouteilleId,
        auteurContenuId: data.auteurContenuId, auteurContenuPseudo: data.auteurContenuPseudo,
        contenu: data.contenu, raison: data.raison,
        statut: data.statut, decision: data.decision || '',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        identiteReelle,
      } as SignalementDetresse;
    }));
  };

  useEffect(() => {
    if (!estModerateur) return;
    const q = query(
      collection(db, 'signalements'),
      where('type', '==', 'detresse'),
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
  }, [estModerateur]);

  const afficher = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 5000); };

  const handleIgnorer = async (id: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'traite', decision: 'Ignoré — signal jugé non pertinent' });
    afficher('✅ Signal ignoré.');
  };

  const handleSoutenir = async (s: SignalementDetresse) => {
    const email = s.identiteReelle?.email;
    if (!email || email === '—') {
      afficher('❌ Aucune adresse email connue pour ce compte — vérifiez manuellement.');
      return;
    }
    try {
      await navigator.clipboard.writeText(genererTexteSoutien(email));
      window.open('https://webmail.gandi.net/', '_blank');
      await updateDoc(doc(db, 'signalements', s.id), { statut: 'traite', decision: 'Ressources de soutien proposées par email' });
      afficher('✅ Texte du mail copié — collez-le dans un nouveau message depuis votre webmail.');
    } catch {
      afficher('❌ Impossible de copier le texte automatiquement — vérifiez les permissions du navigateur.');
    }
  };

  const handleArchiver = async (id: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'archive' });
    afficher('✅ Signal archivé.');
  };

  if (!estModerateur) {
    return (
      <div className="moderation-page">
        <div className="modo-header"><h1>⚠️ Accès refusé</h1><p>Réservé aux modérateurs EchoTalk.</p></div>
      </div>
    );
  }

  // Un signalement de détresse a toujours type === "detresse", quel que soit
  // le canal d'origine — on déduit ce canal à partir des IDs disponibles.
  const origine = (s: SignalementDetresse) => {
    if (s.echoRepId) return { label: '💬 ÉchoRep', id: s.echoRepId };
    if (s.echoBouteilleId) return { label: '🍾 Écho-Bouteille', id: s.echoBouteilleId };
    return { label: '🕊️ Écho', id: s.echoId };
  };

  const enAttente = signalements.filter(s => s.statut === 'en_attente');
  const traites = signalements.filter(s => s.statut !== 'en_attente');

  const renderCarte = (s: SignalementDetresse) => (
    <div key={s.id} className="modo-card detresse">
      <div className="modo-card-header">
        <span className="modo-source algorithme">🤖 Détection auto</span>
        <span className="modo-type">🫂 Détresse</span>
        <span className="modo-date">
          {s.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="modo-auteur">
        <span className="modo-pseudo">{s.auteurContenuPseudo}</span>
        {s.identiteReelle && (
          <span className="modo-identite">👤 {s.identiteReelle.prenom} {s.identiteReelle.nom} — {s.identiteReelle.email}</span>
        )}
        <span className="modo-identite">{origine(s).label} — ID : {origine(s).id}</span>
      </div>
      <p className="modo-contenu">"{s.contenu}"</p>
      <div className="modo-raison"><strong>Raison :</strong> {s.raison}</div>

      {s.statut === 'en_attente' ? (
        <div className="modo-actions">
          <button className="btn-ignorer" onClick={() => handleIgnorer(s.id)}>Ignorer</button>
          <button className="btn-soutenir" onClick={() => handleSoutenir(s)}>🤍 Soutenir</button>
        </div>
      ) : (
        <div className="modo-traite-row">
          <div className="modo-traite-info">
            <span className="modo-traite">✅ Traité</span>
            {s.decision && <span className="modo-decision">— {s.decision}</span>}
          </div>
          <div className="modo-traite-actions">
            <button className="btn-archiver" onClick={() => handleArchiver(s.id)}>
              <i className="ti ti-archive" /> Archiver
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="moderation-page">
      <div className="modo-header">
        <h1>🫂 Modération Détresse</h1>
        <p>Signaux de détresse détectés par l'IA — à évaluer par un humain</p>
      </div>

      {message && <div className="modo-message">{message}</div>}

      {loading ? <p className="modo-vide">Chargement...</p>
        : signalements.length === 0
          ? <p className="modo-vide">Aucun signal de détresse pour le moment.</p>
          : (
            <div className="modo-liste">
              {enAttente.map(renderCarte)}
              {traites.map(renderCarte)}
            </div>
          )}

      <Link to="/moderation" className="btn-admin btn-moderation">🛡️ Modération EchoTalk</Link>
    </div>
  );
}
