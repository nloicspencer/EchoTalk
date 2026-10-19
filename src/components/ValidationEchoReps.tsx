import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { creerNotification } from '../hooks/useNotifications';
import { notifierMentions } from '../hooks/useMentions';
import { Mention } from '../types';
import { TexteAvecMentions } from './Mentions';
import './ValidationEchoReps.css';

interface RepEnAttente {
  id: string;
  echoId: string;
  echoContenu: string;
  auteurId: string;
  auteurPseudo: string;
  contenu: string;
  createdAt: Date;
  expiresAt: Date;
  mentions: Mention[];
}

interface Props {
  proprietaireId: string;
}

export default function ValidationEchoReps({ proprietaireId }: Props) {
  const [enAttente, setEnAttente] = useState<RepEnAttente[]>([]);
  const [echoData, setEchoData] = useState<Record<string, { contenu: string; placesOccupees: number; placesMax: number }>>({});

  useEffect(() => {
    if (!proprietaireId) return;
    // « analyse_en_cours » (19/10/2026) : proposition pas encore analysée par
    // l'IA, normalement invisible. Filet de sécurité : si elle est restée
    // dans cet état plus de 5 minutes (Cloud Functions arrêtées, crédits
    // Anthropic épuisés…), elle s'affiche quand même, pour ne jamais rester
    // bloquée. Le filtre de l'appli l'a déjà vérifiée à l'envoi.
    const q = query(collection(db, 'echoreps_attente'), where('statut', 'in', ['en_attente', 'analyse_en_cours']));
    const unsub = onSnapshot(q, async (snap) => {
      const items: RepEnAttente[] = [];
      const echodata: typeof echoData = {};
      for (const d of snap.docs) {
        const data = d.data();
        if (data.statut === 'analyse_en_cours') {
          const creeLe = data.createdAt instanceof Timestamp ? data.createdAt.toDate().getTime() : Date.now();
          if (Date.now() - creeLe < 5 * 60 * 1000) continue;
        }
        try {
          const echoRef = await getDoc(doc(db, 'echos', data.echoId));
          if (echoRef.exists() && echoRef.data().auteurId === proprietaireId) {
            items.push({
              id: d.id, echoId: data.echoId, echoContenu: data.echoContenu || '',
              auteurId: data.auteurId, auteurPseudo: data.auteurPseudo, contenu: data.contenu,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
              expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(),
              mentions: Array.isArray(data.mentions) ? (data.mentions as Mention[]) : [],
            });
            echodata[data.echoId] = {
              contenu: echoRef.data().contenu,
              placesOccupees: echoRef.data().placesOccupees || 0,
              placesMax: echoRef.data().placesMax || 0,
            };
          }
        } catch {}
      }
      setEnAttente(items);
      setEchoData(echodata);
    });
    return unsub;
  }, [proprietaireId]);

  const tempsRestant = (expiresAt: Date) => {
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Expirée';
    const heures = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${heures}h${minutes}m`;
  };

  const handleAccepter = async (rep: RepEnAttente) => {
    const echo = echoData[rep.echoId];
    if (!echo) return;
    await updateDoc(doc(db, 'echoreps_attente', rep.id), { statut: 'accepte' });
    await addDoc(collection(db, 'echos', rep.echoId, 'echoreps'), {
      auteurId: rep.auteurId, auteurPseudo: rep.auteurPseudo, contenu: rep.contenu,
      mentions: rep.mentions, createdAt: serverTimestamp(), modifie: false, supprime: false,
    });
    await updateDoc(doc(db, 'echos', rep.echoId), { placesOccupees: echo.placesOccupees + 1 });
    // Notification (30/09/2026) — ce composant gère l'acceptation/refus
    // directement (il ne passe pas par validerEchoRep() de
    // useModeration.ts), donc la notification à l'auteur·e de la
    // proposition est créée ici.
    await creerNotification({
      destinataireId: rep.auteurId, type: 'echoRepValidee',
      echoId: rep.echoId, contenuApercu: rep.contenu,
    });
    // Tags @pseudonyme (19/10/2026) : les personnes taguées dans la
    // proposition ne sont prévenues qu'ici, une fois la réponse acceptée.
    // De la part de l'auteur·e de l'EchoRep, pas du propriétaire.
    await notifierMentions(rep.mentions, {
      expediteurId: rep.auteurId, expediteurPseudo: rep.auteurPseudo,
      echoId: rep.echoId, texte: rep.contenu,
    });
  };

  const handleRefuser = async (rep: RepEnAttente) => {
    await updateDoc(doc(db, 'echoreps_attente', rep.id), { statut: 'refuse' });
    await creerNotification({
      destinataireId: rep.auteurId, type: 'echoRepRefusee',
      echoId: rep.echoId, contenuApercu: rep.contenu,
    });
  };

  if (enAttente.length === 0) return null;

  return (
    <div className="validation-section">
      <h3>EchoReps en attente de validation</h3>
      <p className="validation-note">
        {enAttente.length} EchoRep{enAttente.length > 1 ? 's' : ''} en attente.
        Sans réponse, elles seront acceptées automatiquement à l'expiration.
      </p>
      <div className="validation-liste">
        {enAttente.map(rep => (
          <div key={rep.id} className="validation-item">
            <div className="validation-echo-titre">
              Écho : "{(echoData[rep.echoId]?.contenu || rep.echoContenu).slice(0, 60)}..."
            </div>
            <div className="validation-auteur">{rep.auteurPseudo}</div>
            <p className="validation-contenu"><TexteAvecMentions texte={rep.contenu} mentions={rep.mentions} /></p>
            <div className="validation-footer">
              <span className="validation-timer">
                <i className="ti ti-clock" aria-hidden="true" /> {tempsRestant(rep.expiresAt)}
              </span>
              <div className="validation-actions">
                <button className="btn-refuser" onClick={() => handleRefuser(rep)}>
                  <i className="ti ti-x" aria-hidden="true" /> Refuser
                </button>
                <button className="btn-accepter" onClick={() => handleAccepter(rep)}>
                  <i className="ti ti-check" aria-hidden="true" /> Accepter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
