import { useState, useEffect } from 'react';
import { query, orderBy, onSnapshot } from 'firebase/firestore';
import { echosCollection } from '../config/firebase';
import { Echo } from '../types/Echo';

export function useEchos() {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(echosCollection, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Echo[];
      setEchos(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { echos, loading };
}
