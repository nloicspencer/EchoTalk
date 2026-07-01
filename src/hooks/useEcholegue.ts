import { useState, useEffect } from 'react';
import {
  collection, addDoc, onSnapshot, query, where,
  updateDoc, doc, serverTimestamp, Timestamp, arrayUnion, increment
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { analyserContenu } from '../services/moderation';

export interface SelectionHistorique {
  semaine: string;
  selectionneAt: Date;
}

export interface Echolegue {
  id: string;
  auteurId: string;
  auteurPseudo: string;
  recit: string;
  lecon: string;
  statut: 'publie' | 'en_attente_moderation' | 'supprime';
  createdAt: Date;
  nbSelections: number;
  historiqueSelections: SelectionHistorique[];
  masque: boolean;
}

function getSemaineISO(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export { getSemaineISO };

function convertLegue(id: string, data: Record<string, unknown>): Echolegue {
  const historique = (data.historiqueSelections as Array<{semaine: string; selectionneAt: Timestamp}> || [])
    .map(h => ({
      semaine: h.semaine,
      selectionneAt: h.selectionneAt instanceof Timestamp ? h.selectionneAt.toDate() : new Date(),
    }));
  return {
    id,
    auteurId: data.auteurId as string,
    auteurPseudo: data.auteurPseudo as string,
    recit: data.recit as string,
    lecon: data.lecon as string,
    statut: data.statut as Echolegue['statut'],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    nbSelections: (data.nbSelections as number) || 0,
    historiqueSelections: historique,
    masque: (data.masque as boolean) || false,
  };
}

export async function publierEcholegue(
  auteurId: string, auteurPseudo: string, recit: string, lecon: string
): Promise<'publie' | 'en_attente_moderation'> {
  const resultat = analyserContenu(`${recit} ${lecon}`);
  if (resultat.flagge) {
    const ref = await addDoc(collection(db, 'echolegues'), {
      auteurId, auteurPseudo, recit, lecon,
      statut: 'en_attente_moderation',
      createdAt: serverTimestamp(),
      nbSelections: 0, historiqueSelections: [], masque: false,
    });
    await addDoc(collection(db, 'signalements'), {
      echolegueId: ref.id,
      auteurSignalementId: 'systeme',
      auteurContenuId: auteurId, auteurContenuPseudo: auteurPseudo,
      contenu: recit.slice(0, 200),
      raison: 'Détecté automatiquement', raisonsAlgo: resultat.raisons,
      type: 'echolegue', source: 'algorithme',
      statut: 'en_attente', createdAt: serverTimestamp(),
    });
    return 'en_attente_moderation';
  }
  await addDoc(collection(db, 'echolegues'), {
    auteurId, auteurPseudo, recit, lecon,
    statut: 'publie',
    createdAt: serverTimestamp(),
    nbSelections: 0, historiqueSelections: [], masque: false,
  });
  return 'publie';
}

export async function signalerEcholegue(
  echolegueId: string, auteurId: string, auteurPseudo: string,
  recit: string, signaleurId: string
) {
  await addDoc(collection(db, 'signalements'), {
    echolegueId,
    auteurSignalementId: signaleurId,
    auteurContenuId: auteurId, auteurContenuPseudo: auteurPseudo,
    contenu: recit.slice(0, 200),
    raison: 'Signalé par un utilisateur',
    type: 'echolegue', source: 'utilisateur',
    statut: 'en_attente', createdAt: serverTimestamp(),
  });
}

// Sélectionner — incrémente nbSelections + ajoute à l'historique
export async function selectionnerEcholegue(echolegueId: string, semaine: string) {
  await updateDoc(doc(db, 'echolegues', echolegueId), {
    nbSelections: increment(1),
    historiqueSelections: arrayUnion({
      semaine,
      selectionneAt: Timestamp.now(),
    }),
  });
}

// Retirer du journal — retire la semaine de l'historique SANS toucher nbSelections
export async function retirerDuJournal(legue: Echolegue, semaine: string) {
  const nouvelHistorique = legue.historiqueSelections
    .filter(h => h.semaine !== semaine)
    .map(h => ({ semaine: h.semaine, selectionneAt: Timestamp.fromDate(h.selectionneAt) }));
  await updateDoc(doc(db, 'echolegues', legue.id), {
    historiqueSelections: nouvelHistorique,
    // nbSelections inchangé — le lègue a bien été sélectionné
  });
}

export async function validerEcholegue(echolegueId: string) {
  await updateDoc(doc(db, 'echolegues', echolegueId), { statut: 'publie' });
}

export async function supprimerEcholegue(echolegueId: string) {
  await updateDoc(doc(db, 'echolegues', echolegueId), { statut: 'supprime' });
}

// Journal — max 3 lègues, filtrés sur la semaine courante
export function useJournalLegues() {
  const [legues, setLegues] = useState<Echolegue[]>([]);
  useEffect(() => {
    const semaineCourante = getSemaineISO();
    const q = query(collection(db, 'echolegues'), where('statut', '==', 'publie'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => convertLegue(d.id, d.data() as Record<string, unknown>))
        .filter(l => l.historiqueSelections.some(h => h.semaine === semaineCourante))
        .sort((a, b) => {
          const dateA = a.historiqueSelections.find(h => h.semaine === semaineCourante)?.selectionneAt.getTime() ?? 0;
          const dateB = b.historiqueSelections.find(h => h.semaine === semaineCourante)?.selectionneAt.getTime() ?? 0;
          return dateB - dateA;
        })
        .slice(0, 3); // Max 3 dans le journal
      setLegues(items);
    });
    return unsub;
  }, []);
  return legues;
}

export function usesMesEcholegues(auteurId: string) {
  const [legues, setLegues] = useState<Echolegue[]>([]);
  useEffect(() => {
    if (!auteurId) return;
    const q = query(collection(db, 'echolegues'), where('auteurId', '==', auteurId));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => convertLegue(d.id, d.data() as Record<string, unknown>))
        .filter(l => l.statut !== 'supprime')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setLegues(items);
    });
    return unsub;
  }, [auteurId]);
  return legues;
}

export function useBibliotheque() {
  const [legues, setLegues] = useState<Echolegue[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'echolegues'), where('statut', '==', 'publie'));
    const unsub = onSnapshot(q, (snap) => {
      setLegues(snap.docs
        .map(d => convertLegue(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      );
    });
    return unsub;
  }, []);
  return legues;
}
