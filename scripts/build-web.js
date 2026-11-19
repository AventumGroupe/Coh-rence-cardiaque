// Fabrique l'application web installable (PWA) dans docs/, publiée par GitHub Pages :
// polices embarquées, manifeste, icônes et fonctionnement hors connexion (service worker).
// Usage : node scripts/build-web.js
const fs = require("fs");
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
fs.mkdirSync("docs/fonts", { recursive: true });
let html = fs.readFileSync("index.html", "utf8").replace("__APP_VERSION__", "web " + stamp.slice(0, 8));
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/, "")
           .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/,
             '<link rel="stylesheet" href="fonts/fonts.css">\n' +
             '<link rel="manifest" href="manifest.webmanifest">\n' +
             '<link rel="icon" href="icons/icone-192.png">\n' +
             '<link rel="apple-touch-icon" href="icons/icone-180.png">\n' +
             '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
             '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
             '<meta name="apple-mobile-web-app-title" content="Cohérence">\n' +
             '<meta name="description" content="5 minutes de cohérence cardiaque guidée par des paysages vivants. Soft Skills Académie.">');
html = html.replace('<p class="note version" id="app-version"></p>', '<p class="note version"><span id="app-version"></span> · <a href="confidentialite.html" style="color:inherit">Confidentialité</a></p>');
html = html.replace("</body>", '<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});</script>\n</body>');
if (/googleapis|gstatic/.test(html)) { console.error("ressource externe restante"); process.exit(1); }
fs.writeFileSync("docs/index.html", html);
for (const f of fs.readdirSync("fonts")) if (f.endsWith(".woff2")) fs.copyFileSync("fonts/" + f, "docs/fonts/" + f);
fs.writeFileSync("docs/fonts/fonts.css", fs.readFileSync("fonts/fonts.css", "utf8").replace(/url\(fonts\//g, "url("));
fs.writeFileSync("docs/manifest.webmanifest", JSON.stringify({
  name: "Cohérence cardiaque", short_name: "Cohérence", lang: "fr",
  description: "5 minutes de cohérence cardiaque guidée par des paysages vivants.",
  start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
  background_color: "#0d1422", theme_color: "#0d1422",
  icons: [
    { src: "icons/icone-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/icone-512.png", sizes: "512x512", type: "image/png" },
    { src: "icons/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2));
const files = ["./", "index.html", "manifest.webmanifest", "fonts/fonts.css", ...fs.readdirSync("docs/fonts").filter(f => f.endsWith(".woff2")).map(f => "fonts/" + f), "icons/icone-192.png", "icons/icone-512.png"];
fs.writeFileSync("docs/sw.js", `// Fonctionnement hors connexion : l'application est gardée en cache, mise à jour à chaque nouvelle version.
const CACHE = "coherence-${stamp}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // réseau d'abord (pour recevoir les mises à jour), cache si hors connexion
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
`);
console.log("application web prête dans docs/ (version " + stamp + ")");
