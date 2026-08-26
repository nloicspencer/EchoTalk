// Verrouillage par version — remplace l'ancien système de drapeaux
// indépendants (features.ts, désormais supprimé). Version centrale
// cumulative : une seule valeur détermine tout ce qui est actif, chaque
// version incluant automatiquement tout ce qu'il y avait dans les
// précédentes — plus de risque de combinaison qui ne correspond à
// aucune vraie étape de la roadmap.
//
// Roadmap officielle (Charte & Vision, Annexe B) :
//   V1 — socle (Écho Libre, Écho Ouvert, Écho Solidaire symbolique,
//        réactions, modération, profil)
//   V2 — V1 + Écholègue
//   V3 — V2 + monétisation de l'Écho Solidaire (transaction réelle)
//   V4 — V3 + Écho-Bouteille + Publicité
//
// V5 (Journal Premium) et V6 (Partenariats) ne sont pas encore verrouillés
// ici — fonctionnalités encore en conception côté produit, à ajouter
// quand elles se préciseront plutôt que d'anticiper une structure qui
// pourrait changer.
//
// TEST du 21/08/2026 : réglé sur 1 pour vérifier le comportement V1 sur
// /test avant de repasser à la valeur définitive.
export const CURRENT_VERSION = 1;

// FEATURES garde exactement la même forme que l'ancien features.ts, pour
// que les fichiers qui l'utilisaient déjà (FEATURES.ECHOLEGUE, etc.)
// n'aient besoin de changer que leur ligne d'import, pas leur logique.
export const FEATURES = {
  // Écho Libre et Écho Ouvert sont le cœur du produit dès V1 — pas un
  // jalon à verrouiller, donc toujours actifs, jamais conditionnés par
  // CURRENT_VERSION.
  ECHO_OUVERT: true,

  // Correction du 21/08/2026 : l'Écho Solidaire SYMBOLIQUE (jarres roses
  // sans transaction réelle, sélection mensuelle, historique) est déjà
  // entièrement construit et ne coûte rien à activer — il doit être visible
  // dès V1 pour acculturer les utilisateurs au concept, comme le prévoit
  // déjà la Charte ("les Jarres Roses représentent un geste symbolique").
  // Ce n'est PAS un jalon à verrouiller, contrairement à ce qui avait été
  // fait initialement (qui le bloquait par erreur jusqu'à V3).
  ECHO_SOLIDAIRE: true,

  // V2 — Écholègue
  ECHOLEGUE: CURRENT_VERSION >= 2,

  // V3 — monétisation RÉELLE de l'Écho Solidaire (transaction financière).
  // Nouveau flag distinct de ECHO_SOLIDAIRE ci-dessus. Pas encore consommé
  // nulle part dans le code, puisque l'infrastructure de paiement n'existe
  // pas encore (voir Roadmap technique, prérequis V3) — réservé pour le
  // jour où cette brique sera codée.
  ECHO_SOLIDAIRE_MONETISE: CURRENT_VERSION >= 3,

  // V4 — Écho-Bouteille
  ECHO_BOUTEILLE: CURRENT_VERSION >= 4,

  // V4 — Publicité (21/08/2026). Emplacement construit (bandeau dans
  // l'en-tête du Fil), régie non encore choisie — le composant
  // EncartPublicitaireHeader affiche pour l'instant un espace réservé.
  PUBLICITE: CURRENT_VERSION >= 4,
};
