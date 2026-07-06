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

export const OISEAUX = [
  'Albatros', 'Aigle', 'Buse', 'Cigogne', 'Colibri', 'Cygne',
  'Faucon', 'Flamant', 'Grue', 'Héron', 'Hibou', 'Hirondelle',
  'Merle', 'Mésange', 'Milan', 'Mouette', 'Pélican', 'Perroquet',
  'Pie', 'Pigeon', 'Pinson', 'Rouge-gorge', 'Sterne', 'Tourterelle',
];

export const VILLES = [
  'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nantes', 'Toulouse',
  'Lille', 'Strasbourg', 'Rennes', 'Grenoble', 'Nice', 'Montpellier',
  'Brest', 'Dijon', 'Angers', 'Reims', 'Caen', 'Metz', 'Forêt', 'Rivière',
];
