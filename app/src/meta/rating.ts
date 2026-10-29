// Il punteggio di bravura per gioco (Tressette, Briscola, Scopa) e le leghe. Funzioni pure, condivise
// con il server.
//
// È un Elo: vincere contro chi è più forte di te vale molto, battere chi è più debole quasi niente.
// Per questo non si accumula giocando tanto: contro il computer Facile, una volta salito, le vittorie
// valgono zero punti. Il punteggio si ferma dove sta la tua bravura reale. Il computer ha una forza
// fissa per livello; un avversario online vale come un giocatore medio-forte (non si può gonfiare il
// punteggio facendosi battere da un amico: al massimo si arriva dove porta battere sempre chi è forte).
//
// Le classifiche competitive sono separate dai trofei (che restano la progressione permanente): il
// punteggio vive per stagione e, all'inizio di ognuna, si avvicina a metà strada da 1000.

import type { GameId, Level } from '../engine/types.ts';

export const RATING = {
  start: 1000,
  floor: 100,
  /** Forza degli avversari: il computer per livello, e una persona online. */
  opponent: { facile: 800, medio: 1100, difficile: 1400, online: 1300 } as Record<Level | 'online', number>,
  /** Prime partite (calibrazione): il punteggio si muove di più. */
  placement: 10,
  kPlacement: 40,
  k: 20,
  /** All'inizio di una stagione il punteggio torna a metà strada da `start`. */
  carry: 0.5,
  /** Classifica settimanale: servono almeno tante partite nella settimana per comparire. */
  weeklyMin: 5,
  /** Contro la stessa persona online, al giorno contano per il punteggio solo le prime tante partite. */
  samePairPerDay: 3,
} as const;

export interface GameRating {
  /** Punteggio attuale (stagione in corso). */
  r: number;
  /** Partite della stagione in corso, e il punteggio più alto della stagione. */
  n: number;
  peak: number;
}

export interface WeeklyPerf {
  week: string;
  n: number;
  /** Somma delle forze degli avversari, vittorie, sconfitte. */
  opp: number;
  w: number;
  l: number;
}

export const newRating = (): GameRating => ({ r: RATING.start, n: 0, peak: RATING.start });
export const newRatings = (): Record<GameId, GameRating> => ({ tressette: newRating(), briscola: newRating(), scopa: newRating() });

export const expected = (r: number, opp: number) => 1 / (1 + Math.pow(10, (opp - r) / 400));

/** Il punteggio dopo una partita. */
export function rate(g: GameRating, opp: number, won: boolean): { g: GameRating; delta: number } {
  const k = g.n < RATING.placement ? RATING.kPlacement : RATING.k;
  const delta = Math.round(k * ((won ? 1 : 0) - expected(g.r, opp)));
  const r = Math.max(RATING.floor, g.r + delta);
  return { g: { r, n: g.n + 1, peak: Math.max(g.peak, r) }, delta: r - g.r };
}

/** All'inizio di una stagione: metà strada verso il punteggio di partenza. */
export const carryOver = (g: GameRating): GameRating => {
  const r = Math.round(RATING.start + (g.r - RATING.start) * RATING.carry);
  return { r, n: 0, peak: r };
};

/** Prestazione settimanale (Elo di prestazione): forza media degli avversari ± 400 per il saldo. */
export function performance(w: WeeklyPerf): number | null {
  if (w.n < RATING.weeklyMin) return null;
  return Math.round(w.opp / w.n + (400 * (w.w - w.l)) / w.n);
}

/* ================================================================== leghe */

export interface League {
  id: string;
  name: string;
  /** Punteggio minimo. */
  min: number;
  /** La moneta del Regno di Napoli che le dà il nome, e i suoi colori: fondo, metallo, luce. */
  coin: string;
  colors: [string, string, string];
  /** La cornice che si vince chiudendo una stagione in questa lega (catalog.ts, posto `frame`). */
  frame: string;
  /** Monete a fine stagione. */
  coins: number;
}

export const LEAGUES: League[] = [
  { id: 'tornese', name: 'Lega del Tornese', min: 0, coin: 'Tornese', colors: ['#5A3A28', '#C07A4A', '#F2B98C'], frame: 'lega-tornese', coins: 100 },
  { id: 'grana', name: 'Lega della Grana', min: 900, coin: 'Grana', colors: ['#4A3A24', '#B08A4A', '#E8CC8A'], frame: 'lega-grana', coins: 200 },
  { id: 'carlino', name: 'Lega del Carlino', min: 1050, coin: 'Carlino', colors: ['#3A4458', '#AEB8C8', '#F2F4F8'], frame: 'lega-carlino', coins: 400 },
  { id: 'piastra', name: 'Lega della Piastra', min: 1200, coin: 'Piastra', colors: ['#2A3A5E', '#8FB8FF', '#E8F2FF'], frame: 'lega-piastra', coins: 700 },
  { id: 'ducato', name: 'Lega del Ducato', min: 1350, coin: 'Ducato', colors: ['#5A3A08', '#E8BE4F', '#FFF0B8'], frame: 'lega-ducato', coins: 1000 },
  { id: 'oncia', name: 'Lega dell’Oncia', min: 1500, coin: 'Oncia d’oro', colors: ['#3A0E2A', '#F0457A', '#FFD0E2'], frame: 'lega-oncia', coins: 1500 },
  { id: 're', name: 'Lega dei Re', min: 1650, coin: 'Corona', colors: ['#1A1030', '#B58CFF', '#FFF0B8'], frame: 'lega-re', coins: 2500 },
];

export const leagueOf = (r: number): League => {
  let l = LEAGUES[0];
  for (const x of LEAGUES) if (r >= x.min) l = x;
  return l;
};

export const leagueIndex = (r: number) => LEAGUES.indexOf(leagueOf(r));

/** Avanzamento verso la lega dopo: [punti fatti nella lega, punti che servono], o null nell'ultima. */
export function leagueProgress(r: number): [number, number] | null {
  const i = leagueIndex(r);
  const next = LEAGUES[i + 1];
  if (!next) return null;
  const cur = LEAGUES[i];
  const lo = i === 0 ? 700 : cur.min;
  return [Math.max(0, r - lo), next.min - lo];
}

/** In calibrazione finché non si giocano abbastanza partite nella stagione: non si entra in classifica. */
export const placed = (g: GameRating) => g.n >= RATING.placement;
