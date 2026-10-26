"""Renders the app's sound effects to WAV files in assets/sounds.

Placeholders until recorded sounds replace them: soft card snaps, a sweep, small bell tones.
Run with: python3 scripts/make-sounds.py
"""
import os
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)


def t(dur):
    return np.arange(int(SR * dur)) / SR


def band(x, lo, hi):
    sos = butter(2, [lo, hi], btype='band', fs=SR, output='sos')
    return sosfilt(sos, x)


def noise_burst(dur, lo, hi, curve=2.4):
    n = len(t(dur))
    env = (1 - np.arange(n) / n) ** curve
    return band(rng.uniform(-1, 1, n), lo, hi) * env


def bell(f, dur, vol=1.0):
    x = t(dur)
    env = np.exp(-x * 5.5) * np.minimum(1, x / 0.004)
    # Brass-like: fundamental, a bright octave, a slightly inharmonic partial.
    s = np.sin(2 * np.pi * f * x) + 0.45 * np.sin(2 * np.pi * 2 * f * x) + 0.18 * np.sin(2 * np.pi * 2.76 * f * x)
    return s * env * vol


def place(buf, sig, at):
    i = int(at * SR)
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]
    return buf


def write(name, sig, gain=0.8):
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * gain
    # Short fade out against clicks.
    f = min(len(sig), int(0.004 * SR))
    sig[-f:] *= np.linspace(1, 0, f)
    data = (sig * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print('scritto', name)


# A card landing on felt: a papery snap and a soft thud.
card = place(noise_burst(0.09, 1500, 4200), 0.6 * noise_burst(0.06, 120, 420, 3), 0)
write('card', card, 0.55)

# Dealing: a quick run of small snaps.
deal = np.zeros(int(SR * 1.0))
for i in range(10):
    place(deal, noise_burst(0.05, 2000, 4500) * (0.8 + 0.2 * rng.random()), i * 0.085)
write('deal', deal, 0.45)

# Collecting a trick: cards sliding together.
x = t(0.32)
sw = rng.uniform(-1, 1, len(x))
sw = band(sw, 600, 3800) * np.sin(np.pi * x / x[-1]) ** 1.5
write('sweep', sw, 0.4)

write('tick', bell(1760, 0.07) * 0.6, 0.25)

pts = np.zeros(int(SR * 0.5))
place(pts, bell(880, 0.4), 0)
place(pts, bell(1318.5, 0.4) * 0.8, 0.07)
write('pts', pts, 0.5)

scopa = np.zeros(int(SR * 0.9))
for i, f in enumerate([659.3, 880, 1108.7, 1318.5]):
    place(scopa, bell(f, 0.7), i * 0.06)
place(scopa, noise_burst(0.3, 500, 3000) * 0.5, 0)
write('scopa', scopa, 0.6)

# A muted knock: you cannot play that card.
x = t(0.12)
nope = place(np.sin(2 * np.pi * 150 * x) * np.exp(-x * 30), 0.4 * noise_burst(0.12, 100, 400, 4), 0)
write('nope', nope, 0.5)

win = np.zeros(int(SR * 1.4))
for i, f in enumerate([523.3, 659.3, 784, 1046.5, 1318.5]):
    place(win, bell(f, 0.8), i * 0.11)
write('win', win, 0.6)
