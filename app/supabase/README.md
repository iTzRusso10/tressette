# Server di Napoletane (Supabase) e servizi esterni

Senza queste chiavi l'app funziona lo stesso: si gioca contro il computer, monete, trofei e bonus restano sul telefono, e i pulsanti di accesso e online spiegano che non sono ancora attivi.

## 1. Supabase

1. Crea un progetto su supabase.com (regione Europa).
2. Da `app/`: `npx supabase link --project-ref <id del progetto>`, poi `npx supabase db push` (crea tabelle e regole) e `npx supabase functions deploy progress`.
3. In Project Settings → API copia **Project URL** e chiave **anon** in `app/.env` (vedi `.env.example`) e, per il sito, nelle variabili del repository GitHub `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
4. In Authentication → URL Configuration aggiungi i redirect: `napoletane://auth` e `https://itzrusso10.github.io/tressette/auth`.

## 2. Accedi con Apple (serve l'Apple Developer Program)

1. In developer.apple.com: nell'App ID `it.giusepperussodev.napoletane` attiva **Sign in with Apple**.
2. Crea un **Services ID** e una **chiave** per Sign in with Apple (servono per il sito e Android).
3. In Supabase → Authentication → Providers → Apple: inserisci Services ID, Team ID, Key ID e chiave. Aggiungi anche il bundle id `it.giusepperussodev.napoletane` tra i client id.

## 3. Google

1. In console.cloud.google.com crea un progetto e la schermata di consenso OAuth.
2. Crea un **ID client OAuth** di tipo "Applicazione web" con URI di reindirizzamento `https://<progetto>.supabase.co/auth/v1/callback`.
3. In Supabase → Providers → Google inserisci client ID e secret.

## 4. Facebook e amici

1. In developers.facebook.com crea un'app di tipo "Consumer" e aggiungi **Facebook Login**.
2. URI di reindirizzamento OAuth valido: `https://<progetto>.supabase.co/auth/v1/callback`.
3. In Supabase → Providers → Facebook inserisci App ID e App Secret.
4. Per vedere gli amici serve il permesso **user_friends**: va chiesto a Meta con la revisione dell'app (App Review), con un video che mostra la lista amici nel profilo. Finché non è approvato funziona solo per gli account di prova dell'app.
5. Facebook mostra solo gli amici che hanno fatto accesso con Facebook anche loro. Gli altri si aggiungono con il codice amico.

## 5. Video premio (AdMob)

1. In admob.google.com crea le app iOS e Android e un'unità pubblicitaria **con premio** per ciascuna.
2. In `app/app.json`, nel plugin `react-native-google-mobile-ads`, sostituisci `androidAppId` e `iosAppId` (ora ci sono quelli di prova di Google).
3. Metti gli id delle unità in `app/.env`: `EXPO_PUBLIC_ADMOB_REWARDED_IOS` e `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`. Senza, il telefono mostra i video di prova di Google.
4. Prima di pubblicare: il consenso GDPR (messaggio di Google UMP, si configura in AdMob → Privacy e messaggi) e, su iPhone, la richiesta di tracciamento (il testo è già nel plugin).

Dopo aver cambiato `app.json` o aggiunto moduli nativi serve una nuova build: `npm run ios:telefono` (o `eas build`).
