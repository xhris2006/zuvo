"""Synthèse sonore partagée par les bandes-son MboaDeal (numpy uniquement, créations originales).

Chaque script crée une `Piste(durée)`, y ajoute des sons avec `piste.add(signal, t, gain, pan)`,
puis appelle `piste.master(chemin, fondu=…)`.
"""
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(31)


def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(sig, lo=None, hi=None):
    """Filtre passe-haut / passe-bas doux (domaine fréquentiel)."""
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


class Piste:
    def __init__(self, duree):
        self.duree = duree
        self.n = int(SR * duree)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(t * SR)
        if i >= self.n:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        j = min(self.n, i + len(sig))
        s = sig[: j - i] * gain
        self.L[i:j] += s * np.sqrt((1 - pan) / 2)
        self.R[i:j] += s * np.sqrt((1 + pan) / 2)

    def master(self, chemin, fondu=None, drive=1.5, niveau=0.88):
        mix = np.stack([filt(self.L, lo=45), filt(self.R, lo=45)])
        env = np.ones(self.n)
        a = int(0.02 * SR)
        env[:a] = np.linspace(0, 1, a)
        if fondu is not None:
            fo = int(fondu * SR)
            env[fo:] = np.linspace(1, 0, self.n - fo) ** 1.6
        mix *= env
        mix /= np.max(np.abs(mix)) + 1e-9
        mix = np.tanh(mix * drive) / np.tanh(drive) * niveau
        pcm = (mix.T * 32767).astype(np.int16)
        with wave.open(chemin, "wb") as f:
            f.setnchannels(2)
            f.setsampwidth(2)
            f.setframerate(SR)
            f.writeframes(pcm.tobytes())
        crete = 20 * np.log10(np.max(np.abs(mix)))
        rms = 20 * np.log10(np.sqrt(np.mean(mix**2)))
        print(f"{chemin} — crête {crete:.1f} dBFS, RMS {rms:.1f} dBFS")


# ---------------------------------------------------------------- instruments
def pad(notes, dur, bright=1200, attack=0.8):
    t = tt(dur)
    out = np.zeros(len(t))
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            f = midi(m) * 2 ** (det / 12)
            out += 2 * ((t * f + rng.random()) % 1) - 1
    out = filt(out, hi=bright) / (3 * len(notes))
    return out * np.minimum(t / attack, 1) * np.clip((dur - t) / 0.8, 0, 1)


def marimba(m, d=0.7):
    """Lame de bois frappée : fondamentale, partiels à 4× et 10×, attaque boisée."""
    t = tt(d)
    f = midi(m)
    body = (
        np.sin(2 * np.pi * f * t) * np.exp(-t * 6)
        + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 22)
        + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 45)
    )
    knock = filt(rng.standard_normal(len(t)), lo=800, hi=4000) * np.exp(-t * 160) * 0.15
    return (body + knock) * np.minimum(t / 0.0015, 1)


def kalimba(m, d=1.1):
    """Lamelle pincée, plus cristalline (accents et motifs)."""
    t = tt(d)
    f = midi(m)
    sig = (
        np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2)
        + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 18)
        + 0.1 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 5)
    )
    return sig * np.minimum(t / 0.001, 1)


def pluck(m, d=0.45, bright=3000):
    """Corde synthétique brève (arpèges sombres)."""
    t = tt(d)
    f = midi(m)
    saw = 2 * ((t * f) % 1) - 1
    return filt(saw, hi=bright) * np.exp(-t * 9) * np.minimum(t / 0.002, 1)


def kick(punch=1.0):
    t = tt(0.45)
    f = 45 + 120 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)
    click = filt(rng.standard_normal(len(t)), lo=3000) * np.exp(-t * 300) * 0.15
    return body * punch + click


def sub808(m, d=0.9):
    t = tt(d)
    f = midi(m) * (1 + 0.5 * np.exp(-t * 40))
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return np.tanh(1.8 * sig) * np.exp(-t * 2.2) * np.minimum(t / 0.004, 1) * np.clip((d - t) / 0.05, 0, 1)


def clap():
    t = tt(0.25)
    n = rng.standard_normal(len(t))
    env = sum(
        np.exp(-np.maximum(t - o, 0) * (100 if k < 2 else 20)) * (t >= o)
        for k, o in enumerate((0, 0.012, 0.024))
    )
    return filt(n * env, lo=1200, hi=6000)


def snap():
    t = tt(0.12)
    return filt(rng.standard_normal(len(t)), lo=1800, hi=7000) * np.exp(-t * 70)


def shaker(strong):
    t = tt(0.06)
    n = filt(rng.standard_normal(len(t)), lo=6500, hi=14000)
    return n * np.minimum(t / 0.003, 1) * np.exp(-t * (50 if strong else 80)) * (1 if strong else 0.5)


def hat(open_=False):
    t = tt(0.25 if open_ else 0.05)
    return filt(rng.standard_normal(len(t)), lo=8000, hi=16000) * np.exp(-t * (14 if open_ else 120))


def conga(m=62, d=0.35):
    t = tt(d)
    f = midi(m) * (1 + 0.15 * np.exp(-t * 60))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    slap = filt(rng.standard_normal(len(t)), lo=1500, hi=5000) * np.exp(-t * 120) * 0.25
    return tone + slap


def bass(m, dur, bright=1.0):
    t = tt(dur)
    f = midi(m)
    sig = np.sin(2 * np.pi * f * t) + 0.4 * bright * np.sin(4 * np.pi * f * t) + 0.15 * bright * np.sin(6 * np.pi * f * t)
    return np.tanh(1.5 * sig) * np.minimum(t / 0.006, 1) * np.exp(-t * 4) * np.clip((dur - t) / 0.02, 0, 1)


def bell(f0, d=1.2):
    t = tt(d)
    return (
        np.sin(2 * np.pi * f0 * t) * np.exp(-t * 3.5)
        + 0.4 * np.sin(2 * np.pi * f0 * 2.76 * t) * np.exp(-t * 8)
    ) * np.minimum(t / 0.002, 1)


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


def zip_(d=0.35, f0=600, f1=3200):
    """Traînée lumineuse : sifflement qui monte."""
    t = tt(d)
    f = f0 + (f1 - f0) * (t / d) ** 1.5
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    air = filt(rng.standard_normal(len(t)), lo=2500, hi=9000) * 0.5
    return (tone + air) * np.sin(np.pi * t / d) ** 2


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
    t = tt(0.05)
    click = filt(rng.standard_normal(len(t)), lo=2500, hi=9000) * np.exp(-t * 260)
    tone = np.sin(2 * np.pi * (1800 + rng.random() * 300) * t) * np.exp(-t * 180) * 0.25
    return click + tone


def pop(f0=600, f1=1000, d=0.09):
    t = tt(d)
    f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * np.minimum(t / 0.002, 1)


def tick(f=3200):
    t = tt(0.03)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 300)


def message_tone():
    """Deux notes douces, comme un message reçu."""
    out = np.zeros(int(0.5 * SR))
    for k, m in enumerate((84, 88)):
        s = kalimba(m, 0.4) * 0.5
        i = int(k * 0.11 * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    return out
