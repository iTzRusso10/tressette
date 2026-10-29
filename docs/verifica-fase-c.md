# Verifica della Fase C: «Lampara» sul ramo unito

Verifica indipendente del ramo `direzione-artistica` (B0 base, B1 arena, B2 profilo, B3 personalizzazione, B4 missioni, già uniti), fatta il 29 ottobre 2026 su `6c0dbea`. Ho giudicato solo quello che si vede e si misura: foto sui tre schermi, codice, prestazioni. Non ho letto i report degli agenti e non ho corretto codice.

Le foto citate stanno in `app/.visual/` (generate dagli script) e le più significative sono copiate in `app/.visual/verifica/` (la cartella non è nel repo).

---

## 1. Esito dei controlli

| Controllo | Esito | Note |
|---|---|---|
| `npm run check` | **passa** | tipi, lint, 214 test in 15 file |
| `npm run export:web` | **passa** | con `TMPDIR` privato |
| `npm run check:hub` | **passa** | «Tutto a posto: nessun errore» sui tre schermi |
| `node scripts/foto-lib.mjs arte` | **passa** | `/dev/arte`, riduci movimento fermo |
| `node scripts/foto-arena.mjs` | **fallisce (exit 1)** | 1ª volta: cerca `.visual/arena/prima/`, che non è nel repo, e si ferma con `ENOENT`. Ho rifatto le foto «prima» da `funzioni-social` (worktree temporanea, poi tolta): **58 foto su 58 identiche** (le altre 29 arene non cambiano), svelamento con i pulsanti a 2012 / 1992 / 2339 ms (≤ 2500), con riduci movimento stato finale subito, nessun coriandolo. Esce lo stesso con 1 per **40 errori di console** (vedi B-2) |
| `node scripts/foto-profilo.mjs` | **passa** | sul 375×667 sopra la piega: avatar 136 pt, nome, vetrina (fondo a 621 su 667) |
| `node scripts/foto-camerino.mjs` | **fallisce (exit 1)** | tutte le prove funzionali passano (provare non cambia `equipped`, «Usa», «Compra», rifiuto senza monete, «in arrivo» non provabile, fissi, riduci movimento); fallisce per **162 errori di console** (54 per schermo), vedi B-2 |
| `node scripts/foto-missioni.mjs` | **passa** | una busta: monete sparite a 634 ms; tre buste toccate in 32 ms: tutte riscosse; «Riscuoti tutto» con 7 buste: 1019 ms; miniatura in home 277 pt (prima 275); riduci movimento: nessun volo |
| `npm run check:visual` | **passa** | «nessun movimento e nessun errore» sulle 8 modalità × 3 schermi: il tavolo in partita non è cambiato |
| Confini | **rispettati** | `git diff funzioni-social...direzione-artistica --stat`: niente in `src/engine`, `src/state`, `src/online`, `supabase`, `src/meta`, `src/app/gioca`, `Gioca.tsx`, `GameTiles.tsx`, `Classifica.tsx`, `Hub.tsx`, `Summary.tsx`, `Board`/`layout`/`CardSprite`, `Felt.tsx`, `feltDesigns.ts`, `package.json`, `theme.ts`, `kit.tsx`, `motion.ts`. `_layout.tsx` ha solo i tre pesi di Bodoni (permesso a B0) |
| `Math.random` | **nessuno** | nei file nuovi o toccati compare solo nei commenti; particelle e storture usano `seeded()` |
| Riduci movimento | **fermo** nelle quattro aree | `controllaFermo` (stesso fotogramma a 1 s e 4 s) passa su arena, profilo (tuo e di un altro), personalizzazione con una mitica in prova, bacheca. Tutte le animazioni ambientali passano da `useAmbient` |
| Layout shift | **nessuno** | i `fisso-*` non si muovono tra 0,5 s e 3 s in tutti gli script, anche dopo una prova in `/personalizza` |
| Peso del sito | **fuori budget** | JS gzip 852 863 → 946 671 byte: **+93,8 KB** (budget di `tecnologie-grafica.md`: ≤ +60 KB). Trame 288 KB (budget 400), Bodoni 3 × 59 KB |

### Prestazioni (web, 393×852, DPR 2, CPU 4× più lenta, macchina con 2 CPU)

Cinque prove per caso, 3 s misurati dopo 2,5 s dall'apertura (script mio in scratchpad, stesso metodo di `perf-arena.mjs`).

| Schermata | p95 delle 5 prove (ms) | task lunghi | 
|---|---|---|
| `/arena/club-dei-signori` (vivo, polvere, tavolo) | 16,8 · 16,7 · 16,7 · 16,7 · 16,8 | 0 |
| `/profilo` (cornice epica «stelle», dorso epico in vetrina: due riflessi) | 16,7 · 16,8 · 16,8 · 16,8 · 16,8 | 0 |
| `/profilo` mentre si scorre | 16,8 · 16,7 · 16,7 · 16,8 · 16,7 | 0 |
| `/personalizza?posto=frame&id=lega-re` (mitica in prova) | 16,8 · 16,8 · 16,7 · 16,8 · 16,7 | 0 |
| `/missioni` | 16,7 · 16,8 · 16,8 · 16,7 · 16,7 | 0 |
| `/missioni` mentre si scorre | 16,7 · 16,7 · 16,7 · 16,7 · 16,7 | 0 |

Durante l'**apertura** (3 prove, misura dal primo `fisso-`): pronte in 2,8–3,1 s (arena), 3,3–3,5 s (profilo), 3,7–4,3 s (personalizza), 3,1–3,2 s (missioni), contro 3,4–4,3 s dell'hub di oggi. p95 sempre 16,8 ms, nessun task lungo; qualche fotogramma singolo da 50 ms (personalizza) e 100–117 ms (missioni) durante l'accensione, come l'hub (100 ms e un task da 95 ms). **Il budget p95 ≤ 20 ms è rispettato ovunque, con margine.** Non misurato: un telefono Android vero (SVG animati via `useAnimatedProps` costano di più sul nativo che sul web).

---

## 2. Problemi trovati

### Bloccanti (da correggere prima di dichiarare chiusa la Fase B)

**B-1 · Il riflesso della cornice nel profilo non segue più la cornice.**
`src/ui/profilo/VetrinaProfilo.tsx`, `anello()` (righe 109–122) ricava la corona circolare dal vecchio `look.style` del catalogo (raggi fissi 0,35/0,39/0,42), mentre B3 ora disegna le cornici con `foro` e `spessore` di `src/ui/arte/cornici.ts`. Calcolato a 152 pt (telefono) per tutte le 17 cornici da epica in su: la banda di luce o **entra nel disco dell'avatar** fino a 5,6 pt («stelle», «raggi», tutte le «evento-*» a stelle e piastrelle) o **lascia scoperti gli 8 pt interni del metallo e passa fuori, sul fondo**, come un alone fantasma («lega-oncia», «lega-piastra», «lega-ducato», «gemme», «evento-maestri», «evento-scopa», «evento-festa»). Si vede: `app/.visual/verifica/riflesso-profilo-fuori-sagoma.png` (1ª colonna «stelle» durante il passaggio: la banda copre il bordo del disco blu e sborda oltre le perline; 3ª colonna «lega-oncia»: alone grigio fuori dalle punte). È il difetto più visibile sull'oggetto eroe della schermata che deve far venire voglia di mostrarsi.
*Correzione*: nel profilo usare `AvatarCornice … vivo` (che ha già `RiflessoAnello` con la geometria giusta, `Rm = foro + spessore/2`) al posto di `PlayerAvatar` + `<Riflesso forma="path" d={anello(...)}>`, e togliere `anello()`. Il budget resta lo stesso (1 riflesso; per leggendario e mitico `AvatarCornice` aggiunge gemme e granelli: va ricontato con il riflesso della vetrina, oppure si passa un `vivo` ridotto).

**B-2 · Due script di verifica su cinque escono con 1 sul ramo unito.**
(a) `src/ui/arte/materiali.tsx`, `Bordi` (righe 238–268) disegna `<Rect width={w - 1}>`, `w - 3`, `w - 10.5` senza controllare la misura. Quando una schermata Lampara si apre sopra l'hub, le `Superficie` dell'hub nascosto (la `ClaimsCard` «Da riscuotere» e «Riscuoti tutto» di `HomeCards.tsx`) rimisurano 0×0 e producono 27 `<rect>` negativi = 54 errori di console a ogni apertura di `/missioni`, `/personalizza` (dal negozio) e `/arena/[id]` (dallo svelamento). Visivamente innocuo, ma inquina la console e fa fallire `foto-camerino.mjs` e `foto-arena.mjs`, cioè la rete di sicurezza della Fase D.
*Correzione*: in `Superficie` montare `Bordi` solo se `mis.w > 12 && mis.h > 12` (o ignorare gli `onLayout` a 0, tenendo l'ultima misura buona).
(b) `scripts/foto-arena.mjs` confronta con `.visual/arena/prima/`, che nessuno ha in un checkout pulito. *Correzione*: se manca, generarla da `funzioni-social` con una worktree (come ho fatto io) o saltare il confronto con un avviso invece di `ENOENT`.

**B-3 · «Esplora l'arena» porta su illustrazioni vecchie ingrandite a tutto schermo.**
`src/app/arena/[id].tsx` si apre per tutte le arene raggiunte (da Trofei, `src/sections/Trofei.tsx`) e dallo svelamento. Solo il Club ha la scena a piani: le altre 29 sono le illustrazioni piatte di prima, stirate a 393×852. Il caso peggiore è proprio il percorso più frequente: si sblocca la Sala di Cristallo, lo svelamento la presenta in una cornice d'ottone (accettabile, `06-svelamento-cristallo-telefono.png`), si tocca «Esplora l'arena» e si finisce su un lampadario enorme e tre archi vuoti, con il tavolo nascosto dietro la targa (`app/.visual/arena/svelamento-esplora-telefono.png`). La Piazza del Borgo diventa un campanile a tutta altezza e il nome si tronca in «La Piazza del Bor…» (`verifica/esplora-piazza-del-borgo-telefono.png`). Il momento-premio finisce sull'immagine più povera del gioco: è l'opposto di quello che chiede il brief §3 («quando sblocca una nuova arena deve percepire di aver raggiunto qualcosa di importante») e un «elemento provvisorio come risultato finale» (§11).
*Correzione*: finché un'arena non ha i piani (`src/ui/arte/arene.ts`), «Esplora» non c'è (nello svelamento resta solo «Continua»; in Trofei la scheda non si apre) oppure si apre la scena nella sua cornice 3:1 come nello svelamento, senza tutto schermo. Il nome in `misuraNome` deve scendere di corpo fino a stare in una riga invece di troncare.

### Importanti

**I-1 · Due prodotti, non uno.** Dentro le quattro aree Lampara è coerente; il gioco intero no. Dalla home Tramonto (cielo arancio-viola, pillole di vetro, `01-home-tramonto-telefono.png`) si entra nel Club bruno e d'ottone; la bacheca in miniatura di sughero sta su un fondo rosa-viola accanto a una scheda evento viola con un pulsante arancione (`10-home-bacheca-tramonto-telefono.png`); il negozio apre la scheda viola con «Prova sul tuo tavolo» in vetro lilla e «Compra» bianco (`11-negozio-scheda-tramonto-telefono.png`) e poi porta nel camerino scuro. Nella home la scena del Club ha ancora sopra il vecchio tavolino in anteprima, così si vedono due tavoli. Era previsto (§7 «Coerenza durante il prototipo»), ma oggi un utente percepisce **un gioco Tramonto con quattro stanze Lampara**. *Correzione*: è la Fase D, ma l'ordine conta: prima l'hub, la home (scheda dell'arena con `tavolo` passato ad `ArenaScene`, una riga in `Gioca.tsx` da concordare) e la scheda del negozio; poi il riepilogo. Decisione di Giuseppe §9.1 e §9.8.

**I-2 · La prossima arena delude.** Il Club (`04-arena-club-telefono.png`, `05-arena-club-desktop.png`) è il miglior lavoro del ramo: profondità, cono della lampada verde, luna fredda, tavolo equipaggiato dentro la sala. Ma l'arena 14, quella che il giocatore dell'arena 13 vede come prossimo traguardo, è un disegno pastello piatto (`06-svelamento-cristallo-telefono.png`, `app/.visual/arena/dev-arene-cap3-telefono.png`): la progressione visiva oggi **scende** dopo il Club. *Correzione*: in Fase D rifare per prime le due arene adiacenti al Club (12 e 14), poi una per capitolo, prima di qualsiasi altra estensione.

**I-3 · Testo falso nella personalizzazione.** `src/app/personalizza.tsx:120` scrive «Il tuo tavolo, come lo vedono gli altri.» (`08-personalizza-tavolini-telefono.png`, in basso). `publicOf` non contiene tavolino, panno e dorso (lo dice anche §9.3): gli altri non li vedono. *Correzione*: «Il tuo tavolo, com'è adesso.» finché Giuseppe non decide §9.3.

**I-4 · I tavolini non si distinguono abbastanza.** Nella scheda Tavolino tutte le miniature mostrano lo stesso panno blu con una sponda sottile: vetro e marmo sono due bordi bianchi quasi uguali, il legno si riconosce solo dalle borchie (`08-personalizza-tavolini-telefono.png`). Il brief §4 chiede che «le differenze fra legno, cuoio, vetro e metallo siano percepibili». Le cornici invece funzionano (`07-personalizza-leggendaria-telefono.png`). *Correzione* (`src/ui/cosmetics.tsx`, miniature in `GrigliaOggetti`): nella scheda Tavolino mostrare il tavolino in un panno neutro e più sponda (la sponda ≥ 14% del lato, con la trama del materiale: venatura del legno, grana del cuoio, due luci nette del vetro, vene del marmo) e un angolo in primo piano.

**I-5 · Tre pulsanti «indietro» e tre contatori di monete.** Profilo e bacheca: tondo di noce (`profilo/comuni.tsx Indietro`, `missioni.tsx Indietro`); personalizza: il `BackButton` grigio del kit; arena: un cerchio scuro con filo d'oro scritto a mano in `arena/[id].tsx`. Monete: pillola di noce (profilo), pillola scura con filo (personalizza), pillola scura con bordo d'oro (bacheca). Sono le prime cose che l'occhio confronta passando da una schermata all'altra (`02`, `07`, `09`, `04` in `verifica/`). *Correzione*: un `Indietro` e un `Borsellino` in `src/ui/arte/` (sposta quelli di `profilo/comuni.tsx`) usati da tutte e quattro le rotte.

**I-6 · JS oltre il budget.** +93,8 KB gzip contro +60 KB. Il grosso è nel bundle comune (`avatar.tsx` passa da 324 a 1273 righe, `materiali.tsx` 721, `scena.tsx` del Club 901). *Correzione*: caricare le scene a piani e il dettaglio delle cornici solo nelle rotte di vetrina (import dinamico o file di rotta), e verificare che `cornici.ts` non porti nel bundle comune geometrie usate solo sopra i 56 pt.

**I-7 · Le ricompense grandi non esistono ancora.** In Fase B c'è solo la misura piccola (monete che volano, timbro «Fatta», busta che diventa d'oro) e lo svelamento. La `Teca` di B0 non è usata da nessuna schermata reale; vittoria, achievement e oggetti rari passano ancora da `Summary.tsx`/`Overlays.tsx` Tramonto. Non è un difetto dei pacchetti (era fuori confine), ma il brief §7 ne fa «uno dei momenti più importanti». Va messo in testa alla Fase D insieme all'altro agente.

### Rifiniture

- **R-1** Collezione nel profilo «Cornici 4/27» (`profilo.tsx` conta solo `price > 0`) contro «Ne hai 4 su 28» nell'editor (`ProfileEditor.tsx:184`): stesso numero per tutte e due (`hub-telefono-profilo-sotto.png`, `hub-telefono-profilo-cornice.png`).
- **R-2** Nomi troncati: «Venezia al Tra…» nella targhetta della vetrina sul telefono (`02-profilo-telefono.png`), «Fiamma dell…», «Podio della s…», «Evento dei M…» nella griglia delle cornici (`07`). Ridurre il corpo a due righe o usare il nome breve.
- **R-3** Bacheca sul 375×667: la barra fissa «Riscuoti tutto» copre le buste dei biglietti del giorno (`missioni/bacheca-piccolo.png`); il brief vuole la ricompensa leggibile prima di completare. Un margine in fondo pari all'altezza della barra quando si apre, o la barra più bassa sul piccolo.
- **R-4** Il profilo di un altro mostra la sua arena vecchia come fondo: per Assunta (arena 22) un drappo rosso e nuvole viola dietro una cornice leggendaria d'oro (`03-profilo-altro-telefono.png`). Si risolve con I-2, ma finché le arene non sono rifatte conviene scurire di più il velo (oggi 40%) sulle scene non a piani.
- **R-5** Personalizza: con una cornice in prova la griglia apre scorsa a metà riga, con la riga sopra tagliata (`07`); allineare lo scorrimento all'inizio della riga della selezionata.
- **R-6** Esplora: «Trascina per guardarti intorno» c'è anche su desktop senza tocco; lì «Trascina con il mouse» o niente.
- **R-7** `scripts/misura-missioni.mjs` e il profilo di prova delle missioni dipendono da un file in `.visual/` scritto da un altro script: renderlo autonomo.

---

## 3. Domande del brief §10 Fase C

**Sembra un gioco mobile premium? — 6/10.** Le quattro aree sì, a un livello che il gioco prima non aveva: il Club a piani con la lampada verde (`04`, `05`), il profilo con la targa d'ottone, il cartiglio e la vetrina di velluto (`02`), la bacheca di sughero con biglietti, ceralacca e buste (`09`). Ma l'utente le raggiunge da una home Tramonto, ci torna dopo pochi tocchi, e dal Club passa a un'arena 14 in pastello piatto (`06`) o a una Piazza del Borgo ingrandita (`esplora-piazza-del-borgo-telefono.png`). Preso da solo, ogni pezzo Lampara vale 7–8; il prodotto oggi vale 6.

**I cosmetici hanno valore percepito? — 6/10.** Le cornici sì (8): la scala comune → mitica si legge anche senza colore, la «Corona» leggendaria ha una presenza nettamente superiore a «Oro sottile», la «Corona dei Re» mitica con il corallo e la conchiglia è un oggetto che si desidera (`07`, `camerino/cornici-*`). I tavolini no (5, I-4). Panni e dorsi sono belli ma statici e piccoli nella griglia; il dorso sul palco è una carta in un angolo, il panno sul palco funziona (`camerino/personalizza-panno-telefono.png`).

**Il profilo è abbastanza bello da volerlo mostrare? — 8/10.** È la schermata più riuscita insieme al Club: gerarchia chiara (chi sei → dove sei arrivato → cosa possiedi → i numeri), libro mastro su carta leggibile, medagliere con le medaglie vere (`hub-telefono-profilo-sotto.png`). Tolgono punti il riflesso fuori sagoma (B-1) e, per gli altri giocatori, lo sfondo d'arena vecchio (R-4).

**Le arene fanno venire voglia di raggiungere la successiva? — 5/10.** Il Club fa venire voglia di essere al Club. La successiva, oggi, è un passo indietro (I-2), e «Esplora» lo mette a tutto schermo (B-3). Lo svelamento in sé è ben costruito: velo, filetto, scena in cornice, sigilli dei capitoli, «14 di 30», pulsanti a 2 s (`06`, `arena/svelamento-club-0900-telefono.png`).

**Le ricompense sono soddisfacenti? — 5/10.** Le piccole sì: riscuotere è immediato, le monete volano al contatore in ~630 ms, se ne possono riscuotere tre in 32 ms, la busta d'oro e il timbro «Fatta» si capiscono al volo (`missioni/riscuoti-tutto-volo-telefono.png`). Ma non c'è ancora nessuna ricompensa grande (I-7): la teca non si vede mai, la vittoria è quella di prima.

**Le missioni sembrano parte di un gioco completo? — 8/10.** Sì: giornaliere, settimanali e speciali si distinguono per forma e misura (biglietto, locandina, manifesto), la ricompensa si legge prima di completare, gli stati sono chiari anche in scala di grigi (`09`, `missioni/bacheca-2-telefono.png`). Solo la miniatura in home stona sul fondo viola (`10`).

**Tutto è coerente? — 5/10.** Tra le quattro aree: stessa sala bruna, stessa luce dall'alto a sinistra, stessi materiali (ottone, noce, carta, velluto, ceralacca), Bodoni per i nomi e Sora per i dati: un utente le riconosce come lo stesso posto. Ma tre «indietro» e tre contatori diversi (I-5), il riflesso del profilo che non è quello delle cornici (B-1), e soprattutto il passaggio Tramonto ↔ Lampara a ogni navigazione (I-1).

**Le animazioni sono fluide? — 7/10.** Misurate: p95 16,7–16,8 ms ovunque, zero task lunghi, anche con due riflessi nel profilo e la mitica sul palco. Tempi e curve rispettano `motion.ts` (niente molle, niente rimbalzi; i cicli infiniti sono solo ambientali, lenti e dietro `useAmbient`). Un punto in meno perché il riflesso sbagliato del profilo è proprio l'animazione più in vista, e perché sul nativo non ho potuto misurare.

**La schermata resta leggibile? — 8/10.** Contrasti calcolati e testati (`contrasto.test.ts`), numeri in cifre tabellari, carte mai ingrandite, panno libero sul palco. Tolgono i nomi troncati (R-2, B-3) e le buste coperte dalla barra sul piccolo (R-3).

**Le prestazioni sono adeguate? — 8/10.** Sul web con CPU 4× sì, con margine (tabella §1). Restano fuori budget i +93,8 KB di JS (I-6) e manca una misura su un Android medio.

---

## 4. Verdetto

**La direzione Lampara è abbastanza convincente da estenderla: sì, ma non così come è ora, e non nell'ordine «altre schermate prima».** Le quattro aree non sono generiche né statiche: hanno materiali credibili, una luce sola, una gerarchia, una scala di rarità che si legge. Il Club, il profilo e la bacheca sono la prova che lo stile regge un gioco premium. Quello che oggi sembra «assemblato» è il prodotto intorno, non la direzione.

Prima della Fase D, nell'ordine:

1. Correggere i bloccanti B-1 (riflesso del profilo con `AvatarCornice vivo`), B-2 (`Bordi` a misura zero; `foto-arena` senza `prima/`) e B-3 («Esplora» solo dove la scena ha i piani, nome che non si tronca). Sono tre modifiche piccole.
2. Correggere I-3 (testo falso) e I-5 (un solo `Indietro` e un solo `Borsellino` in `src/ui/arte/`), e rientrare nel budget del JS (I-6).
3. Far decidere a Giuseppe §9.1 (Lampara nell'hub) e §9.3 (tavolo pubblico), guardando insieme `01`, `02`, `04`, `09` e `11` in `app/.visual/verifica/`.
4. Fase D in quest'ordine: hub, home e scheda del negozio (via il doppio mondo); la teca e il riepilogo della vittoria con l'altro agente (le ricompense grandi); le arene 12 e 14 a piani, poi una per capitolo; i tavolini nella griglia (I-4). Solo dopo, le altre schermate.

## Foto più rappresentative

- `app/.visual/verifica/04-arena-club-telefono.png`, `05-arena-club-desktop.png`: il livello a cui puntare
- `app/.visual/verifica/02-profilo-telefono.png`: il profilo come vetrina
- `app/.visual/verifica/07-personalizza-leggendaria-telefono.png`: cornice leggendaria in prova sul palco
- `app/.visual/verifica/09-missioni-telefono.png`: la bacheca del circolo
- `app/.visual/verifica/riflesso-profilo-fuori-sagoma.png`: B-1
- `app/.visual/arena/svelamento-esplora-telefono.png` e `app/.visual/verifica/esplora-piazza-del-borgo-telefono.png`: B-3
- `app/.visual/verifica/06-svelamento-cristallo-telefono.png`: la prossima arena (I-2)
- `app/.visual/verifica/01-home-tramonto-telefono.png`, `10-home-bacheca-tramonto-telefono.png`, `11-negozio-scheda-tramonto-telefono.png`: i due mondi (I-1)
- `app/.visual/verifica/08-personalizza-tavolini-telefono.png`: tavolini poco distinti e testo falso (I-3, I-4)
