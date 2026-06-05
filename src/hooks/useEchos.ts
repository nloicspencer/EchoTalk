import { useState, useEffect } from 'react';
import { query, orderBy, onSnapshot } from 'firebase/firestore';
import { echosCollection } from '../config/firebase';
import { Echo } from '../types/Echo';

interface UseEchosResult {
  echos: Echo[];
  loading: boolean;
}

export function useEchos(): UseEchosResult {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(echosCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Echo[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            pseudonyme: d.pseudonyme,
            userId: d.userId,
            contenu: d.contenu,
            tonalite: d.tonalite,
            diffusion: d.diffusion,
            interaction: d.interaction,
            participants: d.participants ?? [],
            duree: d.duree,
            expiresAt: d.expiresAt?.toDate(),
            reactions: d.reactions ?? { resonance: 0, soutien: 0, jare: 0 },
            echorepCount: d.echorepCount ?? 0,
            createdAt: d.createdAt?.toDate(),
          };
        });
        setEchos(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { echos, loading };
}
