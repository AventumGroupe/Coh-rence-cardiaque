"""Génère les icônes et l'écran de démarrage de l'application (assets/), à partir de zéro."""
from PIL import Image, ImageDraw, ImageFilter
import math

def scene(S, scale=1.0):
    W = S * 2
    im = Image.new('RGBA', (W, W))
    px = im.load()
    top, mid, low = (31, 54, 88), (122, 107, 146), (248, 199, 147)
    hy = W * (0.5 + 0.08 * scale)
    for y in range(W):
        t = min(1, y / hy)
        if t < 0.6: a, b, k = top, mid, t / 0.6
        else: a, b, k = mid, low, (t - 0.6) / 0.4
        c = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3)) + (255,)
        for x in range(W): px[x, y] = c
    cx, r = W / 2, W * 0.2 * scale
    glow = Image.new('RGBA', (W, W), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse((cx - r * 2.2, hy - r * 2.4, cx + r * 2.2, hy + r * 2.0), fill=(255, 226, 170, 110))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(W * 0.05)))
    d = ImageDraw.Draw(im)
    d.ellipse((cx - r, hy - r * 1.15, cx + r, hy + r * 0.85), fill=(255, 241, 210, 255))
    d.rectangle((0, hy, W, W), fill=(47, 94, 122, 255))
    for yy, amp, alpha in [(0.06, 0.012, 255), (0.13, 0.014, 220), (0.2, 0.016, 190)]:
        y0 = hy + W * yy * scale
        x0, x1 = cx - r * 1.7, cx + r * 1.7
        lw = W * 0.012 * scale
        for j in range(0, 801):
            x = x0 + (x1 - x0) * j / 800
            y = y0 + math.sin(j / 800 * math.pi * 3) * W * amp * scale
            d.ellipse((x - lw / 2, y - lw / 2, x + lw / 2, y + lw / 2), fill=(244, 236, 222, alpha))
    return im.resize((S, S), Image.LANCZOS)

scene(1024).save('assets/icon-only.png')
scene(1024, scale=0.78).save('assets/icon-background.png')
Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)).save('assets/icon-foreground.png')
for name in ['splash.png', 'splash-dark.png']:
    sp = Image.new('RGBA', (2732, 2732), (13, 20, 34, 255)); ic = scene(640)
    m = Image.new('L', (640, 640), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 639, 639), radius=140, fill=255)
    sp.paste(ic, (1046, 1046), m); sp.save('assets/' + name)
S = 768; n = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(n)
d.pieslice((144, 120, 624, 600), 180, 360, fill=(255, 255, 255, 255))
for y in [428, 536]:
    for i in range(0, 1201):
        x = 80 + i * 0.5; yy = y + math.sin((x - 80) / 600 * math.pi * 3) * 28
        d.ellipse((x - 26, yy - 26, x + 26, yy + 26), fill=(255, 255, 255, 255))
n.resize((96, 96), Image.LANCZOS).save('assets/ic_stat_notify.png')
