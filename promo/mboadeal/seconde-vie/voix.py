"""Voix off de « Ici, tout trouve preneur » (prise ElevenLabs du 28 octobre 2026).

    python3 soundtrack.py rendus/bande-son.wav
    python3 voix.py rendus/voix-off.mp3 rendus/bande-son.wav rendus/bande-son-voix.wav
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "commun"))
from voixoff import mixer  # noqa: E402

# (texte, début dans la prise, fin, instant dans la vidéo, vitesse)
PHRASES = [
    ("MboaDeal, achète, vends, donne une seconde vie.", 0.00, 3.42, 1.00, 1.0),
    ("Une robe portée une seule fois,", 3.84, 5.39, 4.60, 1.1),
    ("une manette oubliée sous le lit,", 5.72, 7.10, 6.20, 1.1),
    ("un canapé qui prend toute la place,", 7.41, 9.32, 7.65, 1.1),
    ("sur MboaDeal, tout trouve preneur.", 9.64, 11.56, 9.60, 1.0),
    ("Achète et vends près de chez toi, partout au Cameroun.", 11.81, 14.53, 11.75, 1.0),
    ("Publie ton annonce en cinq étapes,", 14.89, 16.65, 17.60, 1.0),
    ("des photos, un prix, ta ville", 16.85, 18.84, 20.20, 1.0),
    ("et c'est en ligne.", 19.14, 19.93, 23.25, 1.0),
    ("Tape deux lettres, MboaDeal devine la suite.", 20.26, 22.94, 24.75, 1.0),
    ("Annonces, catégories et même les membres.", 23.46, 25.87, 27.62, 1.0),
    ("Partage-la en un geste", 26.27, 27.61, 31.15, 1.0),
    ("et discute directement avec l'acheteur.", 27.74, 29.63, 33.85, 1.0),
    ("Au lancement, c'est gratuit.", 29.94, 31.41, 36.30, 1.0),
    ("Zéro franc pour publier,", 31.58, 32.94, 37.95, 1.0),
    ("zéro commission.", 32.98, 33.95, 39.50, 1.0),
    ("MboaDeal, achète, vends, donne une seconde vie.", 34.26, 37.70, 40.90, 1.0),
]

mixer(sys.argv[1], sys.argv[2], sys.argv[3], PHRASES)
