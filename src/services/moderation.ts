// Liste noire EchoTalk
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

// Patterns données personnelles
const PATTERNS_DONNEES_PERSO = [
  /\b0[67]\d{8}\b/g,                          // Téléphone FR mobile
  /\b\+33\s?[67]\d{8}\b/g,                    // Téléphone FR +33
  /\b\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, // Téléphone format espacé
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /j'ai\s+\d+\s+ans/gi,                       // "j'ai X ans"
  /\bje\s+m'appelle\s+[A-Z][a-z]+/gi,         // "je m'appelle Prénom"
  /\bmon\s+nom\s+est\s+[A-Z][a-z]+/gi,        // "mon nom est X"
  /\bmon\s+prénom\s+est\s+[A-Z][a-z]+/gi,     // "mon prénom est X"
  /https?:\/\/[^\s]+/gi,                       // URLs
  /www\.[^\s]+/gi,                             // URLs sans http
];

export interface ResultatAnalyse {
  flagge: boolean;
  raisons: string[];
}

export function analyserContenu(contenu: string): ResultatAnalyse {
  const raisons: string[] = [];
  const contenuLower = contenu.toLowerCase();

  // Vérifier liste noire
  for (const mot of LISTE_NOIRE) {
    if (contenuLower.includes(mot.toLowerCase())) {
      raisons.push(`Contenu inapproprié détecté : "${mot}"`);
      break;
    }
  }

  // Vérifier patterns données personnelles
  for (const pattern of PATTERNS_DONNEES_PERSO) {
    if (pattern.test(contenu)) {
      if (pattern.source.includes('0[67]') || pattern.source.includes('33')) {
        raisons.push('Numéro de téléphone détecté');
      } else if (pattern.source.includes('@')) {
        raisons.push('Adresse email détectée');
      } else if (pattern.source.includes('appelle') || pattern.source.includes('nom')) {
        raisons.push('Nom ou prénom potentiellement détecté');
      } else if (pattern.source.includes('ans')) {
        raisons.push('Mention d\'âge détectée');
      } else if (pattern.source.includes('http') || pattern.source.includes('www')) {
        raisons.push('Lien URL détecté');
      } else {
        raisons.push('Données personnelles potentielles détectées');
      }
      break;
    }
  }

  return {
    flagge: raisons.length > 0,
    raisons,
  };
}
