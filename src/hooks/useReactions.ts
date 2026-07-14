import { useState, useEffect } from 'react';
import {
  doc, getDoc, updateDoc, setDoc,
  collection, query, where, getDocs, addDoc,
  serverTimestamp, onSnapshot, Timestamp, increment
} from 'firebase/firestore';
import { db } from '../services/firebase';

export interface StockJarres {
  jarresBleues: number;
  jarresRoses: number;
}

// Lire le stock en temps réel
export function useStockJarres(userId: string) {
  const [stock, setStock] = useState<StockJarres>({ jarresBleues: 15, jarresRoses: 0 });

  useEffect(() => {
    if (!userId) return;
    const ref = doc(db, 'users', userId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStock({
          jarresBleues: data.stockJarresBleues ?? 15,
          jarresRoses: data.stockJarresRoses ?? 0,
        });
      }
    });
    return unsub;
  }, [userId]);

  return stock;
}

// Compteur global "jarres offertes par la communauté" — un document unique
// (stats/global), incrémenté à chaque jarre bleue offerte. Indépendant du
// nombre d'Échos chargés côté client : reste exact même si le Fil est
// paginé et n'affiche qu'une fraction de l'historique.
//
// ⚠️ Ce compteur démarre à 0 tant qu'aucun script de migration n'a été
// exécuté pour y injecter la somme des jarresBleues déjà accumulées sur les
// Échos existants avant la mise en place de ce compteur.
export function useCompteurGlobalJarres() {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const ref = doc(db, 'stats', 'global');
    const unsub = onSnapshot(ref, (snap) => {
      setTotal(snap.exists() ? (snap.data().totalJarresBleues || 0) : 0);
    });
    return unsub;
  }, []);
  return total;
}

// Vérifier si l'utilisateur a déjà réagi à un écho
export async function aDejaReagi(echoId: string, userId: string, type: string): Promise<boolean> {
  const reactionsRef = collection(db, 'reactions');
  const q = query(reactionsRef,
    where('echoId', '==', echoId),
    where('auteurId', '==', userId),
    where('type', '==', type)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// Donner une réaction jarre bleue
export async function donnerJarreBleu(
  echoId: string,
  userId: string,
  stockActuel: number,
  compteurActuel: number
) {
  if (stockActuel <= 0) throw new Error('Stock de jarres bleues épuisé');
  const dejaReagi = await aDejaReagi(echoId, userId, 'jarreBleu');
  if (dejaReagi) throw new Error('Vous avez déjà offert une jarre à cet écho');

  // Enregistrer la réaction
  await addDoc(collection(db, 'reactions'), {
    echoId,
    auteurId: userId,
    type: 'jarreBleu',
    createdAt: serverTimestamp(),
  });

  // Décrémenter le stock
  await updateDoc(doc(db, 'users', userId), {
    stockJarresBleues: stockActuel - 1,
  });

  // Incrémenter le compteur sur l'écho
  await updateDoc(doc(db, 'echos', echoId), {
    jarresBleues: compteurActuel + 1,
  });

  // Incrémenter le compteur global du puits (document unique, indépendant
  // de la pagination du Fil). setDoc + merge pour créer le document au
  // premier appel s'il n'existe pas encore.
  await setDoc(doc(db, 'stats', 'global'), {
    totalJarresBleues: increment(1),
  }, { merge: true });
}

// Donner une jarre rose (Écho Solidaire) — illimité tant que stock > 0
export async function donnerJarreRose(
  echoId: string,
  userId: string,
  stockActuel: number,
  compteurActuel: number
) {
  if (stockActuel <= 0) throw new Error('Stock de jarres roses épuisé. Acquérez un pack dans votre EchoProfil.');

  // Enregistrer dans la collection reactions pour le décompte
  await addDoc(collection(db, 'reactions'), {
    echoId,
    auteurId: userId,
    type: 'jarreRose',
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', userId), {
    stockJarresRoses: stockActuel - 1,
  });

  await updateDoc(doc(db, 'echos', echoId), {
    jarresRoses: compteurActuel + 1,
  });
}

// Acquérir un pack de jarres
export async function acquerirPack(
  userId: string,
  type: 'bleues' | 'roses',
  quantite: 5 | 10 | 15,
  stockActuel: number
) {
  const MAX_STOCK = 50;
  if (stockActuel >= MAX_STOCK) throw new Error('Stock maximum atteint (50 jarres)');
  const quantiteReelle = Math.min(quantite, MAX_STOCK - stockActuel);
  const champ = type === 'bleues' ? 'stockJarresBleues' : 'stockJarresRoses';
  await updateDoc(doc(db, 'users', userId), {
    [champ]: stockActuel + quantiteReelle,
  });

  // Historique des acquisitions
  await addDoc(collection(db, 'packs'), {
    userId,
    type,
    quantite,
    createdAt: serverTimestamp(),
    gratuit: type === 'bleues',
  });
}

// Initialiser le stock d'un nouvel utilisateur
export async function initialiserStock(userId: string) {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().stockJarresBleues === undefined) {
    await updateDoc(ref, {
      stockJarresBleues: 15,
      stockJarresRoses: 0,
    });
  }
}

// Donner un cœur (avec anti-doublon)
export async function donnerCoeur(
  echoId: string,
  userId: string,
  type: 'coeur' | 'coeurBrise',
  compteurActuel: number
) {
  const dejaReagi = await aDejaReagi(echoId, userId, type);
  if (dejaReagi) throw new Error('Vous avez déjà réagi à cet écho');

  await addDoc(collection(db, 'reactions'), {
    echoId,
    auteurId: userId,
    type,
    createdAt: serverTimestamp(),
  });

  const champ = type === 'coeur' ? 'coeurs' : 'coeursBrises';
  await updateDoc(doc(db, 'echos', echoId), {
    [champ]: compteurActuel + 1,
  });
}
