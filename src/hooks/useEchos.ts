import { useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db, echosCollection } from '../services/firebase';
import { Echo, EchoType, Tonalite } from '../types';

function convertEcho(id: string, data: Record<string, unknown>): Echo {
  return {
    ...data,
    id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : undefined,
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
      })) as typeof echoReps);
    });
    return unsub;
  }, [echoId]);

  return echoReps;
}

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

  const data = {
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
    ...(params.type === 'ouvert' && {
      placesMax: params.placesMax ?? 6,
      placesOccupees: 0,
      periodicitéJours: params.periodicitéJours ?? 6,
      ouvertureCount: 1,
      reouverturesRestantes: 3,
      estOuvert: true,
      expiresAt,
    }),
  };

  return addDoc(echosCollection, data);
}

export async function publierEchoRep(
  echoId: string,
  auteurId: string,
  auteurPseudo: string,
  contenu: string,
  placesOccupees: number,
  placesMax: number
) {
  if (placesOccupees >= placesMax) throw new Error('Plus de places disponibles');

  // Vérifier si l'utilisateur a déjà une EchoRep
  const repsRef = collection(db, 'echos', echoId, 'echoreps');
  const existing = await getDocs(query(repsRef, where('auteurId', '==', auteurId)));
  
  if (!existing.empty) throw new Error('Vous avez déjà participé à cet écho');

  await addDoc(repsRef, {
    auteurId,
    auteurPseudo,
    contenu,
    createdAt: serverTimestamp(),
  });

  // Incrémenter les places occupées
  await updateDoc(doc(db, 'echos', echoId), {
    placesOccupees: placesOccupees + 1,
  });
}

export async function toggleEchoOuvert(echoId: string, estOuvert: boolean, reouverturesRestantes: number) {
  if (!estOuvert && reouverturesRestantes <= 0) throw new Error('Plus de réouvertures disponibles');
  
  await updateDoc(doc(db, 'echos', echoId), {
    estOuvert: !estOuvert,
    ...(estOuvert === false && { reouverturesRestantes: reouverturesRestantes - 1 }),
  });
}

export async function reagir(echoId: string, reaction: 'jarresBleues' | 'coeurs' | 'coeursBrises' | 'jarresRoses', valeur: number) {
  const ref = doc(db, 'echos', echoId);
  await updateDoc(ref, { [reaction]: valeur });
}
