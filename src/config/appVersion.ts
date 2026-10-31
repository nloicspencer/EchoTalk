// Verrouillage par version — échelle du 30/10/2026 (remplace l'ancienne
// échelle V1→V4 et le réglage spécial de la phase pionnière, supprimés).
//
// Version cumulative : une seule valeur décide de tout ce qui est actif,
// chaque version incluant automatiquement tout ce qu'il y avait dans les
// précédentes.
//
//   V1 — Écho Libre, Écho Ouvert, Écho Solidaire gratuit (jarres roses
//        symboliques), réactions, modération, profil
//   V2 — + Écholègue
//   V3 — + Écho-Bouteille
//   V4 — + paiement de l'Écho Solidaire (prix des packs de jarres roses,
//        fenêtre de paiement, portefeuille solidaire). Prérequis avant
//        d'activer : prestataire de paiement réel et statut d'entreprise.
//   V5 — + publicité. Prérequis : régie publicitaire choisie et branchée,
//        bandeau de consentement aux traceurs.
//   V6 — + Journal Premium. Prérequis : fonctionnalité à construire.
//
// POUR ACTIVER UNE VERSION : changer CURRENT_VERSION, puis build et
// déploiement. Rien d'autre à toucher.
export const CURRENT_VERSION = 1;

// Accès de test réservé au compte admin (echotalk.fr/test, voir App.tsx).
// Sur /test, l'appli suit VERSION_TEST au lieu de CURRENT_VERSION : ça
// permet d'essayer une version AVANT de l'ouvrir au public. Attention :
// /test travaille sur la vraie base de données — ce qui y est publié est
// réel (simplement invisible du public tant que la version n'est pas
// activée pour tous).
export const VERSION_TEST = 3;

export const SUR_TEST = window.location.pathname.startsWith('/test');
export const VERSION_ACTIVE = SUR_TEST ? VERSION_TEST : CURRENT_VERSION;

// FEATURES garde les mêmes noms qu'avant : les fichiers qui l'utilisent
// (FEATURES.ECHOLEGUE, FEATURES.PUBLICITE…) n'ont rien à changer.
export const FEATURES = {
  // V1 — cœur du produit, toujours actifs.
  ECHO_OUVERT: true,
  ECHO_SOLIDAIRE: true,

  // V2
  ECHOLEGUE: VERSION_ACTIVE >= 2,

  // V3
  ECHO_BOUTEILLE: VERSION_ACTIVE >= 3,

  // V4
  ECHO_SOLIDAIRE_MONETISE: VERSION_ACTIVE >= 4,

  // V5
  PUBLICITE: VERSION_ACTIVE >= 5,

  // V6 — réservé, rien ne l'utilise encore.
  JOURNAL_PREMIUM: VERSION_ACTIVE >= 6,
};
