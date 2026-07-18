import { useEffect, useRef, useState } from 'react';
import {
  query, where, orderBy, limit, startAfter, getDocs,
  QueryDocumentSnapshot, DocumentData, Timestamp, QueryConstraint,
} from 'firebase/firestore';
import { echosCollection } from '../services/firebase';
import { filtrerEchosVisibles } from './useEchos';
import { Echo } from '../types';

type FiltreType = 'tous' | 'libre' | 'ouvert';
type FiltreTonalite = 'tous' | 'soleil' | 'pluie';
type FiltreTemporalite = 'tous' | '48h' | '7j' | '14j';

const LIMITES_PERIODE: Record<string, number> = {
  '48h': 48 * 60 * 60 * 1000,
  '7j': 7 * 24 * 60 * 60 * 1000,
  '14j': 14 * 24 * 60 * 60 * 1000,
};

// Découverte : les 30 derniers Échos qui correspondent aux filtres
// sélectionnés (type, tonalité, période) — filtrés directement par
// Firestore, pas côté client. Contrairement au Fil, pas d'écoute temps
// réel ici : chaque changement de filtre relance une requête ponctuelle,
// et "Charger plus" continue sur cette même requête filtrée.
//
// Le statut (actif/clôturé) et la recherche texte restent gérés côté
// client dans DecouvertePage.tsx, sur la fenêtre chargée ici.
export function useEchosDecouverte(
  filtreType: FiltreType,
  filtreTonalite: FiltreTonalite,
  filtreTemporalite: FiltreTemporalite,
  pageSize = 30
) {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const construireContraintes = (): QueryConstraint[] => {
    const contraintes: QueryConstraint[] = [];
    if (filtreType !== 'tous') contraintes.push(where('type', '==', filtreType));
    if (filtreTonalite !== 'tous') contraintes.push(where('tonalite', '==', filtreTonalite));
    if (filtreTemporalite !== 'tous') {
      const cutoff = new Date(Date.now() - LIMITES_PERIODE[filtreTemporalite]);
      contraintes.push(where('createdAt', '>=', Timestamp.fromDate(cutoff)));
    }
    return contraintes;
  };

  useEffect(() => {
    setLoading(true);
    const contraintes = construireContraintes();
    const q = query(echosCollection, ...contraintes, orderBy('createdAt', 'desc'), limit(pageSize));
    getDocs(q).then(snap => {
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === pageSize);
      setEchos(filtrerEchosVisibles(snap.docs));
      setLoading(false);
    }).catch(err => {
      console.error('[useEchosDecouverte] Erreur de requête (index manquant ?) :', err);
      setEchos([]);
      setHasMore(false);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreType, filtreTonalite, filtreTemporalite, pageSize]);

  const chargerPlus = async () => {
    if (!lastDocRef.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const contraintes = construireContraintes();
      const q = query(
        echosCollection, ...contraintes, orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current), limit(pageSize)
      );
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        lastDocRef.current = snap.docs[snap.docs.length - 1];
        setEchos(prev => [...prev, ...filtrerEchosVisibles(snap.docs)]);
      }
      setHasMore(snap.docs.length === pageSize);
    } catch (err) {
      console.error('[useEchosDecouverte] Erreur "Charger plus" (index manquant ?) :', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  return { echos, loading, loadingMore, hasMore, chargerPlus };
}
