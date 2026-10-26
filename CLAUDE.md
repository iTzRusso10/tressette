# Napoletane: Tressette, Briscola, Scopa

Gioco di carte napoletane: un'app React Native con Expo (`app/`) che produce l'app iOS, l'app Android e il sito su GitHub Pages. L'obiettivo è pubblicarla sugli store come app seria. Si risponde e si scrive in italiano, commit compresi.

## Struttura (`app/`)

- `src/engine/`: il motore, TypeScript puro senza React. Regole, punteggi, regole della casa (`cards.ts`, `rules.ts`, `game.ts`) e computer (`ai.ts`). Ogni giocata (`play`) restituisce una lista di passi `{event, state}` che il tavolo anima uno alla volta.
- `src/state/table.ts`: il regista della partita. Mostra i passi con i tempi giusti, fa giocare il computer, aspetta il tocco, salva e riprende, collega l'online.
- `src/state/settings.ts`: impostazioni salvate (AsyncStorage).
- `src/game/`: il tavolo. `layout.ts` calcola la geometria e le posizioni delle carte (funzioni pure), `CardSprite.tsx` anima ogni carta con Reanimated, `Board.tsx` mette insieme panno, nomi, carte ed effetti.
- `src/online/`: stanze online. `room.ts` (host autorevole, si trasmettono solo le mosse e gli ospiti le rigiocano con il motore), `transport.ts` (in memoria per i test, tra schede con `?local`), `supabase.ts` (Supabase Realtime), `session.ts` (stato per le schermate).
- `src/app/`: le schermate (Expo Router). `src/ui/`: tema, testo, componenti.
- `assets/cards/`: le 40 scansioni (`0.jpg` … `39.jpg`) e il retro. `scripts/make-art.mjs` disegna retro, icona e splash; `scripts/make-sounds.py` genera i suoni.

## Carte

`c` va da 0 a 39: `suitOf(c) = c/10|0` (0 Coppe, 1 Denari, 2 Spade, 3 Bastoni) e `rankOf(c) = c%10 + 1` (8 Fante, 9 Cavallo, 10 Re). 16 è il Settebello, 30 l'Asso di bastoni.

## Regole della casa (non "correggerle")

- **Tressette a perdere:** si gioca in due o in quattro (`perdN`), ognuno per sé. L'Asso di bastoni vale 11 punti (`tz()` restituisce 33 terzi), quindi una mano vale 21. Si perde solo a 31 (`targetsFor`).
- **Cappotto:** vale solo a perdere; chi prende tutti i punti della mano, ultima compresa, vince subito. Si può disattivare.
- Sono coperte dai test in `src/engine/__tests__/`.

## Layout

- La geometria (`measure()`) dipende solo dallo schermo e dal tipo di partita: panno, nomi, mazzo e tabellone sono calcolati per la mano piena e non si spostano mai durante la mano.
- I nomi hanno larghezza fissa (`TAG_W`). Il mazzo (e la briscola) sta fuori dal panno, in alto a sinistra.
- A Scopa ogni carta in tavola tiene il suo posto finché non viene presa (`assignSlots`).
- Dieci carte in mano stanno su due file da cinque: le napoletane non hanno gli indici negli angoli.

## Qualità

- Carte sempre nitide: le carte si disegnano alla misura della mano e si rimpiccioliscono, mai ingrandite; nessun filtro. La carta si gira schiacciandola in orizzontale, senza 3D.
- Niente elementi che si muovono senza motivo. Movimento solo come risposta a quello che succede.
- Design "Gran Caffè": velluto verde, ottone, marmo; Bodoni Moda solo in grande (titoli, punteggi, momenti), Figtree per il resto. Colori e misure in `src/ui/theme.ts`.

## Comandi (da `app/`)

```bash
npm run check            # tipi + lint + test (regole, partite simulate, online)
npm run export:web       # sito in dist/
npm run check:visual     # foto di tutte le modalità su 3 schermi in .visual/, e controllo che niente si sposti
npm run check:online     # due schede giocano online tra loro (?local), senza server
```

Prima di chiudere una modifica visiva: `npm run export:web && npm run check:visual`, e guarda le foto delle 8 combinazioni (Tressette in 2, in 4, a perdere in 4 e in 2, Briscola in 2 e in 4, Scopa in 2 e in 4) a 393×852, 375×667 e 1280×800.

Expo cambia a ogni SDK: prima di usare un'API di Expo o React Native leggi la documentazione della versione installata (vedi `app/AGENTS.md`). Le dipendenze si aggiungono con `npx expo install`.
