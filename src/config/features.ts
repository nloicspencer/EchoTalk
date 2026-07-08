// Feature flags EchoTalk — permettent d'activer/désactiver une fonctionnalité
// sans supprimer son code, pour composer les versions successives (V1, V2, V3...)
// sans jamais avoir à retirer ni réécrire ce qui est déjà développé.
//
// Passer un flag à false rend la fonctionnalité entièrement invisible :
// aucun bouton, aucune section, aucun texte descriptif ne doit y faire référence.
export const FEATURES = {
  // V1 — Échos Libres + Écho-Bouteille (toujours actif)
  ECHO_BOUTEILLE: true,

  // V2 — Écholègue + Écho Solidaire
  ECHOLEGUE: false,
  ECHO_SOLIDAIRE: false,

  // V3 — Échos Ouverts + EchoRep
  ECHO_OUVERT: false,
};
