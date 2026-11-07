// Copie l'application web dans www/, le dossier embarqué dans l'application Android.
const fs = require("fs");
fs.mkdirSync("www", { recursive: true });
fs.copyFileSync("index.html", "www/index.html");
console.log("www/index.html prêt");
