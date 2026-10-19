import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { analyserContenu } from '../services/moderation';
import { creerNotification } from './useNotifications';
import { Mention } from '../types';

// Tags @pseudonyme (19/10/2026)
//
// Un pseudo « Pélican Toulouse » se tague « @PélicanToulouse » : tout
// attaché, sans espace (tirets et apostrophes des noms gardés tels quels,
// ex. « @Rouge-gorgeSaint-Malo »).
//
// Un tag ne compte QUE s'il a été choisi dans la liste de suggestions : la
// personne choisie est alors enregistrée dans le champ `mentions`
// ({ uid, pseudo }) de l'Écho ou de l'EchoRep. Un « @quelquechose » tapé à
// la main sans passer par la liste reste du simple texte : ni mise en
// couleur, ni notification. C'est ce qui évite tout risque de confusion
// entre deux pseudos proches.
//
// L'autocomplétion lit la collection `annuaire` (déjà lisible par tout
// utilisateur connecté, déjà utilisée par l'Écho-Bouteille), enrichie de
// deux champs : `pseudo` et `cle` (le pseudo en minuscules, sans accents
// ni espaces ni ponctuation : « pelicantoulouse »). La recherche par
// préfixe se fait sur `cle`, ce qui permet de taper « @pelicantou » sans
// majuscules ni accents et de trouver quand même « Pélican Toulouse ».

export const MAX_MENTIONS = 5;

export interface SuggestionPseudo {
  uid: string;
  pseudo: string;
}

export function cleRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function tagDe(pseudo: string): string {
  return `@${pseudo.replace(/\s+/g, '')}`;
}

export function echapperRegex(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Un tag n'est reconnu que s'il n'est pas immédiatement suivi d'une
// lettre, d'un chiffre, d'un tiret ou d'une apostrophe : « @PélicanSaint »
// ne doit pas être trouvé à l'intérieur de « @PélicanSaint-Malo ».
export const FIN_DE_TAG = "(?![\\p{L}\\p{N}_'’-])";

function contientTag(texte: string, tag: string): boolean {
  return new RegExp(`${echapperRegex(tag)}${FIN_DE_TAG}`, 'u').test(texte);
}

// Mentions réellement présentes dans le texte final : si l'auteur a effacé
// un tag après l'avoir choisi, la personne n'est plus mentionnée. Sans
// doublon, et limité à MAX_MENTIONS.
export function mentionsPresentes(texte: string, mentions: Mention[] | undefined): Mention[] {
  if (!mentions || mentions.length === 0 || !texte) return [];
  const vus = new Set<string>();
  return mentions
    .filter((m) => {
      if (!m || !m.uid || !m.pseudo || vus.has(m.uid)) return false;
      if (!contientTag(texte, tagDe(m.pseudo))) return false;
      vus.add(m.uid);
      return true;
    })
    .slice(0, MAX_MENTIONS);
}

// Mentions ajoutées lors d'une modification : seules celles-ci sont
// notifiées, jamais une seconde fois celles déjà présentes avant.
export function nouvellesMentions(apres: Mention[], avant: Mention[] | undefined): Mention[] {
  const anciennes = new Set((avant || []).map((m) => m.uid));
  return apres.filter((m) => !anciennes.has(m.uid));
}

export async function rechercherPseudos(saisie: string, exclureUids: string[] = []): Promise<SuggestionPseudo[]> {
  const cle = cleRecherche(saisie);
  if (cle.length < 2) return [];
  const q = query(
    collection(db, 'annuaire'),
    where('cle', '>=', cle),
    where('cle', '<=', `${cle}`),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as { uid?: string; pseudo?: string; banni?: boolean })
    .filter((d) => typeof d.uid === 'string' && typeof d.pseudo === 'string' && !d.banni && !exclureUids.includes(d.uid))
    .map((d) => ({ uid: d.uid as string, pseudo: d.pseudo as string }))
    .slice(0, 6);
}

interface ContexteMention {
  expediteurId: string;
  expediteurPseudo: string;
  echoId: string;
  texte: string;
}

// Notifie les personnes taguées. Jamais si le texte contient des
// coordonnées personnelles ou un contenu inapproprié : un tag ne doit pas
// servir à envoyer ça directement à quelqu'un. Un simple signal « mineur
// possible » ne bloque pas la notification (19/10/2026). Jamais soi-même
// (géré par creerNotification). Une notification qui échoue n'empêche ni
// les autres, ni la publication elle-même.
export async function notifierMentions(mentions: Mention[], ctx: ContexteMention) {
  if (!mentions || mentions.length === 0) return;
  try {
    const analyse = analyserContenu(ctx.texte);
    if (analyse.coordonnees || analyse.inapproprie) return;
  } catch {
    return;
  }
  for (const m of mentions.slice(0, MAX_MENTIONS)) {
    try {
      await creerNotification({
        destinataireId: m.uid,
        type: 'mention',
        expediteurId: ctx.expediteurId,
        expediteurPseudo: ctx.expediteurPseudo,
        echoId: ctx.echoId,
        contenuApercu: ctx.texte,
      });
    } catch (err) {
      console.error('[notifierMentions] notification non créée', err);
    }
  }
}
