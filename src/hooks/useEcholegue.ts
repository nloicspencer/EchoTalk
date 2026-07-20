import { useState, useEffect } from 'react';
import {
  collection, addDoc, onSnapshot, query, where,
  updateDoc, doc, getDoc, setDoc, serverTimestamp, Timestamp,
  arrayUnion, arrayRemove, increment
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

// Calcule les bornes [lundi 00:00, lundi suivant 00:00[ d'une semaine ISO
// (ex: "2026-W29"), pour interroger Firestore sur cette seule plage de
// dates plutôt que de charger toute la bibliothèque puis filtrer à la main.
export function bornesSemaine(semaine: string): { debut: Date; fin: Date } {
  const [anneeStr, semStr] = semaine.split('-W');
  const annee = parseInt(anneeStr, 10);
  const numSemaine = parseInt(semStr, 10);
  const jan4 = new Date(annee, 0, 4);
  const jourJan4 = (jan4.getDay() + 6) % 7; // 0 = lundi
  const lundiSemaine1 = new Date(jan4);
  lundiSemaine1.setDate(jan4.getDate() - jourJan4);
  const debut = new Date(lundiSemaine1);
  debut.setDate(lundiSemaine1.getDate() + (numSemaine - 1) * 7);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setDate(debut.getDate() + 7);
  return { debut, fin };
}

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

// Index léger (un seul petit document) recensant le nombre d'Écholègues
// publiés par semaine de création. Permet d'afficher la liste des semaines
// disponibles (pour la Moulinette et la Bibliothèque) sans jamais avoir à
// charger toute la bibliothèque juste pour le savoir — peu importe qu'elle
// contienne 100 ou 100 000 Écholègues.
async function ajusterCompteurSemaine(semaine: string, delta: 1 | -1) {
  await setDoc(doc(db, 'stats', 'echolegues_semaines'), {
    [`comptes.${semaine}`]: increment(delta),
  }, { merge: true });
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
      nbSelections: 0, historiqueSelections: [], semainesSelectionnees: [], masque: false,
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
    // Pas encore publié (en attente de modération) : pas encore compté
    // dans l'index de semaines — ce sera fait lors de validerEcholegue().
    return 'en_attente_moderation';
  }
  await addDoc(collection(db, 'echolegues'), {
    auteurId, auteurPseudo, recit, lecon,
    statut: 'publie',
    createdAt: serverTimestamp(),
    nbSelections: 0, historiqueSelections: [], semainesSelectionnees: [], masque: false,
  });
  await ajusterCompteurSemaine(getSemaineISO(), 1);
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

export async function selectionnerEcholegue(echolegueId: string, semaine: string) {
  await updateDoc(doc(db, 'echolegues', echolegueId), {
    nbSelections: increment(1),
    historiqueSelections: arrayUnion({
      semaine,
      selectionneAt: Timestamp.now(),
    }),
    semainesSelectionnees: arrayUnion(semaine),
  });
}

export async function retirerDuJournal(legue: Echolegue, semaine: string) {
  const nouvelHistorique = legue.historiqueSelections
    .filter(h => h.semaine !== semaine)
    .map(h => ({ semaine: h.semaine, selectionneAt: Timestamp.fromDate(h.selectionneAt) }));
  await updateDoc(doc(db, 'echolegues', legue.id), {
    historiqueSelections: nouvelHistorique,
    semainesSelectionnees: arrayRemove(semaine),
  });
}

// Valide un Écholègue en attente de modération — le fait entrer dans la
// bibliothèque publiée, et l'ajoute à l'index de semaines (avec sa vraie
// semaine de création, pas la semaine de validation).
export async function validerEcholegue(echolegueId: string) {
  const ref = doc(db, 'echolegues', echolegueId);
  const snap = await getDoc(ref);
  await updateDoc(ref, { statut: 'publie' });
  if (snap.exists()) {
    const data = snap.data();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    await ajusterCompteurSemaine(getSemaineISO(createdAt), 1);
  }
}

// Supprime un Écholègue — retire aussi son compte de l'index de semaines.
export async function supprimerEcholegue(echolegueId: string) {
  const ref = doc(db, 'echolegues', echolegueId);
  const snap = await getDoc(ref);
  await updateDoc(ref, { statut: 'supprime' });
  if (snap.exists()) {
    const data = snap.data();
    if (data.statut === 'publie') {
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
      await ajusterCompteurSemaine(getSemaineISO(createdAt), -1);
    }
  }
}

export function useJournalLegues() {
  const [legues, setLegues] = useState<Echolegue[]>([]);
  useEffect(() => {
    const semaineCourante = getSemaineISO();
    const q = query(
      collection(db, 'echolegues'),
      where('statut', '==', 'publie'),
      where('semainesSelectionnees', 'array-contains', semaineCourante)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => convertLegue(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => {
          const dateA = a.historiqueSelections.find(h => h.semaine === semaineCourante)?.selectionneAt.getTime() ?? 0;
          const dateB = b.historiqueSelections.find(h => h.semaine === semaineCourante)?.selectionneAt.getTime() ?? 0;
          return dateB - dateA;
        })
        .slice(0, 3);
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

// Liste des semaines ayant au moins un Écholègue publié, avec leur nombre
// — lu depuis le petit document index stats/echolegues_semaines, jamais
// depuis la bibliothèque complète.
export function useSemainesEcholegues() {
  const [semaines, setSemaines] = useState<{ semaine: string; total: number }[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stats', 'echolegues_semaines'), (snap) => {
      const comptes = snap.exists() ? ((snap.data().comptes || {}) as Record<string, number>) : {};
      const liste = Object.entries(comptes)
        .filter(([, total]) => total > 0)
        .map(([semaine, total]) => ({ semaine, total }))
        .sort((a, b) => {
          const [anneeA, semA] = a.semaine.split('-W');
          const [anneeB, semB] = b.semaine.split('-W');
          if (anneeB !== anneeA) return parseInt(anneeB) - parseInt(anneeA);
          return parseInt(semB) - parseInt(semA);
        });
      setSemaines(liste);
    });
    return unsub;
  }, []);
  return semaines;
}

// Charge les Écholègues publiés d'une ou plusieurs semaines précises, À LA
// DEMANDE — jamais toute la bibliothèque.
export function useEcholeguesSemaines(semaines: string[]) {
  const [parSemaine, setParSemaine] = useState<Record<string, Echolegue[]>>({});
  const cle = [...new Set(semaines)].sort().join(',');

  useEffect(() => {
    const demandees = cle ? cle.split(',') : [];
    const unsubs: (() => void)[] = [];

    demandees.forEach(semaine => {
      const { debut, fin } = bornesSemaine(semaine);
      const q = query(
        collection(db, 'echolegues'),
        where('statut', '==', 'publie'),
        where('createdAt', '>=', Timestamp.fromDate(debut)),
        where('createdAt', '<', Timestamp.fromDate(fin))
      );
      const unsub = onSnapshot(q, (snap) => {
        const items = snap.docs
          .map(d => convertLegue(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setParSemaine(prev => ({ ...prev, [semaine]: items }));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  return parSemaine;
}
