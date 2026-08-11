export type EchoType = 'libre' | 'ouvert';
export type Tonalite = 'soleil' | 'pluie';

export interface Echo {
  id: string;
  contenu: string;
  auteurId: string;
  auteurPseudo: string;
  tonalite: Tonalite;
  type: EchoType;
  categorie: string;
  createdAt: Date;
  // Réactions
  jarresBleues: number;
  coeurs: number;
  coeursBrises: number;
  // Levier n°2 — Référencement naturel (Google/IA). Choix actif de
  // l'auteur à la publication, décoché par défaut. Rend l'Écho consultable
  // via la page publique /e/{id} sans balise "noindex", donc indexable
  // par les moteurs de recherche et les IA. S'applique à Écho Libre et
  // Écho Ouvert ; absent = non découvrable (comportement par défaut,
  // équivalent à false).
  decouvrable?: boolean;
  // Écho Ouvert uniquement
  placesMax?: 3 | 6 | 8;
  placesOccupees?: number;
  periodicitéJours?: 2 | 6 | 10;
  ouvertureCount?: number;
  reouverturesRestantes?: number; // max 3
  estOuvert?: boolean;
  expiresAt?: Date;
  // Écho Solidaire
  estSolidaire?: boolean;
  modifie?: boolean;
  supprime?: boolean;
  updatedAt?: Date;
  clotureManuellement?: boolean;
  suppressionAt?: Date;
  solidaireDepuis?: Date;
  solidaireJusquau?: Date;
  solidaireTermineAt?: Date;
  jarresRoses?: number;
  // Modération
  masque?: boolean;
  raisonModeration?: string;
}

export interface UserProfile {
  uid: string;
  pseudo: string; // Oiseau + Ville
  createdAt: Date;
  echosPublies: number;
  jarresBleuesRecues: number;
  jarresBleuesPartagees: number;
  coeursRecus: number;
  role?: 'admin' | 'moderateur'; // absent = membre standard
  // Stock de jarres (packs, Écho Solidaire)
  stockJarresBleues: number;
  stockJarresRoses: number;
}

export interface EchoRep {
  id: string;
  echoId: string;
  auteurId: string;
  auteurPseudo: string;
  contenu: string;
  createdAt: Date;
}

export const CATEGORIES = [
  { id: 'tous', label: 'Tous', emoji: '✨' },
  { id: 'famille', label: 'Famille', emoji: '👨‍👩‍👧' },
  { id: 'couple', label: 'Couple', emoji: '💑' },
  { id: 'amour', label: 'Amour', emoji: '❤️' },
  { id: 'amitie', label: 'Amitié', emoji: '🤝' },
  { id: 'travail', label: 'Travail', emoji: '💼' },
  { id: 'entrepreneuriat', label: 'Entrepreneuriat', emoji: '🚀' },
  { id: 'sante', label: 'Santé', emoji: '🌿' },
  { id: 'sport', label: 'Sport', emoji: '⚽' },
  { id: 'voyages', label: 'Voyages', emoji: '✈️' },
  { id: 'creativite', label: 'Créativité', emoji: '🎨' },
  { id: 'solitude', label: 'Solitude', emoji: '🌙' },
  { id: 'joie', label: 'Joie', emoji: '🌟' },
] as const;

// Liste élargie à 31 (depuis 24) pour atteindre ~1 million de combinaisons
// possibles avec les communes de France (32 625 noms uniques après
// dédoublonnage). "Pigeon" et "Canard" retirés (connotations familières
// négatives : "se faire pigeonner", "sortir un canard") et remplacés par
// Chardonneret et Martin-pêcheur.
export const OISEAUX = [
  'Aigle', 'Albatros', 'Alouette', 'Buse', 'Chardonneret', 'Chouette',
  'Cigogne', 'Colibri', 'Corneille', 'Cygne', 'Épervier', 'Faucon',
  'Flamant', 'Geai', 'Grue', 'Héron', 'Hibou', 'Hirondelle',
  'Martin-pêcheur', 'Merle', 'Mésange', 'Milan', 'Moineau', 'Mouette',
  'Pélican', 'Perroquet', 'Pie', 'Pinson', 'Rouge-gorge', 'Sterne',
  'Tourterelle',
];

// VILLES retiré : remplacé par un import dynamique de src/data/communes.json
// (32 625 communes françaises réelles, chargé uniquement au moment de
// l'inscription, pas à chaque chargement de l'application — voir
// AuthContext.tsx). 31 oiseaux × 32 625 villes ≈ 1 011 375 combinaisons.
