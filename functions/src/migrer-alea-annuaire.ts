/**
 * Script de migration à usage UNIQUE — ajoute le champ `alea` (nombre
 * aléatoire fixe) sur chaque document `annuaire/{uid}` déjà existant, créé
 * avant la mise en place de ce champ.
 *
 * Sans ce script, les comptes déjà inscrits n'auraient pas de champ `alea`,
 * et la nouvelle requête de tirage aléatoire (basée sur ce champ) ne les
 * trouverait jamais comme destinataires possibles.
 *
 * Sans risque à ré-exécuter : ignore les documents qui ont déjà un champ
 * `alea`, ne les régénère pas.
 *
 * ── Comment l'exécuter ──
 * Même méthode que les scripts précédents (clé de compte de service +
 * variable d'environnement) :
 *   cd functions
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="chemin vers serviceAccountKey.json"
 *   npx ts-node src/migrer-alea-annuaire.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function migrerAleaAnnuaire() {
  console.log('Lecture de annuaire...');
  const snap = await db.collection('annuaire').get();

  let miseAJour = 0;
  let dejaPresent = 0;

  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.alea === 'number') {
      dejaPresent++;
      continue;
    }
    await d.ref.update({ alea: Math.random() });
    miseAJour++;
    console.log(`  ${d.id} → champ alea ajouté`);
  }

  console.log(`✅ Migration terminée — ${miseAJour} document(s) mis à jour, ${dejaPresent} déjà à jour.`);
}

migrerAleaAnnuaire()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur pendant la migration :', err);
    process.exit(1);
  });
