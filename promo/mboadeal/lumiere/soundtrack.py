"""Bande-son de MboaDeal « lumière » (31 s) : nappe sombre en fa mineur, pulsation à 96 BPM
(sub, charleston, claquement), arpèges, impacts et traînées calés sur l'image. Création
originale (synthèse numpy, sans droits tiers).

    python3 soundtrack.py rendus/bande-son.wav
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "commun"))
from synthe import (  # noqa: E402
    Piste,
    bell,
    boom,
    hat,
    kalimba,
    key_click,
    kick,
    midi,
    pad,
    pluck,
    pop,
    riser,
    snap,
    sparkle,
    sub808,
    tick,
    whoosh,
    zip_,
)

DUR = 31.0
p = Piste(DUR)
BEAT = 60 / 96
STEP = BEAT / 4
BAR = BEAT * 4
START = 4.8  # « Achète. »
STOP = 26.4  # la lumière trace le logo

# Fa mineur : i – VI – III – VII
CHORDS = [
    ([53, 56, 60], 41),
    ([49, 53, 56], 37),
    ([56, 60, 63], 44),
    ([51, 55, 58], 39),
]


def level(t):
    if t < START or t >= STOP:
        return 0
    if t < 12.6:
        return 1
    return 2


# ---------------------------------------------------------------- nappe sombre
for bar in range(12):
    t0 = bar * BAR
    if t0 >= STOP:
        break
    notes, _ = CHORDS[bar % 4]
    bright = 650 if t0 < START else 1200
    sig = pad(notes + [notes[0] + 12], BAR + 0.4, bright, attack=0.6)
    p.add(sig, t0, 0.2 if t0 < START else 0.12, -0.3)
    p.add(sig, t0 + 0.015, 0.2 if t0 < START else 0.12, 0.3)

# ---------------------------------------------------------------- pulsation
bar = 0
t = START
while t < STOP:
    notes, root = CHORDS[bar % 4]
    for s in range(16):
        ts = t + s * STEP
        lvl = level(ts)
        if lvl == 0:
            continue
        if s == 0 or (lvl == 2 and s in (10,)):
            p.add(kick(1.1), ts, 0.34)
        if s in (0, 10) and ts + BEAT * 2 < STOP + 0.5:
            p.add(sub808(root - 12 if root > 40 else root, BEAT * 1.8), ts, 0.3)
        if lvl == 2 and s == 8:
            p.add(snap(), ts, 0.24, 0.1)
        if s % 2 == 0 or lvl == 2:
            roll = lvl == 2 and bar % 2 == 1 and s >= 12
            p.add(hat(), ts, 0.1 if s % 4 else 0.14, -0.4 if s % 2 else 0.4)
            if roll:
                p.add(hat(), ts + STEP / 2, 0.08, 0.4)
        if lvl == 2 and s in (6, 14):
            p.add(hat(True), ts, 0.06, 0.5)
        if ts >= 9.6:  # arpège sombre
            arp = [notes[0], notes[1], notes[2], notes[0] + 12]
            p.add(pluck(arp[s % 4] + 12, 0.35, 2600 if lvl == 2 else 1800), ts, 0.07 if lvl == 1 else 0.09, -0.35 if s % 2 else 0.35)
    t += BAR
    bar += 1

# ---------------------------------------------------------------- 1 · le couloir (0–3,8)
p.add(boom(1.6, 0.5), 0.1)
for i in range(5):  # les écrans se lèvent
    p.add(bell(midi(72 + [0, 3, 5, 7, 10][i]), 0.9), 0.35 + i * 0.42, 0.08, -0.6 + i * 0.3)
    p.add(whoosh(0.4, 5000), 0.2 + i * 0.42, 0.08, -0.6 + i * 0.3)
for i in range(0, len("Chez toi, ça dort."), 2):
    p.add(key_click(), 0.5 + i * 0.05, 0.16, -0.1)
for i in range(0, len("Ici, ça se vend."), 2):
    p.add(key_click(), 1.75 + i * 0.055, 0.16, 0.1)
p.add(riser(1.0), 2.9, 0.22)
p.add(whoosh(0.9), 3.7, 0.36)
p.add(boom(1.4, 0.9), 4.65)

# ---------------------------------------------------------------- 2 · Achète (4,8–9,6)
p.add(whoosh(0.5, 9000), 4.75, 0.2)
p.add(key_click(), 5.6, 0.42)
p.add(key_click(), 5.75, 0.42)
p.add(sparkle(3, 2794), 6.1, 0.16, 0.3)
p.add(whoosh(0.6, 6000), 6.05, 0.18, -0.2)
p.add(pop(700, 1300, 0.1), 7.0, 0.24)
p.add(tick(2800), 7.6, 0.2)
p.add(pop(450, 800, 0.1), 8.6, 0.28)
p.add(boom(0.8, 0.4), 8.62)
p.add(whoosh(0.5), 9.05, 0.26)

# ---------------------------------------------------------------- 3 · l'annonce trouvée (9,6–12,6)
p.add(zip_(0.6, 400, 2200), 9.6, 0.22)
p.add(tick(3200), 10.6, 0.22, -0.4)
p.add(tick(3400), 10.66, 0.22, 0.4)
p.add(bell(midi(84), 1.2), 10.95, 0.16, 0.3)
p.add(whoosh(0.5, 8000), 12.1, 0.26, -0.3)

# ---------------------------------------------------------------- 4 · Vends (12,6–19,4)
p.add(boom(1.2, 0.8), 12.75)
for i in range(5):  # les cartes sont distribuées
    p.add(whoosh(0.35, 6000), 12.8 + i * 0.18, 0.14, 0.5 - i * 0.2)
for i in range(5):  # la lumière saute d'étape en étape
    p.add(kalimba([65, 68, 72, 75, 77][i] + 12, 0.7), 14.4 + i * 0.5, 0.16, -0.5 + i * 0.25)
    p.add(tick(2600 + i * 200), 14.4 + i * 0.5, 0.12)
p.add(whoosh(0.7), 16.85, 0.28)
p.add(riser(0.9, 1800), 16.95, 0.22)
p.add(pop(380, 700, 0.12), 17.8, 0.3)
p.add(boom(1.8, 1.0), 17.85)
p.add(sparkle(5, 2349), 18.05, 0.26, 0.2)
p.add(bell(midi(84), 1.6), 18.1, 0.16)
p.add(whoosh(0.5), 18.95, 0.24)

# ---------------------------------------------------------------- 5 · Partage (19,4–23)
p.add(boom(1.2, 0.8), 19.55)
p.add(whoosh(0.7, 6000), 19.45, 0.24, -0.4)
for i in range(3):  # traînées vers lien, WhatsApp, Facebook
    p.add(zip_(0.45, 500 + i * 100, 2600 + i * 300), 20.35 + i * 0.25, 0.2, 0.2 + i * 0.2)
    p.add(pop(520 + i * 80, 940 + i * 80, 0.08), 20.75 + i * 0.25, 0.16, 0.5)
p.add(pop(800, 1500, 0.1), 21.55, 0.26, 0.6)
p.add(bell(midi(88), 1.0), 21.57, 0.14, 0.6)
p.add(whoosh(0.5), 22.5, 0.24)

# ---------------------------------------------------------------- 6 · Ta vitrine (23–26,4)
p.add(boom(1.2, 0.8), 23.15)
p.add(whoosh(1.3, 9000), 23.9, 0.22, -0.6)
for i in range(3):
    p.add(pop(500 + i * 60, 900 + i * 60, 0.08), 24.3 + i * 0.22, 0.2, -0.5 + i * 0.5)
p.add(whoosh(0.6), 25.9, 0.28)

# ---------------------------------------------------------------- 7 · logo (26,4–31)
p.add(zip_(0.6, 300, 1800), 26.5, 0.24)  # la poignée se trace
p.add(boom(2.2, 1.0), 26.95)
p.add(pop(380, 760, 0.12), 26.95, 0.3)
p.add(sparkle(5, 2637), 27.3, 0.26)  # le sourire
for i, m in enumerate((77, 80, 84)):
    p.add(kalimba(m, 1.2), 27.6 + i * 0.12, 0.18, -0.3 + i * 0.3)
p.add(pop(500, 900, 0.1), 28.45, 0.2)
p.add(bell(midi(77), 2.2), 28.9, 0.14)
fin = pad([41, 53, 56, 60, 65, 72], 4.4, 2000, attack=0.3)
p.add(fin, 26.9, 0.24, -0.2)
p.add(fin, 26.915, 0.24, 0.2)

p.master(sys.argv[1], fondu=29.4)
