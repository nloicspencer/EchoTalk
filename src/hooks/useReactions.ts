import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, getDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const PLAFOND_JARRES = 50;

// Prix réels des packs de Jarres Roses (V3 — monétisation de l'Écho
// Solidaire). Les Jarres Bleues restent gratuites dans tous les cas —
// seules les roses sont concernées par la monétisation. Tant que
// FEATURES.ECHO_SOLIDAIRE_MONETISE est désactivé (V1/V2), ces prix ne
// sont affichés nulle part et l'acquisition reste gratuite comme avant.
export const PRIX_PACKS_ROSES: Record<5 | 10 | 15, number> = {
  5: 5,
  10: 9,
  15: 13,
};

export function useStockJarres(uid: string) {
  const [stock, setStock] = useState({ jarresBleues: 0, jarresRoses: 0 });
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStock({
          jarresBleues: data.stockJarresBleues || 0,
          jarresRoses: data.stockJarresRoses || 0,
        });
      }
    });
    return unsub;
  }, [uid]);
  return stock;
}

// Correction du 21/08/2026 : le plafond de 50 jarres était déjà respecté
// pour l'AFFICHAGE (le compteur ne dépassait jamais 50), mais pas pour la
// LOGIQUE D'ACHAT — un pack de +15 cliqué à 45/50 ajoutait quand même 15
// jarres pleines. Sans conséquence tant que c'était gratuit, mais
// dangereux dès que les packs roses deviennent payants (V3) : quelqu'un
// payant un pack de 15€ à 45/50 ne recevrait en réalité que 5 jarres
// utiles, les 10 restantes étant perdues au plafond — de l'argent
// facturé sans contrepartie.
//
// Nouvelle règle : un pack n'est acquis QUE s'il tient entièrement dans
// la place restante jusqu'au plafond. Sinon, on lève une erreur explicite
// plutôt que de créditer partiellement — c'est à l'interface
// (ProfilPage.tsx) de désactiver visuellement les packs concernés avant
// même que l'utilisateur ne clique.
export async function acquerirPack(
  uid: string, type: 'bleues' | 'roses', quantite: 5 | 10 | 15, stockActuel: number
) {
  const placeRestante = PLAFOND_JARRES - stockActuel;
  if (quantite > placeRestante) {
    throw new Error(
      placeRestante <= 0
        ? `Plafond de ${PLAFOND_JARRES} jarres déjà atteint.`
        : `Ce pack dépasserait le plafond de ${PLAFOND_JARRES} jarres (il reste de la place pour ${placeRestante} jarre${placeRestante > 1 ? 's' : ''} seulement).`
    );
  }
  const champ = type === 'bleues' ? 'stockJarresBleues' : 'stockJarresRoses';
  await updateDoc(doc(db, 'users', uid), { [champ]: increment(quantite) });
}

export async function donnerJarreBleu(echoId: string, uid: string, stockActuel: number, jarresActuelles: number) {
  if (stockActuel <= 0) throw new Error('Stock de jarres bleues épuisé.');
  await updateDoc(doc(db, 'users', uid), { stockJarresBleues: increment(-1) });
  await updateDoc(doc(db, 'echos', echoId), { jarresBleues: jarresActuelles + 1 });
  await addDoc(collection(db, 'reactions'), {
    auteurId: uid, echoId, type: 'jarreBleu', createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'stats', 'global'), { totalJarresBleues: increment(1) });
}

export async function donnerJarreRose(echoId: string, uid: string, stockActuel: number, jarresActuelles: number) {
  if (stockActuel <= 0) throw new Error('Stock de jarres roses épuisé.');
  await updateDoc(doc(db, 'users', uid), { stockJarresRoses: increment(-1) });
  await updateDoc(doc(db, 'echos', echoId), { jarresRoses: jarresActuelles + 1 });
  await addDoc(collection(db, 'reactions'), {
    auteurId: uid, echoId, type: 'jarreRose', createdAt: serverTimestamp(),
  });
}

export async function donnerCoeur(echoId: string, uid: string, type: 'coeur' | 'coeurBrise', valeurActuelle: number) {
  const champ = type === 'coeur' ? 'coeurs' : 'coeursBrises';
  await updateDoc(doc(db, 'echos', echoId), { [champ]: valeurActuelle + 1 });
  await addDoc(collection(db, 'reactions'), {
    auteurId: uid, echoId, type, createdAt: serverTimestamp(),
  });
}

export function useCompteurGlobalJarres() {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stats', 'global'), (snap) => {
      if (snap.exists()) {
        setTotal(snap.data().totalJarresBleues || 0);
      }
    });
    return unsub;
  }, []);
  return total;
}

// Utilitaire ponctuel — vérifie l'existence du document stats/global avant
// le tout premier incrément, pour éviter une erreur si le document n'a
// jamais été créé (nouvelle installation).
export async function assurerStatsGlobalExiste() {
  const ref = doc(db, 'stats', 'global');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await updateDoc(ref, { totalJarresBleues: 0 }).catch(async () => {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(ref, { totalJarresBleues: 0 });
    });
  }
}
