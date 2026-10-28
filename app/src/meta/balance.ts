// Tutti i numeri del bilanciamento in un posto solo: trofei, monete, esperienza, prestigio, missioni,
// stagioni. Cambiarli qui li cambia sul telefono e sul server (che importa questo file).
//
// Valori di partenza scelti con Giuseppe il 28 ottobre 2026. Con questi un giocatore medio arriva
// alla trentesima arena (2900 trofei) in circa 375–445 partite (simulazione: scripts/sim-trofei.py).

import type { Level } from '../engine/types.ts';

export const BALANCE = {
  trophies: {
    /** Trofei per una vittoria, per livello del computer; online vale come l'Esperto. */
    win: { facile: 10, medio: 20, difficile: 30, online: 30 } satisfies Record<Level | 'online', number>,
    /** Trofei persi con una sconfitta: contro il Facile non si perde niente. */
    loss: { facile: 0, medio: 5, difficile: 10, online: 10 } satisfies Record<Level | 'online', number>,
    /** Distanza tra due arene. */
    arenaStep: 100,
    /** Dopo l'ultima arena: un grado di Leggenda ogni tanti trofei, senza fine. */
    legendStep: 200,
  },

  coins: {
    start: 1000,
    /** La prima vittoria di ogni giorno (giorno del telefono). */
    firstWinOfDay: 100,
    win: 15,
    /** Solo per una partita finita: abbandonare non dà niente. */
    loss: 5,
    /** Completamento di un capitolo di arene (6 arene). */
    chapter: 500,
    /** Bonus giornaliero per giorno di fila (dal settimo in poi il massimo). */
    bonusLadder: [100, 150, 200, 250, 300, 400, 500],
    /** Monete regalate (con un video) quando il portafoglio è quasi vuoto. */
    refill: 200,
    refillBelow: 100,
  },

  xp: {
    hand: 10,
    scopa: 5,
    win: 50,
    loss: 15,
    /** Punti per passare dal livello L al L+1: base + step·(L−1). Il 100 arriva a circa 133.000 punti. */
    levelBase: 120,
    levelStep: 25,
    maxLevel: 100,
    /** Dopo il livello 100, un grado di Prestigio ogni tanti punti, senza fine. */
    prestigeStep: 10000,
  },

  /** Monete per ogni livello raggiunto: base + per·livello; i livelli tondi danno anche un oggetto o un titolo. */
  levelCoins: { base: 50, per: 5 },
  /** Monete per ogni grado di Prestigio (livello) e di Leggenda (trofei). */
  prestigeCoins: 1000,
  legendCoins: 1000,

  missions: {
    /** Quante missioni al giorno e alla settimana. */
    daily: 3,
    weekly: 4,
  },

  seasons: {
    /** Primo giorno della prima stagione (ora di Roma, a mezzanotte). */
    firstStart: '2026-11-02',
    days: 60,
    /** Punti stagione: i trofei vinti e persi durante la stagione, mai sotto zero. */
    minMatchesToRank: 10,
  },

  antiAbuse: {
    /** Quanti identificativi di partita ricorda il server per scartare i doppioni. */
    recentMatches: 60,
    /** Una partita non può finire prima di tanti secondi dalla precedente (contro il computer). */
    minSecondsBetweenMatches: 40,
    /** Mani riconosciute per partita (oltre, è un dato inventato). */
    maxHandsPerMatch: 40,
  },
} as const;

export type Balance = typeof BALANCE;
