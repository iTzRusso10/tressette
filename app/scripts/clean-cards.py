"""Normalizes the 40 card scans: the originals are cut unevenly (a beige border on some sides only,
four cards 6 px shorter), so every card gets the same clean crop. Pure crop, no resampling: the cards
stay as sharp as the scans. The app draws the rounded corners and a hairline edge itself.

Originals in scansioni/, output in assets/cards/. Run with: python3 scripts/clean-cards.py
"""
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'scansioni')
OUT = os.path.join(ROOT, 'assets', 'cards')
INSET = 12  # removes the scanned border and the rounded corner on every side
W = 360 - 2 * INSET  # 336
H = round(W * 575 / 360)  # 537: same proportions as before

for i in range(40):
    im = Image.open(os.path.join(SRC, f'{i}.jpg')).convert('RGB')
    w, h = im.size
    top = (h - H) // 2
    out = im.crop((INSET, top, INSET + W, top + H))
    out.save(os.path.join(OUT, f'{i}.jpg'), quality=95, subsampling=0, optimize=True)
print(f'40 carte ritagliate a {W}x{H}')
