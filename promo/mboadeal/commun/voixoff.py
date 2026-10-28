"""Voix off des vidéos MboaDeal : découpe une prise ElevenLabs phrase par phrase, place chaque
phrase sur son moment de l'image (avec un léger accéléré si besoin, sans changer la hauteur de
la voix) et baisse la musique sous la voix, surtout dans les fréquences de la parole pour garder
les impacts graves.

Chaque phrase : (texte, début de la parole dans la prise, fin, instant dans la vidéo, vitesse).
Les positions dans la prise se relèvent sur les silences ; une nouvelle prise demande de les
relever à nouveau.
"""
import subprocess
import sys
import wave

import numpy as np

SR = 48000
PRE, POST = 0.06, 0.14  # marge gardée avant et après la parole (souffle, fin de mot)
DUCK_DB = -5.0  # baisse de toute la musique pendant la voix
DUCK_VOICE_BAND_DB = -13.0  # baisse de la musique entre 300 Hz et 4 kHz
VOICE_RMS_DB = -17.0  # niveau moyen de la voix quand elle parle
MUSIC_RMS_DB = -18.0  # niveau moyen de la musique avant la baisse


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def stretch(clip, speed):
    """Accéléré (ou ralenti) sans changer la hauteur (filtre atempo de ffmpeg)."""
    if abs(speed - 1) < 1e-3:
        return clip
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-af", f"atempo={speed}", "-f", "f32le", "-"],
        input=clip.astype(np.float32).tobytes(),
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


def mixer(prise, musique, sortie, phrases):
    take = filt(decode(prise), lo=80)
    with wave.open(musique, "rb") as f:
        music = np.frombuffer(f.readframes(f.getnframes()), np.int16).reshape(-1, 2).T / 32768
    music = music * 10 ** (MUSIC_RMS_DB / 20) / np.sqrt(np.mean(music**2))
    n = music.shape[1]

    voice = np.zeros(n)
    active = np.zeros(n)
    for text, start, end, at, speed in phrases:
        a, b = int((start - PRE) * SR), int((end + POST) * SR)
        clip = stretch(take[max(a, 0) : min(b, len(take))].copy(), speed)
        fade_in, fade_out = int(0.01 * SR), int(0.05 * SR)
        clip[:fade_in] *= np.linspace(0, 1, fade_in)
        clip[-fade_out:] *= np.linspace(1, 0, fade_out)
        i = int((at - PRE / speed) * SR)
        if i + len(clip) > n:
            sys.exit(f"« {text} » dépasse la fin de la vidéo")
        # Seule la parole compte : les marges (souffle, fondus) peuvent se recouvrir.
        s0, s1 = int(at * SR), int((at + (end - start) / speed) * SR)
        if np.any(active[s0:s1]):
            sys.exit(f"« {text} » chevauche la phrase précédente")
        voice[i : i + len(clip)] += clip
        active[s0:s1] = 1
        print(f"{at:6.2f} → {at + (end - start) / speed:6.2f}  {text}")

    rms = np.sqrt(np.mean(voice[active > 0] ** 2))
    voice *= 10 ** (VOICE_RMS_DB / 20) / rms

    # La musique baisse un peu avant chaque phrase et remonte doucement après
    ahead = int(0.12 * SR)
    duck = smooth(np.concatenate([active[ahead:], np.zeros(ahead)]), 0.06, 0.35)
    band = np.stack([filt(ch, lo=300, hi=4000) for ch in music])
    rest = music - band
    mix = rest * 10 ** (DUCK_DB * duck / 20) + band * 10 ** (DUCK_VOICE_BAND_DB * duck / 20) + voice
    peak = np.max(np.abs(mix))
    if peak > 0.9:
        mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.9
    pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
    with wave.open(sortie, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    print(f"{sortie} — {len(phrases)} phrases, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
