/**
 * Script de migration à usage UNIQUE — calcule et écrit le document index
 * `stats/echolegues_semaines` (compte d'Écholègues publiés par semaine de
 * création) à partir de tous les Écholègues déjà existants.
 *
 * Sans ce script, la Moulinette et la section Bibliothèque de la page
 * Admin afficheraient "aucune semaine disponible" après le déploiement du
 * nouveau code, même s'il existe déjà des Écholègues publiés.
 *
 * Ce script ÉCRASE le contenu de `comptes` avec les valeurs recalculées
 * depuis zéro (pas un incrément cumulatif) — sans risque à ré-exécuter.
 *
 * ── Comment l'exécuter ──
 *   cd functions
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="chemin vers serviceAccountKey.json"
 *   npx ts-node src/migrer-semaines-index-echolegues.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

function getSemaineISO(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function migrerSemainesIndexEcholegues() {
  console.log('Lecture de tous les Écholègues publiés...');
  const snap = await db.collection('echolegues').where('statut', '==', 'publie').get();

  const comptes: Record<string, number> = {};
  snap.docs.forEach(d => {
    const data = d.data();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    const semaine = getSemaineISO(createdAt);
    comptes[semaine] = (comptes[semaine] || 0) + 1;
  });

  console.log(`${snap.docs.length} Écholègue(s) publié(s), répartis sur ${Object.keys(comptes).length} semaine(s) :`);
  Object.entries(comptes)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([semaine, total]) => console.log(`   ${semaine} : ${total}`));

  await db.doc('stats/echolegues_semaines').set({ comptes }, { merge: false });

  console.log('✅ Migration terminée — stats/echolegues_semaines mis à jour.');
}

migrerSemainesIndexEcholegues()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur pendant la migration :', err);
    process.exit(1);
  });
