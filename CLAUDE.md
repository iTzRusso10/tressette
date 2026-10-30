# Napoletane: Tressette, Briscola, Scopa

Gioco di carte napoletane: un'app React Native con Expo (`app/`) che produce l'app iOS, l'app Android e il sito su GitHub Pages. L'obiettivo è pubblicarla sugli store come app seria. Si risponde e si scrive in italiano, commit compresi.

## Struttura (`app/`)

- `src/engine/`: il motore, TypeScript puro senza React. Regole, punteggi, regole della casa (`cards.ts`, `rules.ts`, `game.ts`) e computer (`ai.ts`). Ogni giocata (`play`) restituisce una lista di passi `{event, state}` che il tavolo anima uno alla volta.
- `src/state/table.ts`: il regista della partita. Mostra i passi con i tempi giusti, fa giocare il computer, aspetta il tocco, salva e riprende, collega l'online.
- `src/state/settings.ts`: impostazioni salvate (AsyncStorage).
- `src/game/`: il tavolo. `layout.ts` calcola la geometria e le posizioni delle carte (funzioni pure), `CardSprite.tsx` anima ogni carta con Reanimated, `Board.tsx` mette insieme panno, nomi, carte ed effetti.
- `src/online/`: stanze online. `room.ts` (host autorevole, si trasmettono solo le mosse e gli ospiti le rigiocano con il motore), `transport.ts` (in memoria per i test, tra schede con `?local`), `supabase.ts` (Supabase Realtime), `session.ts` (stato per le schermate).
- `src/meta/`: tutto quello che sta fuori dalla partita. `economy.ts` (monete, bonus giornaliero, livelli) e `progress.ts` (statistiche, trofei) sono funzioni pure condivise con il server; `profile.ts` è lo stato sul telefono; `sync.ts` lo allinea al server quando sei collegato; `auth.ts` (Apple, Google, Facebook), `friends.ts`, `stakes.ts` e `pot.ts` (posta online), `ads.ts` e `admob.native.ts` (video premio).
- `supabase/`: tabelle, regole di sicurezza e funzioni del server (vedi `supabase/README.md` per attivare tutti i servizi). Monete e trofei di chi è collegato li cambia solo il server, con le stesse regole di `src/meta`.
- Progressione (funzioni pure, condivise con il server): `balance.ts` (tutti i numeri modificabili), `ledger.ts` (il registro: stato del giocatore e ogni azione che lo cambia, eseguito identico su telefono e server), `arenas.ts` (30 arene in 5 capitoli, trofei, Leggenda), `levels.ts` (100 livelli e Prestigio), `achievements.ts` (183), `titles.ts` (60), `missions.ts`, `seasons.ts`, `sets.ts` (15), `catalog.ts` (40 tavolini, 60 panni, 60 dorsi più la Collezione Napoli di prima), `shop.ts` (offerta del giorno), `sources.ts` (da dove si ottiene ogni oggetto), `reqs.ts` (requisiti verificabili). `leaderboard.ts` legge le classifiche (trofei e stagione).
- `src/app/`: le schermate (Expo Router). `index.tsx` apre l'hub (`src/sections/Hub.tsx`): cinque sezioni a pagine orizzontali con la barra in basso — Negozio, Amici, **Gioca** (al centro, dove si apre l'app), Classifica, Trofei (arene e medaglie). `src/ui/`: tema, testo, componenti; `cosmetics.tsx` (anteprime di tavoli e dorsi), `ArenaScene.tsx` (illustrazioni delle arene), `ArenaReveal.tsx` (lo svelamento di una nuova arena).
- `assets/cards/`: le 40 scansioni (`0.jpg` … `39.jpg`) e il retro. `scripts/make-art.mjs` disegna retro, icona e splash; `scripts/make-sounds.py` genera i suoni.

## Carte

`c` va da 0 a 39: `suitOf(c) = c/10|0` (0 Coppe, 1 Denari, 2 Spade, 3 Bastoni) e `rankOf(c) = c%10 + 1` (8 Fante, 9 Cavallo, 10 Re). 16 è il Settebello, 30 l'Asso di bastoni.

## Regole della casa (non "correggerle")

- **Tressette a perdere:** si gioca in due o in quattro (`perdN`), ognuno per sé. L'Asso di bastoni vale 11 punti (`tz()` restituisce 33 terzi), quindi una mano vale 21. Si perde solo a 31 (`targetsFor`).
- **Cappotto:** vale solo a perdere; chi prende tutti i punti della mano, ultima compresa, vince subito. Si può disattivare.
- Sono coperte dai test in `src/engine/__tests__/`.

## Layout

- La geometria (`measure()`) dipende solo dallo schermo e dal tipo di partita: panno, nomi, mazzo e tabellone sono calcolati per la mano piena e non si spostano mai durante la mano.
- I nomi hanno larghezza fissa (`TAG_W`). Il mazzo (e la briscola, di traverso sotto il mazzo) sta fuori dal panno, in alto a destra; l'angolo sinistro è del tasto del menu.
- A Scopa ogni carta in tavola tiene il suo posto finché non viene presa (`assignSlots`).
- Dieci carte in mano stanno su due file da cinque: le napoletane non hanno gli indici negli angoli.

## Monete e premi

- I numeri sono tutti in `src/meta/balance.ts`. Si parte con 1000 monete. Prima vittoria del giorno 100, vittoria 15, sconfitta in una partita finita 5 (le partite abbandonate non danno niente). Bonus giornaliero da 100 a 500 (raddoppiabile con un video). Missioni giornaliere 30–100, settimanali 200–500, achievement 100–1000, capitolo completato 500, livelli, gradi di Prestigio e di Leggenda.
- Online si sceglie una posta (100, 500, 1000, 5000 o niente): pagano e incassano solo le persone, il piatto va a chi vince e il server paga solo quando la maggioranza dei giocatori conferma lo stesso risultato.

## Progressione: trofei, livelli, achievement, stagioni

- Quattro percorsi indipendenti che si premiano a vicenda. **Trofei** (`cups` nel codice): solo dalla **partita veloce**, +25 se vinci, −10 se perdi; +12/−5 quando al tavolo c'è un computer al posto di chi non si è trovato. Contro il computer, tra amici e in classificata niente trofei. **30 arene** in cinque capitoli, una ogni 100 trofei (0…2900); alcune avanzate chiedono un requisito (livello, vittorie contro l'Esperto, vittorie in tutti e tre i giochi). I trofei non si azzerano mai e non si scende sotto il primo trofeo dell'arena raggiunta. Dopo la trentesima, un grado di **Leggenda** ogni 200 trofei, senza fine. Un giocatore medio arriva in cima in circa 350–445 partite (`scripts/sim-trofei.py`).
- **Livello**: 100 livelli con esperienza crescente, poi gradi di **Prestigio** ogni 10.000 punti. **Achievement** (`trophies` nel codice e sul server per ragioni storiche): 183 in 16 categorie, bronzo/argento/oro/platino. **Titoli**: 60, ognuno con un requisito, si scelgono nella sezione Trofei. **Missioni**: 3 al giorno e 4 alla settimana, scelte con il seme del giocatore. **Stagioni**: 60 giorni, dalla prima del 2 novembre 2026; azzerano solo i punti stagione.
- **Cosmetici**: tavolino (la sponda), grafica del panno (la superficie) e dorso, liberamente combinabili; sei rarità; si ottengono dal negozio, dalle arene, dagli achievement, dai livelli, dalle stagioni, dai set, dagli eventi. Gli oggetti «in arrivo» aspettano un'illustrazione (`docs/asset-mancanti.md`, generato da `scripts/asset-mancanti.mjs`): si vedono ma non si comprano né si usano. Gli id degli oggetti in `owned` hanno il posto davanti (`felt:verde-smeraldo`); i vecchi id li converte `migrateCosmetics`.
- Ogni regola sta in `ledger.ts`: per cambiare un comportamento si cambia lì (e i test in `src/meta/__tests__/progression.test.ts`), poi si ripubblica la funzione `progress`. Nessun oggetto dà vantaggi in partita.
- Lo svelamento di una nuova arena aspetta che si lasci il tavolo.

## Le tre strade: partita veloce, classificata, computer

- **Partita veloce** (trofei e arene) e **classificata** (punteggio e leghe, dal livello 10) cercano avversari con il **matchmaking**; **contro il computer** è allenamento (monete, esperienza, missioni, achievement). Le **stanze con gli amici** restano come prima e non danno trofei né lega. Ogni partita ha la sua strada (`queue` in `MatchRecord`: `quick`, `ranked`, `cpu`, `friends`).
- **Coda** (`supabase/migrations/20261031000000_matchmaking.sql`): `mm_join` mette un biglietto, `mm_poll` (ogni 1,5 s) prova ad abbinare biglietti dello stesso gioco e modalità con punteggio vicino (trofei nella veloce, punteggio del gioco in classificata); la distanza accettata cresce con l'attesa. Nella veloce dopo 20 secondi i posti liberi li prende un **computer dichiarato** (trofei dimezzati); in classificata si aspetta una persona (dopo un minuto chiunque). Chi aspettava da più tempo apre la stanza (`openMmRoom`, posti già assegnati, parte da sola); gli altri entrano (`joinMmRoom`). Da soli con il computer si gioca in locale (`startMatch(cfg, tag)`).
- **Verifica**: la funzione `progress` chiede a `mm_report` se la partita esiste, se c'eri, se è durata abbastanza, se non l'hai già riferita e se non contraddice gli altri; gioco, avversari, la loro forza e il computer li dice il server. Uscire a metà conta come sconfitta (`forfeit`), salvo se ha chiuso chi teneva il tavolo.
- **Regole fisse** (`mmRules` in `online/matchmaking.ts`): Tressette a 21 con accusi (a perdere 31 con cappotto), Briscola a una mano (classificata: due), Scopa a 11.
- Telefono: `online/matchmaking.ts` (regole, coda tra schede con `?local`, `&mmcpu=3` per accorciare l'attesa), `online/mmServer.ts` (coda vera), `online/search.ts` (dalla coda al tavolo), `app/cerca.tsx` (la ricerca), `sections/PlayModes.tsx` (le tre strade nella home). Prova: `npm run check:mm`.

## Competizione e amici

- **Punteggio per gioco** (`rating.ts`): un Elo, solo in classificata, con la forza vera degli avversari (media dei loro punteggi, ricalcolata dal server), 10 partite di calibrazione, poi K=20. Non premia il volume: oltre la propria bravura le vittorie valgono zero. Sette **leghe** con i nomi delle monete napoletane, ognuna con la sua cornice; a fine stagione il punteggio torna a metà strada da 1000. Contro la stessa persona contano solo 3 partite al giorno. Separato dai trofei, che restano la progressione permanente. I punti stagione seguono i trofei (veloce) e il punteggio (classificata).
- **Classifiche** (`Classifica.tsx`): stagione (per gioco), settimana (prestazione da 5 partite, podio con premi) e trofei; tutti, amici, vicino a te.
- **Ricompense da riscuotere** (`meta.claims`): missioni, traguardi di stagione ed eventi, leghe, podi. Restano finché non le riscuoti, una volta sola (`meta.claimed`). Le missioni del giorno si possono cambiare una volta al giorno.
- **Eventi** (`events.ts`): un calendario di cinque settimane che si ripete, misurato sulle statistiche che ci sono già, tre traguardi e una cornice esclusiva. Niente valute nuove.
- **Profilo** (`profilo.tsx`, `giocatore/[id].tsx`): avatar (`avatars.ts`), cornice (posto `frame` del catalogo), vetrina di tre cose, statistiche e punteggio per gioco, leghe passate. Quello che vedono gli altri è `publicOf` (`ledger.ts`).
- **Achievement segreti**: 12, categoria «Segreti», si vede solo l'indizio finché non si scoprono.
- **Amici** (`Amici.tsx`, `state/social.ts`): ricerca per nome, richieste, chi è online, inviti alle stanze, sfide confermate dalla maggioranza. Niente chat libera: al tavolo online solo **reazioni veloci** (`reactions.ts`, frasi pronte con un limite, silenziabili).

## Qualità

- Carte sempre nitide: le carte si disegnano alla misura della mano e si rimpiccioliscono, mai ingrandite; nessun filtro. La carta si gira schiacciandola in orizzontale, senza 3D.
- Niente elementi che si muovono senza motivo. Movimento solo come risposta a quello che succede.
- Design "Tramonto": cielo arancio-rosa-viola (`gradients.sky`), pannelli di vetro bianco, panno smeraldo con bordo chiaro, un colore vivo per ogni giocatore (giallo per te, poi menta, azzurro, rosa). Carattere Sora ovunque. Colori, misure e ombre in `src/ui/theme.ts`, componenti in `src/ui/kit.tsx`.
- Animazioni con Reanimated sul thread grafico, solo a tempo con le curve e le durate di `src/ui/motion.ts`: ciò che arriva rallenta (`ease.in`), ciò che esce accelera (`ease.out`), l'uscita dura circa due terzi dell'entrata. **Niente molle, niente rimbalzi, niente oltre-e-ritorno, niente pulsazioni infinite** (solo i puntini "sta pensando"). Pulsanti che si schiacciano al tocco (`Squish`), punteggi che contano, coriandoli per Scopa, cappotto e vittoria (`Confetti`). Niente `Math.random` nel render: i coriandoli usano `seeded()`.
- A ogni mano il mazzo si mescola al centro del panno e le carte volano ai giocatori una alla volta (`T.shuffle`, `T.dealCard` in `table.ts`, prop `fresh`/`shuffle` di `CardSprite`), anche alla prima mano.
- Le scansioni originali stanno in `scansioni/`; `scripts/clean-cards.py` le rifila (bordo tolto, tutte 336×537) e le scrive in `assets/cards/`. Non toccare a mano le carte in `assets/`.
- Proporzioni: la mano piena non deve sovrastare il tavolo; i compagni laterali in quattro sono al 62% (`SIDE` in `layout.ts`) e restano dentro il panno, sotto i loro nomi.
- Per le modifiche al design si usano le regole della skill ui-ux-pro-max (github.com/nextlevelbuilder/ui-ux-pro-max-skill).

## Skill di ingegneria

In `.claude/` ci sono le Agent Skills di Addy Osmani (25 skill, checklist, comandi /spec /plan /build /test /review /ship e quattro agenti di revisione; vedi `.claude/skills/AGENT-SKILLS.md`). Valgono come metodo di lavoro; le regole di questo file (regole della casa, qualità visiva, design) vengono prima.

Accanto ci sono le 16 skill di Emil Kowalski su design e animazioni (vedi `.claude/skills/EMIL-SKILLS.md`): per l'app contano soprattutto `animate-expo`, `emil-design-eng`, `apple-design`, `review-animations`, `improve-animations`, `break-ui`. Anche qui le regole di questo file vengono prima: dove le skill suggeriscono molle, rimbalzi o oltre-e-ritorno, valgono le curve a tempo di `src/ui/motion.ts` (e i token di movimento di «Lampara»).

## Comandi (da `app/`)

```bash
npm run check            # tipi + lint + test (regole, partite simulate, online)
npm run export:web       # sito in dist/
npm run check:visual     # foto di tutte le modalità su 3 schermi in .visual/, e controllo che niente si sposti
npm run check:online     # due schede giocano online tra loro (?local), senza server
npm run check:hub        # foto delle cinque sezioni, delle tre strade, del profilo e dei pannelli su 3 schermi
npm run check:mm         # matchmaking tra schede (?local): ricerca, due persone allo stesso tavolo, computer dopo l'attesa
npm run check:db         # migrazioni e regole del server su un Postgres vero (supabase/tests)
```

Prima di chiudere una modifica visiva: `npm run export:web && npm run check:visual`, e guarda le foto delle 8 combinazioni (Tressette in 2, in 4, a perdere in 4 e in 2, Briscola in 2 e in 4, Scopa in 2 e in 4) a 393×852, 375×667 e 1280×800.

Expo cambia a ogni SDK: prima di usare un'API di Expo o React Native leggi la documentazione della versione installata (vedi `app/AGENTS.md`). Le dipendenze si aggiungono con `npx expo install`.
