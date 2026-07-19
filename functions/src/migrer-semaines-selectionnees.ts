/**
 * Script de migration à usage UNIQUE — remplit le nouveau champ
 * `semainesSelectionnees` (tableau simple de chaînes) à partir de
 * l'historique détaillé déjà existant (`historiqueSelections`), pour
 * chaque Écholègue de la collection `echolegues`.
 *
 * Sans ce script, le Journal des Lègues afficherait "vide" après le
 * déploiement du nouveau code, même pour des Écholègues déjà
 * sélectionnés cette semaine — car `useJournalLegues()` interroge
 * désormais Firestore sur ce nouveau champ, qui n'existe pas encore sur
 * les documents créés avant ce changement.
 *
 * Sans risque à ré-exécuter plusieurs fois si besoin (recalcule le champ
 * à partir de historiqueSelections à chaque fois, ne fait pas
 * d'incrémentation cumulative).
 *
 * ── Comment l'exécuter ──
 * Même méthode que pour migrer-compteur-global.ts : placer ce fichier
 * dans functions/src/, puis :
 *   cd functions
 *   npx ts-node src/migrer-semaines-selectionnees.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function migrerSemainesSelectionnees() {
  console.log('Lecture de tous les Écholègues...');
  const snap = await db.collection('echolegues').get();

  let miseAJour = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const historique = (data.historiqueSelections || []) as Array<{ semaine: string }>;
    const semaines = [...new Set(historique.map(h => h.semaine))];

    await d.ref.update({ semainesSelectionnees: semaines });
    miseAJour++;
    console.log(`  ${d.id} → ${semaines.length} semaine(s) : ${semaines.join(', ') || '(aucune)'}`);
  }

  console.log(`✅ Migration terminée — ${miseAJour} Écholègue(s) mis à jour.`);
}

migrerSemainesSelectionnees()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur pendant la migration :', err);
    process.exit(1);
  });
