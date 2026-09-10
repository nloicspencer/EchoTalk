// Service worker EchoTalk (PWA, 21/08/2026).
//
// Stratégie volontairement simple et prudente : cache uniquement les
// fichiers statiques propres à EchoTalk (JS, CSS, images), jamais le
// contenu dynamique. Deux exclusions explicites, importantes :
//   - toute requête vers un autre domaine (Firestore/Firebase passe par
//     googleapis.com, donc déjà exclu naturellement par la vérification
//     d'origine ci-dessous) ;
//   - les routes /api/ (echo.ts, sitemap.ts) — leur contenu doit toujours
//     être frais, jamais servi depuis un cache obsolète.
//
// "Stale-while-revalidate" : sert immédiatement la version en cache si
// elle existe (rapide, fonctionne même hors ligne), tout en allant
// chercher la version à jour en arrière-plan pour la prochaine visite.
const CACHE_NAME = 'echotalk-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached || caches.match(OFFLINE_URL));
      return cached || networkFetch;
    })
  );
});
