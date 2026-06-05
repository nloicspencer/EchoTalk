export type Echo = {
  id: string;
  author: string;
  avatar: string;
  text: string;
  emotion: string;
  timestamp: string;
  echoRep: number;
  reactions: { emoji: string; count: number }[];
  jares: number;
  isOpen: boolean;
  isFree: boolean;
  category?: string;
};

export const MOCK_ECHOS: Echo[] = [
  {
    id: '1',
    author: 'Marta L.',
    avatar: 'M',
    text: "Aujourd'hui j'ai réussi à dire non pour la première fois depuis longtemps. C'est petit mais pour moi c'est immense.",
    emotion: 'Fierté',
    timestamp: 'Il y a 2h',
    echoRep: 14,
    reactions: [{ emoji: '💙', count: 8 }, { emoji: '🌊', count: 3 }],
    jares: 2,
    isOpen: true,
    isFree: false,
    category: 'sante',
  },
  {
    id: '2',
    author: 'Anon',
    avatar: '?',
    text: "Les nuits sont longues en ce moment. Pas de raison particulière, juste ce poids dans la poitrine qu'on ne sait pas nommer.",
    emotion: 'Mélancolie',
    timestamp: 'Il y a 5h',
    echoRep: 22,
    reactions: [{ emoji: '🤍', count: 15 }, { emoji: '🌙', count: 6 }],
    jares: 4,
    isOpen: false,
    isFree: true,
    category: 'solidarite',
  },
  {
    id: '3',
    author: 'Théo R.',
    avatar: 'T',
    text: "Je viens de terminer ma thérapie après 2 ans. Merci à tous ceux qui m'ont accompagné ici. Ce réseau a été un soutien inattendu.",
    emotion: 'Gratitude',
    timestamp: 'Il y a 1j',
    echoRep: 47,
    reactions: [{ emoji: '🌱', count: 21 }, { emoji: '💛', count: 18 }],
    jares: 9,
    isOpen: true,
    isFree: false,
    category: 'famille',
  },
];

export const CATEGORIES = [
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧' },
  { id: 'couple', label: 'Couple', icon: '💕' },
  { id: 'amitie', label: 'Amitié', icon: '🤝' },
  { id: 'travail', label: 'Travail', icon: '💼' },
  { id: 'etudes', label: 'Études', icon: '📚' },
  { id: 'sante', label: 'Santé', icon: '🌿' },
  { id: 'voyage', label: 'Voyage', icon: '✈️' },
  { id: 'spiritualite', label: 'Spiritualité', icon: '🙏' },
  { id: 'culture', label: 'Culture', icon: '🎭' },
  { id: 'solidarite', label: 'Solidarité', icon: '🫂' },
  { id: 'societe', label: 'Société', icon: '🌍' },
];

export const ECHO_SOLIDAIRE = {
  author: 'Sam K.',
  text: "Après des mois de silence, j'ai enfin parlé à ma famille de ce que je traversais. Leur réaction m'a surprise — en bien.",
  emotion: 'Courage',
  echoRep: 63,
};
