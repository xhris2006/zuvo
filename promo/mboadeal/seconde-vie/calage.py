"""Calage de l'image sur la voix off, lu dans `calage.js` (même source que la page) :
M(s) donne l'instant de la vidéo où passe le temps de scène s."""
import json
import os
import re

_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "calage.js"), encoding="utf-8").read()
DUREE = float(re.search(r"const duree = ([\d.]+);", _src).group(1))
_bloc = re.search(r"const points = \[(.*?)\n  \];", _src, re.S).group(1)
POINTS = json.loads("[" + ",".join(re.findall(r"\[[\d.]+, (?:[\d.]+|duree)\]", _bloc)).replace("duree", str(DUREE)) + "]")


def M(s):
    i = 0
    while i < len(POINTS) - 2 and s >= POINTS[i + 1][0]:
        i += 1
    (s0, t0), (s1, t1) = POINTS[i], POINTS[i + 1]
    return t0 + (s - s0) / (s1 - s0) * (t1 - t0)
