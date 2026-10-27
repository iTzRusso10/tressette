"""Prepara i suoni dell'app in assets/sounds a partire dai campioni CC0 in assets/sounds/sorgenti.

Carte (posata, distribuzione, mescolata, presa) e monete sono registrazioni vere del pacchetto
"Casino Audio" di Kenney (CC0). Tic, errore, punti, vittoria, scopa, trofeo, arena, acquisto e
pannello vengono dal pacchetto npm "uisfx" 0.4.0 (audio CC0). Provenienza e licenze: assets/sounds/CREDITS.md.

Per ogni suono: taglio del silenzio in testa (il colpo cade nei primi millisecondi, così il suono
parte quando la carta tocca il panno), coda tagliata e sfumata, un po' di "panno" sulle carte
(meno acuti, un filo di corpo e una stanza piccolissima), volume normalizzato sulla sonorità
percepita (ponderazione K) con un tetto di picco a -1 dBFS. Uscita: WAV mono 16 bit a 44,1 kHz,
che iOS, Android e il web leggono senza decodifica e senza il ritardo d'innesco di mp3 e aac.

Uso (da app/): python3 scripts/make-sounds.py    (servono ffmpeg, numpy e scipy)
"""
import os
import subprocess
import wave

import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
SOUNDS = os.path.join(HERE, '..', 'assets', 'sounds')
SRC = os.path.join(SOUNDS, 'sorgenti')
rng = np.random.default_rng(7)

# Deve restare uguale a T.shuffle in src/state/table.ts (e 0.55 alla partita veloce).
SHUFFLE_MS = 560
FAST = 0.55
# Millisecondi tra l'inizio del file e il colpo della carta (HIT in src/ui/sfxTiming.ts).
HIT_MS = 5


def load(rel):
    """Decodifica un campione in float mono a 44,1 kHz."""
    out = subprocess.run(
        ['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', os.path.join(SRC, rel), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


def env(x, ms=1.0):
    n = max(1, int(SR * ms / 1000))
    k = len(x) // n
    return np.abs(x[: k * n]).reshape(k, n).max(axis=1)


def onset(x, frac=0.1, back_ms=15):
    """Il colpo principale: il picco, poi indietro finché l'inviluppo non scende sotto frac del picco."""
    e = env(x)
    p = int(e.argmax())
    i = p
    while i > 0 and p - i < back_ms and e[i - 1] > frac * e[p]:
        i -= 1
    return i * SR // 1000


def fade_in(x, ms):
    n = min(len(x), int(SR * ms / 1000))
    if n > 1:
        x[:n] *= np.sin(np.linspace(0, np.pi / 2, n)) ** 2
    return x


def fade_out(x, ms):
    n = min(len(x), int(SR * ms / 1000))
    if n > 1:
        x[-n:] *= np.cos(np.linspace(0, np.pi / 2, n)) ** 2
    return x


def cut(x, start, ms, pre_ms=HIT_MS, tail_ms=40):
    """Dal colpo (meno pre_ms di attacco) per ms millisecondi, con attacco e coda sfumati."""
    a = max(0, start - int(SR * pre_ms / 1000))
    y = x[a : a + int(SR * ms / 1000)].copy()
    fade_in(y, max(1.0, (start - a) * 1000 / SR))
    return fade_out(y, tail_ms)


def trim_tail(x, db=-55, tail_ms=30):
    """Toglie la coda sotto db rispetto al picco."""
    e = env(x)
    keep = np.nonzero(e > e.max() * 10 ** (db / 20))[0]
    end = min(len(x), (keep[-1] + 1) * SR // 1000 + int(SR * 0.01)) if len(keep) else len(x)
    return fade_out(x[:end].copy(), tail_ms)


def lead_trim(x, db=-45):
    """Toglie il silenzio in testa (sotto db rispetto al picco), lasciando 1 ms sfumato."""
    i = int(np.argmax(np.abs(x) > np.abs(x).max() * 10 ** (db / 20)))
    a = max(0, i - SR // 1000)
    return fade_in(x[a:].copy(), 1)


def lp(x, f, order=1):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


ROOM = None


def felt(x, body=0.35, air=0.55, room=0.06):
    """Carta su panno: meno acuti secchi, un filo di corpo sotto i 250 Hz, una stanza piccola (circa 70 ms)."""
    global ROOM
    if ROOM is None:
        t = np.arange(int(SR * 0.07)) / SR
        ir = rng.standard_normal(len(t)) * np.exp(-t / 0.018)
        ir = lp(hp(ir, 300), 4500)
        ROOM = ir / np.sqrt(np.sum(ir**2))
    dry = x + body * lp(x, 250, 2)
    soft = air * dry + (1 - air) * lp(dry, 5500, 2)
    wet = np.convolve(soft, ROOM)[: len(soft)]
    return soft + room * wet


# Ponderazione K (ITU-R BS.1770): filtro "testa" (mensola alta +4 dB) e passa-alto RLB.
def _biquad_shelf(f0, gain_db, q):
    a = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    c = np.cos(w)
    b = [a * ((a + 1) + (a - 1) * c + 2 * np.sqrt(a) * al), -2 * a * ((a - 1) + (a + 1) * c), a * ((a + 1) + (a - 1) * c - 2 * np.sqrt(a) * al)]
    d = [(a + 1) - (a - 1) * c + 2 * np.sqrt(a) * al, 2 * ((a - 1) - (a + 1) * c), (a + 1) - (a - 1) * c - 2 * np.sqrt(a) * al]
    return np.array(b) / d[0], np.array(d) / d[0]


def _biquad_hp(f0, q):
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    c = np.cos(w)
    b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    d = [1 + al, -2 * c, 1 - al]
    return np.array(b) / d[0], np.array(d) / d[0]


def loudness(x):
    """Sonorità percepita: RMS ponderato K sulla finestra di 100 ms più forte, in dB."""
    b, a = _biquad_shelf(1681.97, 4.0, 0.7071)
    y = lfilter(b, a, x)
    b, a = _biquad_hp(38.13, 0.5003)
    y = lfilter(b, a, y)
    w = int(SR * 0.1)
    if len(y) <= w:
        return 10 * np.log10(np.mean(y**2) + 1e-12) - 0.691
    c = np.convolve(y**2, np.ones(w) / w, 'valid')
    return 10 * np.log10(c.max() + 1e-12) - 0.691


def limit(x, ceil, max_gr_db=10.0, release_ms=25.0):
    """Limitatore con 1,5 ms di anticipo: schiaccia solo le punte del colpo (al massimo max_gr_db)."""
    la = int(SR * 0.0015)
    e = np.abs(x)
    # Massimo su una finestra centrata: la riduzione comincia prima della punta.
    from scipy.ndimage import maximum_filter1d

    pk = maximum_filter1d(e, size=2 * la + 1)
    want = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    want = np.maximum(want, 10 ** (-max_gr_db / 20))
    g = np.empty_like(want)
    r = np.exp(-1 / (SR * release_ms / 1000))
    cur = 1.0
    for i, w in enumerate(want):
        cur = w if w < cur else w + (cur - w) * r
        g[i] = cur
    return x * g


def level(x, target, peak_db=-1.0):
    """Porta la sonorità a target; le punte sopra peak_db le prende il limitatore, il resto un'attenuazione."""
    lim = 10 ** (peak_db / 20)
    y = x * 10 ** ((target - loudness(x)) / 20)
    if np.abs(y).max() > lim:
        y = limit(y, lim * 0.98)
        # Il limitatore toglie un po' di sonorità: un secondo passaggio la riporta a target.
        y = limit(y * 10 ** ((target - loudness(y)) / 20), lim * 0.98)
    pk = np.abs(y).max()
    if pk > lim:
        y *= lim / pk
    return y


def mix(*parts):
    """Somma (segnale, inizio in ms, guadagno)."""
    n = max(int(SR * at / 1000) + len(s) for s, at, _ in parts)
    out = np.zeros(n)
    for s, at, g in parts:
        i = int(SR * at / 1000)
        out[i : i + len(s)] += s * g
    return out


written = []


def write(name, x, target):
    x = level(x, target)
    os.makedirs(SOUNDS, exist_ok=True)
    data = np.clip(np.round(x * 32767), -32768, 32767).astype(np.int16)
    with wave.open(os.path.join(SOUNDS, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    written.append(name)
    print(f'{name:14s} {len(x) * 1000 / SR:5.0f} ms  sonorità {loudness(x):6.1f} dB  picco {20 * np.log10(np.abs(x).max()):5.1f} dBFS')


# ------------------------------------------------------------------ carte

K = 'kenney-casino/'

# Carta posata: quattro prese diverse, il colpo a HIT_MS dall'inizio.
for i, n in enumerate(['card-place-1', 'card-place-2', 'card-place-3', 'card-place-4'], 1):
    x = load(K + n + '.mp3')
    write(f'card{i}', felt(cut(x, onset(x), 230, tail_ms=70)), -19.5)

# Distribuzione: lo scivolare corto di una carta che arriva in mano, più leggero della carta giocata.
for i, n in enumerate(['card-slide-1', 'card-slide-2', 'card-slide-3', 'card-slide-6'], 1):
    x = load(K + n + '.mp3')
    write(f'deal{i}', felt(lp(cut(x, onset(x), 140, tail_ms=60), 7000), air=0.4), -23)

# Presa: le carte raccolte e spinte verso chi prende. Parte con il movimento.
for i, n in enumerate(['card-shove-1', 'card-shove-2', 'card-shove-4'], 1):
    x = load(K + n + '.mp3')
    write(f'sweep{i}', felt(cut(x, onset(x), 420, pre_ms=8, tail_ms=160), body=0.2), -20)


# Mescolata: due riffle veri, ognuno finisce quando le due metà del mazzo si richiudono
# (CardSprite: dividi, richiudi, dividi, richiudi, ognuno lungo T.shuffle/4).
def riffles(x):
    e = np.convolve(env(x), np.ones(10) / 10, 'same')
    peaks = []
    for i in np.argsort(e)[::-1]:
        if e[i] < e.max() * 0.4:
            break
        if all(abs(i - p) > 300 for p in peaks):
            peaks.append(int(i))
    return sorted(peaks)


def shuffle(total_ms):
    x = load(K + 'card-shuffle.mp3')
    peaks = riffles(x)
    step = total_ms / 4
    parts = []
    for k, at in enumerate([2 * step - 12, 4 * step - 12]):
        p = peaks[k]
        # Ogni riffle dura quanto il suo "dividi e richiudi" e finisce quando il mazzo si richiude;
        # il primo comincia con l'animazione, quindi il file parte insieme alla mescolata.
        a = max(0.0, p - 2 * step + 12)
        seg = x[int(SR * a / 1000) : int(SR * (p + 70) / 1000)].copy()
        fade_in(seg, 25)
        fade_out(seg, 50)
        parts.append((seg, at - (p - a), 1.0 if k else 0.85))
    y = felt(mix(*parts), body=0.15, air=0.7)
    return fade_in(y, 1)


write('shuffle', shuffle(SHUFFLE_MS), -20)
write('shuffle-fast', shuffle(SHUFFLE_MS * FAST), -20)

# ------------------------------------------------------------------ monete

for i, n in enumerate(['chip-lay-1', 'chip-lay-3', 'chip-lay-2'], 1):
    x = load(K + n + '.mp3')
    write(f'coin{i}', lp(cut(x, onset(x), 160, pre_ms=2, tail_ms=50), 9000), -21)

# ------------------------------------------------------------------ interfaccia e premi

U = 'uisfx-organic/'

# Tic: il colpetto di legno, cortissimo e basso di volume.
write('tick', trim_tail(lead_trim(load(U + 'press.ogg'))[: int(SR * 0.12)], tail_ms=60), -30)

# Errore: due note di legno basse e morbide.
write('nope', trim_tail(lead_trim(load(U + 'invalid-drop.ogg'))[: int(SR * 0.45)], tail_ms=120), -24)

# Punti: due note che salgono.
write('pts', trim_tail(lead_trim(load(U + 'checkpoint.ogg')), tail_ms=120), -19)

# Pannello: un fruscio leggero.
write('whoosh', trim_tail(lead_trim(load(U + 'swipe.ogg'))[: int(SR * 0.34)], tail_ms=120), -27)

# Acquisto: due monete sul tavolo e la conferma.
chip1 = load(K + 'chip-lay-1.mp3')
chip3 = load(K + 'chip-lay-3.mp3')
buy = mix(
    (lead_trim(load(U + 'purchase.ogg')), 0, 1.0),
    (cut(chip1, onset(chip1), 150, pre_ms=1), 0, 0.35),
    (cut(chip3, onset(chip3), 150, pre_ms=1), 85, 0.3),
)
write('buy', trim_tail(buy, tail_ms=150), -17)

# Trofeo: tre note che salgono.
write('trophy', trim_tail(lead_trim(load(U + 'level-up.ogg')), tail_ms=200), -16)

# Vittoria: un arpeggio di quattro note, breve.
write('win', trim_tail(lead_trim(load(U + 'achievement.ogg')), tail_ms=250), -14)

# Scopa: tre note che salgono con il salto d'ottava, più presenti dei punti. Niente colpo di carta:
# quando si sente, la carta è già sul panno e le carte prese stanno volando via.
write('scopa', trim_tail(lead_trim(load(U + 'bonus.ogg')), tail_ms=220), -13)

# Arena nuova: la versione piena e profonda dell'arpeggio.
write('arena', trim_tail(lead_trim(load('uisfx-cinematic/achievement.ogg')), tail_ms=300), -13)

# I vecchi suoni sintetici a un solo file sono sostituiti dalle varianti numerate.
for old in ['card', 'deal', 'sweep']:
    p = os.path.join(SOUNDS, old + '.wav')
    if os.path.exists(p):
        os.remove(p)

print(len(written), 'file in', os.path.normpath(SOUNDS))
