// Verrouillage par version — remplace l'ancien système de drapeaux
// indépendants (features.ts, désormais supprimé). Version centrale
// cumulative : une seule valeur détermine tout ce qui est actif, chaque
// version incluant automatiquement tout ce qu'il y avait dans les
// précédentes — plus de risque de combinaison qui ne correspond à
// aucune vraie étape de la roadmap.
//
// Roadmap officielle (Charte & Vision, Annexe B) :
//   V1 — socle (Écho Libre, Écho Ouvert, réactions, modération, profil)
//   V2 — V1 + Écholègue
//   V3 — V2 + monétisation de l'Écho Solidaire
//   V4 — V3 + Écho-Bouteille + Publicité
//
// V5 (Journal Premium) et V6 (Partenariats) ne sont pas encore verrouillés
// ici — fonctionnalités encore en conception côté produit, à ajouter
// quand elles se préciseront plutôt que d'anticiper une structure qui
// pourrait changer.
export const CURRENT_VERSION = 4;

// FEATURES garde exactement la même forme que l'ancien features.ts, pour
// que les fichiers qui l'utilisaient déjà (FEATURES.ECHOLEGUE, etc.)
// n'aient besoin de changer que leur ligne d'import, pas leur logique.
export const FEATURES = {
  // Écho Libre et Écho Ouvert sont le cœur du produit dès V1 — pas un
  // jalon à verrouiller, donc toujours actifs, jamais conditionnés par
  // CURRENT_VERSION.
  ECHO_OUVERT: true,

  // V2 — Écholègue
  ECHOLEGUE: CURRENT_VERSION >= 2,

  // V3 — monétisation de l'Écho Solidaire
  ECHO_SOLIDAIRE: CURRENT_VERSION >= 3,

  // V4 — Écho-Bouteille (la Publicité, également prévue en V4, n'a pas
  // encore de flag consommé côté front — à ajouter quand l'infrastructure
  // publicitaire sera codée)
  ECHO_BOUTEILLE: CURRENT_VERSION >= 4,
};
