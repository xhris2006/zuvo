"""Calage de l'image sur la voix off, lu dans le calage.js d'une vidéo (même source que la
page) : M(s) donne l'instant de la vidéo où passe le temps de scène s."""
import json
import re


def charger(chemin):
    """Renvoie (durée, M) d'après `window.CALAGE = creerCalage(durée, [[scène, vidéo], …])`."""
    src = open(chemin, encoding="utf-8").read()
    appel = re.search(r"creerCalage\(\s*([\d.]+),\s*\[(.*)\]\s*\);", src, re.S)
    duree = float(appel.group(1))
    points = json.loads("[" + ",".join(re.findall(r"\[[\d.]+, [\d.]+\]", appel.group(2))) + "]")

    def M(s):
        i = 0
        while i < len(points) - 2 and s >= points[i + 1][0]:
            i += 1
        (s0, t0), (s1, t1) = points[i], points[i + 1]
        return t0 + (s - s0) / (s1 - s0) * (t1 - t0)

    return duree, M
