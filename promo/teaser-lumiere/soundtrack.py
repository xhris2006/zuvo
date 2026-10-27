"""Bande-son du teaser « lumière sur verre » (30,5 s) : nappe sombre, pulsation électro à
120 BPM avec shaker, frappes au clavier, balayages et impacts calés sur l'image.
Synthèse numpy uniquement (création originale, sans droits tiers).

    python3 soundtrack.py rendus/bande-son.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 30.5
N = int(SR * DUR)
rng = np.random.default_rng(23)
BEAT = 0.5
STEP = BEAT / 4

L = np.zeros(N)
R = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
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


def pad(notes, dur, bright=1200):
    t = tt(dur)
    out = np.zeros(len(t))
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            f = midi(m) * 2 ** (det / 12)
            out += 2 * ((t * f + rng.random()) % 1) - 1
    out = filt(out, hi=bright) / (3 * len(notes))
    return out * np.minimum(t / 0.8, 1) * np.clip((dur - t) / 0.8, 0, 1)


def kick():
    t = tt(0.45)
    f = 45 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8) + filt(rng.standard_normal(len(t)), lo=3000) * np.exp(-t * 300) * 0.15


def clap():
    t = tt(0.25)
    n = rng.standard_normal(len(t))
    env = sum(np.exp(-np.maximum(t - o, 0) * (100 if k < 2 else 20)) * (t >= o) for k, o in enumerate((0, 0.012, 0.024)))
    return filt(n * env, lo=1200, hi=6000)


def shaker(strong):
    t = tt(0.06)
    return filt(rng.standard_normal(len(t)), lo=6500, hi=14000) * np.minimum(t / 0.003, 1) * np.exp(-t * (50 if strong else 80)) * (1 if strong else 0.5)


def bass(m, dur):
    t = tt(dur)
    f = midi(m)
    sig = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)
    return np.tanh(1.5 * sig) * np.minimum(t / 0.006, 1) * np.exp(-t * 4) * np.clip((dur - t) / 0.02, 0, 1)


def bell(f0, d=1.2):
    t = tt(d)
    return (np.sin(2 * np.pi * f0 * t) * np.exp(-t * 3.5) + 0.4 * np.sin(2 * np.pi * f0 * 2.76 * t) * np.exp(-t * 8)) * np.minimum(t / 0.002, 1)


def sparkle(n=5, base=2093):
    out = np.zeros(int(0.9 * SR))
    for k in range(n):
        s = bell(base * 2 ** (k * 2 / 12) * (1.5 if k % 2 else 1), 0.5) * 0.3
        i = int(k * 0.045 * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    return out


def whoosh(d=0.6, bright=7000):
    t = tt(d)
    n = rng.standard_normal(len(t))
    peak = d * 0.62
    env = np.where(t < peak, (t / peak) ** 2.4, np.exp(-(t - peak) * 12))
    return (filt(n, lo=250, hi=1500) * (1 - t / d) + filt(n, lo=1500, hi=bright) * (t / d)) * env


def boom(d=1.4, depth=1.0):
    t = tt(d)
    f = 48 + 60 * np.exp(-t * 7)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return body * np.exp(-t * 3.2) * depth * 0.55


def riser(d, top=1400):
    t = tt(d)
    n = filt(rng.standard_normal(len(t)), lo=1200, hi=9000)
    sweep = np.sin(2 * np.pi * np.cumsum(180 + top * (t / d) ** 2) / SR)
    return (n * 0.6 + sweep * 0.3) * (t / d) ** 2.6


def key_click():
    """Frappe de clavier douce (clic + petite tonalité)."""
    t = tt(0.05)
    click = filt(rng.standard_normal(len(t)), lo=2500, hi=9000) * np.exp(-t * 260)
    tone = np.sin(2 * np.pi * (1800 + rng.random() * 300) * t) * np.exp(-t * 180) * 0.25
    return click + tone


def pop(f0=600, f1=1000, d=0.09):
    t = tt(d)
    f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * np.minimum(t / 0.002, 1)


def tick():
    t = tt(0.03)
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300)


# ---------------------------------------------------------------- nappe et pulsation
CHORDS = [([57, 60, 64], 45), ([53, 57, 60], 41), ([48, 52, 55], 36), ([55, 59, 62], 43)]

# Nappe sombre de bout en bout (accords de 2 s), plus claire à partir de la démo
for bar in range(16):
    t0 = bar * 2.0
    if t0 > 25.4:
        break
    notes, _ = CHORDS[bar % 4]
    bright = 700 if t0 < 4.6 else 1400
    gain = 0.2 if t0 < 4.6 else 0.12
    sig = pad(notes + [notes[0] + 12], 2.3, bright)
    add(sig, t0, gain, -0.3)
    add(sig, t0 + 0.015, gain, 0.3)


def intensity(t):
    """0 : silence ; 1 : pulsation ; 2 : avec shaker ; 3 : plein."""
    if t < 4.6 or 25.1 <= t:
        return 0
    if t < 11.2:
        return 1
    if t < 14.6 or 19.6 <= t < 22.8:
        return 2
    return 3


bar = 2
t = 4.0
while t < 25.1:
    notes, root = CHORDS[bar % 4]
    for s in range(16):
        ts = t + s * STEP
        lvl = intensity(ts)
        if lvl == 0:
            continue
        if s % 4 == 0:
            add(kick(), ts, 0.3 if lvl < 3 else 0.36)
        if lvl >= 2 and s in (4, 12):
            add(clap(), ts, 0.18, 0.15)
        if lvl >= 2:
            add(shaker(s % 4 == 2), ts + (0.016 if s % 2 else 0), 0.22 if lvl == 2 else 0.3, -0.5 if s % 2 else 0.5)
        if s % 2 == 0:
            add(bass(root + (12 if s in (6, 14) else 0), STEP * 1.6), ts, 0.16 if lvl < 3 else 0.2)
    t += 2.0
    bar += 1

# Accord final tenu
fin = pad([57, 60, 64, 69, 76], 5.2, 2200)
add(fin, 25.6, 0.22, -0.2)
add(fin, 25.615, 0.22, 0.2)

# ---------------------------------------------------------------- bruitages calés sur l'image
add(boom(1.6, 0.6), 0.15)
add(sparkle(), 0.3, 0.22, 0.2)
for i in range(5):  # panneaux du carrousel
    add(bell(midi(76 + [0, 3, 5, 7, 10][i]), 0.8), 0.4 + i * 0.22, 0.07, -0.6 + i * 0.3)
add(riser(1.0), 3.3, 0.22)
add(whoosh(0.8), 3.75, 0.35)
add(boom(1.4, 0.8), 4.35)
add(pop(400, 700), 4.65, 0.12)
for i in range(len("Robe en wax")):
    add(key_click(), 5.55 + i * 0.085, 0.3, 0.1)
add(pop(900, 1400), 7.05, 0.18)
add(whoosh(0.5, 9000), 7.3, 0.22)
add(riser(0.6, 2600), 8.0, 0.18)
add(sparkle(4, 2637), 8.6, 0.18, -0.2)
add(tick(), 9.05, 0.3, -0.4)
add(tick(), 9.1, 0.3, 0.4)
add(whoosh(0.6), 10.65, 0.35, -0.4)
add(whoosh(0.7, 9000), 11.1, 0.4, 0.4)
add(boom(1.0, 0.5), 11.3)
for field, (a, speed) in zip(
    ["photo", "Baskets rouges, pointure 42", "Chaussures · Très bon état", "15 000 FCFA", "Yaoundé"],
    [(12.15, 0.05), (12.55, 0.045), (13.2, 0.045), (13.75, 0.06), (14.05, 0.06)],
):
    for i in range(0, len(field), 2):
        add(key_click(), a + i * speed, 0.2, 0.2)
add(pop(500, 800), 14.25, 0.2)
add(boom(1.2, 0.7), 14.3)
for i in range(4):  # les étapes s'empilent
    add(whoosh(0.45), 14.6 + i * 0.32, 0.22, -0.3 + i * 0.2)
    add(boom(0.6, 0.35), 14.95 + i * 0.32)
add(riser(1.95, 2200), 16.95, 0.3)
for i in range(4):  # indicateur d'étape (2 sur 5 … 5 sur 5)
    add(tick(), 17.33 + i * 0.38, 0.22, 0.3)
add(boom(1.8, 1.0), 18.95)
add(sparkle(5, 2349), 18.98, 0.3, 0.2)
add(bell(1567.98, 1.6), 19.0, 0.2)
add(whoosh(0.7), 19.5, 0.35, 0.4)
add(whoosh(0.7), 20.05, 0.3, 0.5)
add(whoosh(0.6), 22.4, 0.3, -0.4)
add(boom(1.0, 0.5), 22.95)
add(whoosh(0.7), 25.0, 0.3)
add(boom(1.6, 0.9), 25.65)
add(riser(0.55, 1800), 25.95, 0.14)
add(bell(1975.5, 1.8), 26.45, 0.26)
add(sparkle(5, 2637), 26.47, 0.3, 0.1)
add(pop(500, 900), 27.35, 0.16)
for i in range(len("À toi de jouer.")):
    add(key_click(), 27.75 + i * 0.07, 0.22)
add(boom(2.0, 0.55), 28.3)
add(bell(880.0, 2.2), 28.3, 0.12)

# ---------------------------------------------------------------- mastering
mix = np.stack([L, R])
mix = np.stack([filt(ch, lo=55) for ch in mix])
fade = np.ones(N)
fade[: int(0.02 * SR)] = np.linspace(0, 1, int(0.02 * SR))
fo = int(29.3 * SR)
fade[fo:] = np.linspace(1, 0, N - fo) ** 1.6
mix *= fade
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.6) / np.tanh(1.6) * 0.88
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(pcm.tobytes())
print(f"ok — crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS, RMS {20 * np.log10(np.sqrt(np.mean(mix**2))):.1f} dBFS")
