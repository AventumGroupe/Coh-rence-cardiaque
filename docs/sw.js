// Fonctionnement hors connexion : l'application est gardée en cache, mise à jour à chaque nouvelle version.
const CACHE = "coherence-202611191410";
const FILES = ["./","index.html","manifest.webmanifest","fonts/fonts.css","fonts/jost-latin-1.woff2","fonts/jost-latin-ext-0.woff2","fonts/marcellus-latin-3.woff2","fonts/marcellus-latin-ext-2.woff2","icons/icone-192.png","icons/icone-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // réseau d'abord (pour recevoir les mises à jour), cache si hors connexion
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
