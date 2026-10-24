import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, DocumentData, DocumentReference, Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
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
  categorie: "harcelement" | "haine" | "menace" | "illegal" | "spam" | "coordonnees" | "aucun";
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
- coordonnées personnelles (catégorie "coordonnees") : tout moyen de contacter ou de retrouver quelqu'un en dehors d'EchoTalk. Numéro de téléphone (même écrit en lettres, découpé ou déguisé : "zéro six…", "06 point 12…" ; y compris des chiffres disséminés dans une phrase en apparence anodine qui, mis bout à bout, forment un numéro — ex : "ma chambre est libre 07, appelle-moi pour 09 la voir, j'ai 08 propositions mais je 05 te préférer, tu sembles 34 bien" contient 07 09 08 05 34, soit un numéro : c'est "coordonnees"), adresse e-mail (même écrite "arobase", "point com"), pseudo ou compte de réseau social ou de messagerie proposé (Instagram, Snapchat, WhatsApp, Telegram, TikTok, Discord…), lien vers un profil ou un site personnel, adresse postale, ou invitation explicite à poursuivre l'échange ailleurs ("écris-moi en privé ailleurs", "on continue sur insta ?"). EchoTalk est anonyme : ces échanges n'y ont pas leur place.

Ne compte PAS comme coordonnées : citer un réseau social en passant sans proposer de contact ("j'ai vu ça sur Instagram"), un prénom seul, une ville seule, un âge. Les mentions de la forme @OiseauVille (ex : @PélicanToulouse, @HirondelleParis) sont des pseudonymes internes à EchoTalk, jamais des coordonnées.

Tu ne dois JAMAIS signaler : la tristesse, la détresse personnelle, le doute, le mal-être, la solitude, les pensées difficiles exprimées sur soi-même. C'est le contenu légitime et central de cette plateforme — ne le traite jamais comme un problème. La distinction clé : une personne qui parle de SA PROPRE tristesse ou détresse n'est jamais un problème ; une personne qui s'adresse à quelqu'un d'autre pour le rabaisser, l'insulter ou lui manquer de respect l'est, même avec des mots simples.

Séparément, indique si le message contient un signal de détresse réelle et explicite avec un danger immédiat pour la personne elle-même (pas juste de la tristesse ordinaire) — ceci sert uniquement à proposer des ressources d'aide plus tard, ce n'est pas une modération.

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte autour, sans balises markdown, au format exact :
{"probleme": true ou false, "categorie": "harcelement" ou "haine" ou "menace" ou "illegal" ou "spam" ou "coordonnees" ou "aucun", "detresse": true ou false}`,
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
    // Contenu masqué ou retenu automatiquement : la page de modération
    // propose « Rétablir » (19/10/2026).
    coordonnees: params.categorie === "coordonnees",
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

// Masquage automatique des coordonnées personnelles (19/10/2026).
// Quand l'IA repère des coordonnées (catégorie "coordonnees"), le contenu
// est masqué tout de suite, en attendant la vérification d'un modérateur,
// sans notifier son auteur. Le filtre de l'appli (src/services/moderation.ts)
// masque déjà les cas évidents dès la publication ; l'IA rattrape ici les
// formes déguisées qu'aucune liste ne peut prévoir, et les contenus écrits
// sans passer par l'appli.
// Texte de remplacement d'un contenu masqué pour coordonnées (24/10/2026) :
// le texte d'origine ne reste pas dans la base (il est conservé dans le
// signalement, lisible par les modérateurs seuls).
// ⚠️ Doit rester identique à TEXTE_MASQUE dans src/services/moderation.ts.
const TEXTE_MASQUE = "Contenu masqué en attente de vérification par la modération.";

// Efface l'aperçu de texte des notifications liées à un contenu masqué
// (24/10/2026) : une notification de tag, par exemple, recopiait le texte —
// et donc les coordonnées — avant que l'IA ne masque le contenu.
async function effacerApercusNotifications(filtres: Array<[string, string]>) {
  let q: Query = db.collection("notifications");
  for (const [champ, valeur] of filtres) q = q.where(champ, "==", valeur);
  const snap = await q.get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d: QueryDocumentSnapshot) => batch.update(d.ref, { contenuApercu: null }));
  await batch.commit();
}

const RAISON_MASQUAGE_COORDONNEES =
  "Coordonnées personnelles détectées par l'IA (masquage automatique en attente de vérification)";

// Écho : analyse, signalement, masquage si coordonnées, alerte détresse.
async function modererDocEcho(
  echoId: string,
  data: DocumentData,
  ref: DocumentReference,
  contexteLog: string
) {
  const contenu = (data.contenu || "").toString().trim();
  // Un écho supprimé porte un texte de remplacement (« Écho supprimé… ») :
  // rien à analyser.
  if (!contenu || data.supprime) {
    console.log(`[${contexteLog}]`, echoId, "contenu vide ou supprimé, aucune analyse.");
    return;
  }

  const analyse = await analyserAvecIA(contenu, ANTHROPIC_API_KEY.value(), `${contexteLog}:${echoId}`);

  if (analyse.probleme) {
    await creerSignalementIA({
      contenuId: echoId,
      collection: "echos",
      auteurId: data.auteurId,
      auteurPseudo: data.auteurPseudo,
      contenu,
      categorie: analyse.categorie,
    });
    console.log(`[${contexteLog}]`, echoId, "-> signalement créé, catégorie:", analyse.categorie);

    if (analyse.categorie === "coordonnees" && !data.masque) {
      await ref.update({ masque: true, raisonModeration: RAISON_MASQUAGE_COORDONNEES, contenu: TEXTE_MASQUE });
      await effacerApercusNotifications([["echoId", echoId]]);
      console.log(`[${contexteLog}]`, echoId, "-> masqué (coordonnées)");
    }
  }

  if (analyse.detresse) {
    await creerAlerteDetresse({
      contenuId: echoId,
      collection: "echos",
      auteurId: data.auteurId,
      auteurPseudo: data.auteurPseudo,
      contenu,
    });
    console.log(`[${contexteLog}]`, echoId, "-> alerte détresse créée");
  }
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
    try {
      await modererDocEcho(event.params.echoId, snap.data(), snap.ref, "modererEcho");
    } catch (err) {
      console.error("Erreur modération IA Écho", event.params.echoId, err);
    }
  }
);

// Écho modifié (19/10/2026) : avant, une modification n'était jamais
// analysée. Ce déclencheur se lance à CHAQUE mise à jour d'un Écho
// (réaction, catégorie, réouverture…), mais s'arrête immédiatement si le
// texte n'a pas changé : l'IA n'est appelée que pour une vraie
// modification du contenu.
export const modererEchoModifie = onDocumentUpdated(
  {
    document: "echos/{echoId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const avant = event.data?.before.data();
    const apres = event.data?.after.data();
    if (!avant || !apres || !event.data) return;
    if ((avant.contenu || "") === (apres.contenu || "")) return;
    // Texte remplacé par le masquage : rien à analyser.
    if (apres.contenu === TEXTE_MASQUE) return;
    // Rétablissement par un modérateur (24/10/2026) : le texte passe de
    // TEXTE_MASQUE à l'original. La décision humaine a le dernier mot :
    // sans cette ligne, l'IA réanalysait le texte rétabli et le remasquait,
    // rendant impossible le rétablissement d'un faux positif de l'IA.
    if (avant.contenu === TEXTE_MASQUE) return;
    // Texte rétabli par un modérateur (24/10/2026) : seul un modérateur peut
    // remplacer « Contenu masqué… » par un autre texte en le démasquant. Sa
    // décision prime sur l'IA : on ne réanalyse pas, sinon un faux positif
    // de l'IA serait remasqué aussitôt, sans fin. Une modification
    // ultérieure par l'auteur reste analysée normalement.
    if (avant.contenu === TEXTE_MASQUE) return;
    try {
      await modererDocEcho(event.params.echoId, apres, event.data.after.ref, "modererEchoModifie");
    } catch (err) {
      console.error("Erreur modération IA Écho modifié", event.params.echoId, err);
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

        // Coordonnées : la bouteille est retirée de la boîte du
        // destinataire (seules les bouteilles « envoyee » y sont
        // affichées) et repasse en attente de modération.
        // destinataireId remis à vide (24/10/2026) : le destinataire ne peut
        // plus la lire du tout, même en interrogeant la base directement ;
        // un modérateur qui la valide tire un nouveau destinataire.
        if (analyse.categorie === "coordonnees" && data.statut !== "en_attente_moderation") {
          await snap.ref.update({ statut: "en_attente_moderation", destinataireId: null });
          if (data.destinataireId) {
            await effacerApercusNotifications([["destinataireId", data.destinataireId], ["type", "echoBouteille"]]);
          }
          console.log("[modererEchoBouteille]", event.params.bouteilleId, "-> remise en attente (coordonnées)");
        }
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

// EchoRep : analyse, signalement, masquage si coordonnées.
async function modererDocEchoRep(
  echoId: string,
  repId: string,
  data: DocumentData,
  ref: DocumentReference,
  contexteLog: string
) {
  const contenu = (data.contenu || "").toString().trim();
  if (!contenu || data.supprime) {
    console.log(`[${contexteLog}]`, repId, "contenu vide ou supprimé, aucune analyse.");
    return;
  }

  const analyse = await analyserAvecIA(contenu, ANTHROPIC_API_KEY.value(), `${contexteLog}:${repId}`);

  if (analyse.probleme || analyse.detresse) {
    await db.collection("signalements").add({
      echoId,
      echoRepId: repId,
      auteurSignalementId: "ia",
      auteurContenuId: data.auteurId,
      auteurContenuPseudo: data.auteurPseudo,
      contenu,
      raison: analyse.probleme
        ? `Détecté par l'IA : ${analyse.categorie}`
        : "Signal de détresse détecté par l'IA — à évaluer par un humain",
      type: analyse.detresse && !analyse.probleme ? "detresse" : "echo_rep",
      source: "ia",
      coordonnees: analyse.probleme && analyse.categorie === "coordonnees",
      statut: "en_attente",
      createdAt: new Date(),
    });
    console.log(`[${contexteLog}]`, repId, "-> signalement créé:", analyse);
  } else {
    console.log(`[${contexteLog}]`, repId, "-> aucun signalement, décision:", analyse);
  }

  if (analyse.probleme && analyse.categorie === "coordonnees" && !data.masque) {
    await ref.update({
      masque: true,
      raisonModeration: RAISON_MASQUAGE_COORDONNEES,
      masqueAt: new Date(),
      contenu: TEXTE_MASQUE,
    });
    if (data.auteurId) {
      await effacerApercusNotifications([["echoId", echoId], ["expediteurId", data.auteurId]]);
    }
    console.log(`[${contexteLog}]`, repId, "-> masquée (coordonnées)");
  }
}

export const modererEchoRep = onDocumentCreated(
  {
    document: "echos/{echoId}/echoreps/{repId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    try {
      await modererDocEchoRep(event.params.echoId, event.params.repId, snap.data(), snap.ref, "modererEchoRep");
    } catch (err) {
      console.error("Erreur modération IA EchoRep", event.params.repId, err);
    }
  }
);

// EchoRep modifiée (19/10/2026) : même principe que modererEchoModifie.
export const modererEchoRepModifiee = onDocumentUpdated(
  {
    document: "echos/{echoId}/echoreps/{repId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const avant = event.data?.before.data();
    const apres = event.data?.after.data();
    if (!avant || !apres || !event.data) return;
    if ((avant.contenu || "") === (apres.contenu || "")) return;
    if (apres.contenu === TEXTE_MASQUE) return;
    // Rétablissement par un modérateur : pas de nouvelle analyse (voir
    // modererEchoModifie).
    if (avant.contenu === TEXTE_MASQUE) return;
    // Texte rétabli par un modérateur : sa décision prime (voir
    // modererEchoModifie).
    if (avant.contenu === TEXTE_MASQUE) return;
    try {
      await modererDocEchoRep(event.params.echoId, event.params.repId, apres, event.data.after.ref, "modererEchoRepModifiee");
    } catch (err) {
      console.error("Erreur modération IA EchoRep modifiée", event.params.repId, err);
    }
  }
);

// ============================================================
// 3) PROPOSITIONS D'ECHOREP — analyse IA AVANT affichage (19/10/2026)
// Une proposition d'EchoRep est un échange quasi direct entre deux
// personnes identifiables par leur pseudo. Elle est créée par l'appli avec
// le statut « analyse_en_cours » (invisible pour le propriétaire de
// l'Écho, sans notification). Cette fonction l'analyse, puis :
//   - coordonnées repérées -> « en_attente_moderation » : le propriétaire
//     ne la voit jamais ; le modérateur peut la rétablir ;
//   - sinon -> « en_attente » : elle apparaît dans la liste de validation
//     du propriétaire, qui est prévenu à ce moment-là.
// Si l'IA échoue (panne, crédits épuisés), la proposition est libérée
// quand même : le filtre de l'appli l'a déjà vérifiée, et elle ne doit
// jamais rester bloquée.
// ============================================================
export const modererPropositionEchoRep = onDocumentCreated(
  {
    document: "echoreps_attente/{attenteId}",
    secrets: [ANTHROPIC_API_KEY],
    region: "europe-west9",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    if (data.statut !== "analyse_en_cours") return;

    const attenteId = event.params.attenteId;
    const contenu = (data.contenu || "").toString().trim();

    let analyse: AnalyseIA | null = null;
    try {
      if (contenu) {
        analyse = await analyserAvecIA(contenu, ANTHROPIC_API_KEY.value(), `modererPropositionEchoRep:${attenteId}`);
      }
    } catch (err) {
      console.error("[modererPropositionEchoRep]", attenteId, "échec de l'IA, proposition libérée quand même", err);
    }

    try {
      if (analyse && (analyse.probleme || analyse.detresse)) {
        await db.collection("signalements").add({
          echoId: data.echoId || null,
          echoRepId: null,
          echoRepAttenteId: attenteId,
          auteurSignalementId: "ia",
          auteurContenuId: data.auteurId,
          auteurContenuPseudo: data.auteurPseudo,
          contenu,
          raison: analyse.probleme
            ? `Détecté par l'IA : ${analyse.categorie}`
            : "Signal de détresse détecté par l'IA — à évaluer par un humain",
          raisonsAlgo: analyse.probleme ? [analyse.categorie] : [],
          type: analyse.detresse && !analyse.probleme ? "detresse" : "echorep",
          source: "ia",
          statut: "en_attente",
          coordonnees: analyse.probleme && analyse.categorie === "coordonnees",
          createdAt: new Date(),
        });
      }

      if (analyse && analyse.probleme && analyse.categorie === "coordonnees") {
        await snap.ref.update({ statut: "en_attente_moderation" });
        console.log("[modererPropositionEchoRep]", attenteId, "-> retenue (coordonnées)");
        return;
      }

      await snap.ref.update({ statut: "en_attente" });
      console.log("[modererPropositionEchoRep]", attenteId, "-> libérée, visible du propriétaire");

      // Notification au propriétaire de l'Écho, maintenant seulement.
      let proprietaireId: string | null = data.proprietaireId || null;
      if (!proprietaireId && data.echoId) {
        const echo = await db.collection("echos").doc(data.echoId).get();
        proprietaireId = echo.exists ? (echo.data()?.auteurId ?? null) : null;
      }
      if (proprietaireId && proprietaireId !== data.auteurId) {
        await db.collection("notifications").add({
          destinataireId: proprietaireId,
          type: "echoRep",
          expediteurId: data.auteurId ?? null,
          expediteurPseudo: data.auteurPseudo ?? null,
          echoId: data.echoId ?? null,
          contenuApercu: contenu ? contenu.slice(0, 140) : null,
          createdAt: new Date(),
          lu: false,
        });
      }
    } catch (err) {
      console.error("[modererPropositionEchoRep]", attenteId, "erreur", err);
    }
  }
);
