import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Fonction serveur (Levier n°2 — Référencement naturel) : rend une page
// HTML déjà complète pour /e/{echoId}, lisible instantanément par les
// robots (Google, IA) sans exécution de JavaScript — contrairement à
// l'ancienne EchoPublicPage.tsx (React côté client, désormais retirée).
//
// Interceptée par la règle de réécriture dans vercel.json, AVANT que la
// requête n'atteigne jamais index.html/React.

function getDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Les sauts de ligne d'une clé privée sont échappés en "\n" une
        // fois stockés comme variable d'environnement Vercel — il faut
        // les reconvertir en vrais sauts de ligne.
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
  <h1>Cet Écho n'est plus disponible.</h1>
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
    const snap = await db.collection('echos').doc(id).get();

    if (!snap.exists) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(pageIndisponible());
      return;
    }

    const data = snap.data()!;

    // Un Écho masqué (en cours de modération) ou supprimé ne doit jamais
    // afficher son contenu, même via un lien déjà partagé avant l'action
    // de modération.
    if (data.masque || data.supprime) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(pageIndisponible());
      return;
    }

    const contenu = echapperHtml((data.contenu || '').toString());
    const pseudo = echapperHtml((data.auteurPseudo || '').toString());
    const decouvrable = data.decouvrable === true;
    const type = data.type === 'ouvert' ? 'ouvert' : 'libre';

    let echoRepsHtml = '';
    if (type === 'ouvert') {
      const repsSnap = await db
        .collection('echos').doc(id).collection('echoreps')
        .orderBy('createdAt', 'asc')
        .get();
      echoRepsHtml = repsSnap.docs
        .map(d => d.data())
        .filter(r => !r.supprime)
        .map(r => `
          <div style="background:rgba(123,94,167,0.06);border-radius:10px;padding:12px;margin-bottom:8px;">
            <strong style="color:#7C6AF7;">${echapperHtml((r.auteurPseudo || '').toString())}</strong>
            <p style="font-style:italic;margin:4px 0 0;">${echapperHtml((r.contenu || '').toString())}</p>
          </div>`)
        .join('');
    }

    const extrait = contenu.length > 150 ? `${contenu.slice(0, 150)}…` : contenu;

    // Résonance stricte (decouvrable=false) : page consultable par lien
    // direct (Levier n°1, inchangé), mais explicitement exclue de
    // l'indexation. Résonance élargie : indexable normalement.
    const robotsTag = decouvrable
      ? '<meta name="robots" content="index, follow" />'
      : '<meta name="robots" content="noindex, follow" />';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${robotsTag}
<title>Un Écho sur EchoTalk — ${pseudo}</title>
<meta name="description" content="${extrait}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="Un Écho sur EchoTalk" />
<meta property="og:description" content="${extrait}" />
<meta property="og:url" content="https://echotalk.fr/e/${id}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Un Écho sur EchoTalk" />
<meta name="twitter:description" content="${extrait}" />
<style>
  body { font-family: Georgia, serif; background:#F5F0FC; color:#2E2A3D; max-width:560px; margin:0 auto; padding:2rem 1rem 4rem; }
  .logo { text-align:center; font-style:italic; font-size:1.5rem; color:#7C6AF7; margin-bottom:1.5rem; }
  .carte { background:#fff; border:0.5px solid #E4DCF5; border-left:3px solid #7C6AF7; border-radius:12px; padding:16px; }
  .pseudo { font-weight:600; color:#2E2A3D; }
  .contenu { font-style:italic; line-height:1.75; margin:12px 0; }
  .cta { text-align:center; margin-top:1.5rem; padding:1.25rem; background:rgba(123,94,167,0.08); border-radius:12px; }
  .cta a { display:inline-block; margin-top:0.75rem; padding:0.75rem 1.5rem; background:#7C6AF7; color:#fff; border-radius:10px; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
  <div class="logo">EchoTalk</div>
  <div class="carte">
    <div class="pseudo">${pseudo}</div>
    <p class="contenu">${contenu}</p>
    ${echoRepsHtml}
  </div>
  <div class="cta">
    <p>Pour réagir, répondre ou découvrir d'autres Échos, rejoignez EchoTalk.</p>
    <a href="https://echotalk.fr">Créer un compte</a>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Mis en cache côté CDN Vercel 5 minutes, revalidé en arrière-plan
    // ensuite — évite de retaper Firestore à chaque visite/passage de robot.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (err) {
    console.error('[api/echo] erreur', err);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(pageIndisponible());
  }
}
