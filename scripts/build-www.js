// Copie l'application web dans www/ (dossier embarqué dans l'application Android)
// et y inscrit le numéro de version (1.0.<numéro de construction GitHub>).
const fs = require("fs");
fs.mkdirSync("www", { recursive: true });
const v = process.env.GITHUB_RUN_NUMBER ? "1.0." + process.env.GITHUB_RUN_NUMBER : "local";
fs.writeFileSync("www/index.html", fs.readFileSync("index.html", "utf8").replace("__APP_VERSION__", v));
console.log("www/index.html prêt, version", v);
