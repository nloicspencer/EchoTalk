import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";

initializeApp();
const db = getFirestore();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// Modèle le plus rapide et le moins cher, largement suffisant
// pour de la classification/analyse de texte courte.
const MODELE = "claude-haiku-4-5-20251001";

const CATEGORIES_VALIDES = [
  "famille", "couple", "amour", "amitie", "travail", "entrepreneuriat",
  "sante", "sport", "voyages", "creativite", "solitude", "joie",
];

// ============================================================
// 0) NETTOYAGE AUTOMATIQUE DE L'ANNUAIRE
// Se déclenche à la suppression d'un document users/{uid} — retire
// automatiquement l'entrée annuaire/{uid} correspondante, pour que le
// tirage aléatoire de destinataire (Écho-Bouteille) ne pioche jamais un
// compte qui n'existe plus.
//
// ⚠️ Limite connue : ce déclencheur ne se déclenche QUE si le document
// Firestore users/{uid} est supprimé (via l'app, un script admin, ou
// Firestore Console). Si un compte est supprimé uniquement depuis
// l'onglet Firebase Authentication (sans toucher à Firestore), ce
// déclencheur ne se déclenche pas et l'entrée annuaire resterait
// orpheline — dans ce cas, relancer le script
// functions/src/nettoyer-annuaire-orphelin.ts ponctuellement.
// ============================================================
export const nettoyerAnnuaireSurSuppressionUser = onDocumentDeleted(
  {
    document: "users/{userId}",
    region: "europe-west9",
  },
  async (event) => {
    const userId = event.params.userId;
    try {
      await db.collection("annuaire").doc(userId).delete();
      console.log("[nettoyerAnnuaireSurSuppressionUser] annuaire nettoyé pour", userId);
    } catch (err) {
      console.error("[nettoyerAnnuaireSurSuppressionUser] Erreur pour", userId, err);
    }
  }
);

// ============================================================
// 1) CATÉGORISATION AUTOMATIQUE
// Se déclenche à la création d'un Écho. Remplace le "general"
// codé en dur par une catégorie choisie selon le contenu réel.
// Invisible pour l'utilisateur — purement un enrichissement en back-office.
// ============================================================
export const categoriserEcho = onDocumentCreated(
  {
    document: "echos/{echoId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const contenu = (data.contenu || "").toString().trim();
    if (!contenu) return;

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    try {
      const reponse = await anthropic.messages.create({
        model: MODELE,
        max_tokens: 20,
        system:
          "Tu classes un court message dans une seule catégorie parmi cette liste exacte : " +
          CATEGORIES_VALIDES.join(", ") +
          ". Réponds uniquement avec l'identifiant de la catégorie, en minuscules, sans aucun autre texte, sans ponctuation.",
        messages: [{ role: "user", content: contenu }],
      });

      const texte = reponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim()
        .toLowerCase();

      const categorie = CATEGORIES_VALIDES.includes(texte) ? texte : "general";

      console.log("[categoriserEcho]", event.params.echoId, "réponse brute:", texte, "-> catégorie retenue:", categorie);

      await snap.ref.update({ categorie });
    } catch (err) {
      console.error("Erreur catégorisation Écho", event.params.echoId, err);
      // En cas d'échec de l'IA, on laisse "general" tel quel plutôt que de bloquer.
    }
  }
);

// ============================================================
// 2) MODÉRATION — NIVEAU SENS (sécurité et bienveillance uniquement)
// ============================================================

interface AnalyseIA {
  probleme: boolean;
  categorie: "harcelement" | "haine" | "menace" | "illegal" | "spam" | "aucun";
  detresse: boolean;
}

async function analyserAvecIA(
  contenu: string,
  apiKey: string,
  contexteLog: string
): Promise<AnalyseIA> {
  const anthropic = new Anthropic({ apiKey });

  console.log(`[${contexteLog}] Contenu envoyé à Claude:`, contenu);

  const reponse = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 150,
    system: `Tu es un classificateur de modération pour EchoTalk, un réseau social de résonance humaine où les gens partagent des émotions, des joies, des doutes et des épreuves personnelles.

Ton rôle est STRICTEMENT limité à la sécurité et à la bienveillance entre utilisateurs. Tu dois repérer uniquement :
- harcèlement ou insultes réelles dirigées vers quelqu'un — y compris les insultes directes et le rabaissement personnel formulés simplement, sans mot choquant ni vulgarité extrême (ex : "ferme-la", "tu es minable/nul/pathétique", "personne ne t'aime"). Ce type de message compte comme harcèlement même s'il paraît anodin ou familier dans le ton.
- discours de haine, racisme, discrimination
- menaces réelles et sérieuses envers autrui (pas l'humour, pas l'hyperbole)
- contenu illégal
- spam ou contenu commercial déguisé

Tu ne dois JAMAIS signaler : la tristesse, la détresse personnelle, le doute, le mal-être, la solitude, les pensées difficiles exprimées sur soi-même. C'est le contenu légitime et central de cette plateforme — ne le traite jamais comme un problème. La distinction clé : une personne qui parle de SA PROPRE tristesse ou détresse n'est jamais un problème ; une personne qui s'adresse à quelqu'un d'autre pour le rabaisser, l'insulter ou lui manquer de respect l'est, même avec des mots simples.

Séparément, indique si le message contient un signal de détresse réelle et explicite avec un danger immédiat pour la personne elle-même (pas juste de la tristesse ordinaire) — ceci sert uniquement à proposer des ressources d'aide plus tard, ce n'est pas une modération.

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte autour, sans balises markdown, au format exact :
{"probleme": true ou false, "categorie": "harcelement" ou "haine" ou "menace" ou "illegal" ou "spam" ou "aucun", "detresse": true ou false}`,
    messages: [{ role: "user", content: contenu }],
  });

  const texte = reponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  console.log(`[${contexteLog}] Réponse brute de Claude:`, texte);
  console.log(`[${contexteLog}] stop_reason:`, reponse.stop_reason, "| tokens:", JSON.stringify(reponse.usage));

  try {
    const nettoye = texte.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(nettoye);
    const resultat = {
      probleme: Boolean(parsed.probleme),
      categorie: parsed.categorie ?? "aucun",
      detresse: Boolean(parsed.detresse),
    };
    console.log(`[${contexteLog}] Décision finale interprétée:`, resultat);
    return resultat;
  } catch (err) {
    console.error(`[${contexteLog}] ÉCHEC PARSING JSON — texte brut reçu:`, texte, "erreur:", err);
    return { probleme: false, categorie: "aucun", detresse: false };
  }
}

async function creerSignalementIA(params: {
  contenuId: string;
  collection: "echos" | "echos_bouteille";
  auteurId: string;
  auteurPseudo: string;
  contenu: string;
  categorie: string;
}) {
  await db.collection("signalements").add({
    echoId: params.collection === "echos" ? params.contenuId : null,
    echoBouteilleId: params.collection === "echos_bouteille" ? params.contenuId : null,
    auteurSignalementId: "ia",
    auteurContenuId: params.auteurId,
    auteurContenuPseudo: params.auteurPseudo,
    contenu: params.contenu,
    raison: `Détecté par l'IA : ${params.categorie}`,
    raisonsAlgo: [params.categorie],
    type: params.collection === "echos" ? "echo" : "echo_bouteille",
    source: "ia",
    statut: "en_attente",
    createdAt: new Date(),
  });
}

async function creerAlerteDetresse(params: {
  contenuId: string;
  collection: string;
  auteurId: string;
  auteurPseudo: string;
  contenu: string;
}) {
  await db.collection("signalements").add({
    echoId: params.collection === "echos" ? params.contenuId : null,
    echoBouteilleId: params.collection === "echos_bouteille" ? params.contenuId : null,
    auteurSignalementId: "ia",
    auteurContenuId: params.auteurId,
    auteurContenuPseudo: params.auteurPseudo,
    contenu: params.contenu,
    raison: "Signal de détresse détecté par l'IA — à évaluer par un humain",
    type: "detresse",
    source: "ia",
    statut: "en_attente",
    createdAt: new Date(),
  });
}

export const modererEcho = onDocumentCreated(
  {
    document: "echos/{echoId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const contenu = (data.contenu || "").toString().trim();
    if (!contenu) {
      console.log("[modererEcho]", event.params.echoId, "contenu vide, aucune analyse effectuée. data:", JSON.stringify(data));
      return;
    }

    try {
      const analyse = await analyserAvecIA(contenu, ANTHROPIC_API_KEY.value(), `modererEcho:${event.params.echoId}`);

      if (analyse.probleme) {
        await creerSignalementIA({
          contenuId: event.params.echoId,
          collection: "echos",
          auteurId: data.auteurId,
          auteurPseudo: data.auteurPseudo,
          contenu,
          categorie: analyse.categorie,
        });
        console.log("[modererEcho]", event.params.echoId, "-> signalement créé, catégorie:", analyse.categorie);
      }

      if (analyse.detresse) {
        await creerAlerteDetresse({
          contenuId: event.params.echoId,
          collection: "echos",
          auteurId: data.auteurId,
          auteurPseudo: data.auteurPseudo,
          contenu,
        });
        console.log("[modererEcho]", event.params.echoId, "-> alerte détresse créée");
      }
    } catch (err) {
      console.error("Erreur modération IA Écho", event.params.echoId, err);
    }
  }
);

export const modererEchoBouteille = onDocumentCreated(
  {
    document: "echos_bouteille/{bouteilleId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const contenu = (data.contenu || "").toString().trim();
    if (!contenu) {
      console.log("[modererEchoBouteille]", event.params.bouteilleId, "contenu vide, aucune analyse effectuée. data:", JSON.stringify(data));
      return;
    }

    try {
      const analyse = await analyserAvecIA(contenu, ANTHROPIC_API_KEY.value(), `modererEchoBouteille:${event.params.bouteilleId}`);

      if (analyse.probleme) {
        await creerSignalementIA({
          contenuId: event.params.bouteilleId,
          collection: "echos_bouteille",
          auteurId: data.expediteurId,
          auteurPseudo: data.expediteurPseudo,
          contenu,
          categorie: analyse.categorie,
        });
        console.log("[modererEchoBouteille]", event.params.bouteilleId, "-> signalement créé, catégorie:", analyse.categorie);
      }

      if (analyse.detresse) {
        await creerAlerteDetresse({
          contenuId: event.params.bouteilleId,
          collection: "echos_bouteille",
          auteurId: data.expediteurId,
          auteurPseudo: data.expediteurPseudo,
          contenu,
        });
        console.log("[modererEchoBouteille]", event.params.bouteilleId, "-> alerte détresse créée");
      }
    } catch (err) {
      console.error("Erreur modération IA Écho-Bouteille", event.params.bouteilleId, err);
    }
  }
);

export const modererEchoRep = onDocumentCreated(
  {
    document: "echos/{echoId}/echoreps/{repId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const contenu = (data.contenu || "").toString().trim();
    if (!contenu) {
      console.log("[modererEchoRep]", event.params.repId, "contenu vide, aucune analyse effectuée. data:", JSON.stringify(data));
      return;
    }

    try {
      const analyse = await analyserAvecIA(contenu, ANTHROPIC_API_KEY.value(), `modererEchoRep:${event.params.repId}`);

      if (analyse.probleme || analyse.detresse) {
        await db.collection("signalements").add({
          echoId: event.params.echoId,
          echoRepId: event.params.repId,
          auteurSignalementId: "ia",
          auteurContenuId: data.auteurId,
          auteurContenuPseudo: data.auteurPseudo,
          contenu,
          raison: analyse.probleme
            ? `Détecté par l'IA : ${analyse.categorie}`
            : "Signal de détresse détecté par l'IA — à évaluer par un humain",
          type: analyse.detresse && !analyse.probleme ? "detresse" : "echo_rep",
          source: "ia",
          statut: "en_attente",
          createdAt: new Date(),
        });
        console.log("[modererEchoRep]", event.params.repId, "-> signalement créé:", analyse);
      } else {
        console.log("[modererEchoRep]", event.params.repId, "-> aucun signalement, décision:", analyse);
      }
    } catch (err) {
      console.error("Erreur modération IA EchoRep", event.params.repId, err);
    }
  }
);
