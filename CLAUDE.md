# Napoletane: Tressette, Briscola, Scopa

Gioco di carte napoletane: un sito su GitHub Pages più un'app iOS e Android con Capacitor (`app/`). L'obiettivo è pubblicarla sugli store come app seria. Si risponde e si scrive in italiano, commit compresi.

## Una sola sorgente

- `index.html` contiene tutto il gioco: regole, computer, grafica e multiplayer PeerJS.
- `app/scripts/build-www.mjs` lo copia in `app/www`, toglie il service worker e aggiunge `app/src/native.js` (vibrazione, barra di stato, schermo acceso, tasto indietro, `intro.js`).
- Dopo una modifica al gioco: `cd app && npm run sync`. Non modificare `app/www`, che viene generata.
- Le immagini delle carte si cambiano in `carte/`. Se cambi un file, aumenta `?v=` in `faceHTML()` e `CACHE` in `sw.js`.

## Carte

`c` va da 0 a 39: `suitOf(c) = c/10|0` (0 Coppe, 1 Denari, 2 Spade, 3 Bastoni) e `rankOf(c) = c%10 + 1` (8 Fante, 9 Cavallo, 10 Re). 16 è il Settebello, 30 l'Asso di bastoni.

## Regole della casa (non "correggerle")

- **Tressette a perdere:** si gioca in due o in quattro (`cfg.perdN`). L'Asso di bastoni vale 11 punti (`tz()` restituisce 33 terzi), quindi una mano vale 21. Si perde solo a 31 (`targetsFor`).
- **Cappotto:** vale solo a perdere.

## Layout

La geometria è in `measure()`, `feltBox()`, `tagPos()`, `origin()`, `tableSlots()` e `layout()`.

- Nomi e panno sono calcolati per la mano piena (`handCount()`), così non si spostano durante la mano.
- I nomi hanno larghezza minima fissa e i puntini stanno sopra lo stato.
- Il mazzo (e la briscola) sta fuori dal panno, in alto a sinistra.

Prima di chiudere una modifica visiva, controlla con screenshot (Playwright) tutte le 7 modalità: Tressette in 2, in 4 e a perdere, Briscola in 2 e in 4, Scopa in 2 e in 4. Usa almeno 393×852, 375×667 e 1280×800.

## Qualità

- Carte sempre nitide: niente `filter` CSS né `will-change` sulle carte.
- Niente zoom e niente rimbalzi.
- Niente elementi che si muovono senza motivo.
