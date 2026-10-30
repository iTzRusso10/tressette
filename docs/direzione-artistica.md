# Direzione artistica: «Lampara»

Fase A del lavoro chiesto da Giuseppe (brief del 29 ottobre 2026): audit visivo, una direzione artistica unica, il sistema visivo comune e il piano per la Fase B divisa in pacchetti. Le scelte tecniche (cosa si cuoce con resvg, cosa si anima con Reanimated, perché non Skia per ora, budget di prestazioni) stanno in `docs/tecnologie-grafica.md`: questo documento le dà per acquisite e non le ripete.

Le foto guardate per l'audit sono in `app/.visual/` (`hub-telefono-*`, `hub-piccolo-*`, `hub-desktop-*`, generate da `npm run check:hub`) e in `app/.visual/audit/` (svelamento dell'arena, pagine `dev/arene`, `dev/panni`, `dev/sociale`, una mano di Briscola fino al riepilogo). La cartella `.visual/` non è nel repository: si rigenera con `npm run export:web && npm run check:hub` e con lo script di prova `/tmp/claude-0/-home-claude/88b6d4b1-ff79-5fd3-afb2-202db413c829/scratchpad/audit-shots.mjs` (temporaneo: da portare in `scripts/` in B0, vedi sotto). La mano di Briscola viene da `node scripts/visual-check.mjs .visual/audit briscola-2 telefono`.

---

## 1. In breve

- **Direzione: «Lampara».** Il gioco è una sala da gioco del Sud, di sera, sotto una lampada. Una sola luce calda dall'alto, tutto il resto nell'ombra calda. Materiali veri: noce lucidato, ottone, carta avorio stampata, velluto, maiolica, marmo, ceralacca, corallo. La lampara è la lampada delle barche dei pescatori nel golfo di notte: dà il nome alla luce che fa da regista a ogni schermata.
- **Il «Tramonto» si sostituisce come fondo dell'interfaccia.** Il cielo arancio-rosa-viola, i pannelli di vetro bianco e i pulsanti a pillola sono proprio la «schermata viola generica con elementi appoggiati sopra» che il brief rifiuta. Il tramonto resta solo dove ha un motivo: nel cielo delle arene del Capitolo I e di Venezia, cioè dentro le scene, mai dietro l'interfaccia. Sora resta per i testi dell'interfaccia; per i titoli arriva **Bodoni Moda**, già installato e mai caricato. Bodoni è un tipografo italiano: è la voce delle carte stampate.
- **Le schermate più povere** sono 1) lo svelamento di una nuova arena, 2) le missioni, 3) il profilo, 4) cornici e avatar, 5) panni, tavolini e dorsi nel negozio, 6) vittoria e sconfitta.
- **Arena del prototipo: «Il Club dei Signori» (13, Capitolo III).** Ha già la lampada verde da banchiere sopra il tavolo (è la metafora della direzione), mette insieme quasi tutti i materiali (cuoio, noce, ottone, velluto, marmo, luna fredda contro lampada calda), sta a metà strada (si può scalare verso il basso e verso l'alto) ed è quella che si vede in tutte le foto di `check:hub`: il confronto prima/dopo è immediato.
- **Fase B in cinque pacchetti senza file in comune**: B0 base (prima di tutto), poi in parallelo B1 arena e sblocco, B2 profilo, B3 personalizzazione dei cosmetici, B4 missioni.
- **Decisioni che spettano a Giuseppe**: in fondo, sezione 9.

---

## 2. Cosa dice la skill ui-ux-pro-max (e cosa ne prendo)

Ricerche eseguite con `scripts/search.py`:

| Ricerca | Risultato | Cosa ne faccio |
|---|---|---|
| `"premium mobile card game italian elegant collectible" --design-system --motion 3` | stile «Liquid Glass», colori nero + oro (`#1C1917`, accento `#A16207`), tipi Cormorant/Montserrat, movimento discreto 300–400 ms; da evitare «visual economici + animazioni veloci» | Prendo nero caldo + oro e la coppia «serif di lusso + sans». **Rifiuto Liquid Glass**: è esattamente il vetro di oggi |
| `"mobile game casual card" --domain product` | Card & Board Game: «3D & Hyperrealism + Flat», palette «panno verde + legno scuro + motivi dei dorsi», secondari Motion-Driven e Dark Mode | È la base della palette: panno, legno, motivi |
| `"skeuomorphism tactile material" --domain style` | Skeuomorfismo: texture (grana), profondità, ombre a 3+ strati, metafore reali (legno, cuoio, metallo), animazioni tattili 300–500 ms; costo alto | Lo adotto **in forma controllata**: materiali veri ma disegno pulito, niente gradienti a 12 stop |
| `"card board game felt wood" --domain color` | panno `#15803D`, accento ambra `#D97706` su fondo scuro `#0F172A` | Confermata la scelta del fondo scuro; scaldo il blu-ardesia in bruno |
| `"luxury classic serif display" --domain typography` | Playfair Display + Inter («alto contrasto, lusso»), Cormorant + Baskerville | Stesso ruolo di Bodoni Moda (didone ad alto contrasto) + Sora: non aggiungo font nuovi |
| `"reward celebration animation reduced motion" --domain ux` | riduci movimento obbligatorio; «animare 1–2 elementi chiave per vista»; niente animazioni infinite decorative | Budget di 6 elementi animati, uno solo «eroe»; ambientali solo in vetrina e si fermano |
| `"animation performance reanimated" --stack react-native` | Reanimated, thread UI, gesture handler | Già così in `motion.ts`, `kit.tsx` |

Dalla sotto-skill `design-system`: i token si costruiscono su tre livelli (**primitivi → semantici → componente**). È la struttura di `src/ui/arte/token.ts` (sezione 5.1).
Da `references/pro-rules.md`: contrasto ≥ 4,5:1 per i testi, ≥ 3:1 per icone e bordi che hanno un significato; pressione senza spostare il layout; nessuna emoji come icona; colore mai unico portatore di significato (la rarità è sempre scritta).

---

## 3. Audit

Voti da 1 (assente) a 5 (al livello del brief), per gli otto criteri del brief: **G** gerarchia, **M** materiali e profondità, **L** luce e ombre, **A** animazioni e feedback, **I** identità, **C** coerenza, **V** valore percepito, **D** desiderio di continuare.

### 3.1 Problemi di sistema (valgono ovunque)

1. **Il fondo è uno solo e non è un luogo.** `kit.tsx` `Backdrop` disegna `gradients.sky` (arancio → rosa → viola → notte) con un sole radiale in alto a sinistra, uguale in ogni schermata. Su questo fondo tutto è «appoggiato»: i pannelli sono `colors.panel` (viola al 42%) o `colors.glass` (bianco al 16%) con bordo bianco da 1 px. Il risultato è la schermata viola generica del brief: negozio, classifica, amici, trofei e profilo hanno lo stesso aspetto e cambia solo il testo (`hub-telefono-negozio.png`, `-classifica.png`, `-amici.png`, `-trofei-titoli.png`).
2. **Un solo «materiale»: il vetro colorato.** Pulsanti, schede, chip e righe sono tutti pillole (`radius.pill`) o rettangoli con `radius.l = 24`, riempiti di vetro. Non c'è nessuna superficie che si possa toccare con la mente: niente legno, metallo o carta. Anche gli oggetti preziosi stanno dentro la stessa scheda viola dei pulsanti.
3. **La luce non ha una direzione.** Il sole del `Backdrop` viene da in alto a sinistra, la lampada del panno (`Felt.tsx`) dal centro, le ombre di `theme.shadow` cadono dritte in basso (`0px 14px 34px`) e il pulsante principale ha un alone bianco (`primary: boxShadow 0 10 28 rgba(255,255,255,.35)`). Sono quattro luci diverse: niente sembra stare nello stesso spazio.
4. **Le ombre sono colorate di viola** (`rgba(30,6,60,…)`). Un'ombra viola su un fondo viola non stacca niente: per questo i livelli si confondono.
5. **Tipografia monocorde.** Sora 800 per tutti i titoli: «Gioca», «Negozio», il nome dell'arena, il nome del giocatore. Il nome di un luogo prestigioso pesa come l'etichetta di una sezione.
6. **La rarità è solo un'etichetta colorata.** `progression.tsx` `RARITY_STYLE` dà sei chip pastello: menta, azzurro, lilla, giallo e rosa sono colori da caramella, non materiali. A parte la chip, un oggetto mitico e uno comune sono presentati allo stesso modo (stessa scheda, stessa luce, stessa grandezza).
7. **Le feste sono tutte uguali.** `Confetti` è usato per scopa, cappotto, vittoria, nuova arena (44 pezzi), achievement, set e lega (30 pezzi, `Overlays.tsx` riga 181). Non c'è una scala: il coriandolo non dice quanto vale ciò che è successo.

### 3.2 Schermata per schermata

| Schermata (file) | G | M | L | A | I | C | V | D |
|---|---|---|---|---|---|---|---|---|
| Home / Gioca (`Gioca.tsx` `ArenaCard`, `HomeCards.tsx`) | 3 | 2 | 1 | 2 | 2 | 3 | 2 | 3 |
| Scelta dei tre giochi (`Gioca.tsx` `Chooser`, `GameTiles.tsx`) | 4 | 2 | 2 | 3 | 3 | 2 | 3 | 3 |
| Arene e percorso trofei (`Trofei.tsx` `ArenaStop`, `ArenaScene.tsx`) | 3 | 2 | 2 | 1 | 3 | 3 | 2 | 2 |
| Profilo (`profilo.tsx`, `competition.tsx`) | 2 | 1 | 1 | 1 | 1 | 3 | 1 | 1 |
| Cornici e avatar (`ProfileEditor.tsx`, `avatar.tsx`) | 2 | 1 | 1 | 1 | 2 | 3 | 1 | 1 |
| Panni e tavolini (`Negozio.tsx`, `cosmetics.tsx`, `Felt.tsx`) | 3 | 3 | 3 | 1 | 2 | 3 | 2 | 2 |
| Dorsi (`Negozio.tsx`, `BackPreview`) | 3 | 3 | 2 | 1 | 3 | 2 | 2 | 2 |
| Negozio e inventario (`Negozio.tsx`) | 3 | 1 | 1 | 1 | 1 | 3 | 2 | 2 |
| Missioni (`Missions.tsx`) | 2 | 1 | 1 | 1 | 1 | 3 | 1 | 1 |
| Achievement e titoli (`Trofei.tsx`) | 3 | 1 | 1 | 1 | 2 | 3 | 1 | 2 |
| Vittoria e sconfitta (`game/Summary.tsx`) | 3 | 1 | 1 | 2 | 1 | 2 | 1 | 2 |
| Ricompense e svelamento (`Overlays.tsx`, `ArenaReveal.tsx`, `DailyBonus.tsx`) | 2 | 1 | 1 | 2 | 1 | 2 | 1 | 2 |
| Classifiche e amici (`Classifica.tsx`, `Amici.tsx`) | 3 | 2 | 1 | 1 | 2 | 3 | 2 | 2 |

**Home / Gioca** (`hub-telefono-gioca.png`, `-desktop-gioca.png`, `audit/svelamento-cap5-telefono.png`)
- `ArenaCard` mette la scena (`ArenaScene` in «slice», cioè solo il centro della tela 600×200) e poi sovrappone un `TablePreview` dall'alto, spostato in su di `-th*0.28`. La scena è vista di fronte, il tavolino dall'alto: **due prospettive diverse**. Il tavolino copre il tavolo disegnato nella scena (si vede spuntare dietro, `audit/svelamento-telefono.png`) e poggia su una fascia prugna piatta (il `LinearGradient` a `rgba(28,8,52,0.75)`), non su un pavimento. È l'esempio più chiaro di «modello messo sullo schermo».
- Il nome dell'arena è scritto sopra la parte più interessante della scena: la finestra con la luna nel Club, il castello nel Regno degli Assi.
- Il pulsante «Gioca» è una pillola gialla con l'alone bianco: è il più importante e si legge, ma è di un materiale (plastica gialla) che non compare da nessun'altra parte.
- Sotto, in fila: «Da riscuotere», l'evento, le missioni. Sono tre pannelli dello stesso vetro: niente distingue un premio pronto da una lista di compiti.
- Desktop: la colonna è centrata su un fondo arancio-viola enorme e vuoto. Sembra un sito.

**Scelta dei tre giochi** (`hub-telefono-gioca-scelta.png`)
- È la parte migliore: le carte vere sulle tessere danno identità e la gerarchia è chiara.
- Le tessere però sono gradienti a caramella (`gradients.games`: arancio, rosa, viola) con una banda lucida orizzontale finta a metà. Le carte vere stanno su una plastica: il contrasto tra le scansioni antiche e il gradiente vivo è stridente.
- La legenda dei trofei sotto (Facile +10…) è in quattro pillole uguali.

**Arene e percorso** (`hub-telefono-trofei.png`, `audit/dev-arene-cap1…5*.png`)
- Le 30 scene in `src/ui/arene/` sono illustrazioni vettoriali piatte ben composte (piani, prospettiva centrale, vignetta), ma **nessuna ha una luce vera**. `Glow` è un radiale semitrasparente; `Ground` e `Vignette` scuriscono i bordi. Ogni oggetto ha un colore pieno, senza lato in luce e lato in ombra: libri, poltrone, colonne sembrano ritagli di carta.
- Il tavolo da gioco nella scena è un ovale piccolissimo (`CardTable` in `arene/kit.tsx`, largo 78 su 600) con tre rettangoli rossi per le carte. È uguale in tutte e 30 le arene, solo ricolorato. Il «tavolo centrale integrato nell'ambiente» del brief oggi non c'è.
- Il Capitolo V (`olimpo.tsx`) è viola, lilla e oro con raggi: è proprio il «viola generico» del brief, e le cinque scene si somigliano (raggi + nuvole + oggetto d'oro al centro).
- La crescita tra i capitoli è affidata al soggetto (bar → palazzo → trono), non alla qualità della luce o dei materiali. Le prime arene sono già calde e luminose quanto le ultime.
- `dim` (arena non raggiunta) desatura tutto in un grigio-lilla uniforme (`night()`). Funziona come «chiuso», ma toglie anche il desiderio: non si intravede niente di ciò che si vincerà.
- Nel percorso (`ArenaStop`) ogni arena è una scheda con una fascia di scena alta 118 punti e la ricompensa in piccolo sotto. La scheda dell'arena corrente ha un bordo giallo e il resto è uguale.
- Nessuna animazione, per scelta (commento in testa a `ArenaScene.tsx`: «Statica, niente animazioni»).

**Profilo** (`hub-telefono-profilo.png`, `-profilo-sotto.png`, `-desktop-profilo.png`)
- È una pagina di statistiche. Avatar da 100 punti a sinistra, nome in Sora 800, tre caselle uguali (trofei, arena, achievement), un paragrafo di testo («140 partite, 82 vinte…»), le righe per gioco, la vetrina **sotto la piega**, poi «Collezione» come quattro barre di avanzamento e 15 gemme grigie identiche (`Emblem glyph="gem"`), poi l'accesso.
- Il fondo è il cielo arancio: non dice niente del giocatore. L'arena raggiunta compare solo come numero «13» in una casella.
- Le cose equipaggiate (tavolino, panno, dorso) non si vedono affatto. La cornice d'alloro è l'unico segno di personalizzazione.
- Desktop: una colonna di 560 punti su un fondo enorme.

**Cornici e avatar** (`hub-telefono-profilo-cornice.png`, `-profilo-avatar.png`)
- `avatar.tsx` `Frame` disegna ogni cornice come un anello con **un solo gradiente lineare** (`fm`: luce → metallo → scuro, in diagonale) più qualche forma piatta: foglie (ellissi), stelle, quattro rombi (`gems`), una coroncina (`crown`). Niente rilievo, smusso, riflesso o incastonatura.
- Comune «Oro sottile» e leggendaria «Corona» hanno la stessa presenza: lo stesso anello, più una coroncina di 6×3 spessori di linea. «Gemme» (leggendaria) sono quattro rombi rossi.
- Nella scheda Avatar tutti e 13 gli avatar hanno l'alloro equipaggiato intorno: la griglia è una ripetizione di corone verdi, e l'occhio non distingue i simboli.
- Le cornici non possedute sono rese col 45% di opacità sul viola: diventano rosa sporco e il desiderio sparisce.
- Il fondo dei simboli (`a.colors`) è un gradiente pastello per avatar: sole arancio, luna blu, settebello verde. Sono colori da app, non da mazzo napoletano.

**Panni e tavolini** (`hub-telefono-negozio.png`, `-negozio-tavolini.png`, `audit/dev-panni*.png`)
- `Felt.tsx` è il pezzo più curato del gioco: sponde con legno, radica, marmo, granito, metallo, cristallo, borchie e fregi; trama del panno; cucitura; luce della lampada. Ma:
- `TablePreview` mette **sempre le stesse tre carte** (due dorsi + Settebello) al centro. Nelle anteprime del negozio le carte occupano metà del panno, e il disegno della grafica (che `feltDesigns.ts` mette apposta ai bordi e negli angoli) resta coperto o tagliato. Si compra un panno e si vede soprattutto il dorso «Classico» viola col sole al tramonto (`audit/dev-panni.png`).
- Nel foglio dei tavolini, 38 sponde diverse su 38 panni smeraldo identici: la differenza è una fascia di 6–10 px. A colpo d'occhio sono 38 copie.
- Il panno non ha spessore. La trama è una `Pattern` di linee (sottile, da vicino sembra un retino) e non c'è il bordo morbido dove il panno sale sulla sponda.
- Le sponde sono illuminate dall'alto (`RAIL_LIGHT` top/bottom): sono già coerenti con la direzione proposta.

**Dorsi** (`hub-telefono-negozio-dorsi.png`, `-negozio-oggetto.png`)
- I dorsi sono PNG cotti da `make-art.mjs` e sono tra le cose più belle (Il Destino, Corona Reale). Ma sono presentati in una scheda viola più piccola della carta stessa, su un riquadro viola più scuro, senza luce né spessore della carta.
- Il dorso di partenza «Classico» è un tramonto viola-arancio: è il Tramonto travestito da carta napoletana, e compare in ogni anteprima di tavolino e panno.
- Nella scheda dell'oggetto il dorso mitico è mostrato su un tavolino casuale (quello equipaggiato). Il mitico non ha una presentazione sua.

**Negozio e inventario** (`hub-telefono-negozio*.png`)
- L'«Offerta del giorno» è la stessa scheda di vetro con un dorso: niente dice «oggi, scontato, raro».
- Due righe di pillole di filtro sopra la griglia, testo di spiegazione, poi una griglia 2×N di schede identiche. Il comune e il mitico hanno la stessa scheda.
- «Set» (`-negozio-set.png`) mostra tre miniature in fila e una gemma grigia. Il «completare il set» non si vede come una collezione.
- Non c'è un posto dove provare un oggetto insieme agli altri prima di comprarlo: l'anteprima della scheda usa quello che hai equipaggiato.

**Missioni** (`hub-telefono-gioca-sotto.png`, `-gioca-fondo.png`)
- `Missions.tsx`: un pannello viola dentro la home, un titolo con spunta, due pillole «Oggi 0/3 · Settimana 0/4», righe con un cerchio vuoto, il testo, una barra sottile da 5 px, il pulsante «cambia» e le monete. È una lista di cose da fare (to-do list) qualsiasi.
- Giornaliere e settimanali sono la stessa lista con un filtro. Non esistono gli obiettivi speciali (l'evento è una scheda separata, sopra).
- La ricompensa è il numero più piccolo della riga (12,5 pt), in fondo a destra.
- Completata: il cerchio diventa menta con una spunta e il testo sbiadisce. Da riscuotere: il cerchio diventa giallo con un regalo e appare una pillola gialla. Al riscuotere c'è solo il suono `buy`. Nessun momento.

**Achievement e titoli** (`hub-telefono-trofei-achievement.png`, `-trofei-titoli.png`, `hub-piccolo-trofei-segreti.png`)
- Ogni achievement non ottenuto è uno scudo viola-grigio uguale agli altri: bronzo, argento, oro e platino si distinguono solo nel riepilogo in alto. 183 righe uguali.
- I titoli sono 60 righe con la stessa corona gialla in un cerchio: il titolo è la cosa che si mostra agli altri, ma qui sembra un'impostazione.
- I segreti con il bordo tratteggiato e il punto interrogativo sono un'idea giusta, resa come un modulo da compilare.

**Vittoria e sconfitta** (`audit/telefono-briscola-2-3-fine.png`)
- `Summary.tsx`: un foglio viola con «Vince Gennaro», due schede uguali per i giocatori, la scheda trofei, due pulsanti. Il risultato pesa quanto il resto.
- **Coriandoli in una sconfitta**: nella foto si perde 0 a 1 e piovono coriandoli. Vengono da `Overlays.tsx` (riga 181), che li lancia per l'achievement «Prima partita» sopra il riepilogo. Il messaggio è contraddittorio.
- «Trofei invariati · Il Bar del Paese, 0 su 100»: la barra verso l'arena successiva è vuota e grigia, senza un segno di dove sei e dove arrivi.

**Ricompense e svelamento dell'arena** (`audit/svelamento-telefono*.png`, `-desktop.png`)
- `ArenaReveal.tsx`: fondo viola quasi opaco, la scritta «Nuova arena», la scena in una scheda con il bordo giallo e un alone giallo, il nome sopra la scena, le ricompense, «Avanti». È una scheda del percorso ingrandita. I coriandoli (44) passano proprio davanti alla scena e al nome.
- Ci sono due dissolvenze in entrata e i coriandoli, ma nessuna transizione: l'arena non «si apre» e non si vede l'arena di prima lasciare il posto alla nuova. Nessun segno del prestigio (Capitolo III di V).
- A 1,6 secondi (prima foto) la scena è ancora sbiadita e coperta: per un momento importante, il primo secondo è vuoto.
- Il banner delle feste minori (`Overlays.tsx` `Banner`) scende dall'alto con una medaglia piatta. Va bene come forma, ma è lo stesso per un livello, un oggetto mitico e una missione.
- Quando un vecchio profilo recupera molti achievement compare «34 achievement completati · +5600 monete» sopra l'arena appena svelata (`audit/svelamento-telefono.png`): due feste si sovrappongono.

**Classifiche e amici** (`hub-telefono-classifica*.png`, `-amici.png`, `audit/dev-sociale.png`)
- La moneta della lega (`competition.tsx` `LeagueCoin`) è un buon oggetto: metallo, zigrinatura, iniziale. Va in quella direzione.
- Senza account, metà schermo è il pannello di accesso con tre pulsanti dei marchi: la classifica non si vede mai, nemmeno di esempio.
- Le righe della classifica sono pillole viola uguali; il podio (1, 2, 3) si distingue solo per il colore del numero.

### 3.3 Le sei schermate più statiche e povere

1. **Svelamento di una nuova arena** (`ArenaReveal.tsx`). È il momento più importante della progressione e oggi è una scheda con i coriandoli sopra. Nessuna transizione, nessun prestigio, nessun «entrare» nel luogo.
2. **Missioni** (`Missions.tsx`). Una lista di cose da fare (to-do list) dentro un pannello. Ricompensa piccola, nessuna identità, nessun feedback al riscuotere.
3. **Profilo** (`profilo.tsx`). Statistiche su un fondo arancio. La vetrina sta sotto la piega e gli oggetti equipaggiati non si vedono.
4. **Cornici e avatar** (`avatar.tsx` `Frame`, `ProfileEditor.tsx`). Anelli piatti, leggendaria uguale a comune, griglia di corone uguali.
5. **Panni, tavolini e dorsi nel negozio** (`cosmetics.tsx` `TablePreview`, `Negozio.tsx`). Stesse tre carte che coprono il panno, schede identiche per tutte le rarità, nessuna prova combinata.
6. **Vittoria e sconfitta** (`Summary.tsx`). Testo e barre in un foglio; coriandoli anche quando si perde.

---

## 4. La direzione: «Lampara»

### 4.1 L'idea

Una sala da gioco del Sud di sera. Fuori è buio, il golfo, la luna. Dentro, sopra il tavolo, **una lampada**. Tutto quello che conta (il tavolo, le carte, la cornice del tuo avatar, la ricompensa) sta nella pozza di luce; il resto sfuma nell'ombra calda del legno. Le cose hanno peso, spessore, un materiale: si appoggiano, proiettano ombre, la luce le sfiora sugli spigoli in alto.

- **Italiana e napoletana** nei materiali e nei segni: il noce delle sale dei circoli, l'ottone delle targhe e delle lampade, la carta avorio dei mazzi e delle locandine stampate a caratteri mobili, la maiolica di Vietri e dei chiostri, il marmo, il velluto delle poltrone, la ceralacca dei sigilli, il corallo di Torre del Greco e la madreperla, il Vesuvio e la lampara nel golfo dietro le finestre.
- **Premium da gioco mobile** nella cura: una sola luce coerente, livelli di profondità precisi, rarità con una scala di materiali e non di colori, animazioni con uno scopo e un budget, momenti di ricompensa proporzionati.
- **Non Clash Royale**: niente cartoon a tinte sature, niente legno da fumetto, niente esplosioni. Il tono è quello di un oggetto antico tenuto bene: elegante, caldo, un po' teatrale nei momenti importanti.

### 4.2 Il Tramonto: si tiene, si evolve o si sostituisce?

| Elemento del Tramonto | Decisione | Perché |
|---|---|---|
| Cielo arancio-rosa-viola come fondo di ogni schermata (`Backdrop`, `gradients.sky`) | **Sostituito** dalla «Sala»: bruno-notte caldo con la pozza di luce della lampada | È il «viola generico». Il fondo deve essere un luogo, non un colore |
| Il tramonto come cielo | **Tenuto dentro le scene**: arene del Capitolo I, Casinò di Venezia, Loggia dei Nobili, panno «Venezia al Tramonto» | Lì ha un motivo: è l'ora del pomeriggio al borgo |
| Pannelli di vetro bianco/viola (`glass`, `panel`) | **Sostituiti** da superfici di materiale (noce, carta, velluto, cuoio) | Il vetro non ha luce, peso né ombra; tutto sembra galleggiare |
| Pulsanti a pillola bianchi e gialli | **Evoluti**: placca d'ottone (azione principale), legno (secondaria), testo (terziaria) | Stessa gerarchia, ma un materiale |
| Panno smeraldo, sponde di `Felt.tsx` | **Tenuti** | Sono già materiali illuminati dall'alto |
| Un colore vivo per giocatore (`seatColors`) | **Tenuti** al tavolo | Sono segnali, non decorazione, e su fondo scuro leggono meglio |
| Sora | **Tenuta** per i testi dell'interfaccia e i numeri | Leggibile, cifre tabellari, già ovunque |
| Sora 800 per i titoli | **Sostituita** da Bodoni Moda per titoli e nomi (arene, giocatore, oggetti) | Serve una voce «stampata» per ciò che ha valore |
| Colori dei tre giochi (arancio, rosa, viola) | **Evoluti** in tre smalti: terracotta (Tressette), corallo (Briscola), blu maiolica (Scopa) | Restano riconoscibili ma diventano materiali. Fase D, perché `GameTiles.tsx` è dell'altro agente |
| Dorso di partenza «Classico» (sole al tramonto viola) | **Da rifare in Fase D** come dorso napoletano classico (rosso o blu con fregio) | È la carta più vista del gioco; oggi è il Tramonto travestito |

### 4.3 Impatto sul tavolo di gioco (non si tocca ora)

La direzione è pensata per estendersi al tavolo senza rompere niente:

- **La geometria non cambia.** `layout.ts` `measure()` dipende solo dallo schermo e dalla modalità. La direzione cambia fondo, materiali e luce, mai posizioni.
- **Il fondo**: oggi `tavolo.tsx` usa `Backdrop` (il cielo). Domani userà `Sala` di `src/ui/arte/` tinta con l'accento dell'arena corrente (`ARENA_SKY[id][1]` al 12%). Le carte bianche su un intorno scuro leggono meglio di adesso.
- **Panno e sponde**: `Felt.tsx` ha già la luce della lampada al centro e le sponde illuminate dall'alto (`RAIL_LIGHT`). È coerente con la luce di Lampara. In Fase D la trama cotta (vedi `tecnologie-grafica.md`) sostituisce la `Pattern` di linee.
- **I nomi** (`Tag.tsx`, oggi vetro scuro): diventano targhette di cuoio con il bordo d'ottone e il colore del giocatore come filetto. Stessa larghezza fissa (`TAG_W`).
- **Riepilogo** (`Summary.tsx`): diventa la «teca» (sezione 5.10) con la barra delle arene come strada. Va fatto insieme all'altro agente.
- **Al tavolo nessuna animazione ambientale**, mai. Le carte non cambiano (nessun filtro, nessuna prospettiva).
- **Rischio da evitare**: cambiare `Backdrop` o `theme.ts` per «fare prima». Lo usano le schermate dell'altro agente e il tavolo. Lampara vive in `src/ui/arte/` finché la Fase D non la porta ovunque.

---

## 5. Il sistema visivo comune

Tutto quello che segue diventa codice in `src/ui/arte/` (pacchetto B0). I file esistenti `theme.ts`, `kit.tsx` e `motion.ts` non cambiano.

### 5.1 Palette

Tre livelli, come nella skill `design-system`: **primitivi** (i materiali), **semantici** (i ruoli), **di componente** (definiti dentro ogni componente a partire dai semantici, mai dai valori esadecimali).

**Primitivi**

| Famiglia | Luce | Medio | Scuro | Ombra |
|---|---|---|---|---|
| Notte (la sala) | `#34211F` | `#2A1A1C` | `#1E1316` | `#140C0E` |
| Noce | `#7A4E30` | `#5A3A26` | `#3B2418` | `#22140C` |
| Ottone / oro | `#F5DFA0` | `#C9A15A` | `#8A6526` | `#4A3410` |
| Foglia d'oro (testo e filetti su scuro) | `#E6C36A` | | | |
| Carta avorio | `#F6EBD9` | `#F3E9D2` | `#E4D4B4` | `#CBB68E` (bordo) |
| Inchiostro | `#2A1810` | `#5C4434` | | |
| Velluto bordeaux | `#7A2433` | `#4A1420` | | `#24080E` |
| Ceralacca | `#A8323C` | `#8E1A26` | `#6E1A22` | |
| Maiolica | bianco smalto `#F4F1EA` | blu `#1E4F99` | giallo `#F2C230` | ramina `#2E7D57` |
| Marmo | `#EDE6DA` | `#D8CDBA` | vena `#8E8478` | |
| Cuoio | `#8A4428` | `#6A3A22` | `#3A1E12` | |
| Panno (quello di oggi) | `#14806A` | `#0B4D42` | `#06352E` | |
| Lampada (luce) | `#FFD9A0` | | | |
| Notte fredda (luce di rimbalzo, luna) | `#3A4A6A` | `#CFE2FF` (luna) | | |

**Semantici**

| Token | Valore | Uso |
|---|---|---|
| `fondo.base` | `#140C0E` | fondo di ogni schermata fuori dalla luce |
| `fondo.luce` | `#1E1316` | il centro della pozza di luce |
| `superficie.1` | `#2A1A1C` | pannelli scuri (cuoio, legno scuro) |
| `superficie.2` | `#34211F` | superficie rialzata, riga premuta |
| `superficie.carta` | `#F3E9D2` | biglietti, schede di carta, libro mastro |
| `testo.forte` | `#F6EBD9` | testi su scuro |
| `testo.medio` | `#D8C6AA` | sottotitoli su scuro |
| `testo.tenue` | `#B4A086` | note, contatori su scuro (mai sotto 12 pt) |
| `testo.inchiostro` | `#2A1810` | testi su carta e su ottone |
| `testo.inchiostroTenue` | `#5C4434` | note su carta |
| `accento.oro` | `#E6C36A` | numeri importanti, titoli piccoli, filetti su scuro |
| `azione.principale` | placca d'ottone (`#F5DFA0 → #C9A15A → #8A6526`) con `testo.inchiostro` | il pulsante più importante della schermata, uno solo |
| `azione.secondaria` | noce (`#7A4E30 → #3B2418`) con `testo.forte` | |
| `azione.pericolo` | ceralacca `#A8323C` con `testo.forte` | |
| `stato.successo` | `#5FB37E` | completato, possiedi |
| `stato.pronto` | `#E6C36A` | da riscuotere |
| `stato.errore` | `#F08A72` | errore, perdi trofei |
| `stato.info` | `#6FA8E8` | informazioni |
| `stato.bloccato` | `testo.tenue` + icona lucchetto | |

**Contrasti verificati** (rapporto WCAG, calcolato su questi valori):

| Testo | Fondo | Rapporto |
|---|---|---|
| `testo.forte` `#F6EBD9` | `fondo.base` / `superficie.1` / noce scuro / velluto / panno | 16,35 / 14,10 / 12,27 / 12,61 / 8,26 |
| `testo.medio` `#D8C6AA` | `superficie.1` / `superficie.2` / panno | 9,96 / 9,09 / 5,84 |
| `testo.tenue` `#B4A086` | `fondo.base` / `superficie.1` / `superficie.2` | 7,64 / 6,58 / 6,01 |
| `accento.oro` `#E6C36A` | `fondo.base` / `superficie.1` / velluto | 11,37 / 9,80 / 8,77 |
| `testo.inchiostro` `#2A1810` | carta / carta scura / ottone medio / foglia d'oro | 14,07 / 11,62 / 7,06 / 10,01 |
| `testo.inchiostroTenue` `#5C4434` | carta / carta scura | 7,46 / 6,17 |
| rosso tipografico `#8E1A26` | carta | 7,48 |
| `testo.forte` | ceralacca `#A8323C` / blu maiolica `#1E4F99` / ramina scura `#1F6A49` | 5,59 / 6,76 / 5,54 |
| stati `#5FB37E` `#F08A72` `#6FA8E8` | `fondo.base` | 7,57 / 7,88 / 7,75 |

Da evitare: `testo.forte` sulla ramina chiara `#2E7D57` (4,24: solo per testi ≥ 18,5 pt in grassetto), `testo.tenue` sul noce chiaro `#5A3A26` (4,02), qualsiasi testo chiaro su ottone (2,04).

**Rarità** (colore della targhetta e del materiale; il nome è sempre scritto):

| Rarità | Materiale | Colore su scuro | Contrasto su `fondo.base` |
|---|---|---|---|
| Comune | peltro | `#B9B2A6` | 9,17 |
| Non comune | rame e bronzo | `#D9895A` | 7,05 |
| Raro | argento e smalto blu | `#6FA8E8` | 7,75 |
| Epico | ametista e porpora | `#B58CE0` | 7,16 |
| Leggendario | oro zecchino | `#E8B44A` | 10,16 |
| Mitico | corallo di Torre del Greco e madreperla | `#EC8FB0` | 8,38 |

Sulle targhette piene di rarità si scrive in `testo.inchiostro` (rapporti tra 6,3 e 8,9).

### 5.2 Tipografia

| Ruolo | Carattere | Misura / interlinea | Note |
|---|---|---|---|
| Nome di un luogo, del giocatore, di un oggetto in vetrina | **Bodoni Moda 700** | 40/46 (svelamento), 32/38 (profilo), 26/32 (scheda oggetto) | Mai sotto 20 pt: i filetti sottili spariscono. Su scuro solo `testo.forte` o `accento.oro` |
| Titolo di sezione dentro una schermata di vetrina | Bodoni Moda 600 | 22/28 | |
| Occhiello («Arena 14 · Capitolo III», «Locandina della settimana») | Sora 600, maiuscolo, spaziatura 1,4 | 12/16 | `accento.oro` su scuro, rosso tipografico su carta |
| Testi dell'interfaccia | Sora 500/600 | scala di `theme.type` (12,5 · 14,5 · 16 · 19) | come oggi |
| Numeri (monete, trofei, contatori) | Sora 700, `tabular-nums` | | sempre cifre tabellari: niente che balla mentre conta |
| Titoli delle sezioni dell'hub («Negozio», «Trofei») | Sora 800 (come oggi) | | restano finché l'hub non passa a Lampara (Fase D) |

Bodoni Moda (OFL) è già una dipendenza: `@expo-google-fonts/bodoni-moda` con i pesi 600, 700 e 800 (≈ 59 KB ciascuno). Va caricato in `src/app/_layout.tsx` (pacchetto B0). Figtree è installata ma non serve: si può togliere più avanti.

Testo inciso sull'ottone: `testo.inchiostro` con `textShadowOffset {0, 1}`, `textShadowRadius 0`, colore `rgba(255,240,200,0.45)`. Il testo sembra scavato perché la luce viene dall'alto.

### 5.3 Luce

**Una sola luce principale per tutto il gioco: la lampada.**

- **Direzione**: dall'alto, leggermente da sinistra (ore 11). In coordinate dello schermo il vettore della luce è `(-0,35, -0,94)`: gli spigoli in alto a sinistra prendono luce, quelli in basso a destra stanno in ombra.
- **Colore**: `#FFD9A0` (luce calda, circa 2700 K).
- **Pozza**: su ogni schermata di vetrina la luce cade su un'ellisse centrata al 42% della larghezza e al 22% dell'altezza (dove sta l'oggetto eroe), raggio 70% della larghezza, opacità 0,22 al centro e 0 al bordo.
- **Rimbalzo**: una luce fredda e debole dalla notte (`#3A4A6A`, opacità 0,12) sugli spigoli in basso a destra. È il riflesso della finestra: separa gli oggetti scuri dal fondo scuro senza alone.
- **Eccezioni, solo dentro le scene delle arene**: il sole del pomeriggio (Capitolo I), la luna fredda (Capitoli III e IV), le candele. Anche lì, la luce sul tavolo viene sempre dall'alto.

Come cade su ogni materiale:

| Materiale | Lato in luce (alto-sinistra) | Lato in ombra (basso-destra) | Riflesso |
|---|---|---|---|
| Noce lucidato | filo chiaro 1 px `#A87A50` al 60%, vernice: banda bianca al 14% nella metà alta | filo scuro 1 px `#1A0E08` | morbido, largo |
| Ottone, oro | `#FFF3C8` al 70% | `#4A3410` | stretto e netto; si muove solo da epico in su |
| Carta | quasi niente | ombra di contatto | nessuno; un angolo sollevato (gradiente 10%) |
| Velluto | **i bordi sono più chiari del centro** (luce radente sul pelo) | centro scuro | nessuno |
| Marmo | lucido largo al 18% | | largo |
| Smalto, maiolica | macchia ellittica bianca al 35% in alto a sinistra, piccola | | puntiforme |
| Ceralacca | macchia al 35% in alto a sinistra | rilievo dell'impronta più scuro | puntiforme |
| Panno | pozza della lampada al centro (come oggi) | il panno scurisce verso la sponda | nessuno |

### 5.4 Ombre

Due ombre per ogni oggetto, sempre: **contatto** (corta, scura, quasi senza sfumatura: dice dove l'oggetto tocca) e **portata** (lunga e morbida: dice quanto è alto). La portata si sposta verso destra di un terzo del suo spostamento verso il basso, perché la luce viene da in alto a sinistra. Il colore è un nero caldo `rgba(8,3,4,α)`, mai viola e mai colorato.

| Livello | Contatto | Portata |
|---|---|---|
| 2 superficie | `0px 1px 2px rgba(8,3,4,0.50)` | `3px 8px 16px rgba(8,3,4,0.40)` |
| 3 oggetto | `0px 2px 3px rgba(8,3,4,0.50)` | `5px 14px 22px rgba(8,3,4,0.45)` |
| 4 primo piano | `0px 3px 4px rgba(8,3,4,0.50)` | `8px 24px 36px rgba(8,3,4,0.50)` |

In RN si scrivono come `boxShadow` con due ombre separate da una virgola (funziona su iOS, Android e web con la nuova architettura). Negli oggetti molto piccoli (sotto i 34 punti) si usa solo il contatto, come fa già `cosmetics.tsx` `cardShadow`.

Aloni colorati: solo per la luce della lampada e per le rarità leggendaria e mitica (alone del materiale, opacità massima 0,25). Mai un alone bianco su un pulsante.

### 5.5 Profondità

Sei livelli. Ogni elemento appartiene a uno solo; lo stesso livello ha la stessa ombra ovunque.

| Livello | Cosa | Parallasse (scorrimento) | Ombra |
|---|---|---|---|
| 0 Sfondo | la Sala, il cielo dell'arena | 0,2 | nessuna |
| 1 Ambiente | piani della scena, mobili lontani, pareti | 0,5 | vignetta della scena |
| 2 Superficie | pannelli, mensole, bacheca, foglio | 1 (scorre col contenuto) | livello 2 |
| 3 Oggetto | carte, cornici, biglietti, tessere, tavolini | 1 | livello 3 |
| 4 Primo piano | oggetto selezionato, in prova, appena vinto | 1 | livello 4 |
| 5 Sovrapposto | foglio (`Sheet`), teca della ricompensa, svelamento | — | velo `#140C0E` all'84% sotto; sopra, luce propria |

Regole:

- Un'animazione sposta un elemento al massimo di un livello (oggetto → primo piano quando lo selezioni). Solo la teca e lo svelamento portano qualcosa dal livello 3 al 5.
- Un oggetto che sale di livello cambia **ombra**, non misura. Le carte non si ingrandiscono mai.
- Sopra il livello 2 non si mettono testi lunghi: le spiegazioni stanno sulle superfici, gli oggetti hanno solo il nome.

### 5.6 Materiali: come si costruiscono

Strumenti disponibili e nessuna dipendenza nuova: `react-native-svg`, `expo-linear-gradient`, `expo-image`, Reanimated. Le trame si cuociono con resvg (`@resvg/resvg-js`, già installato) e si convertono in WebP con Pillow, già usato da `scripts/clean-cards.py`, così non serve `sharp`. Le trame sono **neutre** (grigio con alfa) e si posano su qualsiasi colore senza blend mode (vedi `tecnologie-grafica.md`).

Ordine degli strati, sempre lo stesso:

```
5  riflesso (solo se previsto dalla rarità; animato)
4  bordo a luce: tratto SVG con gradiente luce→ombra lungo la diagonale
3  rilievo: filo chiaro in alto-sinistra, filo scuro in basso-destra (1 px)
2  grana: trama cotta WebP, ripetuta (Image in una Pattern SVG), opacità fissa
1  base: gradiente del materiale a 160° (alto-sinistra → basso-destra)
0  ombre: contatto + portata (boxShadow sulla View)
```

| Materiale | Base (stop del gradiente) | Grana cotta (WebP neutro) | Riflesso | Bordo | Dove si usa |
|---|---|---|---|---|---|
| **Noce lucidato** | `#7A4E30` 0 · `#5A3A26` 0,45 · `#3B2418` 1 | venatura orizzontale (turbolenza 0,02×0,4), 512 px, opacità 0,35 | banda di vernice: bianco 14% → 0 nella metà alta | filetto d'ottone interno 1,5 px opzionale | pulsanti secondari, mensole, cornice della bacheca |
| **Ottone** | `#F5DFA0` 0 · `#C9A15A` 0,35 · `#8A6526` 0,7 · `#C9A15A` 1 (l'ultimo stop è il rimbalzo) | spazzolato orizzontale, 256 px, 0,25 | statico in alto-sinistra; animato da epico in su (`Riflesso`) | `#FFF3C8` 70% / `#4A3410` | pulsante principale, targhe, chip di rarità, cornici |
| **Foglia d'oro** | come l'ottone, contrasto più basso | crepe della foglia, 0,15 | come l'ottone | — | filetti dei titoli, dorsi rari (Fase D) |
| **Carta avorio** | `#F6EBD9` → `#E4D4B4` | fibre della carta, 256 px, 0,12 | nessuno; angolo sollevato | filo `#CBB68E` 1 px; filetti tipografici rossi o d'ottone | biglietti delle missioni, libro mastro del profilo, cartellini dei prezzi |
| **Velluto bordeaux** | radiale: centro `#24080E`, bordo `#7A2433` al 50% | pelo fine, 0,2 | nessuno | — | nicchie della vetrina, teca, sipario dello svelamento |
| **Cuoio** | `#8A4428` → `#3A1E12` | grana a buccia, 0,3 | morbido 10% | impuntura avorio tratteggiata 60%, 4 px dentro | pannelli scuri, targhette dei nomi (Fase D) |
| **Marmo** | `#EDE6DA` → `#D8CDBA` | vene (turbolenza), 512 px, 0,5 in `#8E8478` | banda larga 18% | spigolo smussato | piedistallo dell'oggetto in teca, scene del Capitolo III |
| **Smalto / maiolica** | colore pieno (blu, bianco, giallo, ramina) | craquelure 0,08 (solo maiolica) | macchia ellittica 35% | cloisonné d'ottone 1,5 px | icone delle missioni, gemme delle cornici, sigilli dei giochi |
| **Ceralacca** | radiale `#A8323C` → `#6E1A22` | — | macchia 35% | sagoma irregolare con `seeded()` | timbro «Fatta», «In uso», «In prova» |
| **Sughero** | `#B98A5A` | granuli, 256 px, 0,5 | — | cornice di noce | fondo della bacheca delle missioni |
| **Panno** | `Felt.tsx` come oggi | trama cotta 256 px, 0,18 (in vetrina; al tavolo in Fase D) | — | cucitura a due toni (scuro + chiaro spostato di 1 px) | tavolini e panni nelle anteprime |
| **Cristallo / vetro** | trasparente su scuro, due luci nette | — | due filetti bianchi netti | — | solo scene del Capitolo III e sponda «di vetro». Mai come pannello |

Peso stimato delle trame: 9 trame tra 15 e 60 KB, ≈ 300 KB in tutto, condivise da tutti gli oggetti.

### 5.7 Rarità: una scala precisa

La qualità del disegno è la stessa per tutte e sei. Cresce la **spettacolarità**: materiale più nobile, più ornamento, luce più viva, movimento solo dall'epico.

| | Comune | Non comune | Raro | Epico | Leggendario | Mitico |
|---|---|---|---|---|---|---|
| **Materiale** | peltro, legno chiaro, carta | rame e bronzo | argento con smalto blu | argento dorato con ametista e porpora | oro zecchino con gemme | corallo, madreperla e oro rosa |
| **Ornamento** | profilo liscio | un motivo semplice (zigrinatura, perline) | motivo + una incastonatura di smalto | rilievo su tutto il giro, due materiali | ornamento scolpito che esce dalla sagoma (≤ 18% del raggio) + gemme | ornamento scolpito + un elemento narrativo napoletano (Partenope, Vesuvio, la lampara), tre materiali |
| **Luce** | riflesso statico morbido | riflesso statico netto | riflesso statico + lucido dello smalto | **riflesso che passa** ogni 8 s | riflesso ogni 6 s + gemme che brillano (opacità 0,6–1) | riflesso + madreperla iridescente (gradiente che scorre in 12 s) + alone ≤ 0,25 |
| **Movimento** | nessuno | nessuno | nessuno | 1 (riflesso) | 2 (riflesso + gemme) | 3 (riflesso + iridescenza + particelle) |
| **Particelle** | no | no | no | no | ≤ 8 scintille lente | ≤ 16 granelli di madreperla |
| **Targhetta** | peltro, testo inchiostro | rame | argento con punto di smalto blu | ametista | oro con incisione | corallo con bordo di madreperla |
| **Presentazione quando si ottiene** | piccola | piccola | media | grande (teca), senza particelle | grande + particelle | grande + particelle + sipario |

Regole:

- **Sotto i 48 punti nessun movimento** (classifiche, amici, nomi al tavolo, liste): solo il materiale statico. Il riflesso statico resta, per riconoscere la rarità.
- **Nelle griglie si anima solo l'oggetto selezionato**, mai tutte le miniature.
- **L'avatar resta leggibile**: il cerchio dell'avatar occupa almeno il 70% della misura per tutte le cornici (oggi `r` va da 0,35 a 0,42 della misura, cioè dal 70% all'84% di diametro). L'ornamento che sporge non copre mai il simbolo.
- Gli stessi gradini valgono per cornici, panni (in vetrina), tavolini e dorsi. Per i dorsi l'ornamento resta nell'immagine cotta da `make-art.mjs`, e la vetrina aggiunge solo il riflesso (mai filtri sulle carte).

### 5.8 Movimento

Le curve sono quelle di `motion.ts`: `ease.in` per ciò che arriva, `ease.out` per ciò che esce, `ease.move` per ciò che si sposta. Niente molle, niente rimbalzi, niente oltre-e-ritorno. Ai tempi esistenti (`press` 110, `quick` 180, `enter` 280, `exit` 180, `card` 380) si aggiungono, in `src/ui/arte/movimento.ts`:

| Token | ms | Curva | Uso |
|---|---|---|---|
| `rivela` | 420 | `ease.in` | un oggetto eroe che entra (avatar nel profilo, oggetto in teca) |
| `posa` | 280 | `ease.in` | un oggetto che si appoggia (equipaggia): sale di 8 px e scende, l'ombra passa da primo piano a oggetto |
| `timbro` | 180 | `ease.in` | ceralacca o timbro: da scala 1,12 a 1 e opacità da 0 a 1 (arriva dall'alto e si ferma, non torna indietro) |
| `volo` | 520 | `ease.move` | monete che volano al contatore |
| `sipario` | 900 | `ease.inOut` | apertura del velluto nello svelamento |
| `scena` | 1100 | `ease.in` | i piani dell'arena che si posano (scaglionati di 120) |
| `riflesso` | 1200 | `ease.move` | la banda di luce che attraversa un metallo |
| `pausaRiflesso` | 6000–8000 | — | tra due passaggi (6 s leggendario, 8 s epico) |
| `respiro` | 4000–6000 | `ease.move`, avanti e indietro | fiammelle, tende, nuvole, gemme: ampiezza piccola (opacità ±0,2, spostamento ≤ 6 px) |
| `scaglione` | 40 | — | intervallo tra elementi di una lista che entrano (al massimo 6 elementi scaglionati, poi tutti insieme) |

**Cosa può avere un'animazione ambientale** (continua, lenta): i piani e gli elementi di vita delle scene d'arena; i metalli dall'epico in su; le particelle dal leggendario in su; la lampara e le candele nelle scene. **Sempre e solo in vetrina**: scena d'arena aperta, profilo, palco della personalizzazione, teca, svelamento.

**Cosa non si anima mai da solo**: testi, pulsanti, barre (si muovono solo quando il valore cambia), icone della navigazione, liste, il tavolo durante la partita, le carte, qualsiasi cosa sotto i 48 punti. Niente scala che pulsa.

**Budget per schermata**: al massimo **6 elementi animati insieme**, uno solo «eroe» (gli altri sono di contorno); particelle ≤ 24 per oggetto e ≤ 40 per schermata. Le animazioni ambientali si fermano (`useAmbient`, vedi `tecnologie-grafica.md`) con «riduci movimento», quando la schermata non è a fuoco, quando l'app va in background, quando l'oggetto esce dalla vista. Fermandosi lasciano il fotogramma «bello» (riflesso fuori dalla sagoma, fiamma piena).

**Riduci movimento**: niente animazioni ambientali, niente particelle, niente voli. Le entrate diventano dissolvenze da `dur.quick`; lo svelamento va dritto allo stato finale in una dissolvenza da 280 ms.

### 5.9 Transizioni e apertura delle schermate

- **Le schermate di vetrina** (profilo, personalizzazione, bacheca delle missioni, arena aperta) si aprono con una dissolvenza dal bruno (`animation: 'fade'` nelle opzioni della loro `Stack.Screen`, dichiarate dentro il file della schermata, così non si tocca `_layout.tsx`), poi **la luce si accende**:

```
t =   0 ms  fondo (Sala) a pieno, lampada spenta
t =   0     la pozza di luce sale da 0 a 0,22 in 420 ms
t =  80     superfici: da +12 px e opacità 0 a posto (280 ms, ease.in)
t = 160     oggetto eroe: rivela (420 ms)
t = 240     resto: scaglionato di 40 ms, al massimo 6 elementi
uscita      dissolvenza 180 ms (ease.out)
```

- **Schede dentro una schermata** (per esempio Tavolino / Panno / Dorso nella personalizzazione): il contenuto si scambia con una dissolvenza da 180 ms. Il palco resta fermo (continuità dello spazio).
- **Tra le sezioni dell'hub** non cambia niente in Fase B: `Hub.tsx` è dell'altro agente.

### 5.10 Feedback alle interazioni

| Azione | Cosa si vede | Tempi | Suono e vibrazione (esistenti) |
|---|---|---|---|
| Tocco su un pulsante di materiale | `Squish` (scala 0,96) e il rilievo si inverte: il filo chiaro passa in basso e quello scuro in alto, il pulsante sembra premuto | 110 entrata, 180 ritorno | `tick` |
| Selezione di un oggetto in griglia | un anello d'ottone si disegna intorno (opacità + tratto), l'oggetto sale a primo piano (cambia ombra) e il precedente torna giù | 180 | `tick` |
| Prova (personalizzazione) | il palco scambia il pezzo con una dissolvenza incrociata; ceralacca «In prova» con il `timbro` | 280 + 180 | `tick` |
| Equipaggia | l'oggetto si `posa` sul palco, ceralacca «In uso» sulla miniatura | 280 + 180 | `buy` (vibrazione leggera) |
| Compra | il cartellino del prezzo si gira e diventa «Tuo»; le monete partono dal contatore verso l'oggetto (al contrario del riscuotere) | 520 | `buy` |
| Missione completata | timbro «Fatta» sul biglietto; la busta della ricompensa diventa d'oro (`stato.pronto`) | 180 | `trophy` |
| Riscuoti | 5–8 monete volano dalla busta al contatore in alto, il contatore conta (`CountUp`), il biglietto si piega e scurisce. **Si può toccare la riscossione successiva subito**: le animazioni si sovrappongono e non bloccano | 520 | `coin` |
| Riscuoti tutto | come sopra, scaglionato di 120 ms per biglietto, un solo conteggio finale | ≤ 1200 in tutto | `coin` una volta |
| Bloccato | il lucchetto fa un mezzo giro e torna (spostamento di 4 px, `ease.move`, una volta: è un «no», non un rimbalzo) | 180 | `nope` |

### 5.11 Presentazione delle ricompense

Tre misure. La misura dipende da cosa si è vinto, non dal contesto.

| Misura | Quando | Forma | Durata | Blocca? |
|---|---|---|---|---|
| **Piccola** | monete di vittoria e di missione, bonus giornaliero, oggetto comune o non comune | monete in volo verso il contatore + conteggio; l'oggetto entra nella sua miniatura con `posa` | ≤ 700 ms | no |
| **Media** | oggetto raro, achievement bronzo e argento, livello, traguardo di stagione o di evento | targa d'ottone che scende dall'alto (il `Banner` di oggi, rifatto in Fase D) con l'oggetto in miniatura illuminato | 2,4 s, si chiude toccando | no |
| **Grande** | oggetto epico o superiore, set completato, achievement oro e platino, lega, capitolo, **nuova arena** | **la teca**: velo, l'oggetto su un cuscino di velluto sotto la lampada, la luce che si accende, nome in Bodoni, targhetta della rarità, un riflesso; particelle solo da leggendario; pulsanti «Usalo» e «Avanti» | pulsanti entro 2,0 s (2,5 per l'arena); un tocco salta alla fine | sì, ma si chiude subito |

Regole:

- **Una festa alla volta.** Se ne arrivano più insieme, si mostra la più grande e le altre diventano una riga dentro di essa («e 3 achievement»), invece di sovrapporsi come oggi.
- **I coriandoli restano solo per vincere una partita** (scopa, cappotto, vittoria al tavolo). Mai sopra una sconfitta: quando si perde, le feste degli achievement aspettano che il riepilogo si chiuda (da concordare con l'altro agente, `Summary.tsx` e `Overlays.tsx`).
- **Vittoria normale**: rapida. Risultato, trofei (+20 che vola sulla strada delle arene), monete (piccola), «Rivincita» subito disponibile.

### 5.12 Lo sblocco di un'arena in cinque passi

La sequenza resta breve: pulsanti entro **2,5 s**, un tocco in qualsiasi momento salta alla fine. Con «riduci movimento» si va subito al passo 5 con una dissolvenza.

| Passo | Cosa succede | Tempo | Dove |
|---|---|---|---|
| 1. Il requisito è completato | nel riepilogo della partita la barra dei trofei arriva in fondo, e la targhetta dell'arena successiva sulla strada si accende | durante il riepilogo | `Summary.tsx`: da fare insieme all'altro agente. Intanto lo svelamento aspetta, come oggi, che si lasci il tavolo |
| 2. Il segnale | lo schermo si spegne nel bruno (velo all'84%); suono `arena` e vibrazione; un filetto d'ottone si apre in orizzontale al centro; occhiello «Nuova arena» | 0–500 ms | `ArenaReveal.tsx` |
| 3. La transizione | due teli di velluto si aprono ai lati (sipario). Dietro, i piani dell'arena si posano uno alla volta (cielo, sfondo, mezzo, tavolo), ognuno da un po' più lontano: è la «camera» che arriva. La lampada sopra il tavolo si accende per ultima | 500–1700 ms | `ArenaReveal.tsx` + `ArenaScene` a piani |
| 4. Nome e prestigio | targa sotto la scena: «Arena 14 · Capitolo III» (occhiello), il nome in Bodoni 40 su cui passa un riflesso, una sola volta; cinque sigilli di ceralacca per i capitoli, con quelli raggiunti pieni; «14 di 30» | 1700–2300 ms | idem |
| 5. Esplora o continua | ricompense nella misura giusta (oggetto in piccola teca, monete); se si chiude un capitolo, «Capitolo III completato · +500». Pulsanti: **«Esplora l'arena»** (apre l'arena a tutto schermo con la vita ambientale e il tuo tavolo) e **«Continua»** | dal 2300 ms | idem + nuova schermata `src/app/arena/[id].tsx` |

### 5.13 La crescita delle 30 arene, capitolo per capitolo

La qualità è la stessa dalla prima all'ultima; crescono luce, materiali e vita.

| Capitolo | Mondo | Palette | Materiali | Luce | Vita (elementi animati in vetrina) | Inquadratura |
|---|---|---|---|---|---|---|
| I · Le origini | il borgo | tufo, terracotta, verde persiana, cielo del pomeriggio (qui vive il tramonto) | intonaco, legno grezzo, paglia, maiolica semplice | sole basso del pomeriggio + una lampadina sopra il tavolo | **1**: la tenda che si muove, il vapore del caffè, i colombi | frontale, vicina, ad altezza d'uomo |
| II · I giocatori esperti | il circolo | noce, bordeaux, oro vecchio | noce lucidato, ottone, velluto, specchi | sera dorata, lampadari | **2**: il lampadario che scintilla, l'acqua del canale a Venezia | un poco più alta, la sala si apre |
| III · Il prestigio | la reggia | blu notte, porpora, oro, bianco marmo | cristallo, marmo, porpora, foglia d'oro | luna fredda dalle finestre contro la lampada calda | **3**: riflessi del cristallo, una tenda, la lampara nel golfo | dal fondo della sala: profondità e simmetria |
| IV · I maestri | il santuario | pietra, cera, turchese delle vetrate | pietra, ferro battuto, vetro colorato, cera | candele e un raggio dall'alto | **3–4**: fiammelle, polvere nel raggio (≤ 12 particelle), vetrata che respira | dal basso, le volte sopra |
| V · Le leggende | l'olimpo | **blu notte profondo, oro, madreperla, corallo** (meno viola di oggi) | oro zecchino, madreperla, corallo, marmo bianco | luce che sale dal tavolo stesso, stelle | **4** + particelle (stelle cadenti, granelli d'oro ≤ 24) | ampia, il tavolo in cima al mondo |

Le arene non raggiunte non diventano più grigie (`night()`): diventano **la stessa sala con le luci spente**. Restano la sagoma e la lampada spenta sopra il tavolo, e una sola luce di servizio fa intravedere i materiali. Si capisce cosa si vincerà.

### 5.14 L'arena del prototipo: «Il Club dei Signori»

**Perché questa**: ha già la lampada da banchiere verde sopra il tavolo, che è la metafora di Lampara. Ha quasi tutti i materiali del sistema (cuoio, noce, ottone, velluto delle tende, marmo del busto, luna fredda contro lampada calda). È al Capitolo III, a metà strada, quindi dimostra sia il «fascino accessibile» sia il «prestigio». È quella che si vede in tutte le foto di `check:hub` (il profilo di prova è all'arena 13), quindi il prima/dopo è immediato. E lo svelamento verso l'arena successiva (Sala di Cristallo) è il caso reale più frequente nelle prove.

**Composizione a piani** (ogni piano è un `Svg` separato, per la parallasse):

```
┌──────────────────────────────────────────────┐
│ P0 CIELO: notte sul golfo, Vesuvio in sagoma,│  parallasse 0,2
│    la luna, una lampara sull'acqua           │  vita: la lampara ondeggia
├──────┬────────────────────────────┬──────────┤
│ P1   │  finestra ad arco, tende   │   P1     │  parallasse 0,5
│ libre│  di velluto blu            │ librerie │  vita: una tenda si muove
│ rie  │                            │          │
├──────┴──────────╥─────────────────┴──────────┤
│ P2 poltrone di cuoio, busto di marmo, globo  │  parallasse 0,8
│                 ║ lampada verde              │  la luce cade a cono sul tavolo
│        ┌────────╨─────────┐                  │
│ P3     │ TAVOLO EQUIPAGGIATO in prospettiva  │  parallasse 1
│        │ (FeltArt + rotateX), dorsi coperti  │  vita: polvere nel cono (solo «Esplora»)
│        └──────────────────┘ ombra ellittica  │
├──────────────────────────────────────────────┤
│ P4 primo piano: bracciolo di una poltrona,   │  parallasse 1,15, sfocato con un velo scuro
│    fuori fuoco ai bordi                      │
└──────────────────────────────────────────────┘
```

- **Il tavolo integrato**: il tavolino equipaggiato (`FeltArt`, con la tua sponda e il tuo panno) si mette *dentro* la scena, in prospettiva (`transform: [{perspective: 900}, {rotateX: '55deg'}]`), sul pavimento della scena, con le gambe disegnate in SVG e un'ombra ellittica sotto. Sopra solo il mazzetto coperto con il tuo dorso: **niente scansioni delle carte in prospettiva**, la regola delle carte resta. (Da verificare su react-native-web che `perspective` + `rotateX` diano lo stesso risultato: se no, si disegna il trapezio in SVG con il panno come `Pattern`.)
- **Luce**: luna fredda dalla finestra (`#CFE2FF`, cono sul pavimento come oggi) contro la lampada calda sul tavolo (`#FFD9A0`). Il tavolo è la cosa più luminosa della scena.
- **Nella home** (`Gioca.tsx` è dell'altro agente) l'arena resta statica e con il tavolino sovrapposto come oggi, finché non si concorda di passare `tavolo` ad `ArenaScene` (una riga). Le scene migliorate però si vedono subito anche nella home, perché la firma di `ArenaScene` non cambia.

### 5.15 Il profilo come vetrina

**Sfondo del profilo, senza toccare `src/meta`**: lo sfondo è **la sala dell'arena più alta raggiunta**, presa da `PublicProfile.arena`, che esiste già ed è pubblico. Quindi il profilo degli altri lo mostra fedelmente. Si usa la scena dell'arena con la Sala sopra (velo scuro al 40% e la pozza di luce): l'arena dice quanto hai giocato, prima ancora dei numeri. Un vero cosmetico «sfondo» scelto dal giocatore richiede una decisione di Giuseppe (sezione 9).

**Composizione** (telefono 393×852; sopra la piega anche sul 375×667):

```
┌─────────────────────────────────────┐
│ ‹                       ◉ 5400      │ barra (livello 2)
│░░░░░ SCENA DELL'ARENA (livello 0–1) ░│ altezza ≈ 42% dello schermo
│░░░░░ pozza di luce sull'avatar ░░░░░░│ parallasse sullo scorrimento
│░░░░░░░░░╭──────────╮░░░░░░░░░░░░░░░░│
│░░░░░░░░░│  AVATAR  │ cornice 140 pt ░│ livello 3; riflesso se ≥ epico
│░░░░░░░░░╰────23────╯░░░░░░░░░░░░░░░░│ badge del livello = medaglia d'ottone
│ ════ Giuseppe ════  (Bodoni 32)      │ targa d'ottone (livello 2)
│   ❦ Re del Circolo ❦  (cartiglio)    │ titolo su nastro di carta
│ 🏆 1260 · Arena 13 Club dei Signori  │ una riga, numeri in Sora 700
├─────────────────────────────────────┤ mensola di noce (filetto d'ottone)
│ VETRINA  [velluto][velluto][velluto] │ tre nicchie, oggetti a livello 3
│           dorso    cornice  tavolino │ il primo a livello 4 (eroe)
├─────────────────────────────────────┤
│ LIBRO MASTRO (carta avorio)          │ statistiche per gioco, leghe
│  Tressette  50 · 60% · Carlino 1182 │ come colonne di un registro
│  Briscola   45 · 58% · Carlino 1064 │
│  Scopa      45 · 58% · in prova 4/10│
├─────────────────────────────────────┤
│ MEDAGLIERE  bronzo 24 argento 12 …   │ medaglie vere per livello (Medal)
│ LEGHE PASSATE  monete della lega     │ LeagueCoin in fila
│ COLLEZIONE  4 cassetti con contatore │ tavolini, panni, dorsi, cornici
├─────────────────────────────────────┤
│ [ Personalizza ]   [ Scegli vetrina ]│ ottone / noce
└─────────────────────────────────────┘
```

- **Gerarchia**: chi sei (avatar, nome, titolo), poi quanto sei arrivato (arena, trofei), poi cosa possiedi di più bello (vetrina), poi i numeri.
- **Vita** (≤ 4): parallasse della scena (1), la vita dell'arena in versione ridotta (1), il riflesso della cornice se epica o superiore (1), il primo oggetto della vetrina se ha un riflesso (1).
- **Gli oggetti equipaggiati**: sul proprio profilo il terzo posto libero della vetrina mostra il tavolo in uso. Per gli altri si vede solo ciò che `publicOf` rende pubblico (avatar, cornice, titolo, vetrina, arena). Rendere pubblici tavolino, panno e dorso equipaggiati è una decisione di Giuseppe (sezione 9).
- **Desktop**: la scena diventa larga (3:1, tutta la tela) e la colonna di contenuto resta di 560 punti, sopra la scena e non su un fondo vuoto.

### 5.16 La personalizzazione: «Il tuo tavolo»

Una schermata sola dove si provano insieme tavolino, panno, dorso, cornice e avatar prima di comprare o equipaggiare. Rotta nuova: `/personalizza` (con `?posto=felt&id=…` per arrivarci da un oggetto del negozio o da una ricompensa).

```
┌─────────────────────────────────────┐
│ ‹  Il tuo tavolo            ◉ 5400  │
│░░░░░░░░ PALCO (Sala + lampada) ░░░░░│ livello 0–4
│░░  ◯ avatar+cornice al suo posto ░░░│ come si vede al tavolo
│░░ ┌──────────────────────────────┐░│
│░░ │ TAVOLINO + PANNO (in grande) │░│ il panno si vede tutto:
│░░ │    mazzetto col tuo dorso    │░│ carte piccole in un angolo,
│░░ └──────────────────────────────┘░│ mai al centro del disegno
│░░  [ceralacca: In prova]          ░│
├─────────────────────────────────────┤
│ Tavolino · Panno · Dorso · Cornice · Avatar │ schede (sotto: dissolvenza)
├─────────────────────────────────────┤
│ ▢ ▢ ▢ ▢  griglia: tuoi prima,       │ miniature statiche;
│ ▢ ▢ ▢ ▢  poi da comprare, poi       │ la selezionata a livello 4
│ ▢ ▢ ▢ ▢  da vincere (con «come»)    │ «in arrivo»: visibili, non provabili
├─────────────────────────────────────┤
│ [ Torna al tuo ]  [ Usa · Compra 1200 ]│ barra fissa in basso
└─────────────────────────────────────┘
```

- **Provare non cambia niente**: lo stato «in prova» è locale alla schermata. «Usa» chiama `equip` (esiste); «Compra» chiama `buyItem` e poi `equip` (esistono). Nessuna regola nuova.
- Si possono provare più pezzi insieme; la barra in basso dice cosa manca («2 pezzi da comprare · 3200») e si compra un pezzo alla volta, come oggi.
- Le cornici si provano sull'avatar al suo posto sul palco, e anche in piccolo come in classifica (32 pt), per vedere che restano pulite.
- Il palco è anche la «vetrina» degli oggetti rari: animazioni secondo la rarità (sezione 5.7) solo sul pezzo appena provato.

### 5.17 Le missioni: «La bacheca del circolo»

**Oggetto-metafora**: la bacheca di sughero del circolo, con la cornice di noce, sotto la lampada. Sopra ci sono biglietti di carta appuntati con puntine d'ottone. Il segnapunti (la carta con le tacche a matita che si usa al tavolo) dà la forma alla barra.

| Tipo | Forma | Materiale | Dove |
|---|---|---|---|
| **Del giorno** (3) | biglietto piccolo, una puntina, un po' storto (±1,5°, fisso con `seeded`) | carta avorio; frase in Sora, numero in Bodoni | prima fila |
| **Della settimana** (4) | locandina più grande, due puntine, intestazione tipografica con filetto rosso | carta più spessa (`#E4D4B4`), cornice tipografica | seconda fila |
| **Speciali** (l'evento in corso da `events.ts`) | manifesto con sigillo di ceralacca e i tre traguardi | carta + ceralacca + nastro | in alto, se c'è un evento |

**Ogni biglietto ha**: un'icona di smalto (cloisonné d'ottone) per il tipo di obiettivo (vinci, gioca, scopa, settebello, online…); la frase; **l'avanzamento** come tacche da segnapunti per obiettivi fino a 5 (`||||`) e come una linea a matita su un binario stampato oltre i 5, sempre con «2/5» scritto; **la ricompensa** in una busta appuntata a destra (monete e punti esperienza, numero in Sora 700 a 16 pt: è la seconda cosa che si legge dopo la frase).

**Stati**

| Stato | Come si vede |
|---|---|
| Da fare | biglietto pulito, busta chiusa color carta |
| In corso | tacche a matita / linea, numero |
| Fatta, da riscuotere | timbro di ceralacca «Fatta» (`timbro`), la busta diventa d'oro (`stato.pronto`) con un riflesso solo, una volta |
| Riscossa | il biglietto si piega in basso a destra (orecchia), opacità 0,6, spunta a matita; resta al suo posto |
| Cambiabile (una al giorno) | piccolo pulsante d'ottone con le frecce sulla puntina; dopo il cambio scompare |

**Riscossione rapida**: si tocca la busta → monete in volo verso il contatore (`volo`, 520 ms), e si può toccare subito la busta successiva. «Riscuoti tutto (260)» sta in basso, fisso, e scaglia le buste in 120 ms ciascuna. Niente fogli o teche per le missioni: sono ricompense piccole.

**Nella home** (`Missions.tsx`, stesse props `{width}`): la bacheca in miniatura, i tre biglietti del giorno in fila, le stesse buste, e «Apri la bacheca» porta alla rotta nuova `/missioni`.

**Altezza fissa delle righe**: completare o riscuotere non sposta niente (oggi `ROW_H = 58`; il biglietto avrà la sua altezza fissa).

---

## 6. Come verificare (vale per tutti i pacchetti)

- `npm run check` (tipi, lint, test) deve passare.
- Foto a 393×852, 375×667 e 1280×800 di ogni schermata toccata, **guardate davvero**. Ogni pacchetto ha il suo script di foto (sotto) che usa l'aiuto comune di B0.
- **Niente che si sposta**: gli elementi chiave hanno `testID="fisso-…"` e lo script confronta la loro posizione a 0,5 s e a 3 s dall'apertura, come fa `visual-check.mjs` con `fixed-`.
- **Riduci movimento**: ogni script fa anche una foto con `reducedMotion: 'reduce'` (opzione di Playwright `newContext`) e controlla che le animazioni ambientali non partano (stesso fotogramma a 1 s e a 4 s).
- **Prestazioni** (web, CPU 4× più lenta): frame p95 ≤ 20 ms e nessun task lungo oltre i 50 ms in 3 s di vetrina (budget di `tecnologie-grafica.md`).
- **Nessun `Math.random`** nei file nuovi (`grep`), particelle e storture con `seeded()`.
- **Contrasto**: le coppie testo/fondo dei componenti nuovi stanno nella tabella 5.1 oppure in un test di B0 che calcola il rapporto.

---

## 7. Piano di lavoro per la Fase B

Cinque pacchetti. **B0 si fa per primo e da solo**; poi B1, B2, B3 e B4 vanno in parallelo. Nessun file è toccato da due pacchetti. Se un pacchetto ha bisogno di qualcosa in un file di un altro, lo chiede all'orchestratore invece di modificarlo.

Confini con l'altro agente (da `regole-comuni.md`), validi per tutti: non si toccano `src/engine/**`, `src/state/**`, `src/online/**`, `supabase/**`, `src/meta/**`, `src/app/gioca/**`, `src/app/online.tsx`, `src/app/stanza/**`, `src/app/tavolo.tsx`, `src/sections/Gioca.tsx`, `GameTiles.tsx`, `Classifica.tsx`, `Hub.tsx`, `src/game/Summary.tsx`, `Board.tsx`, `layout.ts`, `CardSprite.tsx`, `package.json`. `theme.ts`, `kit.tsx`, `motion.ts`: nessuna modifica in Fase B (nemmeno aggiunte: tutto va in `src/ui/arte/`). Inoltre, in Fase B, **`src/game/Felt.tsx`, `feltDesigns.ts`, `backImages.ts`, `cardImages.ts` e `scripts/make-art.mjs` restano fermi**: cambierebbero il tavolo durante la partita.

### B0 · La base comune (`src/ui/arte/`)

**File in esclusiva**

- `src/ui/arte/token.ts`: palette a tre livelli (5.1), tipografia (5.2), raggi nuovi (superficie 14, targa 10, carta 4, biglietto 3), livelli e ombre (5.4, 5.5).
- `src/ui/arte/luce.ts`: direzione della luce, `ombra(livello)`, colori di lampada e rimbalzo.
- `src/ui/arte/materiali.tsx`: `Superficie` (`materiale = noce | ottone | carta | velluto | cuoio | marmo | sughero | smalto`), `Filetto`, `Targa` (ottone con testo inciso), `Cartiglio` (nastro del titolo), `Sigillo` (ceralacca con testo o simbolo), `Lampada` (pozza di luce), `Sala` (fondo completo, con `tinta` opzionale).
- `src/ui/arte/rarita.ts` e `src/ui/arte/TarghettaRarita.tsx`: la scala 5.7 come dati (materiale, quattro stop di metallo, quanti movimenti, quante particelle, misura della presentazione) e la `TarghettaRarita`.
- `src/ui/arte/movimento.ts`: i token 5.8 (importa `dur` ed `ease` da `motion.ts`).
- `src/ui/arte/useAmbient.ts`: l'interruttore unico delle animazioni ambientali (riduci movimento, fuoco, `AppState`, prop `attivo`).
- `src/ui/arte/Riflesso.tsx` (banda di luce che passa dentro una sagoma: rettangolo arrotondato, cerchio o path), `Parallasse.tsx` (strati con fattore, guidati da uno scorrimento o fermi), `Scintille.tsx` (≤ 24, `seeded`), `Respiro.tsx` (ciclo lento di opacità o spostamento).
- `src/ui/arte/Ricompensa.tsx`: `MoneteInVolo` (da un punto a un altro, con `CountUp` alla fine), `Teca` (l'oggetto su velluto sotto la lampada: il guscio della presentazione grande, che si riempie con qualsiasi contenuto).
- `src/ui/arte/Pulsante.tsx`: pulsanti di materiale (ottone principale, noce secondario, testo terziario, ceralacca pericolo), con il rilievo che si inverte al tocco e gli stessi `accessibilityRole`/`State` di `kit.Button`.
- `src/ui/arte/trame.ts` (generato) e `assets/arte/trame/*.webp`.
- `scripts/make-materiali.mjs`: cuoce le trame neutre con resvg, converte in WebP con Pillow (`python3`), scrive `trame.ts` e un foglio di controllo `assets/arte/trame/foglio.png`.
- `scripts/foto-lib.mjs`: l'aiuto per le foto (server di `dist/`, profili di prova, tre schermi, controllo dei `fisso-`, foto con riduci movimento) che usano gli script dei pacchetti. Contiene anche `audit-shots.mjs` di questa fase.
- `src/app/dev/arte.tsx`: la pagina di controllo con tutti i materiali, le sei rarità su un campione, le ombre per livello, la tipografia e i pulsanti.
- `src/ui/arte/__tests__/contrasto.test.ts`: calcola i rapporti delle coppie dichiarate in `token.ts` (≥ 4,5, oppure ≥ 3 se marcate «grande»).
- `src/app/_layout.tsx`: **solo** aggiungere a `useFonts` `BodoniModa_600SemiBold`, `BodoniModa_700Bold`, `BodoniModa_800ExtraBold`.

**Non tocca**: tutto il resto. In particolare `theme.ts`, `kit.tsx`, `motion.ts`, `Backdrop`.

**Riserva per gli altri pacchetti**: dentro `src/ui/arte/` B0 **non** crea `arene.ts` (è di B1) né `cornici.ts`, `oggetti.ts` (sono di B3). Sono i file dei dati visivi indicizzati per id che `regole-comuni.md` chiede di mettere sotto `src/ui/arte/`.

**Criteri di accettazione**

- `npm run check` passa; il test dei contrasti passa.
- `/dev/arte` fotografata sui tre schermi: ogni materiale si riconosce senza leggere l'etichetta (legno, ottone, carta, velluto, cuoio, marmo, sughero, smalto); le sei rarità sono in ordine evidente anche in scala di grigi.
- Trame: ≤ 400 KB in tutto in `assets/arte/`, ognuna ≤ 60 KB.
- JS aggiunto al sito ≤ 25 KB gzip (somma dei `.js` in `dist/_expo/static/js/web` prima e dopo).
- Con `reducedMotion: 'reduce'`, `Riflesso`, `Respiro` e `Scintille` non partono (stesso fotogramma a 1 s e a 4 s).
- Ogni export è documentato in testa al suo file (cosa fa, props, budget). La lista degli export è il **contratto** per B1–B4: dopo la consegna non cambia senza passare dall'orchestratore.

### B1 · Arena rappresentativa e sequenza di sblocco

**File in esclusiva**

- `src/ui/ArenaScene.tsx`: firma invariata `{ id, width, height, dim }`; si aggiungono props opzionali `vivo?: boolean` (default `false`), `tavolo?: { table; felt; back }`, `scorrimento?: SharedValue<number>`. Le altre 29 arene passano da qui senza cambiare aspetto.
- `src/ui/arene/kit.tsx`: solo aggiunte (piani, prospettiva del tavolo, luce a cono). Le funzioni esistenti restano identiche.
- `src/ui/arene/reggia.tsx`: solo `ClubDeiSignori` (che diventa un rinvio alla nuova cartella).
- `src/ui/arene/club/**` (nuovo): i piani del Club dei Signori.
- `src/ui/arte/arene.ts` (nuovo): dati visivi delle arene per id (capitolo, palette, luce, elementi di vita), per ora pieni solo per il Club.
- `src/ui/ArenaReveal.tsx`: la sequenza 5.12 (props invariate `{ arena, onClose }`).
- `src/app/arena/[id].tsx` (nuovo): l'arena a tutto schermo, «Esplora».
- `src/sections/Trofei.tsx`: **solo** `ArenaStop`, toccando una scheda raggiunta si apre `/arena/[id]` (e le arene non raggiunte con «luci spente», se fatto in `ArenaScene`).
- `src/app/dev/arene.tsx`; `scripts/foto-arena.mjs` (nuovo).

**Non tocca**: `Gioca.tsx`, `Overlays.tsx`, `Classifica.tsx`, gli altri file di `arene/`, `cosmetics.tsx`, `Felt.tsx` (usa `FeltArt` così com'è).

**Usa da B0**: `Sala`, `Lampada`, `Parallasse`, `Respiro`, `Scintille`, `Riflesso`, `Targa`, `Sigillo`, `Teca`, `MoneteInVolo`, `Pulsante`, `useAmbient`, `movimento`.

**Criteri di accettazione**

- In `/arena/club-dei-signori`: 4 piani più il primo piano, parallasse, il tavolino **equipaggiato** dentro la scena in prospettiva con ombra di contatto, lampada calda contro luna fredda, ≤ 3 elementi di vita (≤ 4 con la polvere in «Esplora»). Si fermano con riduci movimento e quando la schermata non è a fuoco.
- Le altre 29 arene in `/dev/arene` sono **identiche** a prima, controllato con un confronto pixel per pixel delle foto (tolleranza per l'antialiasing), salvo l'eventuale «luci spente» se viene applicato a tutte.
- Home, Trofei e Classifica (che non si toccano) mostrano il Club nuovo senza errori: `npm run check:hub` passa.
- Svelamento: pulsanti visibili entro 2,5 s; un tocco a 0,8 s porta allo stato finale; con riduci movimento lo stato finale arriva in ≤ 300 ms; nessun coriandolo davanti al nome.
- Prestazioni dell'arena aperta: frame p95 ≤ 20 ms (web, CPU 4×).
- Foto: `dev/arene?capitolo=3`, `/arena/club-dei-signori` e lo svelamento (profilo di prova da 1260 a 1300 trofei, come in `audit-shots.mjs`) sui tre schermi.

### B2 · Il profilo come vetrina (il proprio e quello degli altri)

**File in esclusiva**

- `src/app/profilo.tsx`, `src/app/giocatore/[id].tsx`.
- `src/ui/competition.tsx` (`GameStats`, `ShowcaseTile`, `Showcase`, `LeagueHistory` possono cambiare aspetto; le firme degli export usati altrove (`GAME_LABEL`, `GAMES`, `LeagueCoin`) restano identiche, perché `Classifica.tsx` e `Overlays.tsx` le usano).
- `src/ui/ProfileEditor.tsx`: la scheda «Vetrina» diventa il posto per scegliere le tre cose esposte; «Avatar» e «Cornice» portano a `/personalizza?posto=…` (la rotta di B3; il nome è fissato qui).
- `src/ui/profilo/**` (nuovo): `VetrinaProfilo` (la composizione 5.15, usata da tutte e due le rotte a partire da un `PublicProfile` più gli extra «solo tuoi»), `LibroMastro`, `Medagliere`, `Cassetti`.
- `src/app/dev/sociale.tsx` (aggiungere un profilo pubblico di prova completo); `scripts/foto-profilo.mjs` (nuovo).

**Non tocca**: `avatar.tsx` e `cosmetics.tsx` (sono di B3: il profilo usa `PlayerAvatar` e `ItemPreview` così come sono, e vedrà le cornici nuove quando B3 le consegna), `ArenaScene.tsx` (di B1: la usa con la firma di oggi; la parallasse la fa `Parallasse` di B0 intorno alla scena. Quando B1 consegna la prop `vivo`, B2 la attiva con una riga), `src/meta/**`.

**Usa da B0**: `Sala`, `Lampada`, `Parallasse`, `Superficie` (noce, velluto, carta), `Targa`, `Cartiglio`, `Riflesso`, `Pulsante`, `useAmbient`, `token`.

**Criteri di accettazione**

- Sul 375×667, sopra la piega: avatar con la cornice (≥ 128 pt), nome, titolo, trofei e arena, e l'inizio della vetrina.
- Lo sfondo è l'arena raggiunta (`pub.arena`); sul profilo di un altro (`/dev/sociale` o `giocatore/[id]` con dati di prova) si vede la sua arena, la sua cornice, il suo titolo, la sua vetrina, senza un solo dato che non stia in `PublicProfile`.
- ≤ 4 elementi animati; fermi con riduci movimento; niente si sposta (`fisso-avatar`, `fisso-nome`, `fisso-vetrina`).
- Tutte le funzioni di oggi restano: modifica della vetrina, titolo (porta a Trofei), statistiche per gioco, leghe passate, collezione e set, accesso e uscita dall'account, aggiungi o rimuovi amico, sfide.
- Desktop: la scena occupa la larghezza e la colonna resta di 560 punti.
- Foto: profilo (in alto e in fondo), profilo di un altro, scheda Vetrina dell'editor, sui tre schermi.

### B3 · Personalizzazione dei cosmetici con anteprima

**File in esclusiva**

- `src/app/personalizza.tsx` (nuovo): la schermata 5.16, con i parametri `posto` e `id`.
- `src/ui/camerino/**` (nuovo): `Palco`, `GrigliaOggetti`, `BarraAcquisto`.
- `src/ui/avatar.tsx`: le cornici secondo la scala delle rarità (rilievo, smalti, incastonature, ornamenti; riflesso e particelle solo da epico in su e solo ≥ 64 pt) e i fondi degli avatar più «da mazzo». **Firma di `PlayerAvatar` invariata**: lo usano 15 file, tra cui schermate dell'altro agente.
- `src/ui/cosmetics.tsx`: anteprime con il materiale (trama cotta sul panno in vetrina, carte spostate in un angolo per lasciar vedere il disegno, `BackPreview` con lo spessore della carta e il riflesso in vetrina). **Firme invariate** (`TablePreview`, `BackPreview`, `ClothPreview`, `ItemPreview`, `FramePreview`, `ComingPreview`).
- `src/ui/arte/cornici.ts`, `src/ui/arte/oggetti.ts` (nuovi): dati visivi per id (materiale, ornamento, elemento narrativo dei mitici), senza toccare il catalogo.
- `src/sections/Negozio.tsx`: **solo** il pulsante «Prova sul tuo tavolo» nella scheda dell'oggetto (va a `/personalizza?posto=…&id=…`) e, se serve, l'uso delle anteprime nuove.
- `src/app/dev/panni.tsx`, `src/app/dev/cornici.tsx` (nuovo: le 28 cornici a 140, 64 e 32 pt); `scripts/foto-camerino.mjs` (nuovo).

**Non tocca**: `Felt.tsx`, `feltDesigns.ts`, `backImages.ts`, `make-art.mjs` (il tavolo in partita resta com'è), `ProfileEditor.tsx` (di B2), `src/meta/**` (usa `equip`, `buyItem`, `itemsOf`, `sourcesOf` come sono).

**Usa da B0**: `Sala`, `Lampada`, `Superficie`, `Sigillo`, `TarghettaRarita`, `rarita`, `Riflesso`, `Scintille`, `Pulsante`, `useAmbient`, `movimento`.

**Criteri di accettazione**

- In `/personalizza` si provano insieme tavolino, panno, dorso, cornice e avatar; provare non cambia `equipped` (verificato leggendo il profilo salvato prima e dopo); «Usa» equipaggia; «Compra» passa da `buyItem` con gli stessi rifiuti di oggi (monete insufficienti, non in vendita); gli oggetti «in arrivo» si vedono ma non si provano.
- `/dev/cornici`: le sei rarità sono in ordine evidente; «Corona» (leggendaria) ha una presenza nettamente superiore a «Oro sottile» (comune); a 32 pt ogni cornice è pulita e senza animazioni; il cerchio dell'avatar è ≥ 70% della misura per tutte le 12 forme.
- Le anteprime dei panni mostrano il disegno della grafica (angoli e bordi liberi dalle carte) in negozio e sul palco.
- Le schermate che usano `PlayerAvatar` e le anteprime (hub, classifica, amici, banner) passano `npm run check:hub` senza errori e senza spostamenti.
- ≤ 6 elementi animati sul palco; fermi con riduci movimento.
- Foto: `/personalizza` su ogni scheda, `/dev/cornici`, `/dev/panni`, negozio (panni e cornici), sui tre schermi.

### B4 · Le missioni

**File in esclusiva**

- `src/sections/Missions.tsx`: la bacheca in miniatura per la home (props invariate `{ width }`).
- `src/app/missioni.tsx` (nuovo): «La bacheca del circolo» (5.17).
- `src/ui/missioni/**` (nuovo): `Biglietto`, `Locandina`, `Manifesto`, `Tacche`, `Busta`, icone di smalto per i tipi di obiettivo.
- `src/sections/HomeCards.tsx`: **solo** `ClaimsCard` (le monete in volo e il «Riscuoti tutto» con il feedback di 5.10); `EventCard` e `FriendsCard` restano come sono.
- `scripts/foto-missioni.mjs` (nuovo).

**Non tocca**: `src/meta/missions.ts`, `ledger.ts`, `profile.ts` (usa `claim`, `swapDailyMission`, `activeMissions`, `missionProgress` come sono), `events.ts` (solo lettura), `Gioca.tsx`, `Overlays.tsx`.

**Usa da B0**: `Sala`, `Lampada`, `Superficie` (sughero, noce, carta), `Sigillo`, `MoneteInVolo`, `Pulsante`, `movimento`, `useAmbient`.

**Criteri di accettazione**

- Del giorno, della settimana e speciali si distinguono **anche in scala di grigi** (forma e misura, non colore).
- Ogni missione ha: icona, frase, avanzamento con il numero, ricompensa (monete ed esperienza) leggibile prima del completamento, stato chiaro.
- Riscuotere una missione: animazione ≤ 700 ms; la busta successiva si può toccare durante l'animazione (la prova tocca tre buste in 400 ms e tutte e tre vengono riscosse); «Riscuoti tutto» con 7 buste ≤ 1,2 s.
- Completare o riscuotere non sposta niente (`fisso-biglietto-*`); la bacheca in miniatura nella home ha la stessa altezza di prima ±8 punti, per non cambiare l'impaginazione di `Gioca.tsx`.
- Restano tutte le funzioni: cambio di una missione al giorno, scadenze, missioni che si mostrano nuove al cambio del giorno.
- Riduci movimento: le monete non volano, il contatore si aggiorna con una dissolvenza.
- Foto: home (bacheca in miniatura), `/missioni` con missioni da fare, in corso, da riscuotere e riscosse (profilo di prova con `claims` e `missions.done`), sui tre schermi.

### Ordine, consegne e rischi

```
B0 ───────────────► (contratto degli export congelato)
                    ├── B1 arena + sblocco
                    ├── B2 profilo ............. vede le cornici di B3 quando arrivano
                    ├── B3 personalizzazione
                    └── B4 missioni
                                      ▼
                         Fase C: foto di tutto insieme, domande del brief
```

- **Rotte fissate ora**, così i pacchetti possono collegarsi senza toccarsi: `/arena/[id]` (B1), `/personalizza?posto=&id=` (B3), `/missioni` (B4). B2 collega il profilo a `/personalizza`.
- **Coerenza durante il prototipo**: le quattro aree nuove sono rotte fuori dall'hub, quindi passano dal Tramonto dell'hub alla Sala di Lampara. È voluto: si giudica la direzione nella Fase C prima di estenderla (il brief lo chiede).
- **Da concordare con l'altro agente** (non si fa in Fase B): il tavolo integrato nella scheda dell'arena in home (`Gioca.tsx`, una riga), il passo 1 dello svelamento nel riepilogo (`Summary.tsx`), le feste che non si sovrappongono al riepilogo di una sconfitta (`Overlays.tsx`), la Sala come fondo dell'hub e del tavolo (Fase D).
- **Script delle foto**: ognuno ha il suo file, quindi `package.json` non cambia. Si lanciano con `node scripts/foto-….mjs` dopo `npm run export:web`; l'orchestratore può aggiungerli a `package.json` alla fine.

---

## 8. Fase D, in anticipo (per non rompere niente dopo)

Quando la direzione sarà approvata: Sala come fondo dell'hub e del tavolo; pulsanti di `kit.tsx` sostituiti da `arte/Pulsante` (con lo stesso export, dopo averlo concordato); i tre giochi in smalto; banner e teca per tutte le feste; riepilogo come teca con la strada delle arene; trama cotta del panno in `Felt.tsx` (con `check:visual` sulle 8 modalità); dorsi in WebP e il nuovo dorso di partenza; le altre 29 arene a piani, capitolo per capitolo, seguendo 5.13; achievement e titoli come medagliere e cartigli; classifica con un podio vero.

---

## 9. Decisioni che spettano a Giuseppe

1. **Approvare «Lampara»** e l'abbandono del cielo arancio-viola come fondo dell'interfaccia (resta dentro le scene del Capitolo I e di Venezia). È il cambio più visibile di tutto il lavoro.
2. **Sfondo del profilo.** Tre strade:
   - a) l'arena più alta raggiunta, automatico, fedele anche per gli altri (**quello che fa la Fase B**, nessuna modifica a `src/meta`);
   - b) scegliere lo sfondo tra le arene già raggiunte: piccola modifica a `meta`, a `publicOf` e al server;
   - c) un vero cosmetico nuovo «Sala» (posto nuovo nel catalogo, nel negozio, nelle ricompense e sul server).
3. **Mostrare agli altri tavolino, panno e dorso equipaggiati** nel profilo pubblico. Oggi `publicOf` non li contiene: serve aggiungerli (modifica a `ledger.ts` e al server), altrimenti il profilo degli altri mostra solo avatar, cornice, titolo, vetrina e arena.
4. **Nomi**: «Lampara» (interno, per il progetto), «Il tuo tavolo» per la personalizzazione, «La bacheca del circolo» per le missioni.
5. **Bodoni Moda per i titoli** (già installato, licenza OFL) accanto a Sora.
6. **Arte «eroe» fatta a mano**: se in Fase C le arene vettoriali a piani non bastano, servono un illustratore (piani dipinti) o un render 3D per pochi oggetti (scrigno, trofeo di capitolo). È un costo esterno.
7. **Elementi napoletani nei mitici** (Partenope, Vesuvio, la lampara, il corno): va bene usarli come segni dei cosmetici più rari?
8. **Quando portare Lampara nell'hub e al tavolo** (Fase D), insieme all'altro agente.
