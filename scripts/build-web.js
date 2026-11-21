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
html = html.replace('<p class="note safety">', `<div class="install" id="install" hidden>
      <button class="cal-link" id="install-btn" type="button"><span>Installer l'application</span><span>Sur cet appareil ›</span></button>
      <p class="note" id="install-ios" hidden>Sur iPhone : touchez <b>Partager</b>, puis <b>Sur l'écran d'accueil</b>.</p>
    </div>
    <p class="note safety">`);
html = html.replace("</body>", `<script>
(() => {
  // PWA : fonctionnement hors connexion et installation sur l'écran d'accueil
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  const box = document.getElementById("install"), btn = document.getElementById("install-btn"), ios = document.getElementById("install-ios");
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) return;
  let deferred = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; box.hidden = false; btn.hidden = false; });
  btn.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; box.hidden = true; });
  addEventListener("appinstalled", () => { box.hidden = true; });
  // Safari sur iPhone/iPad ne propose pas de bouton : on explique le geste
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) { box.hidden = false; btn.hidden = true; ios.hidden = false; }
})();
</script>\n</body>`);
if (/googleapis|gstatic/.test(html)) { console.error("ressource externe restante"); process.exit(1); }
fs.writeFileSync("docs/index.html", html);
for (const f of fs.readdirSync("fonts")) if (f.endsWith(".woff2")) fs.copyFileSync("fonts/" + f, "docs/fonts/" + f);
fs.writeFileSync("docs/fonts/fonts.css", fs.readFileSync("fonts/fonts.css", "utf8").replace(/url\(fonts\//g, "url("));
fs.mkdirSync("docs/screens", { recursive: true });
for (const [src, dst] of [["store/capture-1-accueil.png", "accueil.png"], ["store/capture-4-lotus.png", "lotus.png"], ["store/presentation-1024x500.png", "presentation.png"]])
  if (fs.existsSync(src)) fs.copyFileSync(src, "docs/screens/" + dst);
fs.writeFileSync("docs/manifest.webmanifest", JSON.stringify({
  id: "./", name: "Cohérence cardiaque", short_name: "Cohérence", lang: "fr", dir: "ltr",
  categories: ["health", "lifestyle"],
  prefer_related_applications: false,
  shortcuts: [{ name: "Commencer une séance", short_name: "Séance", url: "./?seance", icons: [{ src: "icons/icone-192.png", sizes: "192x192" }] }],
  screenshots: [
    { src: "screens/accueil.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Réglages et programme" },
    { src: "screens/lotus.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Le lotus s'ouvre à l'inspiration" },
    { src: "screens/presentation.png", sizes: "1024x500", type: "image/png", form_factor: "wide", label: "Cohérence cardiaque" }
  ],
  description: "5 minutes de cohérence cardiaque guidée par des paysages vivants.",
  start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
  background_color: "#0d1422", theme_color: "#0d1422",
  icons: [
    { src: "icons/icone-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/icone-512.png", sizes: "512x512", type: "image/png" },
    { src: "icons/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2));
fs.writeFileSync("docs/hors-ligne.html", `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hors connexion · Cohérence cardiaque</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d1422;color:#f4ecde;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}p{color:rgba(244,236,222,.7)}</style></head>
<body><div><h1>Pas de connexion</h1><p>Ouvrez l'application une première fois avec internet : elle fonctionnera ensuite hors connexion.</p></div></body></html>`);
const files = ["./", "index.html", "hors-ligne.html", "confidentialite.html", "manifest.webmanifest", "fonts/fonts.css", ...fs.readdirSync("docs/fonts").filter(f => f.endsWith(".woff2")).map(f => "fonts/" + f), "icons/icone-192.png", "icons/icone-512.png"];
fs.writeFileSync("docs/sw.js", `// Fonctionnement hors connexion : l'application est gardée en cache, mise à jour à chaque nouvelle version.
const CACHE = "coherence-${stamp}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // réseau d'abord (pour recevoir les mises à jour), cache si hors connexion
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || (e.request.mode === "navigate" ? caches.match("hors-ligne.html") : Response.error()))));
});
`);
console.log("application web prête dans docs/ (version " + stamp + ")");
