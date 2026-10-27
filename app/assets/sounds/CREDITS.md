# Suoni: provenienza e licenze

Tutti i suoni dell'app vengono da campioni **CC0 1.0** (pubblico dominio): si possono usare, modificare e
pubblicare anche in un'app a pagamento sugli store, senza obbligo di citare l'autore. Li citiamo lo stesso.

I file in questa cartella li prepara `scripts/make-sounds.py` a partire dagli originali in `sorgenti/`
(taglio del silenzio in testa, coda sfumata, un po' di "panno" sulle carte, volumi livellati tra loro).
Per rifarli: `python3 scripts/make-sounds.py` dalla cartella `app/` (servono ffmpeg, numpy e scipy).

## Kenney, "Casino Audio" 1.1

- Autore: Kenney Vleugels, [kenney.nl](https://kenney.nl/assets/casino-audio)
- Licenza: CC0 1.0 ([testo](https://creativecommons.org/publicdomain/zero/1.0/)); il file di licenza
  originale è `sorgenti/kenney-casino/License.txt`: «You may use these assets in personal and commercial
  projects. Credit (Kenney or www.kenney.nl) would be nice but is not mandatory.»
- Copia usata: gli MP3 mono del pacchetto pubblicati in
  [github.com/Geksmode/riftbound-lab](https://github.com/Geksmode/riftbound-lab) (`riftbound/train/sfx/cartes/`,
  ramo `main`), insieme alla licenza originale. Il sito di Kenney non era raggiungibile dalla macchina di lavoro;
  se si vuole, si possono riscaricare gli originali OGG da kenney.nl e rimetterli in `sorgenti/kenney-casino/`.

| File dell'app | Campione |
| --- | --- |
| `card1.wav` … `card4.wav` (carta posata) | `card-place-1` … `card-place-4` |
| `deal1.wav` … `deal4.wav` (carta che arriva in mano) | `card-slide-1`, `-2`, `-3`, `-6` |
| `sweep1.wav` … `sweep3.wav` (presa) | `card-shove-1`, `-2`, `-4` |
| `shuffle.wav`, `shuffle-fast.wav` (mescolata) | `card-shuffle` (due riffle, rimontati sulla durata dell'animazione) |
| `coin1.wav` … `coin3.wav` (monete) | `chip-lay-1`, `-3`, `-2` |
| `buy.wav` (in parte) | `chip-lay-1`, `chip-lay-3` |

## UI SFX ("uisfx") 0.4.0

- Autore: Yuki Capital / Romain Simon, [uisfx.com](https://uisfx.com), [github.com/romainsimon/uisfx](https://github.com/romainsimon/uisfx)
- Licenza dell'audio: CC0 1.0 (`sorgenti/uisfx-organic/LICENSE-AUDIO`: «You may copy, modify, distribute,
  and use these files, including commercially, without asking permission. Attribution is appreciated but not
  required.»). Il codice del pacchetto è MIT, ma qui non ne usiamo il codice: solo i file audio.
- Copia usata: il pacchetto npm `uisfx@0.4.0` (shasum `6ca836e549bc762c544249bda9290f38dfee8c42`), cartelle
  `sounds/organic/` e `sounds/cinematic/`.

| File dell'app | Campione |
| --- | --- |
| `tick.wav` (tocco) | `organic/press` |
| `nope.wav` (mossa non valida) | `organic/invalid-drop` |
| `pts.wav` (punti) | `organic/checkpoint` |
| `whoosh.wav` (pannello) | `organic/swipe` |
| `buy.wav` (acquisto, con le monete di Kenney) | `organic/purchase` |
| `trophy.wav` (trofeo, medaglia) | `organic/level-up` |
| `win.wav` (vittoria) | `organic/achievement` |
| `scopa.wav` (scopa, cappotto) | `organic/bonus` |
| `arena.wav` (nuova arena) | `cinematic/achievement` |
