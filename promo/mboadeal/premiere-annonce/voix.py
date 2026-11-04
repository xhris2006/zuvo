"""Voix off de « Fais comme Adrien » (prise ElevenLabs du 1er novembre 2026).

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
    ("Ding ! Une nouvelle annonce sur MboaDeal !", 0.00, 2.67, 1.10, 1.0),
    ("Adrien l'a fait !", 2.80, 4.19, 4.75, 1.0),
    ("La toute première annonce de MboaDeal ! Des Amiri, taille 40 à 43, à treize mille francs", 4.32, 9.72, 6.30, 1.0),
    ("à Yaoundé.", 9.86, 10.46, 11.84, 1.0),
    ("Tu publies,", 10.65, 11.43, 13.15, 1.0),
    ("tes abonnés sont prévenus.", 11.62, 12.64, 14.12, 1.0),
    ("À ton tour !", 12.79, 13.51, 17.00, 1.0),
    ("Appuie sur plus,", 13.65, 14.78, 17.86, 1.0),
    ("tes photos, la description, la catégorie, le prix et la ville,", 14.92, 18.77, 19.15, 1.0),
    ("tu vérifies", 19.05, 19.67, 23.28, 1.0),
    ("et c'est publié.", 19.85, 20.56, 24.08, 1.0),
    ("Pour le lancement, c'est gratuit !", 20.95, 22.40, 25.95, 1.0),
    ("Zéro franc pour publier, zéro commission.", 22.53, 24.97, 27.55, 1.0),
    ("Fais comme Adrien !", 25.15, 26.09, 30.95, 1.0),
    ("Publie ta première annonce sur MboaDeal.", 26.28, 28.59, 32.08, 1.0),
]

mixer(sys.argv[1], sys.argv[2], sys.argv[3], PHRASES)
