"""Bande-son provisoire de la publicité Zuvo (90 s) : groove afro / amapiano à 112 BPM
(log drum, shaker, accords de piano électrique, balafon) et bruitages calés sur l'image.
Synthèse numpy uniquement ; à remplacer par une musique sous licence pour la diffusion.

    python3 soundtrack.py ../rendus/bande-son.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 90.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
BPM = 112
BEAT = 60 / BPM
STEP = BEAT / 4
BAR = BEAT * 4

L = np.zeros(N)
R = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2)
    R[i:j] += s * np.sqrt((1 + pan) / 2)


def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(sig, lo=None, hi=None):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    mask = np.ones_like(f)
    if lo:
        mask *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        mask *= 1 / np.sqrt(1 + (f / hi) ** 4)
    return np.fft.irfft(spec * mask, len(sig))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- instruments
def kick():
    t = tt(0.4)
    f = 48 + 110 * np.exp(-t * 34)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    return body + filt(rng.standard_normal(len(t)), lo=2500) * np.exp(-t * 320) * 0.18


def logdrum(m, dur=0.42):
    """Log drum d'amapiano : basse percussive qui glisse vers la note."""
    t = tt(dur)
    f = midi(m) * (1 + 0.6 * np.exp(-t * 38))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.55 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
    env = np.minimum(t / 0.004, 1) * np.exp(-t * 5.5)
    tok = filt(rng.standard_normal(len(t)), lo=600, hi=2500) * np.exp(-t * 200) * 0.3
    return np.tanh(1.8 * sig * env) * 0.8 + tok


def clap():
    t = tt(0.28)
    n = rng.standard_normal(len(t))
    env = sum(np.exp(-np.maximum(t - o, 0) * (95 if k < 2 else 18)) * (t >= o) for k, o in enumerate((0, 0.012, 0.024)))
    return filt(n * env, lo=1000, hi=5000) * 0.8


def shaker(strong):
    t = tt(0.07)
    n = filt(rng.standard_normal(len(t)), lo=6000, hi=13000)
    return n * np.minimum(t / 0.004, 1) * np.exp(-t * (45 if strong else 75)) * (1.0 if strong else 0.5)


def rim():
    t = tt(0.1)
    return (np.sin(2 * np.pi * 1800 * t) * 0.5 + filt(rng.standard_normal(len(t)), lo=1500, hi=5000) * 0.6) * np.exp(-t * 70)


def keys(notes, dur=0.32):
    """Accord de piano électrique (stab), léger trémolo."""
    t = tt(dur)
    out = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        out += np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) * np.exp(-t * 8)
    env = np.minimum(t / 0.006, 1) * np.exp(-t * 6) * (1 + 0.15 * np.sin(2 * np.pi * 5 * t))
    return out * env / len(notes)


def balafon(m):
    t = tt(0.5)
    f = midi(m)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 26)
    knock = filt(rng.standard_normal(len(t)), lo=400, hi=3000) * np.exp(-t * 180) * 0.25
    return (sig + knock) * np.minimum(t / 0.002, 1)


def pluck(m):
    """Sanza / likembe : pincement doux."""
    t = tt(0.9)
    f = midi(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 6)) * np.exp(-t * 4.5) * np.minimum(t / 0.003, 1)


def pad(notes, dur):
    t = tt(dur)
    out = np.zeros(len(t))
    for m in notes:
        for det in (-0.06, 0.0, 0.06):
            f = midi(m) * 2 ** (det / 12)
            out += 2 * ((t * f + rng.random()) % 1) - 1
    out = filt(out, hi=1300) / (3 * len(notes))
    return out * np.minimum(t / 0.5, 1) * np.clip((dur - t) / 0.5, 0, 1)


def whoosh(d=0.6):
    t = tt(d)
    n = rng.standard_normal(len(t))
    peak = d * 0.6
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) * 14))
    return (filt(n, lo=300, hi=1600) * (1 - t / d) + filt(n, lo=1600, hi=7000) * (t / d)) * env


def boom():
    t = tt(1.1)
    return np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t * 8)) / SR) * np.exp(-t * 3.2)


def bell(f0=1567.98, d=1.4):
    t = tt(d)
    return (np.sin(2 * np.pi * f0 * t) * np.exp(-t * 3) + 0.45 * np.sin(2 * np.pi * f0 * 2.76 * t) * np.exp(-t * 7)) * np.minimum(t / 0.002, 1)


def pop(f0=620, f1=980):
    t = tt(0.09)
    f = f0 + (f1 - f0) * (t / 0.09)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38) * np.minimum(t / 0.002, 1)


def ping():
    """Arrivée d'un message : deux notes douces."""
    a = bell(1318.5, 0.5) * 0.6
    b = bell(1975.5, 0.7) * 0.6
    out = np.zeros(int(0.1 * SR) + len(b))
    out[: len(a)] += a
    out[int(0.1 * SR) :] += b
    return out


def riser(d):
    t = tt(d)
    n = filt(rng.standard_normal(len(t)), lo=1500, hi=9000)
    sweep = np.sin(2 * np.pi * np.cumsum(220 + 900 * (t / d) ** 2) / SR)
    return (n * 0.7 + sweep * 0.25) * (t / d) ** 2.5


def sparkle():
    out = np.zeros(int(0.8 * SR))
    for k, f in enumerate((2093, 2637, 3136, 4186)):
        s = bell(f, 0.5) * 0.35
        i = int(k * 0.05 * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    return out


def buzz(d):
    """Vibration du téléphone posé sur le lit."""
    t = tt(d)
    sig = np.sign(np.sin(2 * np.pi * 155 * t)) * 0.5 + np.sin(2 * np.pi * 155 * t)
    gate = (np.sin(2 * np.pi * 7 * t) > -0.2).astype(float)
    return filt(sig, hi=900) * gate * np.minimum(t / 0.01, 1) * np.clip((d - t) / 0.02, 0, 1)


def shutter():
    t = tt(0.16)
    n = filt(rng.standard_normal(len(t)), lo=1500, hi=8000)
    return n * (np.exp(-t * 90) + 0.6 * np.exp(-np.maximum(t - 0.07, 0) * 120) * (t > 0.07))


def tap():
    t = tt(0.03)
    return filt(rng.standard_normal(len(t)), lo=2500) * np.exp(-t * 250)


def creak(d=0.6):
    t = tt(d)
    f = 320 + 120 * np.sin(2 * np.pi * 1.3 * t)
    sig = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (rng.random(len(t)) > 0.3)
    return filt(sig, lo=500, hi=2200) * np.sin(np.pi * t / d) * 0.25


def ambience(d):
    t = tt(d)
    n = filt(rng.standard_normal(len(t)), lo=150, hi=1200) * 0.25
    # Moto au loin, de temps en temps
    for start in (2.0, 9.0, 14.5):
        i = int(start * SR)
        seg = tt(2.5)
        f = 95 + 25 * np.sin(2 * np.pi * 0.4 * seg)
        moto = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * seg / 2.5) * 0.08
        n[i : i + len(seg)] += filt(moto, hi=1500)[: len(n) - i]
    return n


# ---------------------------------------------------------------- arrangement
CHORDS = [  # la mineur 7, fa maj 7, do maj 7, sol 6 (boucle de 4 mesures)
    ([57, 60, 64, 67], 45),
    ([53, 57, 60, 64], 41),
    ([52, 55, 60, 64], 48),
    ([55, 59, 62, 64], 43),
]


def section_gain(t):
    """Intensité par instrument selon le moment du film."""
    if t < 17:
        return dict(pad=0.24, pluck=0.34, shaker=0.0, kick=0.0, log=0.0, keys=0.0, clap=0.0, bal=0.0)
    if t < 31:
        return dict(pad=0.10, pluck=0.12, shaker=0.34, kick=0.3, log=0.27, keys=0.0, clap=0.28, bal=0.0)
    if t < 51:
        return dict(pad=0.08, pluck=0.0, shaker=0.39, kick=0.36, log=0.34, keys=0.32, clap=0.35, bal=0.0)
    if t < 53.5:
        return dict(pad=0.14, pluck=0.12, shaker=0.21, kick=0.22, log=0.26, keys=0.23, clap=0.0, bal=0.0)
    if t < 65:
        return dict(pad=0.10, pluck=0.0, shaker=0.39, kick=0.36, log=0.35, keys=0.32, clap=0.35, bal=0.18)
    if t < 77:
        return dict(pad=0.08, pluck=0.0, shaker=0.48, kick=0.4, log=0.39, keys=0.35, clap=0.4, bal=0.34)
    if t < 82.4:
        return dict(pad=0.16, pluck=0.20, shaker=0.14, kick=0.0, log=0.2, keys=0.2, clap=0.0, bal=0.0)
    return dict(pad=0.0, pluck=0.0, shaker=0.0, kick=0.0, log=0.0, keys=0.0, clap=0.0, bal=0.0)


add(ambience(17.0), 0, 0.55)
PENTA = [69, 72, 74, 76, 79, 81]
LOG_STEPS = [(0, 0), (3, 0), (6, 12), (10, 7), (12, 0), (14, 12)]
MELODY = [(0, 81), (2, 79), (4, 76), (6, 79), (8, 81), (11, 84), (12, 81), (14, 79)]

bar = 0
t = 0.0
while t < 84.2:
    notes, root = CHORDS[bar % 4]
    g = section_gain(t)
    if g["pad"]:
        sig = pad(notes, BAR + 0.2)
        add(sig, t, g["pad"], -0.25)
        add(sig, t + 0.013, g["pad"] * 0.9, 0.25)
    for s in range(16):
        ts = t + s * STEP
        gs = section_gain(ts)
        swing = 0.02 if s % 2 else 0.0
        if gs["kick"] and s % 4 == 0:
            add(kick(), ts, gs["kick"])
        if gs["clap"] and s in (4, 12):
            add(clap(), ts, gs["clap"], 0.1)
        if gs["shaker"]:
            add(shaker(s % 4 == 2), ts + swing, gs["shaker"], -0.45 if s % 2 else 0.45)
        if gs["shaker"] and s in (7, 15) and bar % 2:
            add(rim(), ts + swing, gs["shaker"] * 0.5, 0.5)
        if gs["keys"] and s in (2, 7, 10, 15):
            add(keys([n + 12 for n in notes]), ts + swing, gs["keys"], -0.2 if s < 8 else 0.2)
        if gs["pluck"] and s in (0, 6, 10) and (bar + s) % 3 != 2:
            add(pluck(PENTA[(bar * 3 + s) % len(PENTA)]), ts, gs["pluck"], 0.35 if s % 4 else -0.35)
    for s, off in LOG_STEPS:
        ts = t + s * STEP
        gs = section_gain(ts)
        if gs["log"]:
            add(logdrum(root - 12 + off), ts, gs["log"])
    for s, m in MELODY:
        ts = t + s * STEP + (bar % 2) * 0.0
        gs = section_gain(ts)
        if gs["bal"]:
            add(balafon(m - (2 if bar % 4 == 1 else 0)), ts, gs["bal"], -0.5 + s / 16)
    t += BAR
    bar += 1

# Accord final tenu
fin = pad(CHORDS[0][0] + [76], 6.0)
add(fin, 84.2, 0.18, -0.2)
add(fin, 84.213, 0.18, 0.2)
add(bell(880.0, 3.0), 84.2, 0.12)

# ---------------------------------------------------------------- bruitages
add(creak(0.7), 0.1, 0.5, 0.4)
add(creak(0.7), 0.15, 0.5, -0.4)
add(whoosh(0.5), 1.3, 0.25)
for w in range(14):  # titre mot à mot
    add(pop(500, 800), 0.25 + w * 0.17, 0.05, 0.2)
for a in (3.0, 5.1, 17.1, 19.1, 21.3, 23.7, 25.5, 56.6, 60.7, 63.4):  # bulles
    add(pop(700, 1100), a, 0.14, 0.2)
for a in (7.65, 8.9, 10.15, 11.4):  # étiquettes de catégories
    add(pop(560, 900), a, 0.18, -0.2)
add(creak(0.6), 17.0, 0.45, -0.6)
for cut in (28.6, 80.6):  # plongée dans l'écran
    add(riser(0.9), cut - 0.6, 0.2)
    add(whoosh(0.7), cut, 0.3)
for hit in (29.0, 80.9):  # logo
    add(boom(), hit, 0.45)
    add(bell(), hit + 0.75, 0.22, 0.1)
    add(sparkle(), hit + 0.75, 0.25, 0.3)
add(tap(), 34.85, 0.5)
add(shutter(), 40.0, 0.5, 0.3)
add(pop(), 39.15, 0.15)
add(pop(), 41.05, 0.15)
add(pop(), 47.6, 0.15)
for a in (41.75, 42.5, 43.2, 43.9, 44.65):  # étapes de publication
    add(whoosh(0.35), a - 0.2, 0.18, 0.3)
    add(tap(), a - 0.05, 0.25)
add(riser(1.6), 44.3, 0.25)
add(tap(), 45.85, 0.6)
add(boom(), 46.1, 0.35)
add(sparkle(), 46.25, 0.4, 0.3)
add(bell(2093.0, 0.9), 46.3, 0.18)
add(buzz(0.7), 53.5, 0.35)
add(tap(), 54.35, 0.5)
add(ping(), 54.65, 0.3)
add(whoosh(0.4), 57.0, 0.2, 0.4)
add(pop(800, 1300), 57.3, 0.18)
add(buzz(0.5), 58.5, 0.35)
add(ping(), 58.95, 0.3)
add(riser(4.0), 61.0, 0.2)
add(boom(), 65.0, 0.4)
for a in (66.0, 72.3):
    add(shutter(), a, 0.45, 0.3)
for a in (68.0, 71.0, 74.0):  # changements de profil
    add(whoosh(0.4), a - 0.25, 0.22, 0.5)
add(pop(400, 900), 75.3, 0.25, 0.4)
add(boom(), 77.0, 0.25)
for a in (84.3, 84.7, 85.1, 85.5):  # textes de la carte finale
    add(pop(520, 820), a, 0.1)

# ---------------------------------------------------------------- mastering
mix = np.stack([L, R])
fade = np.ones(N)
fade[: int(0.03 * SR)] = np.linspace(0, 1, int(0.03 * SR))
fo = int(87.5 * SR)
fade[fo:] = np.linspace(1, 0, N - fo) ** 1.5
mix *= fade
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.7) / np.tanh(1.7) * 0.88
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(pcm.tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(mix**2)) + 1e-12)
print(f"ok — crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS, RMS {rms:.1f} dBFS")
