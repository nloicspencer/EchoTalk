import {
  collection, addDoc, serverTimestamp, updateDoc, doc,
  onSnapshot, query, orderBy, where, getDocs, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { analyserContenu } from '../services/moderation';

export interface Signalement {
  id: string;
  echoId: string;
  echoRepId?: string;
  auteurSignalementId: string;
  auteurContenuId: string;
  auteurContenuPseudo: string;
  contenu: string;
  raison: string;
  type: 'echo' | 'echorep';
  source: 'utilisateur' | 'algorithme';
  raisonsAlgo?: string[];
  statut: 'en_attente' | 'traite' | 'ignore';
  createdAt: Date;
}

export interface EchoRepEnAttente {
  id: string;
  echoId: string;
  echoTitre: string;
  auteurId: string;
  auteurPseudo: string;
  contenu: string;
  createdAt: Date;
  expiresAt: Date;
}

// Signaler un écho ou EchoRep
export async function signalerContenu(
  echoId: string,
  auteurSignalementId: string,
  auteurContenuId: string,
  auteurContenuPseudo: string,
  contenu: string,
  type: 'echo' | 'echorep',
  echoRepId?: string
) {
  await addDoc(collection(db, 'signalements'), {
    echoId,
    echoRepId: echoRepId || null,
    auteurSignalementId,
    auteurContenuId,
    auteurContenuPseudo,
    contenu,
    raison: 'Signalé par un utilisateur',
    type,
    source: 'utilisateur',
    statut: 'en_attente',
    createdAt: serverTimestamp(),
  });
}

// Analyser automatiquement un contenu et créer un signalement si nécessaire
export async function analyserEtSignaler(
  echoId: string,
  auteurContenuId: string,
  auteurContenuPseudo: string,
  contenu: string,
  type: 'echo' | 'echorep',
  echoRepId?: string
) {
  const resultat = analyserContenu(contenu);
  if (resultat.flagge) {
    await addDoc(collection(db, 'signalements'), {
      echoId,
      echoRepId: echoRepId || null,
      auteurSignalementId: 'systeme',
      auteurContenuId,
      auteurContenuPseudo,
      contenu,
      raison: 'Détecté automatiquement',
      raisonsAlgo: resultat.raisons,
      type,
      source: 'algorithme',
      statut: 'en_attente',
      createdAt: serverTimestamp(),
    });
  }
  return resultat;
}

// Vérifier activité suspecte d'un nouveau compte
export async function verifierActiviteSuspecte(userId: string, pseudo: string) {
  const depuis24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const q = query(
    collection(db, 'echos'),
    where('auteurId', '==', userId),
    where('createdAt', '>=', depuis24h)
  );
  const snap = await getDocs(q);
  if (snap.size > 10) {
    await addDoc(collection(db, 'signalements'), {
      echoId: 'compte',
      auteurSignalementId: 'systeme',
      auteurContenuId: userId,
      auteurContenuPseudo: pseudo,
      contenu: `${snap.size} échos publiés en moins de 24h`,
      raison: 'Activité suspecte — compte récent très actif',
      type: 'compte',
      source: 'algorithme',
      statut: 'en_attente',
      createdAt: serverTimestamp(),
    });
  }
}

// Soumettre une EchoRep en attente de validation
export async function soumettreEchoRep(
  echoId: string,
  echoContenu: string,
  auteurId: string,
  auteurPseudo: string,
  contenu: string
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Analyser le contenu avant soumission
  await analyserEtSignaler(echoId, auteurId, auteurPseudo, contenu, 'echorep');

  const ref = await addDoc(collection(db, 'echoreps_attente'), {
    echoId,
    echoContenu: echoContenu.slice(0, 100),
    auteurId,
    auteurPseudo,
    contenu,
    createdAt: serverTimestamp(),
    expiresAt,
    statut: 'en_attente',
  });

  return ref.id;
}

// Valider ou refuser une EchoRep
export async function validerEchoRep(
  attenteId: string,
  echoId: string,
  auteurId: string,
  auteurPseudo: string,
  contenu: string,
  placesOccupees: number,
  placesMax: number,
  accepter: boolean
) {
  await updateDoc(doc(db, 'echoreps_attente', attenteId), {
    statut: accepter ? 'accepte' : 'refuse',
  });

  if (accepter) {
    if (placesOccupees >= placesMax) throw new Error('Plus de places disponibles');

    const { addDoc: add, collection: col, serverTimestamp: sts } = await import('firebase/firestore');
    await addDoc(collection(db, 'echos', echoId, 'echoreps'), {
      auteurId,
      auteurPseudo,
      contenu,
      createdAt: serverTimestamp(),
      modifie: false,
      supprime: false,
    });

    await updateDoc(doc(db, 'echos', echoId), {
      placesOccupees: placesOccupees + 1,
    });
  }
}

// Hook pour les EchoReps en attente pour un propriétaire
export function useEchoRepsEnAttente(proprietaireId: string) {
  const { useState, useEffect } = require('react');
  const [enAttente, setEnAttente] = useState<EchoRepEnAttente[]>([]);

  useEffect(() => {
    if (!proprietaireId) return;

    // Écouter les EchoReps en attente pour les échos du proprio
    const q = query(
      collection(db, 'echoreps_attente'),
      where('statut', '==', 'en_attente'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      // Filtrer pour ne garder que ceux du proprio
      const items: EchoRepEnAttente[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const echoRef = await getDoc(doc(db, 'echos', data.echoId));
        if (echoRef.exists() && echoRef.data().auteurId === proprietaireId) {
          items.push({
            id: d.id,
            echoId: data.echoId,
            echoTitre: data.echoContenu || '',
            auteurId: data.auteurId,
            auteurPseudo: data.auteurPseudo,
            contenu: data.contenu,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(),
          });
        }
      }
      setEnAttente(items);
    });

    return unsub;
  }, [proprietaireId]);

  return enAttente;
}

// Actions modérateur
export async function modererCompte(
  userId: string,
  action: 'suspendre_temp' | 'suspendre_def' | 'lever_suspension',
  moderateurId: string,
  raison: string
) {
  await updateDoc(doc(db, 'users', userId), {
    suspension: action === 'lever_suspension' ? null : {
      type: action,
      raison,
      moderateurId,
      date: new Date(),
    },
  });

  await addDoc(collection(db, 'historique_moderation'), {
    userId,
    action,
    raison,
    moderateurId,
    createdAt: serverTimestamp(),
  });
}

export async function modererEcho(
  echoId: string,
  action: 'masquer' | 'supprimer',
  moderateurId: string,
  raison: string
) {
  await updateDoc(doc(db, 'echos', echoId), {
    masque: action === 'masquer',
    supprime: action === 'supprimer',
    raisonModeration: raison,
    suppressionAt: action === 'supprimer' ? new Date() : null,
    contenu: action === 'supprimer' ? 'Écho supprimé suite à un signalement.' : undefined,
  });

  await addDoc(collection(db, 'historique_moderation'), {
    echoId,
    action,
    raison,
    moderateurId,
    createdAt: serverTimestamp(),
  });
}
