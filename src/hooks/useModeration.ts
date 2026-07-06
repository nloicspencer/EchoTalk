import { useState, useEffect } from 'react';
import {
  collection, addDoc, serverTimestamp, updateDoc, doc,
  onSnapshot, query, orderBy, where, getDocs, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { analyserContenu } from '../services/moderation';

export interface Signalement {
  id: string; echoId: string; echoRepId?: string;
  auteurSignalementId: string; auteurContenuId: string;
  auteurContenuPseudo: string; contenu: string; raison: string;
  type: 'echo' | 'echorep'; source: 'utilisateur' | 'algorithme';
  raisonsAlgo?: string[]; statut: 'en_attente' | 'traite' | 'ignore';
  decision?: string; createdAt: Date;
}

export interface EchoRepEnAttente {
  id: string; echoId: string; echoTitre: string;
  auteurId: string; auteurPseudo: string; contenu: string;
  createdAt: Date; expiresAt: Date;
}

export async function signalerContenu(
  echoId: string, auteurSignalementId: string, auteurContenuId: string,
  auteurContenuPseudo: string, contenu: string, type: 'echo' | 'echorep', echoRepId?: string
) {
  await addDoc(collection(db, 'signalements'), {
    echoId, echoRepId: echoRepId || null, auteurSignalementId,
    auteurContenuId, auteurContenuPseudo, contenu,
    raison: 'Signalé par un utilisateur', type, source: 'utilisateur',
    statut: 'en_attente', createdAt: serverTimestamp(),
  });
}

export async function analyserEtSignaler(
  echoId: string, auteurContenuId: string, auteurContenuPseudo: string,
  contenu: string, type: 'echo' | 'echorep', echoRepId?: string
) {
  const resultat = analyserContenu(contenu);
  if (resultat.flagge) {
    await addDoc(collection(db, 'signalements'), {
      echoId, echoRepId: echoRepId || null, auteurSignalementId: 'systeme',
      auteurContenuId, auteurContenuPseudo, contenu,
      raison: 'Détecté automatiquement', raisonsAlgo: resultat.raisons,
      type, source: 'algorithme', statut: 'en_attente', createdAt: serverTimestamp(),
    });
  }
  return resultat;
}

export async function verifierActiviteSuspecte(userId: string, pseudo: string) {
  const depuis24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const q = query(collection(db, 'echos'), where('auteurId', '==', userId), where('createdAt', '>=', depuis24h));
  const snap = await getDocs(q);
  if (snap.size > 10) {
    await addDoc(collection(db, 'signalements'), {
      echoId: 'compte', auteurSignalementId: 'systeme',
      auteurContenuId: userId, auteurContenuPseudo: pseudo,
      contenu: `${snap.size} échos publiés en moins de 24h`,
      raison: 'Activité suspecte — compte récent très actif',
      type: 'compte', source: 'algorithme', statut: 'en_attente', createdAt: serverTimestamp(),
    });
  }
}

export async function soumettreEchoRep(
  echoId: string, echoContenu: string, auteurId: string, auteurPseudo: string, contenu: string
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await analyserEtSignaler(echoId, auteurId, auteurPseudo, contenu, 'echorep');
  const ref = await addDoc(collection(db, 'echoreps_attente'), {
    echoId, echoContenu: echoContenu.slice(0, 100), auteurId, auteurPseudo, contenu,
    createdAt: serverTimestamp(), expiresAt, statut: 'en_attente',
  });
  return ref.id;
}

export async function validerEchoRep(
  attenteId: string, echoId: string, auteurId: string, auteurPseudo: string,
  contenu: string, placesOccupees: number, placesMax: number, accepter: boolean
) {
  await updateDoc(doc(db, 'echoreps_attente', attenteId), { statut: accepter ? 'accepte' : 'refuse' });
  if (accepter) {
    if (placesOccupees >= placesMax) throw new Error('Plus de places disponibles');
    await addDoc(collection(db, 'echos', echoId, 'echoreps'), {
      auteurId, auteurPseudo, contenu, createdAt: serverTimestamp(), modifie: false, supprime: false,
    });
    await updateDoc(doc(db, 'echos', echoId), { placesOccupees: placesOccupees + 1 });
  }
}

export function useEchoRepsEnAttente(proprietaireId: string) {
  const [enAttente, setEnAttente] = useState<EchoRepEnAttente[]>([]);
  useEffect(() => {
    if (!proprietaireId) return;
    const q = query(collection(db, 'echoreps_attente'), where('statut', '==', 'en_attente'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const items: EchoRepEnAttente[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const echoRef = await getDoc(doc(db, 'echos', data.echoId));
        if (echoRef.exists() && echoRef.data().auteurId === proprietaireId) {
          items.push({
            id: d.id, echoId: data.echoId, echoTitre: data.echoContenu || '',
            auteurId: data.auteurId, auteurPseudo: data.auteurPseudo, contenu: data.contenu,
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

// ── Modérer un écho ──────────────────────────────────────
// Fix v72 — quand un écho est supprimé par modération, ses EchoReps
// sont désormais masquées en cascade (réversible via recupererEchoRep),
// pour éviter qu'elles restent visibles sous un écho marqué "supprimé
// suite à un signalement".
export async function modererEcho(
  echoId: string, action: 'masquer' | 'supprimer', moderateurId: string, raison: string
) {
  if (action === 'masquer') {
    await updateDoc(doc(db, 'echos', echoId), { masque: true, raisonModeration: raison });
  } else {
    await updateDoc(doc(db, 'echos', echoId), {
      supprime: true, masque: false, raisonModeration: raison,
      suppressionAt: serverTimestamp(), contenu: 'Écho supprimé suite à un signalement.',
    });

    const repsSnap = await getDocs(collection(db, 'echos', echoId, 'echoreps'));
    await Promise.all(repsSnap.docs.map((repDoc) =>
      updateDoc(doc(db, 'echos', echoId, 'echoreps', repDoc.id), {
        masque: true,
        raisonModeration: 'Écho parent supprimé suite à un signalement',
        masqueAt: serverTimestamp(),
      })
    ));
  }
  await addDoc(collection(db, 'historique_moderation'), {
    echoId, action, raison, moderateurId, createdAt: serverTimestamp(),
  });
}

// ── Masquer une EchoRep (réversible) ────────────────────
export async function masquerEchoRep(
  echoId: string, echoRepId: string, moderateurId: string, raison: string
) {
  await updateDoc(doc(db, 'echos', echoId, 'echoreps', echoRepId), {
    masque: true, raisonModeration: raison, masqueAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'historique_moderation'), {
    echoId, echoRepId, action: 'masquer_echorep', raison, moderateurId, createdAt: serverTimestamp(),
  });
}

// ── Récupérer une EchoRep masquée ───────────────────────
export async function recupererEchoRep(echoId: string, echoRepId: string) {
  await updateDoc(doc(db, 'echos', echoId, 'echoreps', echoRepId), {
    masque: false, raisonModeration: null, masqueAt: null,
  });
}

// ── Modérer un compte ────────────────────────────────────
export async function modererCompte(
  userId: string, action: 'suspendre_temp' | 'suspendre_def' | 'lever_suspension',
  moderateurId: string, raison: string, dureeHeures?: number
) {
  if (action === 'lever_suspension') {
    await updateDoc(doc(db, 'users', userId), { suspension: null });
    await updateDoc(doc(db, 'annuaire', userId), { banni: false });
  } else if (action === 'suspendre_temp' && dureeHeures) {
    const jusqu = new Date(Date.now() + dureeHeures * 60 * 60 * 1000);
    await updateDoc(doc(db, 'users', userId), {
      suspension: { type: 'temp', raison, moderateurId, date: new Date(), jusqu, banni: false },
    });
    await updateDoc(doc(db, 'annuaire', userId), { banni: false });
  } else if (action === 'suspendre_def') {
    await updateDoc(doc(db, 'users', userId), {
      suspension: { type: 'def', raison, moderateurId, date: new Date(), jusqu: null, banni: true },
    });
    await updateDoc(doc(db, 'annuaire', userId), { banni: true });
  }
  await addDoc(collection(db, 'historique_moderation'), {
    userId, action, raison, moderateurId, dureeHeures: dureeHeures || null, createdAt: serverTimestamp(),
  });
}

// ── Vérifier suspension/bannissement ────────────────────
// Fix — ajout du champ "raison" (optionnel) au type, absent auparavant
// alors qu'il est bien écrit par modererCompte() et lu plus bas.
export function verifierSuspension(suspension: {
  type: string; jusqu: Date | { seconds: number } | null; banni: boolean; raison?: string;
} | null | undefined): { suspendu: boolean; banni: boolean; message: string } {
  if (!suspension) return { suspendu: false, banni: false, message: '' };

  if (suspension.banni || suspension.type === 'def') {
    return { suspendu: true, banni: true, message: 'Votre compte a été banni définitivement d\'EchoTalk. Si vous pensez qu\'il s\'agit d\'une erreur, contactez l\'équipe.' };
  }

  if (suspension.type === 'temp' && suspension.jusqu) {
    const jusqu = suspension.jusqu instanceof Date
      ? suspension.jusqu
      : new Date((suspension.jusqu as { seconds: number }).seconds * 1000);
    if (new Date() < jusqu) {
      const diff = jusqu.getTime() - Date.now();
      const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
      const heures = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const duree = jours > 0 ? `${jours}j ${heures}h` : `${heures}h${minutes}m`;
      return {
        suspendu: true, banni: false,
        message: `Votre compte est suspendu encore ${duree}. Raison : ${suspension.raison || 'non précisée'}.`,
      };
    }
  }
  return { suspendu: false, banni: false, message: '' };
}
