import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  collection, onSnapshot, query, where,
  updateDoc, doc, getDoc, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { modererEcho } from '../hooks/useModeration';
import './ModerationPage.css';

const MODERATEURS = ['loicspencer3@echotalk.com'];

const DUREES_SUSPENSION = [
  { label: '24 heures', heures: 24 },
  { label: '48 heures', heures: 48 },
  { label: '7 jours', heures: 168 },
];

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
  const [suspensionModal, setSuspensionModal] = useState<{ signalement: Signalement; action: 'temp' | 'def' } | null>(null);
  const [dureeSuspension, setDureeSuspension] = useState(24);
  const estModerateur = user && MODERATEURS.includes(user.email ?? '');

  useEffect(() => {
    if (!estModerateur) return;
    const statut = onglet === 'en_attente' ? 'en_attente' : 'traite';
    const q = query(collection(db, 'signalements'), where('statut', '==', statut));
    const unsub = onSnapshot(q, async (snap) => {
      const items: Signalement[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        if (data.statut === 'archive') continue;
        let identiteReelle;
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
          id: d.id, echoId: data.echoId, echoRepId: data.echoRepId,
          auteurContenuId: data.auteurContenuId, auteurContenuPseudo: data.auteurContenuPseudo,
          contenu: data.contenu, raison: data.raison, raisonsAlgo: data.raisonsAlgo,
          type: data.type, source: data.source, statut: data.statut,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          identiteReelle,
        });
      }
      setSignalements(items);
      setLoading(false);
    });
    return unsub;
  }, [estModerateur, onglet]);

  const afficher = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const handleIgnorer = async (id: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'ignore' });
    afficher('✅ Signalement ignoré.');
  };

  const handleMasquer = async (s: Signalement) => {
    await modererEcho(s.echoId, 'masquer', user!.uid, s.raison);
    await updateDoc(doc(db, 'signalements', s.id), { statut: 'traite' });
    afficher('✅ Contenu masqué.');
  };

  const handleSupprimer = async (s: Signalement) => {
    if (!confirm('Supprimer définitivement ?')) return;
    if (s.type === 'echorep' && s.echoRepId) {
      await updateDoc(doc(db, 'echos', s.echoId, 'echoreps', s.echoRepId), {
        supprime: true,
        suppressionAt: serverTimestamp(),
        contenu: 'EchoRep supprimée suite à un signalement.',
      });
    } else {
      await modererEcho(s.echoId, 'supprimer', user!.uid, s.raison);
    }
    await updateDoc(doc(db, 'signalements', s.id), { statut: 'traite' });
    afficher('✅ Contenu supprimé.');
  };

  const handleSuspendre = async () => {
    if (!suspensionModal) return;
    const { signalement, action } = suspensionModal;
    const jusqu = action === 'temp'
      ? new Date(Date.now() + dureeSuspension * 60 * 60 * 1000)
      : null;
    await updateDoc(doc(db, 'users', signalement.auteurContenuId), {
      suspension: {
        type: action,
        raison: signalement.raison,
        moderateurId: user!.uid,
        date: new Date(),
        jusqu,
      },
    });
    await updateDoc(doc(db, 'signalements', signalement.id), { statut: 'traite' });
    setSuspensionModal(null);
    afficher(action === 'temp' ? `✅ Compte suspendu ${dureeSuspension}h.` : '✅ Compte banni définitivement.');
  };

  const handleArchiver = async (id: string) => {
    await updateDoc(doc(db, 'signalements', id), { statut: 'archive' });
    afficher('✅ Signalement archivé.');
  };

  if (!estModerateur) {
    return (
      <div className="moderation-page">
        <div className="modo-header"><h1>⚠️ Accès refusé</h1><p>Réservé aux modérateurs EchoTalk.</p></div>
      </div>
    );
  }

  const enAttenteCount = signalements.filter(s => s.statut === 'en_attente').length;

  return (
    <div className="moderation-page">
      <div className="modo-header">
        <h1>🛡️ Modération EchoTalk</h1>
        <p>Accès restreint — modérateurs EchoTalk</p>
      </div>

      {message && <div className="modo-message">{message}</div>}

      {/* Modal suspension */}
      {suspensionModal && (
        <div className="suspension-overlay" onClick={() => setSuspensionModal(null)}>
          <div className="suspension-modal" onClick={e => e.stopPropagation()}>
            <h3>{suspensionModal.action === 'temp' ? '⏸️ Suspendre temporairement' : '🚫 Bannir définitivement'}</h3>
            <p><strong>{suspensionModal.signalement.auteurContenuPseudo}</strong></p>
            {suspensionModal.action === 'temp' && (
              <div className="duree-choix">
                <p>Durée de suspension :</p>
                {DUREES_SUSPENSION.map(d => (
                  <button
                    key={d.heures}
                    className={`duree-btn ${dureeSuspension === d.heures ? 'active' : ''}`}
                    onClick={() => setDureeSuspension(d.heures)}
                  >{d.label}</button>
                ))}
              </div>
            )}
            {suspensionModal.action === 'def' && (
              <p className="suspension-avertissement">⚠️ Cette action est irréversible.</p>
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
          En attente {enAttenteCount > 0 && <span className="badge">{enAttenteCount}</span>}
        </button>
        <button className={onglet === 'traites' ? 'active' : ''} onClick={() => setOnglet('traites')}>Traités</button>
      </div>

      {loading ? <p className="modo-vide">Chargement...</p>
        : signalements.length === 0 ? <p className="modo-vide">Aucun signalement {onglet === 'en_attente' ? 'en attente' : 'traité'}.</p>
        : (
          <div className="modo-liste">
            {signalements.map(s => (
              <div key={s.id} className={`modo-card ${s.source === 'algorithme' ? 'algo' : 'user'}`}>
                <div className="modo-card-header">
                  <span className={`modo-source ${s.source}`}>
                    {s.source === 'algorithme' ? '🤖 Détection auto' : '🚩 Signalement'}
                  </span>
                  <span className="modo-type">
                    {s.type === 'echo' ? '🕊️ Écho' : s.type === 'echorep' ? '💬 EchoRep' : '👤 Compte'}
                  </span>
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
                        <button className="btn-masquer" onClick={() => handleMasquer(s)}>Masquer</button>
                        <button className="btn-supprimer" onClick={() => handleSupprimer(s)}>Supprimer</button>
                      </>
                    )}
                    <button className="btn-suspendre-temp" onClick={() => setSuspensionModal({ signalement: s, action: 'temp' })}>Suspendre</button>
                    <button className="btn-suspendre-def" onClick={() => setSuspensionModal({ signalement: s, action: 'def' })}>Bannir</button>
                  </div>
                )}

                {s.statut !== 'en_attente' && (
                  <div className="modo-traite-row">
                    <span className="modo-traite">✅ Traité</span>
                    <button className="btn-archiver" onClick={() => handleArchiver(s.id)}>📦 Archiver</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
