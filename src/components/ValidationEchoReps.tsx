import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
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
}

interface Props {
  proprietaireId: string;
}

export default function ValidationEchoReps({ proprietaireId }: Props) {
  const [enAttente, setEnAttente] = useState<RepEnAttente[]>([]);
  const [echoData, setEchoData] = useState<Record<string, { contenu: string; placesOccupees: number; placesMax: number }>>({});

  useEffect(() => {
    if (!proprietaireId) return;
    const q = query(collection(db, 'echoreps_attente'), where('statut', '==', 'en_attente'));
    const unsub = onSnapshot(q, async (snap) => {
      const items: RepEnAttente[] = [];
      const echodata: typeof echoData = {};
      for (const d of snap.docs) {
        const data = d.data();
        try {
          const echoRef = await getDoc(doc(db, 'echos', data.echoId));
          if (echoRef.exists() && echoRef.data().auteurId === proprietaireId) {
            items.push({
              id: d.id, echoId: data.echoId, echoContenu: data.echoContenu || '',
              auteurId: data.auteurId, auteurPseudo: data.auteurPseudo, contenu: data.contenu,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
              expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(),
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
      createdAt: serverTimestamp(), modifie: false, supprime: false,
    });
    await updateDoc(doc(db, 'echos', rep.echoId), { placesOccupees: echo.placesOccupees + 1 });
  };

  const handleRefuser = async (rep: RepEnAttente) => {
    await updateDoc(doc(db, 'echoreps_attente', rep.id), { statut: 'refuse' });
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
            <p className="validation-contenu">{rep.contenu}</p>
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
