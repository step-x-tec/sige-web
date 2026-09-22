// public/sw.js
//
// Portée volontairement limitée : ce service worker met en cache l'app
// shell (le HTML/JS/CSS de Next.js) pour que l'application puisse encore
// SE CHARGER sans réseau. La mise en cache des DONNÉES (cours du jour,
// effectif de classe) et la file d'attente des présences saisies hors
// ligne sont gérées séparément par lib/offlineDb.ts + lib/offlineSync.ts,
// directement dans le code de l'application plutôt qu'ici — plus simple à
// raisonner qu'une logique état/synchronisation répartie entre un service
// worker et l'app.

const CACHE_NAME = 'sige-shell-v1';
const APP_SHELL_ROUTES = ['/', '/login', '/today'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ROUTES).catch(() => {
      // Le premier install peut échouer si l'app tourne encore en dev sans
      // build statique complet — non bloquant, le cache se remplira au fil
      // de la navigation via le fetch handler ci-dessous.
    })),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ne jamais intercepter les appels API (autre origine, données
  // dynamiques) — uniquement les documents/assets same-origin de l'app
  // Next.js elle-même.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // Stale-while-revalidate : sert le cache immédiatement si présent,
      // met à jour en arrière-plan quand le réseau répond.
      return cached ?? network;
    }),
  );
});
