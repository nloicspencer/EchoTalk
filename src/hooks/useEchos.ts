import { useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, echosCollection } from '../services/firebase';
import { Echo, EchoType, Tonalite } from '../types';

function convertEcho(id: string, data: Record<string, unknown>): Echo {
  return {
    ...data,
    id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
    reouverturesRestantes: data.reouverturesRestantes !== undefined ? data.reouverturesRestantes : 3,
  } as Echo;
}

export function useEchos() {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(echosCollection, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEchos(snap.docs.map((d) => convertEcho(d.id, d.data() as Record<string, unknown>)));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { echos, loading };
}

export function useEchoSolidaire() {
  const [echoSolidaire, setEchoSolidaire] = useState<Echo | null>(null);

  useEffect(() => {
    const q = query(echosCollection, where('estSolidaire', '==', true), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setEchoSolidaire(convertEcho(d.id, d.data() as Record<string, unknown>));
      } else {
        setEchoSolidaire(null);
      }
    });
    return unsub;
  }, []);

  return echoSolidaire;
}

export function useEchoReps(echoId: string) {
  const [echoReps, setEchoReps] = useState<Array<{
    id: string;
    auteurId: string;
    auteurPseudo: string;
    contenu: string;
    createdAt: Date;
    updatedAt?: Date;
    supprime?: boolean;
    modifie?: boolean;
  }>>([]);

  useEffect(() => {
    if (!echoId) return;
    const repsRef = collection(db, 'echos', echoId, 'echoreps');
    const q = query(repsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEchoReps(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
        updatedAt: d.data().updatedAt instanceof Timestamp ? d.data().updatedAt.toDate() : undefined,
      })) as typeof echoReps);
    });
    return unsub;
  }, [echoId]);

  return echoReps;
}

// ── PUBLIER ──────────────────────────────────────────────

interface PublierEchoParams {
  contenu: string;
  auteurId: string;
  auteurPseudo: string;
  tonalite: Tonalite;
  type: EchoType;
  placesMax?: 3 | 6 | 8;
  periodicitéJours?: 2 | 6 | 10;
}

export async function publierEcho(params: PublierEchoParams) {
  const expiresAt = params.periodicitéJours
    ? new Date(Date.now() + params.periodicitéJours * 24 * 60 * 60 * 1000)
    : null;

  return addDoc(echosCollection, {
    contenu: params.contenu,
    auteurId: params.auteurId,
    auteurPseudo: params.auteurPseudo,
    tonalite: params.tonalite,
    type: params.type,
    categorie: 'general',
    createdAt: serverTimestamp(),
    jarresBleues: 0,
    coeurs: 0,
    coeursBrises: 0,
    estSolidaire: false,
    modifie: false,
    supprime: false,
    ...(params.type === 'ouvert' && {
      placesMax: params.placesMax ?? 6,
      placesOccupees: 0,
      periodicitéJours: params.periodicitéJours ?? 6,
      ouvertureCount: 1,
      reouverturesRestantes: 3,
      estOuvert: true,
      expiresAt,
    }),
  });
}

// ── MODIFIER ÉCHO ─────────────────────────────────────────

export async function modifierEcho(echoId: string, nouveauContenu: string, createdAt: Date) {
  const diff = Date.now() - createdAt.getTime();
  const heures24 = 24 * 60 * 60 * 1000;
  if (diff > heures24) throw new Error('Le délai de modification de 24h est dépassé.');
  await updateDoc(doc(db, 'echos', echoId), {
    contenu: nouveauContenu,
    modifie: true,
    updatedAt: serverTimestamp(),
  });
}

// ── SUPPRIMER ÉCHO ────────────────────────────────────────

export async function supprimerEcho(echo: Echo) {
  const echoRef = doc(db, 'echos', echo.id);

  if (echo.type === 'ouvert') {
    // Compter les EchoRep non supprimées
    const repsRef = collection(db, 'echos', echo.id, 'echoreps');
    const reps = await getDocs(repsRef);
    const nbReps = reps.docs.filter(d => !d.data().supprime).length;

    // Supprimer toutes les EchoRep
    const batch = writeBatch(db);
    reps.docs.forEach(d => batch.delete(d.ref));

    // Marquer l'écho comme supprimé (pas delete, pour garder la trace)
    batch.update(echoRef, {
      supprime: true,
      contenu: `Écho Ouvert supprimé par son auteur — ${nbReps} EchoRep${nbReps !== 1 ? 's' : ''} avaient été partagées`,
      estOuvert: false,
    });
    await batch.commit();
  } else {
    // Écho Libre → suppression directe
    await deleteDoc(echoRef);
  }
}

// ── ECHOREP ───────────────────────────────────────────────

export async function publierEchoRep(
  echoId: string,
  auteurId: string,
  auteurPseudo: string,
  contenu: string,
  placesOccupees: number,
  placesMax: number,
  estProprietaire: boolean
) {
  const repsRef = collection(db, 'echos', echoId, 'echoreps');
  const existing = await getDocs(query(repsRef, where('auteurId', '==', auteurId)));
  const premiereParticipation = existing.empty;

  if (premiereParticipation && !estProprietaire && placesOccupees >= placesMax) {
    throw new Error('Plus de places disponibles dans cet écho');
  }

  await addDoc(repsRef, {
    auteurId,
    auteurPseudo,
    contenu,
    createdAt: serverTimestamp(),
    modifie: false,
    supprime: false,
  });

  if (premiereParticipation && !estProprietaire) {
    await updateDoc(doc(db, 'echos', echoId), { placesOccupees: placesOccupees + 1 });
  }
}

export async function modifierEchoRep(echoId: string, repId: string, nouveauContenu: string, createdAt: Date) {
  const diff = Date.now() - createdAt.getTime();
  const minutes60 = 60 * 60 * 1000;
  if (diff > minutes60) throw new Error('Le délai de modification de 60 minutes est dépassé.');
  await updateDoc(doc(db, 'echos', echoId, 'echoreps', repId), {
    contenu: nouveauContenu,
    modifie: true,
    updatedAt: serverTimestamp(),
  });
}

export async function supprimerEchoRep(
  echoId: string,
  repId: string,
  auteurId: string,
  placesOccupees: number,
  estProprietaire: boolean
) {
  const repsRef = collection(db, 'echos', echoId, 'echoreps');

  // Vérifier si c'est la seule EchoRep de cet auteur
  const autresReps = await getDocs(query(repsRef, where('auteurId', '==', auteurId)));
  const seulementCetteRep = autresReps.docs.length === 1;

  // Marquer comme supprimée
  await updateDoc(doc(db, 'echos', echoId, 'echoreps', repId), {
    supprime: true,
    contenu: 'EchoRep supprimée par son auteur.',
  });

  // Libérer la place si c'était la seule participation
  if (seulementCetteRep && !estProprietaire) {
    await updateDoc(doc(db, 'echos', echoId), {
      placesOccupees: Math.max(0, placesOccupees - 1),
    });
  }
}

// ── AUTRES ───────────────────────────────────────────────

export async function toggleEchoOuvert(echoId: string, estOuvert: boolean, reouverturesRestantes: number) {
  if (estOuvert) {
    await updateDoc(doc(db, 'echos', echoId), {
      estOuvert: false,
      clotureManuellement: true,
    });
    return;
  }
  if (reouverturesRestantes <= 0) throw new Error('Plus de réouvertures disponibles pour cet écho');
  await updateDoc(doc(db, 'echos', echoId), {
    estOuvert: true,
    reouverturesRestantes: reouverturesRestantes - 1,
    clotureManuellement: false,
  });
}

export async function reagir(echoId: string, reaction: 'jarresBleues' | 'coeurs' | 'coeursBrises' | 'jarresRoses', valeur: number) {
  await updateDoc(doc(db, 'echos', echoId), { [reaction]: valeur });
}
