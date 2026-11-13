// Captures d'écran et image de présentation pour la fiche Google Play, rendues depuis l'application.
// Usage : node store/make-store-images.js <chemin absolu de index.html> <dossier de sortie>
const { chromium } = require("playwright");
const [, , page, out] = process.argv;
(async () => {
  const b = await chromium.launch();
  const clock = () => { let q = [], now = 0; window.requestAnimationFrame = cb => { q.push(cb); return 1; }; performance.now = () => now; window.__step = ms => { now += ms; const c = q; q = []; c.forEach(f => f(now)); }; };
  const prep = async (p, settings) => {
    await p.addInitScript(clock);
    await p.addInitScript(s => {
      localStorage.setItem("souffle.reglages", JSON.stringify(s));
      localStorage.setItem("souffle.rappels", JSON.stringify({ days: [1, 2, 3, 4, 5], matin: 420, midi: 645, soir: 1200 }));
      const d = new Date(); d.setHours(7, 10, 0, 0); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      localStorage.setItem("souffle.log", JSON.stringify({ [k]: [d.getTime()] }));
    }, settings);
  };
  const step = async (p, ms) => { for (let t = 0; t < ms; t += 100) await p.evaluate(() => window.__step(100)); };
  const base = { rythme: 1, minutes: 5, son: 3, vol: 60, guide: 1, sonV: 2, departV: 1 };

  // 1. écran d'accueil
  let p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await prep(p, base); await p.goto("file://" + page); await step(p, 1500); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: out + "/capture-1-accueil.png" }); await p.close();

  // 2 à 6. séance : un paysage par minute, capture en milieu d'inspiration
  p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await prep(p, { ...base, minutes: 7 }); await p.goto("file://" + page); await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: ".ctrls{display:none!important}" });
  await p.evaluate(() => document.getElementById("start").click());
  await step(p, 1000); // fondu du panneau
  // séance longue (7 min) pour voir défiler les 5 paysages ; capture au cœur de chaque inspiration
  const names = ["2-maree", "3-aube", "4-lotus", "5-aurore", "6-papillon"];
  const wordIs = async w => (await p.evaluate(() => document.getElementById("word").textContent)) === w;
  for (let k = 0; k < names.length; k++) {
    if (k === 0) await step(p, 48000); else await step(p, 50000);
    for (let i = 0; i < 200 && !(await wordIs("Expirez")); i++) await step(p, 100);
    for (let i = 0; i < 200 && !(await wordIs("Inspirez")); i++) await step(p, 100);
    await step(p, 3600);
    await p.screenshot({ path: out + "/capture-" + names[k] + ".png" });
  }
  // écran de fin de séance
  for (let i = 0; i < 4000 && !(await p.evaluate(() => !document.getElementById("end").classList.contains("fade-out"))); i++) await step(p, 100);
  await p.evaluate(() => document.getElementById("f3").click());
  await step(p, 1500); await p.waitForTimeout(1200); // laisse finir les fondus (horloge réelle)
  await p.screenshot({ path: out + "/capture-7-fin.png" });
  await p.close();

  // image de présentation 1024 × 500
  p = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await prep(p, base); await p.goto("file://" + page); await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: `#home{display:none!important}
    .fg{position:fixed;inset:0;display:grid;align-content:center;padding-left:64px;gap:10px;color:#f4ecde;
        background:linear-gradient(90deg,rgba(13,20,34,.78) 0%,rgba(13,20,34,.45) 45%,rgba(13,20,34,0) 70%)}
    .fg img{width:190px;height:auto}
    .fg h1{font-family:"Marcellus",Georgia,serif;font-weight:400;font-size:56px;margin:6px 0 0;line-height:1.05}
    .fg p{font-family:"Jost",system-ui,sans-serif;font-size:22px;margin:0;color:rgba(244,236,222,.85)}` });
  await p.evaluate(() => { const d = document.createElement("div"); d.className = "fg"; d.innerHTML = `<img src="${document.querySelector('.brand .logo').src}"><h1>Cohérence<br>cardiaque</h1><p>Respirez au rythme des paysages</p>`; document.body.appendChild(d); });
  await step(p, 7000);
  await p.screenshot({ path: out + "/presentation-1024x500.png" });
  await b.close();
  console.log("images de la fiche prêtes dans", out);
})();
