# Tornei e circoli: proposta

Questa è una proposta, non ancora codice. Oggi l'online funziona a stanze private: chi crea la stanza tiene la partita e gli altri la rigiocano con lo stesso motore. Non ci sono un server di gioco, un matchmaking o partite in contemporanea organizzate dal server. Un torneo "vero", con sconosciuti accoppiati in tempo reale, ha bisogno di tutte e tre le cose. Le proposte qui sotto partono da quello che c'è già.

## Tornei

### A. Torneo della settimana a mani uguali (si può fare adesso)

- **Come funziona.** Ogni fine settimana c'è un torneo per gioco contro il computer Esperto. Chi si iscrive gioca dieci partite. Tutti ricevono le **stesse mani**, nello stesso ordine: il mazzo si mescola con un seme fissato dal torneo, come nel bridge "duplicato". Vince chi fa più punti con le stesse carte. La fortuna conta poco e il confronto è giusto.
- **Contro i trucchi.** Il motore è TypeScript puro ed è già condiviso con il server. L'app manda la lista delle mosse e il server **rigioca la partita** con il seme del torneo. Si accetta solo il risultato che viene fuori. Nessun numero mandato dal telefono conta da solo. È più sicuro di qualunque altra cosa nell'app.
- **Classifica e premi.** Una classifica per torneo, divisa per lega: si gareggia con chi è del proprio livello. Premi in monete e una cornice del torneo, con le ricompense da riscuotere che ci sono già.
- **Cosa serve.**
  - Una tabella `tournaments` (date, gioco, seme) e una `tournament_entries` (mosse e punti per partita).
  - La verifica delle mosse nella funzione `progress`.
  - Una scheda nella home e una schermata del torneo.
  - Circa una settimana di lavoro.

### B. Torneo tra amici (dopo A)

- **Come funziona.** Chi lo crea sceglie 4 o 8 amici e il gioco. Il tabellone a eliminazione diretta si compone da solo. Ogni incontro si gioca in una stanza privata con gli inviti che ci sono già. Il risultato conta quando la maggioranza lo conferma, come per le sfide.
- **Cosa serve.**
  - Le tabelle del tabellone.
  - La schermata con il tabellone.
  - Promemoria con gli inviti.
- **Il limite.** Funziona solo se gli amici si mettono d'accordo sull'orario. Per questo ogni turno dura 48 ore e, se uno non si presenta, passa l'altro.

### C. Tornei pubblici in tempo reale (non adesso)

- **Cosa servirebbe.**
  - Un matchmaking.
  - Un server autorevole che tenga le partite. Oggi le tiene il telefono di chi crea la stanza.
  - Gestione delle disconnessioni a metà torneo.
  - Abbastanza giocatori online alla stessa ora.
- **Quando ha senso.** Dopo il lancio, se i numeri lo giustificano.

**Consiglio:** A per primo, perché è giusto, verificabile e non dipende da quanti sono online. B se gli amici giocano molto tra loro.

## Circoli

Un circolo è un gruppo di giocatori con un nome, una classifica e degli obiettivi comuni. Il costo vero non è il codice: è la **moderazione**. App Store e Google Play chiedono che i contenuti scritti dagli utenti abbiano una segnalazione, un blocco e qualcuno che risponda. Un nome di circolo è un contenuto scritto dagli utenti.

Proposta per una fase successiva, pensata per non dover moderare niente:

- **Nomi scelti da un elenco.** Si compongono da parti già pronte, per esempio «Circolo» + «del Vesuvio», «dei Quartieri», «di Mergellina». Niente testo libero. Lo stemma si sceglie tra simboli e colori già pronti.
- **Fino a 30 membri.** Chi lo fonda può invitare (solo amici) e allontanare.
- **Classifica dei circoli della settimana.** È la somma delle prestazioni settimanali dei membri migliori: i primi 10, perché un circolo grande non vinca solo per numero.
- **Obiettivo comune della settimana.** Per esempio «500 vittorie a Scopa tutti insieme». Premia ogni membro con monete e una cornice del circolo, come gli eventi.
- **Cosa serve.**
  - Tre tabelle.
  - Le regole di sicurezza.
  - Una sezione dentro Amici.
  - Circa una settimana e mezza.

## Decisioni per Giuseppe

1. Torneo A sì o no, e con quali premi (solo cosmetici o anche monete).
2. Circoli: farli con i nomi da elenco (nessuna moderazione) oppure aspettare di avere chi modera, per poter lasciare i nomi liberi.
3. Quando: prima o dopo la pubblicazione sugli store.
