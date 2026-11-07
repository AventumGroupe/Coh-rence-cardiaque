"""Bande-son de la vidéo : mêmes sons que l'application (accord tenu qui enfle à l'inspiration,
notes pentatoniques, bol chantant), calés sur le minutage de video/render.js."""
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

# ---- enveloppe de l'accord (100 points par seconde, lissage exponentiel comme setTargetAtTime)
CR = 100
steps = int(TOTAL * CR) + 1
env = np.zeros(steps); v = 0.0
phases = []
k = 0
while START_RUN + k * (INH + EXH) < END_RUN - 0.01:
    s = START_RUN + k * (INH + EXH)
    phases.append((s, True)); phases.append((s + INH, False)); k += 1
def target_at(x):
    if x < 1.0: return 0.0, 1.5
    if x < START_RUN: return 0.12, 1.5
    if x >= END_RUN: return (0.08, 2.0) if x < TOTAL - 4 else (0.0, 1.2)
    i = int((x - START_RUN) // ((INH + EXH) / 2))
    inhale = i % 2 == 0
    return (0.26 if inhale else 0.12), (INH if inhale else EXH) / 2.5
for i in range(steps):
    x = i / CR; tg, tc = target_at(x)
    v += (tg - v) * (1 - np.exp(-1 / (CR * tc)))
    env[i] = v
drone_env = np.interp(t, np.arange(steps) / CR, env).astype(np.float32)

# ---- accord : ré, la, ré (voix médiums audibles sur téléphone et ordinateur)
def tri(f):  # onde triangle douce (trois harmoniques impaires, aigus atténués)
    w = 2 * np.pi * f * t
    return (np.sin(w) - np.sin(3 * w) / 9 + np.sin(5 * w) / 50).astype(np.float32)
voices = [(146.83, 0.10, "sine"), (293.66, 0.45, "tri"), (294.1, 0.30, "sine"), (440.0, 0.32, "tri"), (587.33, 0.16, "sine")]
drone = np.zeros(N, np.float32)
for i, (f, g, kind) in enumerate(voices):
    lfo = 1 + 0.3 * np.sin(2 * np.pi * (0.07 + i * 0.031) * t)
    sig = tri(f) if kind == "tri" else np.sin(2 * np.pi * f * t).astype(np.float32)
    drone += (g * lfo).astype(np.float32) * sig
drone *= drone_env

# ---- notes et bol
notes = np.zeros(N, np.float32)
def add_tone(at, f, vol, decay, partial=0.2):
    for m, a in [(1, 1.0), (2, partial)]:
        d = decay / m; L = int((d + 0.05) * SR); s0 = int(at * SR)
        if s0 >= N: return
        L = min(L, N - s0); tt = np.arange(L) / SR
        peak = vol * a
        e = np.where(tt < 0.08, peak * (0.0001 / peak) ** np.clip(1 - tt / 0.08, 0, 1), peak * (0.0001 / peak) ** np.clip((tt - 0.08) / (d - 0.08), 0, 1))
        notes[s0:s0 + L] += (e * np.sin(2 * np.pi * f * m * tt)).astype(np.float32)
def add_bowl(at, f, vol):
    for m, a, d in [(1, 1.0, 7.0), (2.76, 0.22, 4.0)]:
        for beat in (0, 0.6):
            L = int((d + 0.05) * SR); s0 = int(at * SR)
            if s0 >= N: continue
            L = min(L, N - s0); tt = np.arange(L) / SR
            peak = vol * a * 0.5
            e = np.where(tt < 0.03, peak * (0.0001 / peak) ** np.clip(1 - tt / 0.03, 0, 1), peak * (0.0001 / peak) ** np.clip((tt - 0.03) / (d - 0.03), 0, 1))
            notes[s0:s0 + L] += (e * np.sin(2 * np.pi * (f * m + beat) * tt)).astype(np.float32)
NOTES = [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66]
for at, inhale in phases:
    dur = INH if inhale else EXH
    pool = NOTES[2:] if inhale else NOTES[:4]
    add_tone(at + 0.3, pool[rng.integers(len(pool))], 0.16, 5)
    if rng.random() < 0.4: add_tone(at + dur * 0.55, pool[rng.integers(len(pool))], 0.09, 4)
    add_bowl(at, 440 if inhale else 392, 0.3 if inhale else 0.16)
add_bowl(TITLE + 0.2, 392, 0.2)        # ouverture
add_bowl(END_RUN + 0.6, 392, 0.25)     # fin de séance

# ---- écho gauche / droite (retards 0,41 s et 0,57 s, réinjection 0,32, filtré)
dry = drone + notes
send = 0.28 * dry
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
L = dry + lowpass(echo(send, 0.41, 0.32), 1800)
R = dry + lowpass(echo(send, 0.57, 0.32), 1800)
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
