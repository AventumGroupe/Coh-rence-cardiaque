// Filme l'application image par image (30 i/s) et envoie les images à ffmpeg.
// Usage : node video/render.js <index.html> <sortie.mp4 sans son> [durée_séance_min]
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const [, , page_path, out, minArg] = process.argv;
const FPS = 30, STEP = 1000 / FPS;
const MIN = +(minArg || 5);
const FROM = +(process.argv[5] || 0) * 1000;
const TITLE = 6000, INTRO = 4000, RUN = MIN * 60000, OUTRO = 9000;
const TOTAL = TITLE + INTRO + RUN + 600 + OUTRO;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(({ min }) => {
    try {
      localStorage.setItem("souffle.reglages", JSON.stringify({ rythme: 1, minutes: min, son: 0, vol: 60, guide: 1 }));
      localStorage.removeItem("souffle.log");
    } catch (e) {}
    // horloge pilotée : l'animation n'avance que quand on le demande
    let q = [], now = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    performance.now = () => now;
    window.__step = (ms) => { now += ms; const cbs = q; q = []; cbs.forEach((cb) => cb(now)); };
  }, { min: MIN });
  await p.goto("file://" + page_path);
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: `
    #home, .ctrls, #end, #paused { display: none !important; }
    .cue { bottom: 9vh !important; padding: 26px 0 30px; background: radial-gradient(ellipse 34% 60% at 50% 55%, rgba(13,20,34,.42), rgba(13,20,34,0) 100%); }
    .cue .word { font-size: 4.6rem !important; }
    .cue .count { font-size: 1.5rem !important; }
    .time { font-size: 1.3rem !important; opacity: .8; }
    .hud-top { padding: 34px 48px 0 !important; }
    .ov { position: fixed; inset: 0; display: grid; place-items: center; text-align: center; pointer-events: none; opacity: 0;
          background: radial-gradient(ellipse at center, rgba(13,20,34,.7), rgba(13,20,34,.25) 75%); color: #f4ecde; }
    .ov .in { display: grid; gap: 22px; justify-items: center; text-shadow: 0 2px 24px rgba(0,0,0,.5); }
    .ov img { width: 300px; height: auto; }
    .ov h1 { font-family: "Marcellus", Georgia, serif; font-weight: 400; font-size: 6.2rem; margin: 0; letter-spacing: .01em; }
    .ov p { font-family: "Jost", system-ui, sans-serif; font-size: 2rem; margin: 0; color: rgba(244,236,222,.85); }
    .ov small { font-family: "Jost", system-ui, sans-serif; font-size: 1.4rem; color: rgba(244,236,222,.7); letter-spacing: .06em; }
    #ov-end { background: radial-gradient(ellipse at center, rgba(13,20,34,.88), rgba(13,20,34,.6) 80%); }
    .wm { position: fixed; right: 48px; bottom: 40px; width: 170px; opacity: .75; pointer-events: none; }
  `});
  await p.evaluate(() => {
    const logo = document.querySelector(".brand .logo").src;
    const mk = (id, html) => { const d = document.createElement("div"); d.className = "ov"; d.id = id; d.innerHTML = `<div class="in">${html}</div>`; document.body.appendChild(d); };
    mk("ov-title", `<img src="${logo}" alt=""><h1>Cohérence cardiaque</h1><p>5 minutes · 6 respirations par minute</p><small>Suivez l'image : elle s'ouvre quand vous inspirez, se referme quand vous expirez</small>`);
    mk("ov-end", `<img src="${logo}" alt=""><h1>Bravo</h1><p>Trois fois par jour, cinq minutes, pour retrouver le calme.</p><small>softskills-academie.com</small>`);
    const wm = document.createElement("img"); wm.className = "wm"; wm.id = "wm"; wm.src = logo; wm.style.opacity = 0; document.body.appendChild(wm);
  });

  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", String(FPS), out], { stdio: ["pipe", "inherit", "inherit"] });

  const fade = (t, a, b, f = 800) => Math.max(0, Math.min(1, (t - a) / f, (b - t) / f));
  let t = 0, started = false, n = 0, ended = false;
  const frames = Math.round(TOTAL / STEP);
let shot = 0;
  const t0 = Date.now();
  for (let i = 0; i < frames; i++, t += STEP) {
    if (!started && t >= TITLE) { started = true; await p.evaluate(() => document.getElementById("start").click()); }
    await p.evaluate(({ dt, t, ov1, ov2, wm }) => {
      window.__step(dt);
      document.getElementById("ov-title").style.opacity = ov1;
      document.getElementById("ov-end").style.opacity = ov2;
      document.getElementById("wm").style.opacity = wm;
    }, { dt: STEP, t, ov1: fade(t, -1000, TITLE - 200, 900), ov2: fade(t, TITLE + INTRO + RUN + 600, TOTAL + 2000, 1200),
         wm: 0.7 * fade(t, TITLE + 800, TITLE + INTRO + RUN + 400, 1200) });
    if (t < FROM - 1) continue;
    const buf = await p.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (++n % 900 === 0) console.log(`${n}/${frames} images (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("vidéo muette écrite :", out, "durée", (TOTAL / 1000).toFixed(1), "s");
  await b.close();
})();
