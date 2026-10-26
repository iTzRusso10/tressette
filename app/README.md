# App iOS e Android

L'app usa [Capacitor](https://capacitorjs.com): prende il gioco web della cartella principale (`index.html`, `carte/`, `fonts/`, `vendor/`) e lo impacchetta in un'app nativa che funziona anche offline. Il codice del gioco resta uno solo: ogni modifica al sito finisce anche nell'app con un `npm run sync`.

Cosa aggiunge l'app rispetto al sito:

- funziona senza connessione (tranne il gioco online, che usa internet come sempre)
- vibrazione quando tocchi una carta, sbagli giocata, fai punti o vinci la partita
- schermo sempre acceso mentre l'app è aperta
- tasto indietro di Android: chiude regole, impostazioni e menu un passo alla volta
- icona e schermata di avvio, solo verticale sui telefoni

## Requisiti sul Mac

- Node 22 o superiore
- Xcode aggiornato dall'App Store, per iOS (l'app gira da iOS 15 in su)
- Android Studio, per Android (l'app gira da Android 7 in su)

## Primo avvio

```bash
cd app
npm install
npm run ios        # prepara i file e apre il progetto in Xcode
npm run android    # prepara i file e apre il progetto in Android Studio
```

In Xcode: seleziona il target **App**, poi in *Signing & Capabilities* scegli il tuo Team. Collega l'iPhone e premi ▶.

In Android Studio: aspetta che finisca la sincronizzazione Gradle, collega il telefono con il debug USB attivo e premi ▶.

## Dopo una modifica al gioco

```bash
cd app
npm run sync
```

Il comando ricostruisce `www/` dai file del sito e la copia nei due progetti nativi.

## Icone e schermata di avvio

Le immagini di partenza sono in `assets/`: `icon-only.png` per iOS, `icon-background.png` e `icon-foreground.png` per l'icona adattiva di Android, `splash.png` per l'avvio. Dopo averle cambiate:

```bash
npm run assets
```

## Pubblicare sugli store

- **App Store**: serve l'Apple Developer Program (99 $/anno). In Xcode: *Product → Archive*, poi *Distribute App*. Per far provare l'app agli amici prima dell'uscita c'è TestFlight.
- **Google Play**: serve un account sviluppatore (25 $ una volta). In Android Studio: *Build → Generate Signed App Bundle*, poi carichi il file `.aab` nella Play Console.

Identificativo dell'app: `it.giusepperussodev.napoletane`. Nome sotto l'icona: **Napoletane**. Si cambiano in `capacitor.config.json`, in `ios/App/App/Info.plist` e in `android/app/src/main/res/values/strings.xml`.
