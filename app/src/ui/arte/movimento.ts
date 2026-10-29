// «Lampara»: i tempi del movimento (docs/direzione-artistica.md §5.8).
//
// Le curve sono quelle di src/ui/motion.ts: `ease.in` per ciò che arriva, `ease.out` per ciò che esce,
// `ease.move` per ciò che si sposta. Niente molle, rimbalzi, oltre-e-ritorno. Qui si aggiungono i tempi
// della vetrina.
//
// Export:
// - `dur`, `ease`         rinviati da motion.ts (stesso oggetto, per importare tutto da un posto)
// - `mov`                 i token: rivela, posa, timbro, volo, sipario, scena, riflesso, pausaRiflesso
//                         (epico 8000, leggendario 6000), respiro (min/max), scaglione, plus `scenaPasso`
// - `BUDGET`              i limiti per schermata: 6 animati (1 eroe), 24 particelle per oggetto, 40 per schermata,
//                         48 pt minimi per animarsi, 6 elementi scaglionati
// - `ACCENSIONE`          la sequenza d'apertura di una schermata di vetrina (§5.9), in ms dall'apertura
// - `easeInOut`           curva simmetrica (`Easing.inOut(Easing.cubic)`, uguale a `ease.move`) per sipario e respiro
import { dur, ease } from '../motion';
import { MINIMO_ANIMATO, PAUSE_RIFLESSO } from './rarita';

export { dur, ease };

/** Curva simmetrica per sipario e respiro (avanti e indietro senza scatti). */
export const easeInOut = ease.move;

export const mov = {
  /** Un oggetto eroe che entra (avatar nel profilo, oggetto in teca). ease.in */
  rivela: 420,
  /** Un oggetto che si appoggia (equipaggia): sale di 8 px e scende, l'ombra passa da 4 a 3. ease.in */
  posa: 280,
  /** Ceralacca o timbro: da scala 1,12 a 1 e opacità 0 → 1. ease.in */
  timbro: 180,
  /** Monete che volano al contatore. ease.move */
  volo: 520,
  /** Apertura del velluto nello svelamento. easeInOut */
  sipario: 900,
  /** I piani dell'arena che si posano. ease.in */
  scena: 1100,
  /** Ritardo tra un piano e il successivo. */
  scenaPasso: 120,
  /** La banda di luce che attraversa un metallo. ease.move */
  riflesso: 1200,
  /** Pausa tra due passaggi del riflesso. */
  pausaRiflesso: PAUSE_RIFLESSO,
  /** Ciclo di fiammelle, tende, nuvole, gemme: ampiezza piccola (opacità ±0,2, spostamento ≤ 6 px). */
  respiro: { min: 4000, max: 6000 },
  /** Intervallo tra elementi di una lista che entrano. */
  scaglione: 40,
} as const;

export const BUDGET = {
  /** Elementi animati insieme per schermata (uno solo eroe). */
  animati: 6,
  particelleOggetto: 24,
  particelleSchermata: 40,
  /** Sotto questa misura (punti) niente movimento: solo il materiale statico. */
  minimoAnimato: MINIMO_ANIMATO,
  /** Al massimo 6 elementi scaglionati, poi tutti insieme. */
  scaglionati: 6,
  /** Ampiezza massima del respiro. */
  respiroSpostamento: 6,
  respiroOpacita: 0.2,
} as const;

/** L'accensione di una schermata di vetrina (§5.9): tempi in ms dall'apertura. */
export const ACCENSIONE = {
  /** La pozza di luce sale da 0 a 0,22. */
  luce: { a: 0, durata: mov.rivela },
  /** Superfici: da +12 px e opacità 0 a posto. */
  superfici: { a: 80, durata: dur.enter, da: 12 },
  /** Oggetto eroe. */
  eroe: { a: 160, durata: mov.rivela },
  /** Il resto, scaglionato. */
  resto: { a: 240, passo: mov.scaglione },
  uscita: dur.exit,
} as const;
