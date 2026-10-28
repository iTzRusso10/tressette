# Asset grafici da creare

Generato da `app/scripts/asset-mancanti.mjs` a partire da `app/src/meta/catalog.ts`. Non modificarlo a mano: cambia il catalogo e rilancia lo script.

Sono **26 oggetti** in catalogo con lo stato «in arrivo»: si vedono nel negozio e nell’inventario con un’anteprima onesta («In arrivo»), non si comprano e non si mettono sul tavolo finché non c’è l’illustrazione. Chi li vince (arene, achievement, eventi) li possiede già e li potrà usare appena pronti.

## Stile comune

- Direzione «Tramonto» del gioco: colori pieni e caldi, forme pulite, luce dall’alto, nessun effetto fotografico. Stessa mano per tutti gli oggetti (un solo illustratore o uno stile guida unico).
- Illustrazioni originali: niente immagini prese dal web, niente figure copiate da mazzi esistenti, niente marchi.
- La rarità si deve sentire: comune/non comune semplici; epico ricco; leggendario con oro e luce; mitico il più prezioso, ma sempre leggibile.
- Nessun oggetto dà vantaggi in partita: niente che copra o confonda valori e semi delle carte.

## Come aggiungerli

1. Tavolini e panni: un disegno nuovo in `app/src/game/Felt.tsx` (sponde: materiali ed `emblem`; panni: `designOf`), oppure un’immagine registrata come i dorsi.
2. Dorsi: il PNG in `app/assets/backs/<id>.png` e la voce in `app/src/game/backImages.ts` (lo rigenera `node scripts/make-art.mjs`).
3. Nel catalogo togli `coming` dall’oggetto: diventa «pronto», si compra (se è in vendita) e si usa. Il resto (negozio, inventario, set, achievement) non cambia.

## Tavolini (3)

- Formato: SVG vettoriale (preferito) o PNG 2048×1280 con trasparenza, solo la sponda: l’interno (il panno) deve restare vuoto/trasparente.
- La sponda sul tavolo è spessa 9 punti su un panno di circa 350×410 punti: i dettagli devono leggersi a quella misura e a 60 px di larghezza nelle anteprime.
- Si consegnano anche i quattro angoli separati (fregi) se il soggetto è sugli angoli, per poterli scalare senza deformarli.

| N. | Id | Nome | Categoria | Rarità | Tema | Palette | Si ottiene | Set |
|---|---|---|---|---|---|---|---|---|
| 23 | `drago-cremisi` | Drago Cremisi | Fantasy | Epico | Sponda in metallo rosso a squame; sugli angoli quattro teste di drago in ottone | `#A0182A` `#E05A4A` `#F3D58C` `#2A0508` | Nel negozio | Drago Cremisi |
| 32 | `cuore-di-drago` | Cuore di Drago | Fantasy | Leggendario | Sponda di ossidiana con vene di lava; al centro dei lati lunghi un cuore di drago incastonato come una gemma pulsante | `#3A0408` `#B8202A` `#FF7A5A` `#FFD27A` | Achievement «Il terrore dell’Esperto» | — |
| 37 | `fenice-eterna` | Fenice Eterna | Fantasy | Mitico | Sponda d’oro rosso; sui lati corti due fenici ad ali aperte, piume che scorrono lungo la sponda | `#B8202A` `#FF8A3D` `#FFE38A` `#FFFFFF` | Achievement «Maestro delle Missioni» | Fenice Eterna |

Note per ciascuno:

- **Drago Cremisi** (Tavolino, `drago-cremisi`): Le teste agli angoli devono leggersi anche a 40 px; squame solo come rilievo, non come disegno piatto.
- **Cuore di Drago** (Tavolino, `cuore-di-drago`): Statico (niente animazione); la luce della gemma è dipinta, non un effetto.
- **Fenice Eterna** (Tavolino, `fenice-eterna`): Le ali seguono la curva degli angoli; nessuna parte deve entrare nel panno.

## Grafiche del panno (9)

- Formato: SVG vettoriale (preferito) o PNG 2048×2400 senza sponda, angoli arrotondati applicati dal gioco.
- Le carte bianche si posano al centro e devono restare leggibili: soggetto tono su tono, contrasto basso nella zona centrale (circa 60% della larghezza), dettagli forti solo verso i bordi.
- Il gioco aggiunge sopra trama del tessuto, luce della lampada e velluto: l’illustrazione non deve averli già dipinti.

| N. | Id | Nome | Categoria | Rarità | Tema | Palette | Si ottiene | Set |
|---|---|---|---|---|---|---|---|---|
| 31 | `drago-cremisi` | Drago Cremisi | Fantasy | Leggendario | Un drago orientale che si avvolge lungo il bordo del panno, la testa in un angolo | `#5A0E18` `#B8202A` `#F3D58C` | Nel negozio | Drago Cremisi |
| 32 | `fenice-dorata` | Fenice Dorata | Fantasy | Leggendario | Una fenice ad ali spiegate al centro del panno, le piume che sfumano verso il bordo | `#5A2008` `#FF8A3D` `#FFE38A` | Nel negozio | Fenice Eterna |
| 33 | `lupo-d-argento` | Lupo d’Argento | Fantasy | Leggendario | Profilo di un lupo che ulula, inciso in argento al centro; luna piena dietro | `#222A3A` `#B9C0CC` `#F2F4F8` | Nel negozio | — |
| 34 | `serpente-imperiale` | Serpente Imperiale | Fantasy | Epico | Un serpente con corona che disegna un otto intorno al centro del tavolo | `#0F3E28` `#3FA172` `#F3D58C` | Nel negozio | — |
| 35 | `tigre-notturna` | Tigre Notturna | Fantasy | Epico | Strisce di tigre stilizzate che entrano dai bordi, occhi ambra in un angolo | `#18121F` `#FF8A3D` `#FFD27A` | Con un evento (in arrivo) | — |
| 38 | `fiamme-eterne` | Fiamme Eterne | Fantasy | Leggendario | Lingue di fuoco che salgono dal bordo inferiore e sfumano a metà tavolo | `#140806` `#E0602A` `#FFB36B` | Nel negozio | — |
| 52 | `corona-degli-assi` | Corona degli Assi | Esclusivi | Mitico | Una corona al centro formata dai quattro assi napoletani (Coppe, Denari, Spade, Bastoni) disposti a ventaglio | `#2E030A` `#F3D58C` `#FFFFFF` | Achievement «Signore dei Panni» | Il Regno degli Assi |
| 53 | `la-mano-perfetta` | La Mano Perfetta | Esclusivi | Mitico | Un ventaglio di carte coperte tenuto da una mano elegante, in oro su verde | `#0F3E28` `#F3D58C` `#F4EAD6` | Achievement «Mano Perfetta» | — |
| 54 | `i-tre-semi` | I Tre Semi | Esclusivi | Mitico | Tre emblemi intrecciati, uno per gioco (Tressette, Briscola, Scopa), in un triangolo al centro | `#17093A` `#F3D58C` `#FF8A3D` `#7FD0FF` | Achievement «Tripla Corona» | — |

Note per ciascuno:

- **Drago Cremisi** (Panno, `drago-cremisi`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.
- **Fenice Dorata** (Panno, `fenice-dorata`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.
- **Lupo d’Argento** (Panno, `lupo-d-argento`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.
- **Serpente Imperiale** (Panno, `serpente-imperiale`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.
- **Tigre Notturna** (Panno, `tigre-notturna`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.
- **Fiamme Eterne** (Panno, `fiamme-eterne`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.
- **Corona degli Assi** (Panno, `corona-degli-assi`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%. I semi devono essere quelli delle carte napoletane, disegnati da zero (non ritagliati dalle scansioni).
- **La Mano Perfetta** (Panno, `la-mano-perfetta`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.
- **I Tre Semi** (Panno, `i-tre-semi`): Illustrazione al centro del panno, tono su tono, opacità bassa: le carte bianche devono restare leggibili sopra. Niente nella fascia dove si posano le carte giocate più scuro o più chiaro del panno di oltre il 15%.

## Dorsi delle carte (14)

- Formato: PNG 720×1150 (proporzioni delle carte, 360×575), con la cornice bianca di 12 px uguale agli altri dorsi; consegna anche il sorgente vettoriale.
- Simmetrico per rotazione di 180° (le carte si vedono anche capovolte).
- Deve leggersi su una carta larga 50 punti sul tavolo: medaglione centrale grande, niente dettagli che diventano rumore, niente testo.

| N. | Id | Nome | Categoria | Rarità | Tema | Palette | Si ottiene | Set |
|---|---|---|---|---|---|---|---|---|
| 23 | `leone-d-oro` | Leone d’Oro | Nobili | Epico | Leone rampante araldico in oro su porpora, dentro uno scudo | `#4A0E0E` `#F3D58C` `#FFF6D6` | Achievement «Mani Esperte» | — |
| 24 | `aquila-reale` | Aquila Reale | Nobili | Epico | Aquila araldica ad ali spiegate, oro su nero | `#121116` `#F3D58C` `#FFF6D6` | Nel negozio | — |
| 31 | `drago-cremisi` | Drago Cremisi | Fantasy | Leggendario | Drago cremisi arrotolato su sé stesso al centro, coda e testa simmetriche | `#2A0508` `#B8202A` `#F3D58C` | Nel negozio | Drago Cremisi |
| 32 | `fenice-dorata` | Fenice Dorata | Fantasy | Leggendario | Fenice d’oro ad ali aperte, due volte (sopra e sotto, ruotata) | `#2E0E02` `#FF8A3D` `#FFE38A` | Nel negozio | Fenice Eterna |
| 33 | `lupo-d-argento` | Lupo d’Argento | Fantasy | Leggendario | Testa di lupo d’argento frontale in un medaglione | `#0F141E` `#B9C0CC` `#FFFFFF` | Nel negozio | — |
| 34 | `occhio-del-drago` | Occhio del Drago | Fantasy | Leggendario | Occhio di drago con pupilla a fessura, iride verde e oro, squame intorno | `#0A120A` `#9FE070` `#FFE38A` | Nel negozio | — |
| 35 | `spada-eterna` | Spada Eterna | Fantasy | Leggendario | Due spade incrociate con l’elsa decorata, lame lucide | `#0C1430` `#E6EAF2` `#F3D58C` | Achievement «Sempre in Piedi» | — |
| 37 | `fiamma-blu` | Fiamma Blu | Fantasy | Epico | Una fiamma blu stilizzata che sale al centro | `#050C26` `#3D7BFF` `#BFE9FF` | Nel negozio | — |
| 40 | `serpente-mistico` | Serpente Mistico | Fantasy | Leggendario | Un serpente che si morde la coda (uroboro) intorno a un occhio | `#062216` `#3FA172` `#F3D58C` | Con un evento (in arrivo) | — |
| 51 | `il-re-delle-carte` | Il Re delle Carte | Mitici | Mitico | Il Re (figura napoletana) ridisegnato in stile medaglione, a specchio come le figure delle carte | `#0B0A0E` `#F3D58C` `#C2283D` `#FFF6D6` | Achievement «Re della Scopa» | Il Signore delle Carte |
| 52 | `trono-degli-assi` | Trono degli Assi | Mitici | Mitico | Un trono d’oro visto di fronte, sullo schienale i quattro semi napoletani | `#140104` `#F3D58C` `#FFF6D6` | Nel negozio | Il Regno degli Assi |
| 53 | `la-mano-perfetta` | La Mano Perfetta | Mitici | Mitico | Un ventaglio di carte in oro, a specchio | `#062216` `#F3D58C` `#F4EAD6` | Achievement «Mano Perfetta» | — |
| 55 | `i-tre-giochi` | I Tre Giochi | Mitici | Mitico | Tre emblemi (Tressette, Briscola, Scopa) in triangolo dentro un medaglione | `#08021A` `#F3D58C` `#FF8A3D` `#7FD0FF` | Arena 28: La Corona dei Tre Giochi | Il Destino dei Tre Giochi |
| 59 | `l-ultima-partita` | L’Ultima Partita | Mitici | Mitico | Due carte incrociate su un tavolo visto dall’alto, una lampada sopra | `#0A0806` `#F3D58C` `#F4EAD6` | Achievement «Il Veterano» | — |

Note per ciascuno:

- **Leone d’Oro** (Dorso delle carte, `leone-d-oro`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Aquila Reale** (Dorso delle carte, `aquila-reale`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Drago Cremisi** (Dorso delle carte, `drago-cremisi`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Fenice Dorata** (Dorso delle carte, `fenice-dorata`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Lupo d’Argento** (Dorso delle carte, `lupo-d-argento`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Occhio del Drago** (Dorso delle carte, `occhio-del-drago`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Spada Eterna** (Dorso delle carte, `spada-eterna`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Fiamma Blu** (Dorso delle carte, `fiamma-blu`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **Serpente Mistico** (Dorso delle carte, `serpente-mistico`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta). Arriverà con il primo evento.
- **Il Re delle Carte** (Dorso delle carte, `il-re-delle-carte`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta). Figura originale, non copiata da un mazzo esistente.
- **Trono degli Assi** (Dorso delle carte, `trono-degli-assi`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **La Mano Perfetta** (Dorso delle carte, `la-mano-perfetta`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **I Tre Giochi** (Dorso delle carte, `i-tre-giochi`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
- **L’Ultima Partita** (Dorso delle carte, `l-ultima-partita`): Dorso 720×1150 px, cornice bianca di 12 px come gli altri dorsi; il soggetto deve leggersi su una carta larga 50 punti; simmetrico per rotazione di 180° (la carta si vede capovolta).
