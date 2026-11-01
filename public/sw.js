// Service worker EchoTalk (PWA, 21/08/2026 — révisé le 19/10/2026,
// notifications push ajoutées le 01/11/2026 : voir en fin de fichier).
//
// Ne cache que les fichiers propres à EchoTalk, jamais le contenu
// dynamique. Exclusions :
//   - toute requête vers un autre domaine (Firestore/Firebase passe par
//     googleapis.com, exclu par la vérification d'origine) ;
//   - les routes /api/ ;
//   - les pages publiques de partage /e/{id} (Écho) et /l/{id}
//     (Écholègue) : servies par api/echo.ts et api/echolegue.ts, elles
//     doivent toujours refléter l'état réel (un contenu supprimé ou
//     masqué ne doit jamais réapparaître depuis un cache).
//
// Correction du 19/10/2026 — deux stratégies au lieu d'une :
//   - PAGES (navigation : /, /test, /profil…) : RÉSEAU
//     D'ABORD. Chaque ouverture charge la dernière version déployée ; le
//     cache ne sert que hors connexion. Avant, la page était servie
//     depuis le cache d'abord (stale-while-revalidate) : après un
//     déploiement, le premier chargement affichait encore l'ancienne
//     version, et une appli restée ouverte pouvait la garder des jours
//     (découvert le 19/10/2026 : deux comptes sur deux versions
//     différentes, tags @ perdus à l'acceptation d'une EchoRep).
//   - FICHIERS DE VITE (/assets/ : JS, CSS) : CACHE D'ABORD. Leur nom
//     change à chaque déploiement (ex. index-a1b2c3.js) : un nom donné ne
//     correspond jamais qu'à un seul contenu, le servir depuis le cache
//     est donc sans risque, et rapide.
//   - AUTRES FICHIERS (manifest.json, icônes) : réseau d'abord, comme les
//     pages, car leur nom ne change pas.
//
// CACHE_NAME passé à v2 : à l'activation, l'ancien cache (pages
// périmées comprises) est entièrement supprimé.
const CACHE_NAME = 'echotalk-v2';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function estExclu(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/e/') ||
    url.pathname.startsWith('/l/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (estExclu(url)) return;

  // Pages : réseau d'abord, cache seulement hors connexion.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copie = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, copie));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Fichiers de Vite (/assets/, nom unique par déploiement) : cache
  // d'abord, réseau sinon (et mise en cache).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Autres fichiers (manifest.json, icônes…) : leur nom ne change pas d'un
  // déploiement à l'autre, donc réseau d'abord comme les pages — sinon un
  // manifest.json modifié (start_url) ne serait jamais pris en compte.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copie = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});

// ============================================================
// NOTIFICATIONS PUSH (01/11/2026)
// Envoyées par la Cloud Function envoyerPushNotification via Firebase
// Cloud Messaging, sous forme de « données » : { titre, corps, lien, type }.
// Le texte ne contient jamais de texte d'Écho ni de pseudonyme.
// Une notification est TOUJOURS affichée pour chaque push reçu : sur
// iPhone, un push reçu sans notification affichée peut faire retirer
// l'autorisation par le système.
// ============================================================
self.addEventListener('push', (event) => {
  let donnees = {};
  try {
    const charge = event.data ? event.data.json() : {};
    donnees = charge.data || charge;
  } catch {
    donnees = {};
  }
  const titre = donnees.titre || 'EchoTalk';
  const options = {
    body: donnees.corps || 'Du nouveau vous attend sur EchoTalk.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: donnees.type || 'echotalk',
    renotify: true,
    data: { lien: donnees.lien || '/notifications' },
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

// Clic sur la notification : on revient dans EchoTalk (onglet ou appli
// déjà ouverts si possible), sur la page des notifications.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const lien = (event.notification.data && event.notification.data.lien) || '/notifications';
  const cible = new URL(lien, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.startsWith(self.location.origin) && 'focus' in fenetre) {
          return fenetre.focus().then((f) => (f && 'navigate' in f ? f.navigate(cible) : f));
        }
      }
      return self.clients.openWindow(cible);
    })
  );
});
