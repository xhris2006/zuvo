"""Bande-son de « Ici, tout trouve preneur » (45 s) : groove chaleureux à 112 BPM (marimba,
kalimba, shaker, congas, basse), bruitages calés sur l'image. Création originale (synthèse
numpy, sans droits tiers).

    python3 soundtrack.py rendus/bande-son.wav
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "commun"))
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
    snap,
    sparkle,
    tick,
    whoosh,
)

DUR = 45.0
p = Piste(DUR)
BEAT = 60 / 112
STEP = BEAT / 4
BAR = BEAT * 4
START = 3.9  # le groove démarre avec l'ouverture en iris

# Ré majeur : I – vi – IV – V
CHORDS = [
    ([62, 66, 69, 74], 50),
    ([59, 62, 66, 71], 47),
    ([55, 59, 62, 67], 43),
    ([57, 61, 64, 69], 45),
]
RIFF = [(0, 3), (3, 2), (6, 1), (8, 3), (10, 2), (12, 1), (14, 2)]  # (pas, note de l'accord)


def level(t):
    """0 : rien ; 1 : léger ; 2 : plein ; 3 : feutré (scène sombre)."""
    if t < START or t >= 40.0:
        return 0
    if t < 11.0:
        return 1
    if 30.6 <= t < 35.8:
        return 3
    return 2


# ---------------------------------------------------------------- nappe
for bar in range(22):
    t0 = START + bar * BAR
    if t0 >= 40.0:
        break
    notes, _ = CHORDS[bar % 4]
    bright = 900 if 30.6 <= t0 < 35.8 else 1800
    sig = pad(notes, BAR + 0.3, bright, attack=0.3)
    p.add(sig, t0, 0.09, -0.3)
    p.add(sig, t0 + 0.012, 0.09, 0.3)

# ---------------------------------------------------------------- groove
bar = 0
t = START
while t < 40.0:
    notes, root = CHORDS[bar % 4]
    for s in range(16):
        ts = t + s * STEP
        lvl = level(ts)
        if lvl == 0:
            continue
        if s in (0, 8) or (lvl == 2 and s == 11):
            p.add(kick(), ts, 0.32 if lvl == 2 else 0.26)
        if lvl in (2, 3) and s in (4, 12):
            p.add(clap() if lvl == 2 else snap(), ts, 0.16 if lvl == 2 else 0.2, 0.15)
        p.add(shaker(s % 4 == 2), ts + (0.012 if s % 2 else 0), 0.18 if lvl == 1 else 0.24, -0.5 if s % 2 else 0.5)
        if lvl == 2 and s in (2, 7, 10, 15):
            p.add(conga(64 if s in (7, 15) else 60), ts, 0.16, 0.35)
        if s in (0, 3, 6, 8, 10, 14):
            m = root + (12 if s == 8 else 7 if s == 6 else 0)
            p.add(bass(m, STEP * 1.8), ts, 0.15 if lvl == 1 else 0.19)
        if lvl in (1, 2):
            for step, idx in RIFF:
                if s == step:
                    p.add(marimba(notes[idx] + 12, 0.6), ts, 0.13 if lvl == 1 else 0.16, -0.25 + (idx % 2) * 0.5)
    t += BAR
    bar += 1

# ---------------------------------------------------------------- 1 · logo (0–4,4)
intro = pad([62, 66, 69, 74, 78], 4.2, 1400, attack=1.2)
p.add(intro, 0.0, 0.16, -0.2)
p.add(intro, 0.015, 0.16, 0.2)
p.add(boom(1.6, 0.7), 0.15)
p.add(pop(380, 760, 0.12), 0.2, 0.3)
for i, m in enumerate((74, 78, 81, 86)):
    p.add(kalimba(m, 0.9), 0.5 + i * 0.12, 0.2, -0.4 + i * 0.25)
p.add(sparkle(5, 2349), 0.9, 0.18, 0.2)
p.add(whoosh(0.6, 9000), 1.25, 0.2)
for i, m in enumerate((74, 76, 78)):  # « Achète. Vends. Donne une seconde vie. »
    p.add(marimba(m, 0.7), 2.0 + i * 0.18, 0.22, -0.3 + i * 0.3)
p.add(tick(2400), 2.8, 0.18)
p.add(riser(0.9), 3.0, 0.2)
p.add(whoosh(0.7), 3.6, 0.32)

# ---------------------------------------------------------------- 2 · accroche (3,9–11,6)
for t0, m in ((4.5, 69), (5.8, 71), (7.1, 74)):  # les cartes arrivent
    p.add(pop(420, 820, 0.1), t0 + 0.05, 0.28)
    p.add(kalimba(m + 12, 0.8), t0 + 0.1, 0.16, 0.2)
for t0 in (5.55, 6.85, 8.75):  # textes qui sortent
    p.add(whoosh(0.35, 6000), t0 - 0.1, 0.12, -0.3)
p.add(whoosh(0.6, 8000), 8.95, 0.28)  # éventail
p.add(boom(1.0, 0.5), 9.25)
p.add(sparkle(5, 2637), 9.9, 0.24, 0.3)
p.add(bell(midi(86), 1.4), 9.75, 0.12)

# ---------------------------------------------------------------- 3 · au Cameroun (11–17,6)
p.add(whoosh(0.7), 10.6, 0.34)
p.add(boom(1.2, 0.6), 11.2)
p.add(whoosh(0.9, 5000), 11.9, 0.26, 0.2)  # téléphone qui monte
for i, m in enumerate((74, 76, 78, 81, 83, 86, 88)):  # catégories qui apparaissent
    p.add(pop(500 + i * 60, 900 + i * 60, 0.08), 12.6 + i * 0.2, 0.18, -0.6 + (i % 2) * 1.2)
    p.add(kalimba(m, 0.5), 12.62 + i * 0.2, 0.1, -0.6 + (i % 2) * 1.2)

# ---------------------------------------------------------------- 4 · 01 Publie (17–24,6)
p.add(whoosh(0.7, 9000), 16.7, 0.34)
p.add(boom(1.0, 0.5), 17.3)
for i in range(5):
    p.add(whoosh(0.3, 5000), 17.85 + i * 0.12, 0.08, 0.5)
for i, t0 in enumerate((18.95, 20.05, 21.15, 22.25, 23.3)):  # étape validée
    p.add(marimba(74 + [0, 2, 4, 7, 9][i] + 12, 0.6), t0, 0.22, 0.3)
    p.add(tick(3000 + i * 200), t0, 0.16)
for i in range(8):  # le prix s'affiche
    p.add(tick(2200 + i * 120), 21.4 + i * 0.1, 0.12, 0.4)
p.add(pop(400, 700, 0.1), 23.2, 0.3)
p.add(boom(1.6, 0.9), 23.45)
p.add(sparkle(5, 2349), 23.5, 0.28, 0.2)
p.add(kalimba(86, 1.2), 23.5, 0.18)

# ---------------------------------------------------------------- 5 · 02 Trouve (24–31,2)
p.add(whoosh(0.6), 23.85, 0.3)
p.add(whoosh(0.8, 5000), 24.6, 0.22, -0.2)
p.add(pop(500, 900, 0.1), 25.05, 0.2)
p.add(key_click(), 25.35, 0.4)
p.add(key_click(), 25.5, 0.4)
p.add(sparkle(3, 3136), 25.9, 0.14, 0.3)  # la suite en grisé
for i, t0 in enumerate((27.45, 28.1, 29.05)):  # annonces, catégories, membres
    p.add(pop(520 + i * 80, 940 + i * 80, 0.08), t0, 0.2, -0.5 + i * 0.5)
p.add(pop(700, 1300, 0.1), 27.3, 0.26)  # suite acceptée
p.add(kalimba(81, 0.8), 27.32, 0.14)
p.add(whoosh(0.5, 7000), 29.9, 0.22)
p.add(pop(500, 900, 0.09), 30.25, 0.2, -0.5)
p.add(pop(560, 1000, 0.09), 30.4, 0.2, 0.5)
p.add(kalimba(88, 0.6), 30.42, 0.12, 0.5)

# ---------------------------------------------------------------- 6 · 03 Partage et discute (30,6–36,4)
p.add(whoosh(0.8), 30.3, 0.34)
p.add(boom(1.4, 0.8), 30.9)
p.add(whoosh(0.7, 5000), 31.0, 0.22, 0.4)
for i in range(3):
    p.add(whoosh(0.35, 6000), 31.6 + i * 0.15, 0.12, -0.5)
p.add(pop(400, 650, 0.1), 32.5, 0.3)
p.add(pop(800, 1400, 0.1), 32.75, 0.24)
p.add(whoosh(0.5, 7000), 33.5, 0.2)
p.add(message_tone(), 34.25, 0.3, -0.3)
p.add(message_tone(), 34.9, 0.3, 0.3)

# ---------------------------------------------------------------- 7 · au lancement (35,8–40,6)
p.add(whoosh(0.7), 35.5, 0.34)
p.add(riser(0.8, 2000), 36.95, 0.2)
p.add(boom(1.4, 0.9), 37.8)  # 0 FCFA
p.add(pop(380, 700, 0.12), 37.77, 0.3)
p.add(boom(1.4, 0.9), 39.45)  # 0 %
p.add(pop(420, 760, 0.12), 39.42, 0.3)
p.add(sparkle(6, 2349), 39.55, 0.3, -0.2)
p.add(sparkle(5, 2794), 39.67, 0.24, 0.3)

# ---------------------------------------------------------------- 8 · fin (40–45)
p.add(whoosh(0.8), 39.7, 0.32)
p.add(boom(2.0, 1.0), 40.45)
p.add(pop(380, 760, 0.12), 40.45, 0.3)
for i, m in enumerate((74, 78, 81, 86)):
    p.add(kalimba(m, 1.2), 40.95 + i * 0.1, 0.18, -0.3 + i * 0.2)
p.add(sparkle(5, 2637), 41.0, 0.22)
for i, m in enumerate((74, 76, 78)):
    p.add(marimba(m + 12, 0.8), 41.3 + i * 0.15, 0.18)
fin = pad([50, 62, 66, 69, 74, 78], 5.0, 2400, attack=0.2)
p.add(fin, 40.4, 0.22, -0.2)
p.add(fin, 40.415, 0.22, 0.2)
p.add(bell(midi(86), 2.4), 42.3, 0.1)

p.master(sys.argv[1], fondu=43.2)
