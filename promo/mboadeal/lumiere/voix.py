"""Voix off de MboaDeal « lumière » (prise ElevenLabs du 28 octobre 2026).

    python3 soundtrack.py rendus/bande-son.wav
    python3 voix.py rendus/voix-off.mp3 rendus/bande-son.wav rendus/bande-son-voix.wav
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "commun"))
from voixoff import mixer  # noqa: E402

# (texte, début dans la prise, fin, instant dans la vidéo, vitesse)
PHRASES = [
    ("Chez toi, ça dort…", 0.00, 1.48, 0.45, 1.0),
    ("Ici, ça se vend.", 1.75, 2.82, 2.00, 1.0),
    ("Achète.", 3.09, 3.66, 4.95, 1.0),
    ("Deux lettres, et la suite s'écrit toute seule.", 3.91, 5.99, 5.70, 1.0),
    ("La bonne affaire, près de chez toi.", 6.36, 7.99, 10.10, 1.0),
    ("Vends.", 8.30, 8.63, 12.75, 1.0),
    ("Cinq étapes.", 8.98, 9.85, 13.50, 1.0),
    ("Une photo, un prix, ta ville.", 10.02, 12.04, 14.60, 1.0),
    ("Publiée !", 12.27, 12.83, 18.15, 1.0),
    ("Partage.", 13.11, 13.71, 19.55, 1.0),
    ("Un lien, WhatsApp, Facebook.", 13.99, 15.95, 20.45, 1.0),
    ("Ta vitrine.", 16.18, 16.85, 23.15, 1.0),
    ("Ton profil, tes favoris, tes abonnés.", 17.12, 19.36, 24.00, 1.0),
    ("MboaDeal.", 19.59, 20.35, 27.55, 1.0),
    ("Achète, vends, donne une seconde vie.", 20.63, 22.95, 28.40, 1.0),
]

mixer(sys.argv[1], sys.argv[2], sys.argv[3], PHRASES)
