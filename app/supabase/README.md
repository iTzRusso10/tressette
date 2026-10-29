# Server di Napoletane (Supabase) e servizi esterni

Senza queste chiavi l'app funziona lo stesso: si gioca contro il computer, monete, trofei e bonus restano sul telefono, e i pulsanti di accesso e online spiegano che non sono ancora attivi.

## 1. Supabase

1. Crea un progetto su supabase.com (regione Europa).
2. Da `app/`: `npx supabase link --project-ref <id del progetto>`, poi `npx supabase db push` (crea tabelle e regole) e `npx supabase functions deploy progress`.
3. In Project Settings → API copia **Project URL** e chiave **anon** in `app/.env` (vedi `.env.example`) e, per il sito, nelle variabili del repository GitHub `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
4. In Authentication → URL Configuration aggiungi i redirect: `napoletane://auth` e `https://itzrusso10.github.io/tressette/auth`.

### Aggiornamenti del server

Quando arrivano nuove migrazioni (per esempio `20261027000200_trofei_negozio.sql`: trofei delle arene, negozio e classifiche) o cambia la funzione, da `app/`:

```bash
npx supabase db push                     # applica solo le migrazioni nuove
npx supabase functions deploy progress   # la funzione usa src/meta/arenas.ts e shop.ts: va ripubblicata a ogni loro modifica
```

La migrazione `20261028000000_progressione_lunga.sql` aggiunge la colonna `meta` (arena raggiunta, missioni, stagione, set, titolo), il calendario delle stagioni, i punteggi e le classifiche di stagione (`leaderboard_season`, `my_season_rank`) e `close_seasons()`, che ogni notte scrive la classifica finale delle stagioni finite (serve l'estensione **pg_cron**: Database → Extensions; senza, lanciala a mano dopo la fine di ogni stagione). Le righe dei profili vecchi le converte la funzione alla prima chiamata, senza perdere oggetti o medaglie. Per aggiungere una stagione: una voce in `src/meta/seasons.ts` e una riga nella tabella `seasons` (stesse date).

Pubblica prima la migrazione e poi la funzione: la funzione nuova legge le colonne `cups`, `best_cups`, `owned` ed `equipped`. Un'app vecchia continua a funzionare con il server nuovo, e una nuova con il server vecchio tiene trofei e oggetti sul telefono finché non aggiorni.

La migrazione `20261029000000_competizione_social.sql` aggiunge competizione e amici:

- **Punteggio per gioco** (`game_ratings`, `weekly_scores`): lo scrive solo la funzione `progress`, con le regole di `src/meta/rating.ts`. Classifiche `leaderboard_game(gioco, 'stagione' | 'settimana', 'mondo' | 'amici' | 'vicini')`, `my_game_rank`, `my_season_history`.
- **Premi automatici** (`reward_grants`): `close_weeks()` premia i primi tre di ogni gioco a fine settimana (lunedì 00:30, con pg_cron); `close_seasons()` scrive anche la classifica finale per gioco e premia i primi tre. I premi arrivano nell'app come ricompense da riscuotere, una volta sola.
- **Profilo pubblico** (`profiles.public`, `last_seen`): avatar, cornice, titolo, vetrina, statistiche per gioco. Niente monete. `public_profile(id)`, `search_players(testo)` (almeno tre lettere).
- **Amici**: richieste (`send_friend_request`, `respond_friend_request`, `my_friend_requests`, `remove_friend`), stato online (`ping`, ogni minuto mentre l'app è aperta), `my_friends` con profilo pubblico e ultima volta visto.
- **Inviti** (`send_invite`, `my_invites`, `respond_invite`): solo tra amici, venti all'ora, ognuno vale dieci minuti.
- **Sfide** (`report_duel`, `my_rivals`, `duels_with`): a fine partita online ognuno dice chi ha vinto; conta quando la maggioranza dei giocatori è d'accordo. Corregge anche il pagamento della posta online (`stake_report`).

La migrazione `20261031000000_matchmaking.sql` aggiunge il **matchmaking** della partita veloce e della classificata: la coda (`mm_tickets`), le partite trovate (`mm_matches`) e i risultati riferiti (`mm_reports`). Dall'app si usano `mm_join`, `mm_poll` e `mm_cancel`; la funzione `progress` chiama `mm_report` per verificare ogni partita veloce o classificata prima di dare trofei o punteggio. Ogni notte pg_cron toglie le partite trovate più vecchie di due giorni. Va pubblicata insieme alla funzione `progress` nuova (regole v3).

Prima di pubblicare, `npm run check:db` prova tutte le migrazioni e le regole su un Postgres vero (serve `postgres` installato sul computer).

Classifiche: `leaderboard('mondo' | 'amici')` (prime 100 posizioni per trofei; a parità chi ci è arrivato prima, poi l'esperienza) e `my_rank()` (la tua posizione nel mondo). Restituiscono solo nome, foto, trofei, esperienza e posizione, e solo a chi ha fatto l'accesso.

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
