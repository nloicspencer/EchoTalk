/**
 * Script de nettoyage à usage UNIQUE (mais sans risque à ré-exécuter) —
 * repère les documents `annuaire/{uid}` qui n'ont plus de document
 * `users/{uid}` correspondant (comptes supprimés manuellement pendant des
 * sessions de debug, sans nettoyage de leur entrée annuaire — la règle
 * Firestore bloque volontairement la suppression côté client), et les
 * supprime via les identifiants admin (qui contournent cette règle).
 *
 * Ces entrées orphelines faussaient le tirage aléatoire de destinataire
 * pour Écho-Bouteille : une bouteille pouvait être "envoyée avec succès"
 * à un UID fantôme, invisible pour quiconque.
 *
 * ── Comment l'exécuter ──
 *   cd functions
 *   npx ts-node src/nettoyer-annuaire-orphelin.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function nettoyerAnnuaireOrphelin() {
  console.log('Lecture de annuaire et users...');
  const [annuaireSnap, usersSnap] = await Promise.all([
    db.collection('annuaire').get(),
    db.collection('users').get(),
  ]);

  const uidsValides = new Set(usersSnap.docs.map(d => d.id));
  const orphelins = annuaireSnap.docs.filter(d => !uidsValides.has(d.id));

  console.log(`annuaire : ${annuaireSnap.docs.length} entrée(s), users : ${usersSnap.docs.length} compte(s).`);
  console.log(`→ ${orphelins.length} entrée(s) orpheline(s) détectée(s) :`);
  orphelins.forEach(d => console.log(`   - ${d.id}`));

  if (orphelins.length === 0) {
    console.log('✅ Rien à nettoyer.');
    return;
  }

  for (const d of orphelins) {
    await d.ref.delete();
  }

  console.log(`✅ ${orphelins.length} entrée(s) orpheline(s) supprimée(s) de annuaire.`);
}

nettoyerAnnuaireOrphelin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur pendant le nettoyage :', err);
    process.exit(1);
  });
