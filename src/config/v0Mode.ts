// Interrupteur V0 : tant que c'est à `true`, tout visiteur qui arrive sur
// le site public voit la page de pré-inscription (LandingV0) au lieu de
// l'application réelle. Les testeurs continuent d'accéder normalement à
// l'application via la route cachée /test, quel que soit l'état de ce
// drapeau.
//
// Le jour du vrai lancement (V1), il suffit de passer ce drapeau à
// `false` pour que tout le monde voie l'application normale sur "/" —
// aucun autre changement de code n'est nécessaire.
export const V0_MODE = true;
