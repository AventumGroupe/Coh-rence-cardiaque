# Vidéo de la séance

Fabrique la vidéo MP4 (1920 × 1080, 30 i/s) d'une séance guidée, à partir de l'application elle-même.

```bash
npm install playwright            # une fois (Chromium doit être disponible)
node video/render.js "$PWD/index.html" video/out/muet.mp4 5      # images (5 = minutes de séance)
python3 video/soundtrack.py video/out/bande-son.wav 5            # son (numpy)
ffmpeg -i video/out/muet.mp4 -i video/out/bande-son.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart video/out/coherence-cardiaque.mp4
```

Déroulé : titre (6 s), « Installez-vous » (4 s), séance au rythme 5 s / 5 s avec les cinq paysages (un par minute), écran de fin (9 s).
