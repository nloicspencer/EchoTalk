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
//   V3 — V2 + monétisation de l'Écho Solidaire (architecture de façade,
//        prête pour le prestataire de paiement)
//   V4 — V3 + Écho-Bouteille + Publicité
//
// V5 (Journal Premium) et V6 (Partenariats) ne sont pas encore verrouillés
// ici — fonctionnalités encore en conception côté produit, à ajouter
// quand elles se préciseront plutôt que d'anticiper une structure qui
// pourrait changer.
export const CURRENT_VERSION = 4;

// Phase pionnière (21/08/2026) — configuration spéciale pour la période de
// pré-remplissage avec les 30 à 50 premiers pionniers, avant l'ouverture
// publique. Décision : tout le contenu de V4 reste actif (Écholègue,
// Écho-Bouteille), MAIS la monétisation réelle de l'Écho Solidaire et
// l'emplacement publicitaire restent désactivés le temps de cette phase
// fermée — pas de vrai argent en jeu, pas d'impression commerciale,
// pendant qu'on construit la confiance avec les premiers contributeurs.
//
// Ce n'est pas une vraie version de la roadmap officielle — juste un
// réglage temporaire, découplé de CURRENT_VERSION. Une fois la phase
// pionnière terminée et l'ouverture publique réelle enclenchée, repasser
// cette valeur à `false` pour que CURRENT_VERSION reprenne seul le
// contrôle normal des fonctionnalités.
export const PHASE_PIONNIERE = true;

// FEATURES garde exactement la même forme qu'avant, pour que les fichiers
// qui l'utilisaient déjà (FEATURES.ECHOLEGUE, etc.) n'aient besoin de
// changer que leur ligne d'import, pas leur logique.
export const FEATURES = {
  // Écho Libre et Écho Ouvert sont le cœur du produit dès V1 — pas un
  // jalon à verrouiller, donc toujours actifs, jamais conditionnés par
  // CURRENT_VERSION.
  ECHO_OUVERT: true,

  // L'Écho Solidaire SYMBOLIQUE (jarres roses sans transaction réelle,
  // sélection mensuelle, historique) est visible dès V1 pour acculturer
  // les utilisateurs — pas un jalon à verrouiller.
  ECHO_SOLIDAIRE: true,

  // V2 — Écholègue
  ECHOLEGUE: CURRENT_VERSION >= 2,

  // V3 — monétisation RÉELLE de l'Écho Solidaire (prix des packs roses,
  // fenêtre de paiement de façade, bandeau de récupération, portefeuille
  // solidaire). Forcée à false pendant la phase pionnière, peu importe
  // CURRENT_VERSION.
  ECHO_SOLIDAIRE_MONETISE: !PHASE_PIONNIERE && CURRENT_VERSION >= 3,

  // V4 — Écho-Bouteille (jamais désactivé par la phase pionnière — c'est
  // justement le contenu qu'on veut que les pionniers alimentent).
  ECHO_BOUTEILLE: CURRENT_VERSION >= 4,

  // V4 — Publicité. Forcée à false pendant la phase pionnière, peu
  // importe CURRENT_VERSION — même raison que ECHO_SOLIDAIRE_MONETISE.
  PUBLICITE: !PHASE_PIONNIERE && CURRENT_VERSION >= 4,
};
