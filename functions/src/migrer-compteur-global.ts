/**
 * Script de migration à usage UNIQUE — initialise le compteur global
 * `stats/global.totalJarresBleues` avec la somme des jarresBleues déjà
 * accumulées sur tous les Échos existants avant la mise en place du
 * compteur global.
 *
 * À exécuter une seule fois, après le déploiement du nouveau code, avant
 * (ou juste après) que les utilisateurs commencent à offrir de nouvelles
 * jarres. Réexécuter ce script plus tard n'aurait pas de sens (le total
 * serait alors incorrect) — il fait un setDoc en écrasement complet, pas
 * un incrément.
 *
 * ── Comment l'exécuter ──
 * 1. Placer ce fichier à la racine de `functions/src/` (ou l'exécuter en
 *    script Node local avec les credentials admin Firebase — au choix,
 *    voir instructions ci-dessous).
 * 2. Lancer une seule fois, vérifier le résultat dans Firestore Console
 *    (stats/global.totalJarresBleues), puis supprimer ce fichier ou le
 *    laisser de côté (il ne fait rien tout seul, il faut l'exécuter
 *    explicitement).
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Si ce script tourne dans functions/ avec les credentials déjà configurés
// (gcloud auth / service account par défaut), initializeApp() sans argument
// suffit. Sinon, décommenter et pointer vers votre fichier de clé de
// service account téléchargé depuis Firebase Console → Paramètres du
// projet → Comptes de service.
//
// initializeApp({ credential: cert(require('./chemin-vers-votre-cle.json')) });
initializeApp();

const db = getFirestore();

async function migrerCompteurGlobal() {
  console.log('Lecture de tous les Échos...');
  const snap = await db.collection('echos').get();

  let total = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    // On ne compte que les jarres des Échos non supprimés — cohérent avec
    // ce que le puits affichait déjà avant la migration (useEchos filtrait
    // les Échos supprimés/masqués du calcul client).
    if (data.supprime) return;
    total += data.jarresBleues || 0;
  });

  console.log(`Total calculé : ${total} jarres bleues sur ${snap.docs.length} Échos.`);

  await db.doc('stats/global').set({ totalJarresBleues: total }, { merge: true });

  console.log('✅ Migration terminée — stats/global.totalJarresBleues =', total);
}

migrerCompteurGlobal()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur pendant la migration :', err);
    process.exit(1);
  });
