// Script ponctuel (24/10/2026) — à lancer UNE fois, avec les droits admin.
//
// Les propositions d'EchoRep envoyées avant le 19/10/2026 au soir n'ont pas
// le champ `proprietaireId` (le propriétaire de l'Écho). Or la liste de
// validation et les règles Firestore s'appuient désormais dessus : sans ce
// champ, une ancienne proposition en attente disparaîtrait de la liste de
// son destinataire. Ce script retrouve le propriétaire de chaque ancienne
// proposition (via son Écho) et le lui ajoute.
//
// Sans risque à relancer : une proposition qui a déjà le champ est ignorée.
//
// Lancement (depuis C:\Users\User\echotalk-v1\functions) :
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "serviceAccountKey.json"
//   npx ts-node src/migrer-proprietaire-attente.ts

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

async function main() {
  const snap = await db.collection("echoreps_attente").get();
  let completees = 0;
  let sansEcho = 0;

  for (const d of snap.docs) {
    const data = d.data();
    if (data.proprietaireId) continue;

    const echo = data.echoId ? await db.collection("echos").doc(data.echoId).get() : null;
    const proprietaireId: string | null = echo && echo.exists ? (echo.data()?.auteurId ?? null) : null;
    if (!proprietaireId) sansEcho++;

    await d.ref.update({ proprietaireId });
    completees++;
  }

  console.log(`${completees} proposition(s) complétée(s) sur ${snap.size}.`);
  if (sansEcho > 0) {
    console.log(`${sansEcho} proposition(s) dont l'Écho n'existe plus (propriétaire laissé vide).`);
  }
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
