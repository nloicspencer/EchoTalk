import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  collection, onSnapshot, query, orderBy, where,
  updateDoc, doc, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { modererCompte, modererEcho } from '../hooks/useModeration';
import './ModerationPage.css';

const MODERATEURS = ['loicspencer3@echotalk.com'];

interface Signalement {
  id: string;
  echoId: string;
  echoRepId?: string;
  auteurContenuId: string;
  auteurContenuPseudo: string;
  contenu: string;
  raison: string;
  raisonsAlgo?: string[];
  type: string;
  source: 'utilisateur' | 'algorithme';
  statut: string;
  createdAt: Date;
  identiteReelle?: { prenom: string; nom: string; email: string };
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [onglet, setOnglet] = useState<'en_attente' | 'traites'>('en_attente');

  useEffect(() => {
    const q = query(
      collection(db, 'signalements'),
      where('statut', '==', onglet === 'en_attente' ? 'en_attente' : 'traite'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const items: Signalement[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        let identiteReelle;

        // Récupérer identité réelle de l'auteur
        if (data.auteurContenuId && data.auteurContenuId !== 'systeme') {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.auteurContenuId));
            if (userDoc.exists()) {
              const ud = userDoc.data();
              identiteReelle = { prenom: ud.prenom || '—', nom: ud.nom || '—', email: ud.email || '—' };
            }
          } catch {}
        }

        items.push({
          id: d.id,
          echoId: data.echoId,
          echoRepId: data.echoRepId,
          auteurContenuId: data.auteurContenuId,
          auteurContenuPseudo: data.auteurContenuPseudo,
          contenu: data.contenu,
          raison: data.raison,
          raisonsAlgo: data.raisonsAlgo,
          type: data.type,
          source: data.source,
          statut: data.statut,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          identiteReelle,
        });
      }
      setSignalements(items);
      setLoading(false);
    });

    return unsub;
  }, [onglet]);

  const afficherMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleIgnorer = async (id: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'ignore' });
    afficherMessage('✅ Signalement ignoré.');
  };

  const handleMasquerEcho = async (s: Signalement) => {
    await modererEcho(s.echoId, 'masquer', user.uid, s.raison);
    await updateDoc(doc(db, 'signalements', s.id), { statut: 'traite' });
    afficherMessage('✅ Écho masqué.');
  };

  const handleSupprimerEcho = async (s: Signalement) => {
    if (!confirm('Supprimer définitivement cet écho ?')) return;
    await modererEcho(s.echoId, 'supprimer', user.uid, s.raison);
    await updateDoc(doc(db, 'signalements', s.id), { statut: 'traite' });
    afficherMessage('✅ Écho supprimé.');
  };

  const handleSuspendreTemp = async (s: Signalement) => {
    if (!confirm(`Suspendre temporairement ${s.auteurContenuPseudo} ?`)) return;
    await modererCompte(s.auteurContenuId, 'suspendre_temp', user.uid, s.raison);
    await updateDoc(doc(db, 'signalements', s.id), { statut: 'traite' });
    afficherMessage('✅ Compte suspendu temporairement.');
  };

  const handleSuspendreDef = async (s: Signalement) => {
    if (!confirm(`Bannir définitivement ${s.auteurContenuPseudo} ? Cette action est irréversible.`)) return;
    await modererCompte(s.auteurContenuId, 'suspendre_def', user.uid, s.raison);
    await updateDoc(doc(db, 'signalements', s.id), { statut: 'traite' });
    afficherMessage('✅ Compte banni définitivement.');
  };

  const enAttente = signalements.filter(s => s.statut === 'en_attente');
  const traites = signalements.filter(s => s.statut !== 'en_attente');

  if (!user || !MODERATEURS.includes(user.email ?? '')) {
    return (
      <div className="moderation-page">
        <div className="modo-header">
          <h1>⚠️ Accès refusé</h1>
          <p>Cette page est réservée aux modérateurs EchoTalk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-page">
      <div className="modo-header">
        <h1>🛡️ Modération EchoTalk</h1>
        <p>Accès restreint — modérateurs EchoTalk</p>
      </div>

      {message && <div className="modo-message">{message}</div>}

      <div className="modo-onglets">
        <button className={onglet === 'en_attente' ? 'active' : ''} onClick={() => setOnglet('en_attente')}>
          En attente {enAttente.length > 0 && <span className="badge">{enAttente.length}</span>}
        </button>
        <button className={onglet === 'traites' ? 'active' : ''} onClick={() => setOnglet('traites')}>
          Traités
        </button>
      </div>

      {loading ? (
        <p className="modo-vide">Chargement...</p>
      ) : signalements.length === 0 ? (
        <p className="modo-vide">Aucun signalement {onglet === 'en_attente' ? 'en attente' : 'traité'}.</p>
      ) : (
        <div className="modo-liste">
          {signalements.map(s => (
            <div key={s.id} className={`modo-card ${s.source === 'algorithme' ? 'algo' : 'user'}`}>
              <div className="modo-card-header">
                <span className={`modo-source ${s.source}`}>
                  {s.source === 'algorithme' ? '🤖 Détection auto' : '🚩 Signalement utilisateur'}
                </span>
                <span className="modo-type">{s.type === 'echo' ? '🕊️ Écho' : s.type === 'echorep' ? '💬 EchoRep' : '👤 Compte'}</span>
                <span className="modo-date">{s.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="modo-auteur">
                <span className="modo-pseudo">{s.auteurContenuPseudo}</span>
                {s.identiteReelle && (
                  <span className="modo-identite">
                    👤 {s.identiteReelle.prenom} {s.identiteReelle.nom} — {s.identiteReelle.email}
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

              {s.statut === 'en_attente' && (
                <div className="modo-actions">
                  <button className="btn-ignorer" onClick={() => handleIgnorer(s.id)}>Ignorer</button>
                  {s.type !== 'compte' && (
                    <>
                      <button className="btn-masquer" onClick={() => handleMasquerEcho(s)}>Masquer</button>
                      <button className="btn-supprimer" onClick={() => handleSupprimerEcho(s)}>Supprimer</button>
                    </>
                  )}
                  <button className="btn-suspendre-temp" onClick={() => handleSuspendreTemp(s)}>Suspendre (temp)</button>
                  <button className="btn-suspendre-def" onClick={() => handleSuspendreDef(s)}>Bannir</button>
                </div>
              )}

              {s.statut !== 'en_attente' && (
                <span className="modo-traite">✅ Traité</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
