// Script ponctuel (31/10/2026) — à lancer UNE fois, avec les droits admin,
// AVANT de publier les nouvelles règles Firestore.
//
// Les comptes de test en @echotalk.com ne reçoivent pas d'e-mails : ils ne
// pourraient jamais confirmer leur adresse et resteraient bloqués sur
// l'écran de vérification. Ce script les marque comme vérifiés.
// (Ton compte admin, loicspencer3@echotalk.com, est concerné aussi.)
//
// Sans risque à relancer : un compte déjà vérifié est ignoré.
//
// Lancement (depuis C:\Users\User\echotalk-v1\functions) :
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "serviceAccountKey.json"
//   npx ts-node src/verifier-comptes-test.ts

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp();

const DOMAINE_TEST = "@echotalk.com";

async function main() {
  let pageToken: string | undefined;
  let marques = 0;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const compte of page.users) {
      const email = (compte.email || "").toLowerCase();
      if (!email.endsWith(DOMAINE_TEST) || compte.emailVerified) continue;
      await getAuth().updateUser(compte.uid, { emailVerified: true });
      console.log("Vérifié :", email);
      marques++;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`${marques} compte(s) de test marqué(s) comme vérifié(s).`);
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
