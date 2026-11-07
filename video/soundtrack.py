"""Bande-son de la vidéo : mêmes sons que l'application (bol tibétain grave à l'inspiration,
aigu à l'expiration, notes de cithare très douces), calés sur le minutage de video/render.js."""
import numpy as np, wave, sys

SR = 44100
MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 5
TITLE, INTRO, RUN, OUTRO = 6.0, 4.0, MIN * 60, 9.0
INH, EXH = 5.0, 5.0
START_RUN = TITLE + INTRO
END_RUN = START_RUN + RUN
TOTAL = TITLE + INTRO + RUN + 0.6 + OUTRO
N = int(TOTAL * SR)
t = np.arange(N, dtype=np.float64) / SR
rng = np.random.default_rng(365)

# ---- minutage des phases
phases = []
k = 0
while START_RUN + k * (INH + EXH) < END_RUN - 0.01:
    s0 = START_RUN + k * (INH + EXH)
    phases.append((s0, True)); phases.append((s0 + INH, False)); k += 1

notes = np.zeros(N, np.float32)
def partial(at, f, peak, attack, decay):
    L = int((decay + 0.05) * SR); s0 = int(at * SR)
    if s0 >= N or peak <= 0: return
    L = min(L, N - s0); tt = np.arange(L) / SR
    e = np.where(tt < attack, peak * (0.0001 / peak) ** np.clip(1 - tt / attack, 0, 1),
                 peak * (0.0001 / peak) ** np.clip((tt - attack) / (decay - attack), 0, 1))
    notes[s0:s0 + L] += (e * np.sin(2 * np.pi * f * tt)).astype(np.float32)
def bowl(at, f, vol):  # bol tibétain, identique à l'application
    for i, (m, a, d) in enumerate([(1, 1, 9), (2.71, 0.4, 6), (5.33, 0.16, 3.5), (8.8, 0.05, 2)]):
        partial(at, f * m, vol * a * 0.6, 0.012, d)
        if i < 2: partial(at, f * m + (1.1 if i else 0.4), vol * a * 0.3, 0.012, d * 0.9)
def cithare(at, f, vol):
    for m, a, d in [(1, 1, 3.6), (2, 0.32, 2.0), (3, 0.12, 1.2), (4, 0.05, 0.8)]:
        partial(at, f * m, vol * a, 0.006, d)
CITHARE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33]
idx = 2
for at, inhale in phases:
    dur = INH if inhale else EXH
    bowl(at, 220 if inhale else 440, 0.34 if inhale else 0.2)   # grave à l'inspiration, aigu à l'expiration
    def step():
        global idx
        if rng.random() < 0.7: idx = max(0, min(len(CITHARE) - 1, idx + (1 if inhale else -1)))
        return CITHARE[idx]
    cithare(at + dur * 0.32, step(), 0.07)
    if rng.random() < 0.55: cithare(at + dur * 0.68, step(), 0.05)
bowl(TITLE + 0.2, 220, 0.3)                        # ouverture
bowl(END_RUN + 0.6, 220, 0.3); bowl(END_RUN + 1.8, 440, 0.12)   # fin de séance

# ---- écho gauche / droite (retards 0,41 s et 0,57 s, réinjection 0,32, filtré)
dry = notes
send = 0.2 * dry
def echo(x, delay, fb):
    D = int(delay * SR); e = np.zeros_like(x)
    for s in range(D, len(x), D):
        n = min(D, len(x) - s)
        e[s:s + n] = x[s - D:s - D + n] + fb * e[s - D:s - D + n]
    return e
def lowpass(x, fc):
    taps = 255; n = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * fc / SR * n) * np.hamming(taps); h /= h.sum()
    B = 1 << 20; out = np.zeros(len(x) + taps, np.float32); F = np.fft.rfft(h, B + taps)
    for s in range(0, len(x), B):
        seg = x[s:s + B]; y = np.fft.irfft(np.fft.rfft(seg, B + taps) * F, B + taps)[:len(seg) + taps - 1]
        out[s:s + len(y)] += y.astype(np.float32)
    return out[(taps - 1) // 2:(taps - 1) // 2 + len(x)]
dry = lowpass(dry, 3200)
send = 0.2 * dry
L = dry + lowpass(echo(send, 0.43, 0.28), 1600)
R = dry + lowpass(echo(send, 0.61, 0.28), 1600)
st = np.stack([L, R], 1) * 0.9
# fondu de sécurité au tout début et à la fin, puis normalisation (crête -1 dBFS)
fade = np.ones(N, np.float32); f1 = int(0.5 * SR); f2 = int(3 * SR)
fade[:f1] = np.linspace(0, 1, f1); fade[-f2:] = np.linspace(1, 0, f2)
st *= fade[:, None]
peak = np.abs(st).max(); st *= (10 ** (-1 / 20)) / peak
rms = np.sqrt((st ** 2).mean())
pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"bande-son : {TOTAL:.1f} s, {len(phases)//2} respirations, RMS {20*np.log10(rms):.1f} dBFS")
