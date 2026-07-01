export type Tonalite = 'soleil' | 'pluie';
export type Diffusion = 'libre' | 'cercle';
export type Interaction = 'ouvert' | 'ferme';

export interface EchoReactions {
  resonance: number;
  soutien: number;
  jare: number;
}

export interface Echo {
  id: string;
  pseudonyme: string;
  userId: string;
  contenu: string;
  tonalite: Tonalite;
  diffusion: Diffusion;
  interaction: Interaction;
  participants: string[];
  duree: number;
  expiresAt: Date;
  reactions: EchoReactions;
  echorepCount: number;
  createdAt: Date;
}
