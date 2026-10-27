"""Voix off du teaser : découpe la prise ElevenLabs phrase par phrase, place chaque phrase sur
son moment de l'image et baisse la musique sous la voix (surtout dans les fréquences de la voix,
pour garder les impacts graves).

    python3 soundtrack.py rendus/bande-son-sous-voix.wav --voix
    python3 voix.py voix-off.mp3 rendus/bande-son-sous-voix.wav rendus/bande-son-voix.wav

Les positions dans la prise (début et fin de la parole, en secondes) valent pour la prise du
27 octobre 2026 ; une nouvelle prise demande de les relever à nouveau (silences, transcription).
"""
import subprocess
import sys
import wave

import numpy as np

SR = 48000

# (texte, début de la parole dans la prise, fin, instant où la phrase commence dans la vidéo)
PHRASES = [
    ("Ce que tu n'utilises plus… quelqu'un le cherche.", 0.000, 2.564, 0.35),
    ("Cherche.", 3.021, 3.500, 4.75),
    ("Une robe en wax ?", 3.982, 4.730, 5.55),
    ("Trouve.", 5.139, 5.520, 8.15),
    ("Les photos, le prix, la ville : tout est là.", 6.042, 8.608, 8.80),
    ("Et toi… qu'as-tu à vendre aujourd'hui ?", 9.184, 11.032, 11.62),
    ("Une photo, un titre, un prix.", 11.582, 13.401, 13.70),
    ("Cinq étapes simples…", 13.917, 14.832, 16.50),
    ("Publiée.", 15.319, 15.735, 19.00),
    ("Discute.", 16.176, 16.643, 19.80),
    ("Directement avec l'acheteur.", 16.977, 18.163, 20.60),
    ("La seconde main, simplement.", 18.606, 20.139, 23.00),
    ("Zuvo.", 20.566, 20.957, 26.60),
    ("La seconde vie de tes affaires.", 21.263, 22.654, 27.15),
    ("À toi de jouer.", 22.994, 23.798, 28.75),
]
PRE, POST = 0.08, 0.15  # marge gardée avant et après la parole (souffle, fin de mot)
DUCK_DB = -5.0  # baisse de toute la musique pendant la voix
DUCK_VOICE_BAND_DB = -13.0  # baisse de la musique entre 300 Hz et 4 kHz, où parle la voix
VOICE_RMS_DB = -17.0  # niveau moyen de la voix quand elle parle
MUSIC_RMS_DB = -17.5  # niveau moyen de la musique avant la baisse


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def filt(sig, lo=None, hi=None):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    mask = np.ones_like(f)
    if lo:
        mask *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        mask *= 1 / np.sqrt(1 + (f / hi) ** 4)
    return np.fft.irfft(spec * mask, len(sig))


def smooth(env, attack, release):
    out = np.empty_like(env)
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    y = 0.0
    for i, x in enumerate(env):
        c = a if x > y else r
        y = c * y + (1 - c) * x
        out[i] = y
    return out


take = filt(decode(sys.argv[1]), lo=80)
with wave.open(sys.argv[2], "rb") as f:
    music = np.frombuffer(f.readframes(f.getnframes()), np.int16).reshape(-1, 2).T / 32768
music *= 10 ** (MUSIC_RMS_DB / 20) / np.sqrt(np.mean(music**2))
n = music.shape[1]

voice = np.zeros(n)
active = np.zeros(n)
for text, start, end, at in PHRASES:
    a, b = int((start - PRE) * SR), int((end + POST) * SR)
    clip = take[max(a, 0) : min(b, len(take))].copy()
    fade_in, fade_out = int(0.01 * SR), int(0.06 * SR)
    clip[:fade_in] *= np.linspace(0, 1, fade_in)
    clip[-fade_out:] *= np.linspace(1, 0, fade_out)
    i = int((at - PRE) * SR)
    if i + len(clip) > n:
        sys.exit(f"« {text} » dépasse la fin de la vidéo")
    if np.any(active[i : i + len(clip)]):
        sys.exit(f"« {text} » chevauche la phrase précédente")
    voice[i : i + len(clip)] += clip
    active[int(at * SR) : int((at + end - start) * SR)] = 1

# Niveau de la voix (mesuré sur les passages parlés)
rms = np.sqrt(np.mean(voice[active > 0] ** 2))
voice *= 10 ** (VOICE_RMS_DB / 20) / rms

# La musique baisse un peu avant chaque phrase et remonte doucement après
ahead = int(0.12 * SR)
duck = np.concatenate([active[ahead:], np.zeros(ahead)])
duck = smooth(duck, 0.06, 0.35)
band = np.stack([filt(ch, lo=300, hi=4000) for ch in music])
rest = music - band

mix = rest * 10 ** (DUCK_DB * duck / 20) + band * 10 ** (DUCK_VOICE_BAND_DB * duck / 20) + voice
peak = np.max(np.abs(mix))
if peak > 0.9:
    mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.9
pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
with wave.open(sys.argv[3], "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(pcm.tobytes())
print(f"ok — {len(PHRASES)} phrases, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
