# Tecnologie per la grafica: materiali, luce, profondità, particelle

Fase A della direzione artistica: con quali strumenti ottenere materiali credibili, riflessi controllati, profondità nelle arene, particelle moderate e un 3D vero solo dove serve, su iOS, Android e web (Expo SDK 58, React Native 0.88, Reanimated 4.7, react-native-svg 15.16) e su telefoni medi.

Questo documento sceglie solo le tecnologie e dà un budget. Le scelte di stile (palette, materiali per capitolo, gerarchia delle rarità) stanno in `docs/direzione-artistica.md`.

## In breve

- **Base: materiali "cotti" fuori linea + Reanimated.** Le superfici (oro, smalto, legno, cuoio, marmo, trama del panno, lucentezza dei dorsi) si disegnano in SVG con i filtri di luce. **resvg**, che è già nel progetto (`scripts/make-art.mjs`), li calcola e li salva in WebP. Sul telefono si animano solo trasformazioni e opacità (Reanimated, sul thread grafico). È la stessa idea dei giochi mobile premium: l'arte è pre-renderizzata, il motore la muove.
- **Il vettoriale resta dove funziona già**: le 30 arene (`src/ui/arene/`), i disegni dei panni (`feltDesigns.ts`), le cornici comuni. Le arene si dividono in piani separati per la parallasse.
- **Skia: non ora.** Si valuta dopo la Fase B, solo se il prototipo "cotto" non basta per le cornici leggendarie e mitiche. In quel caso si usa solo in vetrina, caricato in differita sul web. Al tavolo non va mai.
- **3D in tempo reale (expo-gl + three): no.** Se serve un oggetto 3D (scrigno, trofeo che ruota) si renderizza in Blender e si usa come sequenza di immagini.
- **Lottie e Rive: no per ora.** Servono un animatore e un editor, pesano sul web e non sono in Expo Go. Reanimated basta per le sequenze di sblocco e di ricompensa.
- **Risparmio subito disponibile**: i 53 dorsi PNG pesano 14,9 MB nel sito. In WebP qualità 88 diventano 3,3 MB (−78%).

## Cosa ho misurato (29 ottobre 2026)

Tutte le prove sono in una cartella temporanea: nessuna dipendenza aggiunta, `package.json` non è stato toccato.

| Misura | Valore | Come |
|---|---|---|
| Sito attuale, JS (18 file) | 3,36 MB grezzi, **843 KB gzip** (`__common` 433 KB, `entry` 292 KB, `_layout` 72 KB) | `expo export -p web`, gzip -9 |
| Sito attuale, risorse | 17,5 MB, di cui **dorsi 15 MB** (53 PNG 720×1150 RGBA), carte 2 MB, suoni 1 MB | `du` su `dist/assets` |
| Dorsi in WebP | q88: **3,3 MB**; lossless: 5,5 MB (da 14,9 MB) | Pillow, `method=6` |
| Hub sul web, telefono 393×852, CPU 4× più lenta | pronto in 2,6 s; 5,5 MB scaricati; heap JS 29,6 MB usati (60 totali); 4 950 nodi DOM; da fermo frame p50 16,7 ms, p95 16,7 ms, max 50 ms, 1 long task in 3 s; cambio sezione 560–730 ms | Playwright + CDP (`Emulation.setCPUThrottlingRate`, `Performance.getMetrics`) |
| CanvasKit (Skia web) usato da `@shopify/react-native-skia` 2.14 (`bin/full`) | `canvaskit.wasm` 8,1 MB grezzi, **3,27 MB gzip, 2,51 MB brotli**; più 38 KB gzip di JS | `npm pack canvaskit-wasm@0.41.0` |
| JS di Skia nel bundle web (Canvas, Shader, Atlas…) | 127 KB grezzi, **35 KB gzip** | esbuild, minify |
| Avvio di CanvasKit su rete 4G (9 Mbit/s, 60 ms) | **~3,0 s** a CPU 1×, ~3,2 s a CPU 4×; poi lo shader del riflesso gira a 60 fps (p95 16,8 ms) | pagina di prova con `RuntimeEffect`, Chromium |
| Memoria di CanvasKit | **128 MB** di memoria wasm riservata (`HEAPU8`), oltre all'heap JS | stessa prova |
| Skia nativo | +~4 MB Android, +~6 MB iOS (tabella della documentazione Skia) | shopify.github.io/react-native-skia |
| three.js con tree-shaking (renderer, mesh, materiale PBR, luce) | 534 KB grezzi, **133 KB gzip** | esbuild, `three@0.186.1` |
| dotLottie web (`@lottiefiles/dotlottie-web`) | wasm 1,24 MB, **496 KB gzip** | npm pack |
| Rive web (`@rive-app/canvas` 2.49) | wasm 2,2 MB, **912 KB gzip** + 149 KB gzip di JS | npm pack |
| Cottura con resvg | cornice d'oro 512×512 con rilievo e luce speculare: 1,1 s, **20 KB WebP**; marmo, legno e panno 512×512: 104 KB WebP in tutto; trama del panno ripetibile 256 px in grigio: **15 KB WebP** | `@resvg/resvg-js` già installato, prova in scratchpad |

Compatibilità, da `node_modules/expo/bundledNativeModules.json` (SDK 58) e dalla documentazione v58:

| Libreria | Versione per SDK 58 | Expo Go | Note |
|---|---|---|---|
| `@shopify/react-native-skia` | 2.14.0 (peer: RN ≥ 0.78, Reanimated ≥ 4, worklets ≥ 0.7) | sì | Sul web serve CanvasKit (`setup-skia-web` copia il wasm in `public/`, oppure CDN con `locateFile`) |
| `expo-gl` | ~58.0.3 | sì | WebGL2. Alcuni metodi mancano (`getUniform`, `fenceSync`…). Un argomento sbagliato può far chiudere l'app |
| `@react-three/fiber` | 9.8.2 (peer react ≥ 19 < 19.4: va bene con 19.3) | via expo-gl | |
| `lottie-react-native` | ~7.5.0 | **no** | Sul web usa `@lottiefiles/dotlottie-react` |
| Rive (`@rive-app/react-native` 0.5.8) | non nella lista Expo | **no** | Richiede `react-native-nitro-modules` |
| `react-native-svg` | 15.16.0 (installato) | sì | Vedi i limiti dei filtri sotto |
| `@react-native-masked-view/masked-view` | 0.3.2 | sì | Non installato |

Il progetto usa già `react-native-google-mobile-ads` e l'accesso con Apple, quindi gira già con una development build (`eas.json`, profilo `development`). La presenza in Expo Go non è un criterio decisivo.

## Le opzioni

### 1. Solo quello che c'è: react-native-svg, expo-linear-gradient, Reanimated, expo-image

**Cosa si ottiene davvero**

- Gradienti lineari e radiali, `Pattern`, `ClipPath`, `Mask`, `Image` dentro l'SVG: funzionano su iOS, Android e web.
- **Filtri SVG su nativo (verificato nel codice di react-native-svg 15.16).** Implementati: `FeBlend`, `FeColorMatrix`, `FeComposite`, `FeFlood`, `FeGaussianBlur`, `FeMerge`, `FeOffset`. **Non implementati** (sul telefono si vede solo un avviso): `FeTurbulence`, `FeDiffuseLighting`, `FeSpecularLighting`, `FeDisplacementMap`, `FeMorphology`, `FeConvolveMatrix`, `FeComponentTransfer`, `FeImage`, `FeTile` e le luci. Sul web funzionano tutti, perché li disegna il browser. Ma un materiale procedurale calcolato sul telefono è impossibile: o lo si cuoce prima, o serve Skia.
- **Reanimated 4 anima le proprietà SVG**, con `useAnimatedProps` o con le animazioni CSS di Reanimated. Sul nativo ha configurazioni per `linearGradient` (x1, y1, x2, y2 e stop), `pattern`, `rect`, `circle`, `path` e `image`. È il modo più economico per un **riflesso che segue la forma**: l'anello della cornice è riempito con un gradiente bianco trasparente, e la banda chiara scorre spostando x1/x2. Niente maschere, la sagoma la dà il path.
- RN 0.88 ha nei tipi `mixBlendMode`, `isolation`, `boxShadow`, `filter` e `backgroundImage` (gradienti CSS) sulle View della nuova architettura. Sono utili, ma **vanno provati su tutte e tre le piattaforme prima di contarci**. `filter` ha funzioni diverse per piattaforma, e il comportamento di react-native-web 0.21 con `mixBlendMode` non è verificato. La regola sotto (luce e ombra cotte come strati con alfa) evita del tutto i blend mode.

**Dove si ferma**

- Ridisegnare un SVG grande a ogni frame costa. Con `animatedProps`, react-native-svg ridisegna tutto l'`Svg` che contiene l'elemento animato. Quindi si animano solo SVG piccoli (una cornice da 140 punti) oppure la View che li contiene (trasformazioni e opacità, che vanno in composizione senza ridisegnare).
- Senza turbolenza e luci sul nativo non si ottiene "metallo spazzolato", "venature del marmo" o "fibra del panno" credibili dal vivo. Si ottengono solo gradienti, che il brief chiede espressamente di non usare come scorciatoia.
- Le particelle sono una `Animated.View` ciascuna. 40 vanno bene (`Confetti` lo fa già), 300 no.

### 2. @shopify/react-native-skia (shader SkSL, image filter, blend mode, Atlas)

**Cosa dà in più**

- `RuntimeEffect`/SkSL: shader veri. Metallo anisotropo con riflesso che segue l'inclinazione del telefono, olografico, fiamme e energia con rumore animato, luce volumetrica.
- Image filter e blend mode identici su iOS, Android e web.
- `Atlas` con `useRSXformBuffer`: centinaia di sprite animati da un worklet a costo quasi nullo.
- Si integra con Reanimated 4: le shared value si passano direttamente come prop.

**Costi**

- **Web**: +2,5 MB brotli / 3,3 MB gzip di wasm, più 35–38 KB gzip di JS. È **3–4 volte tutto il JS attuale del sito** (843 KB gzip).
  - In 4G l'avvio prende circa 3 s.
  - CanvasKit riserva circa 128 MB di memoria wasm. Su un telefono medio con il browser è un peso vero.
  - Si può caricare in differita: `<WithSkiaWeb getComponent={() => import(...)} fallback={...}>` carica CanvasKit solo quando si apre il componente. `LoadSkiaWeb()` invece blocca l'avvio e con Expo Router obbliga a cambiare `main`. Da evitare.
  - Sul web mancano alcune API: `ShaderFilter`, `PathEffectFactory.MakeSum/MakeCompose`, `PathFactory.MakeFromText`.
- **Nativo**: +4 MB Android e +6 MB iOS. Va bene con RN 0.88, Expo 58 e Reanimated 4, ed è in Expo Go.
- **Manutenzione**: un secondo sistema di disegno accanto a react-native-svg, con shader da scrivere e da provare su tre piattaforme. Ogni cosmetico che usa uno shader ha bisogno di un'alternativa statica, perché sul web prima dei 3 secondi di caricamento qualcosa va mostrato.

**Giudizio**: è l'unico modo per avere luce *calcolata* dal vivo. Ma il guadagno rispetto a "cotto + banda animata" si vede solo su pochi oggetti (leggendari e mitici in vetrina), e il costo sul web lo pagano tutti.

### 3. 3D vero: expo-gl + three / @react-three/fiber, oppure 3D pre-renderizzato

- **In tempo reale**:
  - Pesi: expo-gl è in Expo Go e piccolo sul nativo; three con tree-shaking aggiunge almeno 133 KB gzip; r3f aggiunge il suo reconciler.
  - Servono modelli glTF, quindi un modellatore 3D, e un contesto GL per ogni vista. Molti contesti insieme sono un problema su Android e sul web.
  - three non gira nei worklet: il ciclo di disegno passa per il thread JS.
  - Un'arena 3D in tempo reale su un telefono medio costa batteria e calore, ed è difficile da rendere *bella* senza un artista 3D.
  - Beneficio concreto nel nostro gioco: nessuno che una buona illustrazione a piani non dia meglio.
- **Pre-renderizzato** (Blender: modello, luci, render):
  - Un oggetto che ruota si salva come sprite sheet: 24–36 fotogrammi WebP, per esempio 6×6 da 256 px, circa 150–300 KB. Un'arena "3D" si salva come 3–5 strati WebP con alfa, da muovere in parallasse.
  - Prestazioni identiche a un'immagine, nessuna dipendenza, qualità da film.
  - Costo: serve qualcuno che faccia il modello, e il materiale non reagisce alla luce dal vivo. Per questo il riflesso animato si mette sopra con Reanimated.
- **Video** (`expo-video`, ~58.0.12): utile solo per un'intro lunga. Per uno sblocco di 2 secondi una sequenza di immagini o Reanimated pesa meno e si interrompe meglio.

### 4. Immagini pre-renderizzate a strati (resvg) + Reanimated per luce e parallasse

È l'estensione naturale di quello che fa già `scripts/make-art.mjs`, che disegna i dorsi in SVG e li salva in PNG.

- **resvg implementa i filtri che sul nativo mancano**: `feTurbulence`, `feDiffuseLighting`, `feSpecularLighting`, `feDistantLight`, `feColorMatrix`, `feComposite aritmetico`. Prova fatta: una cornice d'oro con rilievo, metallo spazzolato, borchie con riflesso speculare e anello smaltato esce in 1,1 s a 512 px e pesa **20 KB in WebP**. Marmo e legno vengono da turbolenza e mappa di colore. La trama del panno viene da rumore e luce radente, con le cuciture in tratteggio a due toni.
- **Regola per non avere blend mode**: si cuociono **strati neutri**. La luce è bianco con alfa, l'ombra è nero con alfa, la trama è in grigio. Messi sopra un colore con la normale composizione alfa, funzionano identici su iOS, Android e web e su qualsiasi colore del catalogo. Una sola trama del panno da 15 KB serve tutti i 60 panni.
- **La luce si muove con Reanimated**. Il riflesso è una banda chiara: una piccola immagine o un gradiente SVG animato, dentro la sagoma, che si sposta con `translateX` o con x1/x2. La parallasse sposta i piani a velocità diverse. Tutto sul thread grafico, senza ridisegnare.
- **Costi**:
  - Peso delle immagini: va tenuto a bada con WebP, misure giuste e immagini condivise tra oggetti (vedi il budget).
  - Ogni cosmetico nuovo richiede di rilanciare lo script. È già il flusso dei dorsi, ed è anche un vantaggio: il cosmetico nasce da codice e da un file di stile, si rivede in un foglio di controllo (come `.backs/foglio.png`) e non serve un illustratore per ogni pezzo.

### 5. Lottie / Rive per le ricompense

- **Lottie**:
  - `lottie-react-native` 7.5.0 (Apache-2.0) è nella lista SDK 58 ma **non in Expo Go**. Sul web pesa circa 500 KB gzip di wasm (dotLottie).
  - Le animazioni si fanno in After Effects con Bodymovin, oppure si comprano. Senza un animatore non porta niente che Reanimated non faccia già con le curve di `motion.ts`.
  - Skia contiene Skottie (Lottie dentro Skia, presente nel CanvasKit "full"): se un giorno arriva Skia, Lottie non serve come libreria a parte.
- **Rive**:
  - Il runtime è MIT, ma le animazioni si fanno nell'editor Rive (verificare i termini dell'editor prima di sceglierlo). Sul web pesa circa 1 MB gzip.
  - Il nuovo runtime React Native richiede Nitro Modules e non è in Expo Go.
  - Ottimo per animazioni interattive con macchine a stati, ma è un terzo sistema di disegno.
- **Giudizio**: no adesso. Si riconsidera solo se arriva un animatore con un flusso già suo.

## Tabella di confronto

| | 1. SVG + Reanimated (attuale) | 2. Skia | 3a. 3D in tempo reale | 3b. 3D pre-renderizzato | 4. Cotto (resvg) + Reanimated | 5. Lottie / Rive |
|---|---|---|---|---|---|---|
| Materiali credibili | scarsi (solo gradienti sul nativo) | ottimi (shader) | ottimi se c'è l'artista | ottimi | **buoni-ottimi** (rilievo, luce, trama) | dipende dall'animatore |
| Riflesso animato | sì (gradiente animato nella sagoma) | ottimo, anche con l'inclinazione | sì | sopra con Reanimated | **sì (banda animata)** | sì |
| Parallasse | sì (piani separati) | sì | sì | sì (strati) | **sì (strati)** | limitata |
| Particelle | ≤ 40 viste | centinaia (Atlas) | sì | sprite | ≤ 40 viste | sì |
| Peso web | 0 | **+2,5–3,3 MB** wasm + 35 KB JS | +133 KB+ JS + modelli | solo immagini | solo immagini (~20–100 KB a oggetto) | +0,5–1 MB wasm |
| Peso nativo | 0 | +4 MB Android / +6 MB iOS | piccolo + modelli | immagini | immagini | +qualche MB |
| Memoria | bassa | +128 MB wasm sul web | alta (contesti GL) | immagini decodificate | immagini decodificate | media |
| Avvio | 0 | ~3 s sul web (differibile) | contesto GL | 0 | 0 | wasm sul web |
| Expo Go / dev build | Go | Go (e dev build) | Go | Go | Go | **solo dev build** |
| Nuovo cosmetico | codice | codice shader + alternativa statica | modello 3D | render in Blender | **codice + script** | file dell'editor |
| Manutenibilità | alta | media (due sistemi) | bassa | media (serve Blender) | **alta** (stesso flusso dei dorsi) | media-bassa |
| Verdetto | resta per vettoriale e animazione | **dopo, se serve, solo vetrina** | **no** | **sì, solo per oggetti eroe** | **base del sistema** | **no per ora** |

## Architettura a livelli: cosa si fa con cosa

Tre livelli, sempre in quest'ordine:

1. **Forma**: vettoriale, dal codice. Arene, disegni del panno, ornamenti, sagome.
2. **Materiale**: strati neutri cotti con resvg, in WebP, condivisi dove possibile.
3. **Luce e vita**: Reanimated su trasformazioni e opacità, oppure gradienti SVG piccoli animati. Solo in vetrina.

I dati visivi di ogni oggetto (materiale, ornamento, quale strato usare) vanno in file nuovi sotto `src/ui/arte/`, indicizzati per id: `materiali.ts`, `cornici.ts`, `arene.ts`. Il catalogo (`src/meta/`) non si tocca. Le immagini cotte vanno in `assets/arte/…` e un registro generato le richiede, come fa già `backImages.ts`.

| Elemento | Forma | Materiale | Luce e vita | Al tavolo |
|---|---|---|---|---|
| **Arene** (30) | SVG di `arene/`, diviso in 3–4 piani (cielo, lontano, medio, primo piano), ogni piano un `Svg` separato | strati condivisi per capitolo (grana, luce volumetrica, foschia) in WebP; per l'arena eroe della Fase B anche strati dipinti/cotti apposta | parallasse sullo scorrimento (`useAnimatedScrollHandler`) e, nello svelamento, un leggero movimento della camera; vita ambientale lenta su pochi elementi (nuvole che scorrono, fiammelle in opacità, stelle): **un elemento animato per piano, al massimo 4** | — |
| **Cornici** | SVG per comune e non comune (come oggi); dal raro in su base cotta 512×512 con il foro dell'avatar | oro, argento, bronzo, smalto, pietre, cotti con rilievo e luce speculare (prova: 20 KB) | epico: riflesso che scorre ogni 6–8 s (banda di 1,2 s); leggendario: riflesso + gemme che brillano in opacità; mitico: + 8–16 particelle seminate (`seeded`) | il tag del giocatore usa la versione statica |
| **Panni** | `feltDesigns.ts` resta così (vettoriale, già leggibile) | la `Pattern` di linee diventa una trama ripetibile cotta (256 px in grigio, 15 KB), messa come `Image` dentro una `Pattern` SVG; velluto = uno strato di luce in più; cuciture vettoriali a due toni (scuro + chiaro spostato di 1 px) | in vetrina (anteprima nel negozio e nella personalizzazione), solo per i rari: un passaggio di luce radente lento; **niente al tavolo** | statico, carte sempre leggibili |
| **Tavolini** (sponda) | path della sponda attuale | trame ripetibili cotte per famiglia: legno (venatura), cuoio (grana + impunture), marmo (venature), metallo spazzolato; il vetro resta vettoriale (riflessi netti, rifrazione finta con gradienti) | in vetrina: riflesso sul bordo per metallo e vetro | statico |
| **Dorsi** | già cotti da `make-art.mjs` | aggiungere una maschera "foglia d'oro" per i rari (strato di luce con alfa) | in vetrina: banda di lucentezza che attraversa il dorso (immagine piccola, `translateX` dentro una View con `overflow: hidden`) | statico, mai filtri (regola delle carte) |
| **Particelle** | View con forme semplici o sprite WebP piccoli | — | solo epico e superiori, solo in vetrina, ≤ 24 per oggetto, ≤ 40 per schermata, seminate | mai (tranne i coriandoli già esistenti) |
| **Sblocco arena** (`ArenaReveal`) | arena a piani | strati dell'arena | sequenza breve con le curve di `motion.ts`: buio → piani che entrano uno alla volta a velocità diverse (la "camera" si posa) → nome con riflesso che passa una volta → rarità/prestigio → pulsanti. Massimo 2,5 s prima dei pulsanti, si salta con un tocco | aspetta che si lasci il tavolo (come oggi) |
| **Ricompense** | icone vettoriali | per gli oggetti eroe (scrigno, trofeo di capitolo) un render 3D in Blender come sprite sheet (24–36 fotogrammi) | conteggio delle monete, oggetto che entra, una passata di luce; più ricca solo per sblocchi importanti | — |

### Quando prendere Skia

Non ora. Si riapre la questione alla fine della Fase B se e solo se:

1. il prototipo della cornice leggendaria (cotta + riflesso Reanimated) è giudicato non abbastanza "prezioso" rispetto a una prova Skia fatta in parallelo nella stessa misura;
2. e la prova Skia sul web resta nel budget: caricata con `WithSkiaWeb` solo nelle schermate di vetrina, con l'immagine cotta come `fallback`, e niente regressioni sull'avvio del sito.

Se succede, Skia si usa solo dentro componenti `Vetrina*` (cornice, dorso e arena in anteprima). Mai nell'hub all'avvio, mai al tavolo. Sul nativo il costo è accettabile (+4–6 MB).

## Movimento ridotto e animazioni fuori schermo

Un solo hook, per esempio `useAmbient()` in `src/ui/arte/`, che tutte le animazioni ambientali usano. Restituisce `false` (e le animazioni si fermano con `cancelAnimation`, lasciando il fotogramma di riposo, cioè la luce nella posizione "bella") quando:

- **riduci movimento** è attivo: `useReducedMotion()` di Reanimated, già usato in `Confetti.tsx` e `progression.tsx`. Nelle animazioni a tempo si passa anche `reduceMotion: ReduceMotion.System`;
- **la schermata non è a fuoco**: `useFocusEffect` di `expo-router`, già usato in `Gioca.tsx`;
- **la sezione dell'hub non è quella visibile**: le cinque sezioni sono pagine orizzontali montate insieme, quindi serve l'indice della pagina corrente. È il caso più facile da dimenticare;
- **l'elemento è fuori dalla lista visibile**: `onViewableItemsChanged` delle liste. Nelle griglie si anima solo l'oggetto selezionato o in evidenza, mai tutte le miniature;
- **l'app è in background**: `AppState`, che sul web segue `document.visibilityState`.

Ogni ciclo ambientale dura almeno 4 s, con pause lunghe (il riflesso passa in 1,2 s ogni 6–8 s). Usa le curve di `motion.ts` e non cambia mai il layout: solo `transform` e `opacity`. Con il movimento ridotto restano gli stati finali e le dissolvenze brevi.

## Budget di prestazioni

Riferimento: telefono medio Android (fascia Galaxy A / Redmi Note, 4–6 GB di RAM) e iPhone di 4–5 anni fa. Sul web: Chromium a 393×852, DPR 2, CPU rallentata 4×.

| Voce | Budget |
|---|---|
| Animazioni ambientali simultanee per schermata | ≤ 6 elementi animati (es. 4 piani dell'arena + 1 riflesso + 1 elemento di vita); nelle griglie solo l'oggetto in evidenza |
| Particelle | ≤ 24 per oggetto, ≤ 40 per schermata |
| SVG con proprietà animate | solo SVG ≤ ~200×200 punti; quelli grandi (arene, panno) si muovono solo come View |
| Texture: piano d'arena a tutta larghezza | ≤ 1280 px sul lato lungo, WebP q80–88, ≤ 150 KB |
| Texture: cornice cotta | 512×512 (si mostra al massimo a ~140 punti a 3×), ≤ 30 KB |
| Texture: trame ripetibili (panno, legno, cuoio, marmo) | 256–512 px, ≤ 60 KB, una per famiglia, condivise |
| Dorsi | passare a WebP; valutare 2× la misura delle carte invece di 720×1150 |
| Immagini decodificate in memoria per schermata | ≤ 48 MB (RGBA: 1280×1280 = 6,5 MB; 512×512 = 1 MB) |
| Web, JS aggiunto da tutta la direzione artistica | ≤ +60 KB gzip sul totale attuale di 843 KB |
| Web, immagini caricate all'avvio dell'hub | non oltre i 5,5 MB attuali; gli strati delle arene si caricano solo quando si vedono |
| Web, heap JS dell'hub | ≤ +15 MB sui 29,6 MB attuali |
| Frame in vetrina (web, CPU 4×) | p95 ≤ 20 ms e nessun long task > 50 ms durante 3 s di animazione (oggi da fermo: p95 16,7 ms, 1 long task) |
| Nativo | 60 fps sul thread grafico in vetrina; dimensione dell'app ≤ +5 MB per tutta la grafica nuova |

### Come misurarlo

- **Web, ogni volta**: lo script di prova usato per questo documento (`/tmp/claude-0/-home-claude/88b6d4b1-ff79-5fd3-afb2-202db413c829/scratchpad/perf/misura.mjs`) va portato in `scripts/perf-check.mjs` e collegato a `npm run check:perf`. Fa questo:
  - serve `dist/` come `hub-check.mjs` e carica un profilo realistico (bonus già riscosso, sennò il pannello copre l'hub);
  - imposta la CPU 4× con CDP (`Emulation.setCPUThrottlingRate`);
  - misura il tempo all'hub pronto, i byte scaricati, `Performance.getMetrics` (heap JS, nodi, layout), i frame con `requestAnimationFrame` (p50, p95, max) e i long task con `PerformanceObserver` per 3 s su ogni schermata di vetrina, il cambio di sezione;
  - fallisce se supera il budget. Per un'analisi più fine: `page.tracing`/`Tracing.start` di CDP, da aprire nel pannello Performance di Chrome.
- **Peso del sito**: dopo `npm run export:web`, somma gzip dei `.js` in `dist/_expo/static/js/web` e dimensione di `dist/assets`. Va confrontata con i numeri di questo documento.
- **Nativo**:
  - build release su un Android medio (`npm run android:telefono`): il Perf Monitor del menu sviluppatore per gli fps UI/JS, `adb shell dumpsys gfxinfo <pacchetto> framestats` per i frame lenti, il profiler di Android Studio per la memoria;
  - su iPhone, Xcode Instruments (Animation Hitches, Allocations);
  - dimensione dell'app dagli artefatti di `eas build`, prima e dopo.

## Prossimi passi pratici (Fase B)

1. `scripts/make-materiali.mjs` (accanto a `make-art.mjs`): cuoce in `assets/arte/` le trame neutre (panno, legno, cuoio, marmo, metallo) e le basi delle cornici dal raro in su, scrive il registro TypeScript e un foglio di controllo da guardare. Usa resvg, già installato, e per il WebP `sharp` oppure il passaggio con Pillow (già usato da `clean-cards.py`). Il WebP va scelto con l'orchestratore, perché `sharp` sarebbe una dipendenza nuova di sviluppo.
2. `src/ui/arte/useAmbient.ts` e i componenti base `Riflesso` (banda che scorre dentro una sagoma), `Parallasse` (piani a velocità diverse) e `Scintille` (particelle seminate), con il budget scritto nei commenti.
3. Una cornice leggendaria e l'arena eroe con questi strumenti. Poi misura (`check:perf`, foto con `check:hub`) e confronto onesto con una prova Skia prima di decidere se aggiungerla.
4. Dorsi in WebP: un cambio a `make-art.mjs` e a `backImages.ts`, −11,6 MB sul sito.
