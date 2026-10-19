import { OISEAUX } from '../types';

// Filtre de modération automatique côté appli — révisé le 19/10/2026.
//
// Trois familles de détection, aux conséquences différentes :
//
// 1. COORDONNÉES PERSONNELLES (`coordonnees`) — téléphone (y compris
//    +33, 0033, séparé par des points/espaces/tirets, ou écrit « zéro
//    six… »), e-mail (y compris « arobase », « point com », @ espacé),
//    compte de réseau social ou de messagerie proposé, lien ou nom de
//    domaine, adresse postale. Conséquence : le contenu est MASQUÉ tout de
//    suite (ou mis en attente), en attendant la vérification d'un
//    modérateur. L'anonymat est le principe d'EchoTalk : on n'y échange
//    pas de moyen de se contacter ailleurs.
//
// 2. CONTENU INAPPROPRIÉ (`inapproprie`) — liste noire, cherchée en MOTS
//    ENTIERS uniquement. Avant le 19/10/2026, « con » était cherché à
//    l'intérieur des mots : « continuer », « content », « rencontre »
//    déclenchaient un signalement (et « s'habituer » à cause de « tuer »).
//    Conséquence : signalement (comportement inchangé).
//
// 3. MINEUR POSSIBLE (`mineur`) — « j'ai 15 ans », « je suis mineur ».
//    EchoTalk est réservé aux plus de 18 ans : c'est un signal à vérifier,
//    pas une faute. Conséquence : simple signalement, rien n'est masqué.
//    « J'ai 30 ans » ou « j'ai 2 ans de sobriété » ne sont plus repérés.
//    Le prénom (« je m'appelle Marie ») n'est plus repéré : il ne permet
//    pas d'identifier quelqu'un.
//
// 4. NUMÉRO DISSIMULÉ (`numeroDissimule`, 19/10/2026) — chiffres semés
//    dans une phrase anodine qui, mis bout à bout, forment un numéro
//    (« ma chambre est libre 07, appelle-moi pour 09 la voir… »).
//    Conséquence : simple signalement, rien n'est masqué — une phrase
//    ordinaire peut, par hasard, contenir des nombres qui forment un
//    numéro. L'agent IA, lui, juge le sens et masque si c'est voulu.
//
// Aucune expression n'a le drapeau /g : avec /g, .test() garde en mémoire
// sa position d'une analyse à l'autre, et un numéro pouvait passer s'il
// arrivait juste après un autre message repéré (défaut constaté le
// 19/10/2026).
//
// Ce filtre tourne dans l'appli : il est rapide mais contournable. L'agent
// IA (functions/src/index.ts) refait l'analyse côté serveur et rattrape
// les formes déguisées qu'aucune liste ne peut prévoir.

const LISTE_NOIRE = [
  // Insultes FR
  'connard', 'connasse', 'salope', 'pute', 'enculé', 'fdp', 'batard', 'bâtard',
  'merde', 'con', 'conne', 'idiot', 'idiote', 'imbécile', 'abruti', 'crétin',
  // Haine / Racisme / Antisémitisme
  'nazi', 'nègre', 'négresse', 'youpin', 'youpine', 'bougnoule', 'bicot',
  'bamboula', 'chinetoque', 'schleu', 'juif de merde', 'sale arabe', 'sale noir',
  'sale blanc', 'raciste', 'antisémite', 'islamophobe', 'heil', 'kkk',
  // Violence
  'je vais te tuer', 'je vais te crever', 'suicide toi', 'crève', 'mort aux',
  'tuer', 'violer', 'frapper', 'menace',
  // Contenu sexuel explicite
  'pornographie', 'porn', 'sexe explicite', 'nudes',
  // Insultes EN
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'nigger', 'faggot',
];

export interface ResultatAnalyse {
  flagge: boolean;
  raisons: string[];
  coordonnees: boolean;
  inapproprie: boolean;
  mineur: boolean;
  numeroDissimule: boolean;
}

// Minuscules, sans accents, apostrophes et tirets typographiques unifiés.
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[‐‑–—]/g, '-');
}

function echapper(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mot entier : ni précédé ni suivi d'une lettre ou d'un chiffre.
const LISTE_NOIRE_REGEX = LISTE_NOIRE.map((mot) => ({
  mot,
  regex: new RegExp(`(?<![\\p{L}\\p{N}])${echapper(normaliser(mot)).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'u'),
}));

const OISEAUX_NORMALISES = OISEAUX.map((o) => normaliser(o).replace(/[^a-z]/g, ''));

// Un « @mot » qui commence par un nom d'oiseau est un tag EchoTalk
// (@PélicanToulouse), pas un compte de réseau social.
function estTagEchoTalk(handle: string): boolean {
  const h = handle.replace(/[^a-z]/g, '');
  return OISEAUX_NORMALISES.some((o) => h.startsWith(o));
}

const RESEAUX = '(?:insta|instagram|ig|snap|snapchat|whatsapp|whats\\s?app|wa|telegram|tg|tiktok|tik\\s?tok|facebook|fb|messenger|discord|twitter|linkedin|onlyfans|kik|threads|bereal|skype|viber|wechat|line)';
const INTENTION = "(?:moi|me|m'|mon|ma|mes|ajoute|ajouter|add|ecris|ecrire|contacte|contacter|dm|mp|pv|follow|suis|suivre|retrouve|retrouver|pseudo|compte|id|c'est|parle|parler|parlons|rejoins|rejoindre|viens|passe)";

function detecterCoordonnees(n: string): string | null {
  // Téléphone : au moins 9 chiffres d'affilée, séparateurs autorisés
  // (espaces, points, tirets, barres, parenthèses), avec ou sans +33/0033.
  const suites = n.match(/(?:\+|00)?\d(?:[\s.\-/()]*\d){8,}/g) || [];
  if (suites.some((s) => {
    const chiffres = s.replace(/\D/g, '').length;
    return chiffres >= 9 && chiffres <= 15;
  })) return 'Numéro de téléphone détecté';

  // Téléphone écrit en lettres : « zéro six », « zero sept »…
  if (/(?<![a-z])zero[\s-]*(?:un|deux|trois|quatre|cinq|six|sept|huit|neuf)(?![a-z])/.test(n)) {
    return 'Numéro de téléphone (en lettres) détecté';
  }

  // E-mail classique, ou avec @ espacé, ou « point com ».
  if (/[a-z0-9._%+-]+\s*@\s*[a-z0-9-]+\s*(?:\.|\bpoint\b|\bdot\b)\s*[a-z]{2,}/.test(n)) {
    return 'Adresse e-mail détectée';
  }
  if (/(?<![a-z])(?:arobase|arrobase|arobaz|arobas)(?![a-z])/.test(n)) return 'Adresse e-mail (en lettres) détectée';
  if (/(?<![a-z])(?:gmail|hotmail|yahoo|outlook|icloud|orange|wanadoo|laposte|protonmail|proton|live|free|sfr)\s*(?:\.|point|dot)\s*(?:com|fr|net|me)(?![a-z])/.test(n)) {
    return 'Adresse e-mail détectée';
  }

  // Liens et noms de domaine.
  if (/https?:\/\/\S+/.test(n) || /(?<![a-z])www\.\S+/.test(n)) return 'Lien détecté';
  if (/(?<![a-z0-9@.-])[a-z0-9-]{2,}\.(?:com|fr|net|org|io|me|be|ch|ca|co|app|link|ly|gg|tv|ee|to|xyz)(?![a-z0-9])/.test(n)) {
    return 'Lien ou nom de domaine détecté';
  }

  // Compte de réseau social ou de messagerie PROPOSÉ : nom du réseau à
  // proximité d'une intention (« ajoute-moi sur insta », « mon snap c'est… »).
  // Citer un réseau en passant (« j'ai vu ça sur Instagram ») ne suffit pas.
  const reseauIntention = new RegExp(
    `(?<![a-z])${INTENTION}(?![a-z])[^.!?\\n]{0,40}(?<![a-z])${RESEAUX}(?![a-z])|(?<![a-z])${RESEAUX}(?![a-z])[^.!?\\n]{0,25}(?<![a-z])${INTENTION}(?![a-z])`
  );
  if (reseauIntention.test(n)) return 'Compte de réseau social ou de messagerie détecté';

  // « @compte » qui n'est pas un tag EchoTalk.
  const handles = n.match(/(?<![a-z0-9._%+-])@([a-z0-9._-]{3,40})/g) || [];
  if (handles.some((h) => !estTagEchoTalk(h.slice(1)))) return 'Compte de réseau social détecté';

  // Adresse postale : numéro suivi d'un type de voie.
  if (/(?<![\d])\d{1,4}\s*(?:bis|ter)?\s*,?\s*(?:rue|avenue|av\.?|boulevard|bd|chemin|allee|impasse|place|quai|route|cours|square|residence|lotissement)(?![a-z])/.test(n)) {
    return 'Adresse postale détectée';
  }

  return null;
}

// Chiffres semés : on retire d'abord ce qui est manifestement autre chose
// qu'un morceau de numéro (dates, heures, années), puis on cherche une
// suite de nombres consécutifs dans le texte qui, collés, donnent
// exactement un numéro français (10 chiffres commençant par 01 à 09, ou
// 33 + 9 chiffres).
function detecterNumeroDissimule(n: string): boolean {
  const nettoye = n
    .replace(/\d{1,2}\s*[/.-]\s*\d{1,2}(?:\s*[/.-]\s*\d{2,4})?/g, ' ')  // dates 05/07, 05/07/2026
    .replace(/\d{1,2}\s*h(?:\s*\d{1,2})?(?![a-z])/g, ' ')                 // heures 14h, 14h30 (pas « 05 habite »)
    .replace(/(?<!\d)(?:19|20)\d{2}(?!\d)/g, ' ');                        // années 1958, 2026
  const groupes = (nettoye.match(/\d+/g) || []).filter((g) => g.length <= 8);
  for (let i = 0; i < groupes.length; i++) {
    let suite = '';
    for (let j = i; j < groupes.length; j++) {
      suite += groupes[j];
      if (j > i && (/^0[1-9]\d{8}$/.test(suite) || /^33[1-9]\d{8}$/.test(suite))) return true;
      if (suite.length >= 11) break;
    }
  }
  return false;
}

function detecterMineur(n: string): boolean {
  // « j'ai 15 ans » (de 10 à 17 ans), mais pas « j'ai 15 ans de mariage ».
  if (/(?<![a-z])j'?\s?ai\s+1[0-7]\s*ans(?![a-z])(?!\s+(?:de|d'|que|qu'|depuis|deja|dans))/.test(n)) return true;
  if (/(?<![a-z])je\s+suis\s+(?:encore\s+)?(?:mineur|mineure)(?![a-z])/.test(n)) return true;
  return false;
}

export function analyserContenu(contenu: string): ResultatAnalyse {
  const n = normaliser(contenu || '');
  const raisons: string[] = [];

  const coordonnees = detecterCoordonnees(n);
  if (coordonnees) raisons.push(coordonnees);

  const mot = LISTE_NOIRE_REGEX.find((m) => m.regex.test(n));
  if (mot) raisons.push(`Contenu inapproprié détecté : "${mot.mot}"`);

  const mineur = detecterMineur(n);
  if (mineur) raisons.push('Mineur possible (âge de moins de 18 ans mentionné)');

  // Seulement si aucun numéro « visible » n'a déjà été repéré.
  const numeroDissimule = !coordonnees && detecterNumeroDissimule(n);
  if (numeroDissimule) raisons.push('Numéro possiblement dissimulé (chiffres répartis dans le texte)');

  return {
    flagge: raisons.length > 0,
    raisons,
    coordonnees: !!coordonnees,
    inapproprie: !!mot,
    mineur,
    numeroDissimule,
  };
}

// Raison enregistrée sur un contenu masqué automatiquement.
export const RAISON_MASQUAGE_COORDONNEES = 'Coordonnées personnelles détectées (masquage automatique en attente de vérification)';
