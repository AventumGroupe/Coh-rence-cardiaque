// Copie l'application web dans www/ (dossier embarqué dans l'application Android),
// y inscrit le numéro de version (1.0.<numéro de construction GitHub>)
// et remplace Google Fonts par les polices embarquées : l'application ne contacte aucun serveur.
const fs = require("fs");
fs.mkdirSync("www/fonts", { recursive: true });
const v = process.env.GITHUB_RUN_NUMBER ? "1.0." + process.env.GITHUB_RUN_NUMBER : "local";
let html = fs.readFileSync("index.html", "utf8").replace("__APP_VERSION__", v);
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/, "")
           .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
for (const f of fs.readdirSync("fonts")) fs.copyFileSync("fonts/" + f, "www/fonts/" + f);
// fonts.css référence « fonts/xxx.woff2 » : depuis www/fonts/fonts.css, le chemin devient relatif au dossier
fs.writeFileSync("www/fonts/fonts.css", fs.readFileSync("fonts/fonts.css", "utf8").replace(/url\(fonts\//g, "url("));
fs.writeFileSync("www/index.html", html);
if (/googleapis|gstatic/.test(html)) { console.error("Une ressource externe subsiste dans www/index.html"); process.exit(1); }
console.log("www/index.html prêt, version", v, "— polices embarquées");
