"""Bande-son de « Fais comme Adrien » (33 s) : le « ding » de la notification, puis un groove
afro lumineux à 108 BPM (marimba, kalimba, shaker, congas, basse) et des bruitages calés sur
l'image. Création originale (synthèse numpy, sans droits tiers).

Les bruitages sont écrits en temps de scène, comme les animations de la page, puis placés sur
la voix par le calage (`calage.js`, lu par `commun/calage.py`).

    python3 soundtrack.py rendus/bande-son.wav
"""
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, "..", "commun"))
from calage import charger  # noqa: E402
from synthe import (  # noqa: E402
    Piste,
    bass,
    bell,
    boom,
    clap,
    conga,
    kalimba,
    key_click,
    kick,
    marimba,
    message_tone,
    midi,
    pad,
    pop,
    riser,
    shaker,
    sparkle,
    tick,
    whoosh,
    zip_,
)

DUREE, M = charger(os.path.join(ICI, "calage.js"))
DUR = DUREE
p = Piste(DUR)
BEAT = 60 / 108
STEP = BEAT / 4
BAR = BEAT * 4
START = M(4.3)  # l'annonce d'Adrien apparaît
FULL = M(10.7)  # « Tu publies, tes abonnés sont prévenus »
STOP = M(27.8)  # carte finale

# La majeur : I – vi – IV – V
CHORDS = [
    ([57, 61, 64, 69], 45),
    ([54, 57, 61, 66], 42),
    ([50, 54, 57, 62], 38),
    ([52, 56, 59, 64], 40),
]
RIFF = [(0, 3), (3, 2), (6, 1), (8, 3), (10, 2), (12, 1), (14, 2)]  # (pas, note de l'accord)


def level(t):
    """0 : rien ; 1 : léger ; 2 : plein."""
    if t < START or t >= STOP:
        return 0
    return 1 if t < FULL else 2


def fx(sig, s, gain=1.0, pan=0.0):
    """Bruitage placé au temps de scène s (instants de la page, avant calage)."""
    p.add(sig, M(s), gain, pan)


# ---------------------------------------------------------------- nappe
for bar in range(40):
    t0 = START + bar * BAR
    if t0 >= STOP:
        break
    notes, _ = CHORDS[bar % 4]
    sig = pad(notes, BAR + 0.3, 1700, attack=0.3)
    p.add(sig, t0, 0.08, -0.3)
    p.add(sig, t0 + 0.012, 0.08, 0.3)

# ---------------------------------------------------------------- groove
bar = 0
t = START
while t < STOP:
    notes, root = CHORDS[bar % 4]
    for s in range(16):
        ts = t + s * STEP
        lvl = level(ts)
        if lvl == 0:
            continue
        if s in (0, 8) or (lvl == 2 and s == 11):
            p.add(kick(), ts, 0.32 if lvl == 2 else 0.26)
        if lvl == 2 and s in (4, 12):
            p.add(clap(), ts, 0.16, 0.15)
        p.add(shaker(s % 4 == 2), ts + (0.012 if s % 2 else 0), 0.17 if lvl == 1 else 0.23, -0.5 if s % 2 else 0.5)
        if lvl == 2 and s in (2, 7, 10, 15):
            p.add(conga(64 if s in (7, 15) else 60), ts, 0.16, 0.35)
        if s in (0, 3, 6, 8, 10, 14):
            m = root + (12 if s == 8 else 7 if s == 6 else 0)
            p.add(bass(m, STEP * 1.8), ts, 0.15 if lvl == 1 else 0.19)
        for step, idx in RIFF:
            if s == step:
                p.add(marimba(notes[idx] + 12, 0.6), ts, 0.12 if lvl == 1 else 0.15, -0.25 + (idx % 2) * 0.5)
    t += BAR
    bar += 1

# ---------------------------------------------------------------- 1 · la notification (0–4,75)
intro = pad([57, 64, 69, 73], 4.6, 900, attack=1.0)
p.add(intro, 0.0, 0.14, -0.2)
p.add(intro, 0.015, 0.14, 0.2)
fx(whoosh(0.8, 5000), 0.05, 0.26)  # le téléphone se lève
fx(message_tone(), 1.0, 0.42)  # « Ding ! »
fx(bell(midi(88), 1.6), 1.02, 0.16, 0.2)
fx(sparkle(4, 2637), 1.15, 0.14, -0.2)
for i, m in enumerate((69, 73, 76)):  # « Une nouvelle annonce sur MboaDeal »
    fx(marimba(m, 0.6), 1.9 + i * 0.15, 0.16, -0.3 + i * 0.3)
fx(riser(0.9, 1600), 2.95, 0.18)
fx(whoosh(0.7, 8000), 3.75, 0.32)  # on plonge dans la notification

# ---------------------------------------------------------------- 2 · l'annonce d'Adrien (4,3–11,2)
fx(boom(1.2, 0.6), 4.35)
fx(pop(420, 820, 0.1), 4.45, 0.24)
fx(kalimba(81, 0.9), 4.9, 0.16, -0.2)  # « Adrien l'a fait. »
fx(pop(500, 900, 0.09), 5.4, 0.22)  # son avatar
fx(tick(3000), 7.2, 0.16, 0.3)  # le titre souligné
fx(whoosh(0.5, 7000), 7.55, 0.2, 0.4)  # deuxième photo
for i in range(8):  # le prix défile
    fx(tick(2200 + i * 120), 8.6 + i * 0.1, 0.11, 0.4)
fx(kalimba(88, 0.8), 9.45, 0.14, 0.3)
fx(pop(520, 940, 0.08), 9.6, 0.2, 0.4)  # Yaoundé
fx(pop(580, 1000, 0.08), 9.85, 0.2, -0.4)  # Neuf avec étiquette

# ---------------------------------------------------------------- 3 · les abonnés sont prévenus (10,7–16)
fx(whoosh(0.8), 10.55, 0.34)
fx(boom(1.4, 0.8), 10.85)
for i, m in enumerate((69, 73, 76)):
    fx(marimba(m + 12, 0.6), 11.3 + i * 0.18, 0.15, -0.3 + i * 0.3)
fx(pop(400, 700, 0.11), 11.95, 0.28)  # le profil d'Adrien
fx(bell(midi(81), 1.2), 12.5, 0.1)
for i, s0 in enumerate((12.7, 13.0, 13.3)):  # les notifications partent
    fx(zip_(0.3, 700 + i * 120, 2600 + i * 200), s0 - 0.05, 0.12, -0.4 + i * 0.4)
    fx(message_tone(), s0 + 0.2, 0.16, -0.4 + i * 0.4)

# ---------------------------------------------------------------- 4 · à ton tour (15,6–23,6)
fx(whoosh(0.7, 9000), 15.45, 0.34)
fx(boom(1.2, 0.7), 15.7)
fx(pop(380, 760, 0.12), 16.95, 0.3)  # le bouton +
fx(key_click(), 17.5, 0.5)
fx(sparkle(3, 2794), 17.55, 0.14, 0.2)
for i in range(5):  # les cinq étapes
    s0 = 18.0 + i * 0.7
    fx(whoosh(0.3, 5000), s0, 0.08, 0.5)
    fx(marimba(69 + [0, 2, 4, 7, 9][i] + 12, 0.6), s0 + 0.5, 0.2, 0.3)
    fx(tick(3000 + i * 200), s0 + 0.5, 0.14)
fx(pop(400, 700, 0.1), 21.9, 0.3)  # annonce publiée
fx(boom(1.6, 0.9), 21.95)
fx(sparkle(5, 2349), 22.0, 0.26, 0.2)
fx(kalimba(88, 1.2), 22.0, 0.16)

# ---------------------------------------------------------------- 5 · gratuit (23,2–28,2)
fx(whoosh(0.7), 23.05, 0.34)
fx(riser(0.8, 2000), 24.1, 0.2)
fx(pop(380, 700, 0.12), 24.9, 0.3)  # 0 FCFA
fx(boom(1.4, 0.9), 24.95)
fx(pop(420, 760, 0.12), 26.0, 0.3)  # 0 %
fx(boom(1.4, 0.9), 26.05)
fx(sparkle(6, 2349), 26.15, 0.28, -0.2)
fx(sparkle(5, 2794), 26.27, 0.22, 0.3)

# ---------------------------------------------------------------- 6 · fin (27,8–32,6)
fx(whoosh(0.8), 27.6, 0.32)
fx(boom(2.0, 1.0), 28.15)
fx(pop(380, 760, 0.12), 28.15, 0.3)
for i, m in enumerate((69, 73, 76, 81)):  # le logo
    fx(kalimba(m, 1.2), 28.6 + i * 0.1, 0.18, -0.3 + i * 0.2)
fx(sparkle(5, 2637), 28.7, 0.22)
for i, (s0, m) in enumerate(((29.0, 76), (29.25, 81))):  # « Fais comme Adrien. »
    fx(marimba(m + 12, 0.8), s0, 0.18)
fx(key_click(), 30.75, 0.45)  # « Publier sur MboaDeal »
fx(bell(midi(88), 2.2), 30.2, 0.1)
fin = pad([45, 57, 61, 64, 69, 73], DUR - M(28.1) + 0.3, 2200, attack=0.2)
p.add(fin, M(28.1), 0.22, -0.2)
p.add(fin, M(28.1) + 0.015, 0.22, 0.2)

p.master(sys.argv[1], fondu=DUR - 1.6)
