// «Lampara»: la base comune (pacchetto B0, docs/direzione-artistica.md §5 e §7).
//
// CONTRATTO PER B1–B4. Questi export non cambiano senza passare dall'orchestratore. Si importa tutto da
// '@/ui/arte'. Ogni file ha in testa la descrizione completa di props e budget.
//
// token.ts (puro, senza React Native)
//   primitivi                 famiglie di materiale: notte, noce, ottone, fogliaOro, carta, inchiostro, velluto,
//                             ceralacca, maiolica, marmo, cuoio, sughero, panno, lampada, notteFredda, ombra
//   fondo, superficie, testo, accento, azione, stato   i ruoli semantici (§5.1)
//   fontArte, tipografia      Bodoni Moda/Sora; stili per ruolo: nomeSvelamento, nomeProfilo, nomeOggetto,
//                             titoloSezione, occhiello, occhielloCarta, numero, inciso
//   raggi, LIVELLI            raggi (superficie 14, targa 10, carta 4, biglietto 3); i sei livelli con la parallasse
//   COPPIE_CONTRASTO, rapportoContrasto, CoppiaContrasto   le coppie testo/fondo verificate dal test
//   mescola, conAlfa, stopSmalto   aiuti per i colori
// luce.ts
//   LUCE, GRADIENTE_LUCE      direzione (ore 11), colore della lampada, rimbalzo freddo, pozza; start/end a 160°
//   ombra(livello, {piccolo}) boxShadow contatto + portata per i livelli 2, 3, 4; LivelloOmbra
//   alone(colore, a, r)       alone ≤ 0,25 (lampada, leggendario, mitico)
//   bordoLuce                 fili chiaro/scuro per materiale
// movimento.ts
//   dur, ease, easeInOut      da motion.ts
//   mov                       rivela 420, posa 280, timbro 180, volo 520, sipario 900, scena 1100, scenaPasso 120,
//                             riflesso 1200, pausaRiflesso, respiro 4000–6000, scaglione 40
//   BUDGET, ACCENSIONE        limiti per schermata (6 animati, particelle 24/40, 48 pt); sequenza d'apertura (§5.9)
// rarita.ts (puro)
//   RARITA, rarita(r), puoAnimare(r, misura), ORDINE_RARITA, PAUSE_RIFLESSO, MINIMO_ANIMATO
//   StileRarita, Presentazione
// useAmbient.ts
//   useAmbient(attivo)        true solo senza riduci movimento, con la schermata a fuoco e l'app attiva
//   useRiduciMovimento()
// trame.ts (generato da scripts/make-materiali.mjs)
//   TRAME, DENSITA_TRAME, NomeTrama, InfoTrama   nove trame neutre WebP ripetibili
// materiali.tsx
//   Superficie, SuperficieProps, Materiale   noce | ottone | carta | velluto | cuoio | marmo | sughero | smalto
//   testoSu(materiale, tinta) il colore di testo giusto su un materiale
//   Trama                     grana cotta su qualsiasi colore
//   Filetto                   filetto tipografico (oro, rosso, ottone; semplice o con losanga)
//   Targa                     ottone con testo inciso ('etichetta' Sora maiuscolo, 'nome' Bodoni ≥ 20 pt)
//   Cartiglio                 nastro di carta del titolo
//   Sigillo                   ceralacca seminata con testo o simbolo; `timbro` per l'entrata
//   Lampada                   pozza di luce (con `accendi`)
//   Sala                      il fondo completo di una schermata di vetrina
// TarghettaRarita.tsx
//   TarghettaRarita           targhetta di metallo con il nome della rarità
//   MedagliaRarita            campione tondo della rarità (riflesso dall'epico, ≥ 48 pt)
// Riflesso.tsx      Riflesso, RiflessoProps      banda di luce dentro rettangolo, cerchio o path
// Respiro.tsx       Respiro, RespiroProps        ciclo lento di opacità, x, y o scala
// Scintille.tsx     Scintille, ScintilleProps    particelle seminate (≤ 24)
// Parallasse.tsx    Parallasse, Piano, sporgenzaPiano, useScorrimento
// Pulsante.tsx      Pulsante, PulsanteProps, TipoPulsante   principale | secondario | terziario | pericolo
// Ricompensa.tsx    Moneta, MoneteInVolo, Teca
//
// Rotte e file riservati agli altri pacchetti: arene.ts (B1), cornici.ts e oggetti.ts (B3) vanno in questa
// cartella ma non li crea B0. Pagina di controllo: /dev/arte. Foto: node scripts/foto-lib.mjs arte.
export * from './token';
export * from './luce';
export * from './movimento';
export * from './rarita';
export * from './useAmbient';
export * from './trame';
export * from './materiali';
export * from './TarghettaRarita';
export * from './Riflesso';
export * from './Respiro';
export * from './Scintille';
export * from './Parallasse';
export * from './Pulsante';
export * from './Ricompensa';
