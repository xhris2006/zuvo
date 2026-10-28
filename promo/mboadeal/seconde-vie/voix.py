"""Voix off de « Ici, tout trouve preneur » (prise ElevenLabs du 28 octobre 2026, voix d'Ellen).

    python3 soundtrack.py rendus/bande-son.wav
    python3 voix.py rendus/voix-off.mp3 rendus/bande-son.wav rendus/bande-son-voix.wav
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "commun"))
from voixoff import mixer  # noqa: E402

# (texte, début dans la prise, fin, instant dans la vidéo, vitesse). Les instants sont ceux
# du calage (`calage.js`) : l'image suit la voix.
PHRASES = [
    ("MboaDeal.", 0.00, 0.90, 1.30, 1.0),
    ("Achète, vends.", 1.32, 2.32, 2.62, 1.0),
    ("Donne une seconde vie à tes affaires.", 2.72, 4.30, 4.02, 1.0),
    ("Une robe portée une seule fois,", 4.72, 6.27, 6.02, 1.0),
    ("une manette oubliée sous le lit,", 6.67, 7.99, 7.97, 1.0),
    ("un canapé qui prend trop de place.", 8.38, 10.20, 9.68, 1.0),
    ("Ici, tout trouve preneur.", 10.54, 12.09, 11.84, 1.0),
    ("Achète et vends près de chez toi, partout au Cameroun.", 12.46, 15.19, 13.76, 1.0),
    ("Ton annonce en cinq étapes.", 15.58, 17.05, 17.88, 1.0),
    ("Tes photos,", 17.42, 18.05, 19.60, 1.0),
    ("la description,", 18.37, 19.16, 20.65, 1.0),
    ("la catégorie,", 19.49, 20.33, 21.75, 1.0),
    ("le prix et la ville.", 20.63, 21.89, 22.90, 1.0),
    ("Tu vérifies et c'est publié.", 22.21, 23.95, 24.50, 1.0),
    ("Pas besoin de trop réfléchir pour trouver ce que tu veux.", 24.41, 26.73, 26.51, 1.0),
    ("T'as des annonces, toutes les catégories et les membres de ta communauté sur une seule interface.", 27.10, 32.08, 29.14, 1.0),
    ("Partage-la en un geste", 32.44, 33.71, 34.94, 1.0),
    ("et discute directement.", 33.95, 35.13, 36.45, 1.0),
    ("Pour son lancement, tout est gratuit.", 35.52, 37.25, 38.42, 1.0),
    ("Zéro franc pour publier une annonce", 37.56, 39.32, 40.46, 1.0),
    ("et zéro pour cent de commission sur tes ventes.", 39.55, 41.51, 42.45, 1.0),
    ("Et toi, qu'attends-tu ?", 41.89, 43.01, 45.09, 1.0),
    ("Fais tes affaires avec le sucre aux dents, mon ami.", 43.33, 45.37, 46.53, 1.0),
    ("Découvre MboaDeal.", 45.63, 46.90, 48.83, 1.0),
]

mixer(sys.argv[1], sys.argv[2], sys.argv[3], PHRASES)
