import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Levier n°2 — Sitemap : liste les URLs de tous les Échos en résonance
// élargie (decouvrable === true), régénéré à chaque requête (avec cache
// CDN de 30 min). C'est ce qui permet à Google de DÉCOUVRIR ces pages —
// api/echo.ts, lui, ne fait que les rendre LISIBLES une fois trouvées.
// Les deux sujets sont distincts : sans ce fichier, une page fraîchement
// publiée reste invisible tant que personne ne la découvre par hasard.

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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb();
    const snap = await db.collection('echos')
      .where('decouvrable', '==', true)
      .get();

    const urls = snap.docs
      .filter(d => {
        const data = d.data();
        return !data.masque && !data.supprime;
      })
      .map(d => {
        const data = d.data();
        const lastmodDate = data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date();
        return `  <url>
    <loc>https://echotalk.fr/e/${d.id}</loc>
    <lastmod>${lastmodDate.toISOString()}</lastmod>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).send(xml);
  } catch (err) {
    console.error('[api/sitemap] erreur', err);
    res.status(500)
      .setHeader('Content-Type', 'application/xml; charset=utf-8')
      .send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
