import type { Progress } from './ledger';
import type { Account } from './profile';

/**
 * Ospite e account sullo stesso telefono.
 *
 * Senza account la progressione è del telefono (l'ospite). Al primo accesso la si mette da parte e
 * il server la importa una volta sola; da lì in poi lo schermo mostra quella dell'account. All'uscita
 * torna l'ospite com'era prima dell'accesso, così:
 * - un altro account sullo stesso telefono non eredita le monete e il livello di chi è appena uscito;
 * - quello che si gioca da ospite non viene cancellato dal server al rientro.
 */
export interface Seat {
  account: Account | null;
  /** La progressione dell'ospite, messa da parte mentre c'è un account. */
  guest: Progress | null;
}

export interface SeatChange extends Seat {
  /** La progressione da mostrare adesso; null se resta quella di prima. */
  progress: Progress | null;
}

export function switchAccount(cur: Seat & { progress: Progress }, next: Account | null, fresh: () => Progress): SeatChange {
  const prev = cur.account;
  // Ospite che entra: la sua progressione va da parte (e al server, che la importa la prima volta).
  if (!prev && next) return { account: next, guest: cur.progress, progress: null };
  // Stesso account (sessione rinnovata, nome o foto aggiornati): non cambia niente.
  if (prev && next && prev.id === next.id) return { account: next, guest: cur.guest, progress: null };
  // Esce: torna l'ospite di prima (o uno nuovo, su un telefono dove l'account c'era già prima di questa versione).
  if (prev && !next) return { account: null, guest: null, progress: cur.guest ?? fresh() };
  // Un altro account senza passare dall'uscita: riparte dall'ospite, che resta da parte.
  if (prev && next) {
    const guest = cur.guest ?? fresh();
    return { account: next, guest, progress: guest };
  }
  return { account: null, guest: cur.guest, progress: null };
}
