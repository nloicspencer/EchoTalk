import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Page publique d'un Écholègue (19/10/2026) — même principe que api/echo.ts
// pour /e/{id} : une page HTML déjà complète pour /l/{echolegueId},
// consultable sans compte par simple lien partagé (WhatsApp, SMS, email…).
//
// Interceptée par la règle de réécriture dans vercel.json, AVANT que la
// requête n'atteigne index.html/React.
//
// Choix volontaires :
// - Seul un Écholègue publié est visible. En attente de modération,
//   masqué ou supprimé : page « plus disponible », même si le lien a été
//   partagé avant l'action de modération.
// - Le pseudo de l'auteur n'est PAS affiché : le Journal des Lègues
//   présente les Écholègues sans pseudo dans l'appli, la page publique
//   respecte le même anonymat.
// - Toujours "noindex" : les Écholègues n'ont pas de choix de Résonance
//   élargie (champ decouvrable) comme les Échos. Partageables par lien,
//   mais jamais proposés aux moteurs de recherche.

function getDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function pageIndisponible(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>EchoTalk</title>
<style>
  body { font-family: Georgia, serif; background:#F5F0FC; color:#2E2A3D; text-align:center; padding:4rem 1rem; }
  a { display:inline-block; margin-top:1.5rem; padding:0.75rem 1.5rem; background:#7C6AF7; color:#fff; border-radius:10px; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
  <h1>Cet Écholègue n'est plus disponible.</h1>
  <a href="https://echotalk.fr">Découvrir EchoTalk</a>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || '';
  if (!id) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(pageIndisponible());
    return;
  }

  try {
    const db = getDb();
    const snap = await db.collection('echolegues').doc(id).get();

    if (!snap.exists) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(pageIndisponible());
      return;
    }

    const data = snap.data()!;

    if (data.statut !== 'publie' || data.masque) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(pageIndisponible());
      return;
    }

    const recitBrut = (data.recit || '').toString();
    const recit = echapperHtml(recitBrut);
    const lecon = echapperHtml((data.lecon || '').toString());
    // Extrait pour l'aperçu du lien : coupé AVANT l'échappement HTML, pour
    // ne jamais trancher une entité (&amp;…) en deux. Retours à la ligne
    // remplacés par des espaces : un aperçu tient sur une ligne.
    const extraitBrut = recitBrut.replace(/\s+/g, ' ').trim();
    const extrait = echapperHtml(extraitBrut.length > 150 ? `${extraitBrut.slice(0, 150)}…` : extraitBrut);

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, follow" />
<title>Un Écholègue sur EchoTalk</title>
<meta name="description" content="${extrait}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="Un Écholègue sur EchoTalk" />
<meta property="og:description" content="${extrait}" />
<meta property="og:url" content="https://echotalk.fr/l/${echapperHtml(id)}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Un Écholègue sur EchoTalk" />
<meta name="twitter:description" content="${extrait}" />
<style>
  body { font-family: Georgia, serif; background:#F5F0FC; color:#2E2A3D; max-width:560px; margin:0 auto; padding:2rem 1rem 4rem; }
  .logo { text-align:center; font-style:italic; font-size:1.5rem; color:#7C6AF7; margin-bottom:1.5rem; }
  .carte { background:#fff; border:0.5px solid #E4DCF5; border-radius:12px; padding:16px; }
  .entete { font-family: system-ui, sans-serif; font-size:0.875rem; font-weight:600; color:#7C6AF7; margin-bottom:12px; }
  .recit { border-left:3px solid #7C6AF7; background:rgba(123,94,167,0.05); border-radius:8px; padding:12px; margin-bottom:12px; }
  .lecon { border-left:3px solid #C49A52; background:rgba(196,154,82,0.08); border-radius:8px; padding:12px; }
  .label { font-family: system-ui, sans-serif; font-size:0.6875rem; font-weight:600; color:#8B6420; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
  .texte { font-style:italic; line-height:1.75; margin:0; white-space:pre-wrap; overflow-wrap:break-word; }
  .cta { text-align:center; margin-top:1.5rem; padding:1.25rem; background:rgba(123,94,167,0.08); border-radius:12px; }
  .cta a { display:inline-block; margin-top:0.75rem; padding:0.75rem 1.5rem; background:#7C6AF7; color:#fff; border-radius:10px; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
  <div class="logo">EchoTalk</div>
  <div class="carte">
    <div class="entete">📓 Écholègue</div>
    <div class="recit"><p class="texte">${recit}</p></div>
    <div class="lecon">
      <div class="label">Ce que j'en retiens</div>
      <p class="texte">${lecon}</p>
    </div>
  </div>
  <div class="cta">
    <p>Pour lire d'autres Écholègues ou transmettre le vôtre, rejoignez EchoTalk.</p>
    <a href="https://echotalk.fr">Créer un compte</a>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (err) {
    console.error('[api/echolegue] erreur', err);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(pageIndisponible());
  }
}
