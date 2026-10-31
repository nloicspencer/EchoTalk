import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as nodemailer from "nodemailer";
import { createHmac, timingSafeEqual } from "crypto";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, DocumentData, DocumentReference, Query, QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
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

// ============================================================
// ÉCHO-BOUTEILLE — tirage du destinataire CÔTÉ SERVEUR (31/10/2026)
//
// Avant : le navigateur de l'expéditeur choisissait lui-même le
// destinataire. N'importe qui pouvait donc, en écrivant directement dans
// la base, envoyer une bouteille à la personne de son choix — acceptable
// entre pionniers de confiance, pas pour le public.
//
// Désormais :
//   1. L'appli crée la bouteille SANS destinataire, au statut
//      « a_distribuer » (ou « en_attente_moderation » si le filtre de
//      l'appli l'a retenue). Les règles Firestore interdisent toute autre
//      forme de création.
//   2. modererEchoBouteille (ci-dessous) l'analyse avec l'IA AVANT tout
//      envoi : coordonnées → retenue pour un modérateur ; sinon → tirage
//      au sort d'un destinataire ici, puis notification.
//   3. Quand un modérateur valide une bouteille retenue, l'appli la
//      repasse en « a_distribuer » ; distribuerEchoBouteilleValidee la
//      distribue alors, sans nouvelle analyse (la décision humaine prime).
//
// Si l'IA est indisponible (panne, crédits épuisés), la bouteille est
// distribuée quand même : elle a déjà passé le filtre de l'appli, comme
// avant ce changement. Si les Cloud Functions elles-mêmes sont arrêtées,
// les bouteilles restent « a_distribuer » et partiront à leur remise en
// route.
// ============================================================
const DUREE_BOUTEILLE_MS = 7 * 24 * 60 * 60 * 1000;

// Tirage aléatoire via le champ `alea` de l'annuaire (fixé à l'inscription) :
// quelques lectures seulement, quelle que soit la taille de l'annuaire.
// 3 candidats par requête pour pouvoir écarter l'expéditeur lui-même.
async function tirerCandidat(expediteurId: string, seuil: number, sens: "asc" | "desc"): Promise<string | null> {
  const snap = await db.collection("annuaire")
    .where("banni", "==", false)
    .where("alea", sens === "asc" ? ">=" : "<", seuil)
    .orderBy("alea", sens)
    .limit(3)
    .get();
  // Jamais l'expéditeur, et jamais un compte dont l'adresse e-mail n'est
  // pas confirmée (31/10/2026) : il ne pourrait de toute façon pas lire
  // la bouteille.
  for (const d of snap.docs as QueryDocumentSnapshot[]) {
    const uid: string = d.data().uid || d.id;
    if (uid === expediteurId) continue;
    try {
      const compte = await getAuth().getUser(uid);
      if (compte.emailVerified) return uid;
    } catch {
      // Compte de connexion introuvable : on l'ignore.
    }
  }
  return null;
}

async function tirerDestinataireAleatoire(expediteurId: string): Promise<string | null> {
  const seuil = Math.random();
  return (await tirerCandidat(expediteurId, seuil, "asc"))
    ?? (await tirerCandidat(expediteurId, seuil, "desc"));
}

async function distribuerBouteille(ref: DocumentReference, contexteLog: string) {
  const depart = await ref.get();
  const data = depart.data();
  if (!data || data.statut !== "a_distribuer") return;

  const destinataireId = await tirerDestinataireAleatoire(data.expediteurId);
  if (!destinataireId) {
    console.warn(`[${contexteLog}] aucun destinataire disponible — bouteille laissée « a_distribuer »`);
    return;
  }

  // Transaction : si le déclencheur s'exécute deux fois (cela peut arriver
  // avec les Cloud Functions), la bouteille n'est distribuée qu'une fois.
  const distribuee = await db.runTransaction(async (tx) => {
    const actuel = await tx.get(ref);
    if (actuel.data()?.statut !== "a_distribuer") return false;
    tx.update(ref, {
      destinataireId,
      statut: "envoyee",
      expiresAt: Timestamp.fromMillis(Date.now() + DUREE_BOUTEILLE_MS),
      distribueeAt: Timestamp.now(),
    });
    return true;
  });
  if (!distribuee) return;

  // Notification au destinataire — sans pseudo d'expéditeur : l'anonymat
  // fait partie du principe de l'Écho-Bouteille.
  await db.collection("notifications").add({
    destinataireId,
    type: "echoBouteille",
    expediteurId: data.expediteurId ?? null,
    expediteurPseudo: null,
    echoId: null,
    contenuApercu: (data.contenu || "").toString().slice(0, 140) || null,
    createdAt: Timestamp.now(),
    lu: false,
  });
  console.log(`[${contexteLog}] distribuée`);
}

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
    const id = event.params.bouteilleId;
    const contenu = (data.contenu || "").toString().trim();
    if (!contenu) {
      console.log("[modererEchoBouteille]", id, "contenu vide, aucune analyse effectuée.");
      return;
    }

    let retenue = false;
    try {
      const analyse = await analyserAvecIA(contenu, ANTHROPIC_API_KEY.value(), `modererEchoBouteille:${id}`);

      if (analyse.probleme) {
        await creerSignalementIA({
          contenuId: id,
          collection: "echos_bouteille",
          auteurId: data.expediteurId,
          auteurPseudo: data.expediteurPseudo,
          contenu,
          categorie: analyse.categorie,
        });
        console.log("[modererEchoBouteille]", id, "-> signalement créé, catégorie:", analyse.categorie);

        // Coordonnées : la bouteille n'est pas envoyée, elle attend un
        // modérateur (qui la validera ou la supprimera).
        if (analyse.categorie === "coordonnees") {
          retenue = true;
          if (data.statut === "a_distribuer") {
            await snap.ref.update({ statut: "en_attente_moderation", destinataireId: null });
          } else if (data.statut === "envoyee") {
            // Bouteille créée par une ancienne version de l'appli (déjà
            // envoyée) : on la retire de la boîte du destinataire.
            await snap.ref.update({ statut: "en_attente_moderation", destinataireId: null });
            if (data.destinataireId) {
              await effacerApercusNotifications([["destinataireId", data.destinataireId], ["type", "echoBouteille"]]);
            }
          }
          console.log("[modererEchoBouteille]", id, "-> retenue (coordonnées)");
        }
      }

      if (analyse.detresse) {
        await creerAlerteDetresse({
          contenuId: id,
          collection: "echos_bouteille",
          auteurId: data.expediteurId,
          auteurPseudo: data.expediteurPseudo,
          contenu,
        });
        console.log("[modererEchoBouteille]", id, "-> alerte détresse créée");
      }
    } catch (err) {
      console.error("Erreur modération IA Écho-Bouteille (distribuée quand même)", id, err);
    }

    if (!retenue && data.statut === "a_distribuer") {
      try {
        await distribuerBouteille(snap.ref, `modererEchoBouteille:${id}`);
      } catch (err) {
        console.error("Erreur distribution Écho-Bouteille", id, err);
      }
    }
  }
);

// Bouteille validée par un modérateur : en_attente_moderation → a_distribuer.
export const distribuerEchoBouteilleValidee = onDocumentUpdated(
  {
    document: "echos_bouteille/{bouteilleId}",
    region: "europe-west9",
  },
  async (event) => {
    const avant = event.data?.before.data();
    const apres = event.data?.after.data();
    if (!avant || !apres || !event.data) return;
    if (avant.statut !== "en_attente_moderation" || apres.statut !== "a_distribuer") return;
    try {
      await distribuerBouteille(event.data.after.ref, `distribuerEchoBouteilleValidee:${event.params.bouteilleId}`);
    } catch (err) {
      console.error("Erreur distribution Écho-Bouteille validée", event.params.bouteilleId, err);
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

// ============================================================
// SUPPRESSION DES COMPTES NON VÉRIFIÉS (31/10/2026)
// Une fois par jour : tout compte créé à partir du 31/10/2026 (ouverture
// publique) dont l'adresse e-mail n'a pas été confirmée dans les 3 jours
// est supprimé — compte de connexion, fiche, entrée d'annuaire et pseudo.
// Le pseudo est libéré (réattribuable), puisque personne ne l'a jamais
// vu… sauf si le compte a publié quelque chose avant la mise en place de
// la vérification : dans ce cas le pseudo reste réservé.
//
// Les comptes plus anciens (pionniers, comptes de test) ne sont JAMAIS
// supprimés par cette fonction : ils restent simplement bloqués sur
// l'écran de vérification tant qu'ils n'ont pas confirmé leur adresse.
// ⚠️ Même date que DEBUT_SUPPRESSION_NON_VERIFIES dans
// src/pages/VerificationEmailPage.tsx.
// ============================================================
const DEBUT_SUPPRESSION_NON_VERIFIES = Date.parse("2026-10-31T12:00:00Z");
const DELAI_VERIFICATION_MS = 3 * 24 * 60 * 60 * 1000;

export const supprimerComptesNonVerifies = onSchedule(
  {
    schedule: "every day 04:00",
    timeZone: "Europe/Paris",
    region: "europe-west9",
  },
  async () => {
    const maintenant = Date.now();
    let pageToken: string | undefined;
    let supprimes = 0;
    do {
      const page = await getAuth().listUsers(1000, pageToken);
      for (const compte of page.users) {
        if (compte.emailVerified) continue;
        const creation = Date.parse(compte.metadata.creationTime);
        if (Number.isNaN(creation) || creation < DEBUT_SUPPRESSION_NON_VERIFIES) continue;
        if (maintenant - creation < DELAI_VERIFICATION_MS) continue;

        const uid = compte.uid;
        try {
          const fiche = await db.collection("users").doc(uid).get();
          const pseudo: string | undefined = fiche.exists ? fiche.data()?.pseudo : undefined;
          const aPublie = fiche.exists && (fiche.data()?.echosPublies ?? 0) > 0;
          if (pseudo && !aPublie) {
            await db.collection("pseudos").doc(pseudo).delete();
          }
          await db.collection("annuaire").doc(uid).delete();
          await db.collection("users").doc(uid).delete();
          await getAuth().deleteUser(uid);
          supprimes++;
          console.log("[supprimerComptesNonVerifies] compte supprimé", uid, aPublie ? "(pseudo conservé : contenu publié)" : "");
        } catch (err) {
          console.error("[supprimerComptesNonVerifies] échec pour", uid, err);
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);
    console.log("[supprimerComptesNonVerifies] terminé —", supprimes, "compte(s) supprimé(s)");
  }
);

// ============================================================
// E-MAILS D'ECHOTALK (31/10/2026) — envoyés depuis notifications@echotalk.fr
// (boîte Gandi), par SMTP.
//
// Secrets Firebase nécessaires (jamais dans le code ni dans Git) :
//   SMTP_MOT_DE_PASSE  : mot de passe de la boîte notifications@echotalk.fr
//   CLE_DESINSCRIPTION : clé secrète qui signe les liens de désinscription
//                        (empêche de désinscrire quelqu'un d'autre)
// ============================================================
const SMTP_MOT_DE_PASSE = defineSecret("SMTP_MOT_DE_PASSE");
const CLE_DESINSCRIPTION = defineSecret("CLE_DESINSCRIPTION");
const EXPEDITEUR = "notifications@echotalk.fr";
const URL_APPLI = "https://echotalk.fr";

function transporteur() {
  return nodemailer.createTransport({
    host: "mail.gandi.net",
    port: 465,
    secure: true,
    auth: { user: EXPEDITEUR, pass: SMTP_MOT_DE_PASSE.value() },
  });
}

function echapperHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Gabarit commun : sobre, aux couleurs d'EchoTalk, lisible sans images.
function gabaritHtml(paragraphes: string[], bouton: { texte: string; url: string }, piedDePage: string): string {
  const corps = paragraphes.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p}</p>`).join("");
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px 12px;background:#F5F0FC;font-family:Arial,Helvetica,sans-serif;color:#2E2A3D">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px 24px;border:1px solid #E4DCF2">
<p style="margin:0 0 18px;font-family:Georgia,serif;font-size:22px;color:#7B5EA7">EchoTalk</p>
${corps}
<p style="margin:22px 0"><a href="${bouton.url}" style="display:inline-block;background:#7B5EA7;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">${echapperHtml(bouton.texte)}</a></p>
<p style="margin:18px 0 0;font-size:12px;color:#6B6B76;line-height:1.5">${piedDePage}</p>
</div></body></html>`;
}

// ------------------------------------------------------------
// 1) E-MAIL DE VÉRIFICATION DE L'ADRESSE
// Remplace l'e-mail standard de Firebase (dont le texte n'est pas
// modifiable) : mention des 3 jours, expéditeur @echotalk.fr.
// L'appli l'appelle à l'inscription et via « Renvoyer l'e-mail » ; en cas
// d'échec, elle se rabat sur l'e-mail standard de Firebase.
// ------------------------------------------------------------
const ATTENTE_ENTRE_ENVOIS_MS = 55 * 1000;

export const envoyerEmailVerification = onCall(
  {
    region: "europe-west9",
    secrets: [SMTP_MOT_DE_PASSE],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Connexion requise.");

    const compte = await getAuth().getUser(uid);
    if (compte.emailVerified) return { deja: true };
    if (!compte.email) throw new HttpsError("failed-precondition", "Aucune adresse e-mail.");

    // Pas plus d'un envoi par minute et par compte. Collection « envois »
    // inaccessible depuis l'appli (règle par défaut : tout refuser).
    const suivi = db.collection("envois_verification").doc(uid);
    const dernier = (await suivi.get()).data()?.dernierEnvoi;
    if (dernier && Date.now() - dernier.toMillis() < ATTENTE_ENTRE_ENVOIS_MS) {
      throw new HttpsError("resource-exhausted", "Trop de demandes.");
    }
    await suivi.set({ dernierEnvoi: Timestamp.now() });

    const lien = await getAuth().generateEmailVerificationLink(compte.email, { url: `${URL_APPLI}/` });
    const creation = Date.parse(compte.metadata.creationTime);
    const avecDelai = !Number.isNaN(creation) && creation >= DEBUT_SUPPRESSION_NON_VERIFIES;

    const paragraphes = [
      "Bonjour,",
      "Pour accéder à EchoTalk, confirmez votre adresse e-mail en cliquant sur le bouton ci-dessous.",
    ];
    if (avecDelai) {
      paragraphes.push("Ce lien est valable <strong>3 jours</strong>. Passé ce délai, votre compte et le pseudonyme qui vous a été attribué seront supprimés ; vous pourrez alors vous inscrire à nouveau.");
    }
    paragraphes.push("Sur iPhone, le lien s'ouvre dans Safari : une fois l'adresse confirmée, revenez simplement dans EchoTalk.");

    const texte = [
      "Bonjour,",
      "",
      "Pour accéder à EchoTalk, confirmez votre adresse e-mail en ouvrant ce lien :",
      lien,
      "",
      ...(avecDelai ? ["Ce lien est valable 3 jours. Passé ce délai, votre compte et le pseudonyme qui vous a été attribué seront supprimés ; vous pourrez alors vous inscrire à nouveau.", ""] : []),
      "Sur iPhone, le lien s'ouvre dans Safari : une fois l'adresse confirmée, revenez simplement dans EchoTalk.",
      "",
      "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.",
      "",
      "L'équipe EchoTalk",
    ].join("\n");

    await transporteur().sendMail({
      from: `EchoTalk <${EXPEDITEUR}>`,
      to: compte.email,
      replyTo: "contact@echotalk.fr",
      subject: "Confirmez votre adresse e-mail pour EchoTalk",
      text: texte,
      html: gabaritHtml(
        paragraphes,
        { texte: "Confirmer mon adresse", url: lien },
        "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.<br>L'équipe EchoTalk"
      ),
    });
    return { envoye: true };
  }
);

// ------------------------------------------------------------
// 2) RÉSUMÉ DES NOTIFICATIONS, TOUTES LES 5 HEURES
// Pour chaque personne ayant reçu des notifications NON LUES depuis le
// passage précédent : un e-mail récapitulatif. Jamais de texte d'Écho ni
// de pseudonyme — seulement des nombres par type d'événement.
// Pas d'e-mail : désinscrits (users/{uid}.resumeEmail == false), adresses
// non vérifiées, comptes de test @echotalk.com.
// ------------------------------------------------------------
const LIBELLES_RESUME: Record<string, [string, string]> = {
  jarreBleue: ["jarre bleue reçue", "jarres bleues reçues"],
  jarreRose: ["jarre rose reçue", "jarres roses reçues"],
  coeur: ["réaction à vos Échos", "réactions à vos Échos"],
  echoRep: ["réponse à valider sur vos Échos Ouverts", "réponses à valider sur vos Échos Ouverts"],
  echoRepDecision: ["décision sur une de vos réponses", "décisions sur vos réponses"],
  echoBouteille: ["Écho-Bouteille reçu", "Écho-Bouteilles reçus"],
  mention: ["mention de votre pseudonyme", "mentions de votre pseudonyme"],
  echolegueSelectionnee: ["Écholègue sélectionné pour le Journal des Lègues", "Écholègues sélectionnés pour le Journal des Lègues"],
  echoSolidaire: ["Écho choisi comme Écho Solidaire du mois", "Échos choisis comme Écho Solidaire du mois"],
  moderation: ["message de l'équipe de modération", "messages de l'équipe de modération"],
};

function familleResume(type: string): string {
  if (type === "coeurBrise") return "coeur";
  if (type === "echoRepValidee" || type === "echoRepRefusee") return "echoRepDecision";
  return type;
}

function signatureDesinscription(uid: string): string {
  return createHmac("sha256", CLE_DESINSCRIPTION.value()).update(uid).digest("hex").slice(0, 32);
}

const DOMAINE_COMPTES_TEST = "@echotalk.com";
const INTERVALLE_RESUME_MS = 5 * 60 * 60 * 1000;

export const envoyerResumesNotifications = onSchedule(
  {
    schedule: "every 5 hours",
    timeZone: "Europe/Paris",
    region: "europe-west9",
    secrets: [SMTP_MOT_DE_PASSE, CLE_DESINSCRIPTION],
  },
  async () => {
    const suivi = db.collection("systeme").doc("resume_emails");
    const maintenant = Timestamp.now();
    const precedent = (await suivi.get()).data()?.derniereExecution
      ?? Timestamp.fromMillis(maintenant.toMillis() - INTERVALLE_RESUME_MS);

    const snap = await db.collection("notifications")
      .where("createdAt", ">", precedent)
      .where("createdAt", "<=", maintenant)
      .get();

    // Regroupement par destinataire, notifications non lues seulement.
    const parPersonne = new Map<string, Map<string, number>>();
    snap.docs.forEach((d: QueryDocumentSnapshot) => {
      const n = d.data();
      if (n.lu === true || typeof n.destinataireId !== "string") return;
      const famille = familleResume(n.type);
      if (!LIBELLES_RESUME[famille]) return;
      const compteur = parPersonne.get(n.destinataireId) ?? new Map<string, number>();
      compteur.set(famille, (compteur.get(famille) ?? 0) + 1);
      parPersonne.set(n.destinataireId, compteur);
    });

    const transport = parPersonne.size > 0 ? transporteur() : null;
    let envoyes = 0;
    for (const [uid, compteur] of parPersonne) {
      try {
        const fiche = await db.collection("users").doc(uid).get();
        if (!fiche.exists || fiche.data()?.resumeEmail === false) continue;
        const compte = await getAuth().getUser(uid);
        const email = (compte.email || "").toLowerCase();
        if (!compte.emailVerified || !email || email.endsWith(DOMAINE_COMPTES_TEST)) continue;

        const lignes: string[] = [];
        compteur.forEach((nombre, famille) => {
          const [singulier, pluriel] = LIBELLES_RESUME[famille];
          lignes.push(`${nombre} ${nombre > 1 ? pluriel : singulier}`);
        });
        const lienDesinscription = `${URL_APPLI}/desinscription?u=${encodeURIComponent(uid)}&s=${signatureDesinscription(uid)}`;
        const lienAppli = `${URL_APPLI}/notifications`;

        const texte = [
          "Bonjour,",
          "",
          "Il s'est passé quelque chose pour vous sur EchoTalk :",
          ...lignes.map((l) => `- ${l}`),
          "",
          `Voir mes notifications : ${lienAppli}`,
          "",
          "Sur iPhone, ce lien s'ouvre dans Safari. Pour retrouver EchoTalk tel que vous l'avez installé, ouvrez plutôt l'icône EchoTalk de votre écran d'accueil.",
          "",
          `Ne plus recevoir ce résumé : ${lienDesinscription}`,
        ].join("\n");

        await transport!.sendMail({
          from: `EchoTalk <${EXPEDITEUR}>`,
          to: email,
          replyTo: "contact@echotalk.fr",
          subject: "Du nouveau pour vous sur EchoTalk",
          text: texte,
          html: gabaritHtml(
            [
              "Bonjour,",
              "Il s'est passé quelque chose pour vous sur EchoTalk :",
              `<span style="display:block;padding-left:4px">${lignes.map((l) => `• ${echapperHtml(l)}`).join("<br>")}</span>`,
              "Sur iPhone, ce lien s'ouvre dans Safari. Pour retrouver EchoTalk tel que vous l'avez installé, ouvrez plutôt l'icône EchoTalk de votre écran d'accueil.",
            ],
            { texte: "Voir mes notifications", url: lienAppli },
            `Vous recevez ce résumé parce que vous avez un compte EchoTalk. <a href="${lienDesinscription}" style="color:#6B6B76">Ne plus recevoir ce résumé</a>`
          ),
          headers: {
            "List-Unsubscribe": `<${lienDesinscription}>, <mailto:contact@echotalk.fr?subject=desinscription>`,
          },
        });
        envoyes++;
      } catch (err) {
        console.error("[envoyerResumesNotifications] échec pour", uid, err);
      }
    }

    await suivi.set({ derniereExecution: maintenant });
    console.log("[envoyerResumesNotifications]", envoyes, "résumé(s) envoyé(s) pour", parPersonne.size, "personne(s) concernée(s)");
  }
);

// ------------------------------------------------------------
// 3) DÉSINSCRIPTION DU RÉSUMÉ (lien présent dans chaque e-mail)
// Appelée par la page echotalk.fr/desinscription, sans connexion : la
// signature du lien prouve qu'il vient bien d'un de nos e-mails.
// ------------------------------------------------------------
export const desinscrireResume = onCall(
  {
    region: "europe-west9",
    secrets: [CLE_DESINSCRIPTION],
  },
  async (request) => {
    const uid = typeof request.data?.u === "string" ? request.data.u : "";
    const signature = typeof request.data?.s === "string" ? request.data.s : "";
    const attendue = uid ? signatureDesinscription(uid) : "";
    const valide = uid.length > 0 && signature.length === attendue.length
      && timingSafeEqual(Buffer.from(signature), Buffer.from(attendue));
    if (!valide) throw new HttpsError("invalid-argument", "Lien invalide.");

    const fiche = db.collection("users").doc(uid);
    if (!(await fiche.get()).exists) return { ok: true };
    await fiche.update({ resumeEmail: false });
    return { ok: true };
  }
);
