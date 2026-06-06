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

export function useEchos(categorie?: string) {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(echosCollection, orderBy('createdAt', 'desc'));
    if (categorie && categorie !== 'tous') {
      q = query(echosCollection, where('categorie', '==', categorie), orderBy('createdAt', 'desc'));
    }
    const unsub = onSnapshot(q, (snap) => {
      setEchos(snap.docs.map((d) => convertEcho(d.id, d.data() as Record<string, unknown>)));
      setLoading(false);
    });
    return unsub;
  }, [categorie]);

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

interface PublierEchoParams {
  contenu: string;
  auteurId: string;
  auteurPseudo: string;
  tonalite: Tonalite;
  type: EchoType;
  categorie: string;
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
    categorie: params.categorie,
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
      estOuvert: true,
      expiresAt,
    }),
  };

  return addDoc(echosCollection, data);
}

export async function reagir(echoId: string, reaction: 'jarresBleues' | 'coeurs' | 'coeursBrises' | 'jarresRoses', valeur: number) {
  const ref = doc(db, 'echos', echoId);
  await updateDoc(ref, { [reaction]: valeur });
}
