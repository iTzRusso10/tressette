# Napoletane: Tressette, Briscola, Scopa

Tre giochi con le carte napoletane, come app per iPhone e Android e come sito.

- **Tressette**: in due, in quattro a coppie o a perdere (in due o in quattro, con cappotto), accusi e segnali
- **Briscola**: in due o in quattro a coppie, si vince con più di 60 punti
- **Scopa**: in due o in quattro a coppie, scope, carte, denari, settebello e primiera
- Contro il computer (Facile, Medio, Esperto) o online con gli amici tramite codice stanza

Gioca sul web: https://itzrusso10.github.io/tressette/

## Come si lavora

L'app è in `app/`: React Native con Expo (SDK 58), Expo Router, Reanimated. La stessa sorgente produce l'app iOS, l'app Android e il sito.

```bash
cd app
npm install            # serve Node 22+
npm start              # server di sviluppo (poi i per iOS, a per Android, w per il web)
npm run check          # tipi, lint e test delle regole
npm run ios            # build di sviluppo (serve Xcode, il telefono usa il server sul computer)
npm run android        # build di sviluppo (serve Android Studio)
npm run ios:telefono      # installa sull'iPhone collegato la versione completa: funziona senza computer
npm run android:telefono  # lo stesso per Android
```

Con l'Apple ID gratuito l'app installata sull'iPhone scade dopo 7 giorni (poi si rilancia `npm run ios:telefono`) e «Accedi con Apple» resta spento. Con l'Apple Developer Program dura un anno, si può distribuire con TestFlight e si attiva Accedi con Apple: `APPLE_SIGN_IN=1 npm run ios:telefono`.

Build per gli store senza Xcode, con EAS: `npx eas-cli@latest build --platform ios` (o `android`).

Il sito si pubblica da solo a ogni push su `main` (GitHub Actions, `.github/workflows/sito.yml`).

## Online

Le stanze passano da Supabase Realtime. Per attivarle: crea un progetto su supabase.com, copia `app/.env.example` in `app/.env` e inserisci URL e chiave pubblica (anon). Per il sito, mettile in GitHub come variabili del repository `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
