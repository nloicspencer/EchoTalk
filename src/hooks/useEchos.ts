import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Echo } from '../data/mockData';

function toRelativeTime(value: unknown): string {
  if (!value) return '';
  // Firestore Timestamp
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const date = (value as { toDate(): Date }).toDate();
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  }
  // Already a string
  if (typeof value === 'string') return value;
  return '';
}

export function useEchos(category: string | null = null) {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints = [orderBy('createdAt', 'desc')];
    if (category) {
      constraints.unshift(where('category', '==', category));
    }
    const q = query(collection(db, 'echos'), ...constraints);

    const unsub = onSnapshot(q, snapshot => {
      const docs: Echo[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          author: d.author ?? 'Anonyme',
          avatar: d.avatar ?? d.author?.[0] ?? '?',
          text: d.text ?? '',
          emotion: d.emotion ?? '',
          timestamp: toRelativeTime(d.createdAt),
          echoRep: d.echoRep ?? 0,
          reactions: d.reactions ?? [],
          jares: d.jares ?? 0,
          isOpen: d.isOpen ?? false,
          isFree: d.isFree ?? false,
          category: d.category,
        };
      });
      setEchos(docs);
      setLoading(false);
    });

    return unsub;
  }, [category]);

  return { echos, loading };
}
