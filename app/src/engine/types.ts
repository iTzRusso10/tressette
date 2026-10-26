import type { Card } from './cards';

export type GameId = 'tressette' | 'briscola' | 'scopa';
/** '2' and '4' are the normal modes; 'perdere' is Tressette a perdere (in two or four, each for themselves). */
export type Mode = '2' | '4' | 'perdere';
export type Level = 'facile' | 'medio' | 'difficile';
export type SeatType = 'human' | 'cpu' | 'remote';
export type Signal = 'Busso' | 'Striscio' | 'Volo';

export interface Seat {
  name: string;
  type: SeatType;
}

export interface TrickEntry {
  p: number;
  c: Card;
}

export interface Accuso {
  p: number;
  label: string;
  pts: number;
  cards: Card[];
}

export interface Move {
  c: Card;
  /** Scopa: the cards taken from the table (empty when the card is laid down). */
  take?: Card[];
  /** Tressette in four: the signal given with the opening card. */
  sig?: Signal | null;
}

export interface TressetteRow {
  t: number;
  /** Card points in thirds, without the last trick. */
  cardsT: number;
  ult: boolean;
  acc: number;
  pts: number;
  total: number;
  tricks: number;
}
export interface BriscolaRow {
  t: number;
  pts: number;
  tricks: number;
  total: number;
}
export interface ScopaRow {
  t: number;
  scope: number;
  cards: number;
  den: number;
  sb: boolean;
  prim: number;
  pCards: number;
  pDen: number;
  pPrim: number;
  pSb: number;
  total: number;
}
export type HandRow = TressetteRow | BriscolaRow | ScopaRow;

export interface Outcome {
  winners: number[];
  losers: number[];
  cappotto?: boolean;
}

export interface HandResult {
  rows: HandRow[];
  out: Outcome | null;
}

export interface Hand {
  hands: Card[][];
  deck: Card[];
  trick: TrickEntry[];
  turn: number;
  /** Tressette points per seat, in thirds. */
  terzi: number[];
  tricks: number[];
  capt: Card[][];
  played: Card[];
  /** voids[p][suit]: p showed they have no cards of that suit. */
  voids: boolean[][];
  /** Cards everyone knows p holds (accusi, cards drawn face up). */
  known: Card[][];
  accusi: Accuso[];
  signal: { p: number; type: Signal } | null;
  /** Seat that took the last trick (Tressette), or -1. */
  ultima: number;
  last: { trick: TrickEntry[]; w: number } | null;
  /** Scopa: the cards on the table. */
  table: Card[];
  /** Briscola: the face-up card under the deck and its suit. */
  brisc: Card | null;
  trump: number;
  /** Briscola points per seat. */
  pts: number[];
  scope: number[];
  lastCap: number;
  over: boolean;
  result: HandResult | null;
  // Transient, for the table to show what is happening.
  /** Cards highlighted on the table: the winning card of a trick, or the cards of a Scopa capture. */
  glow: Card[] | null;
  /** Scopa: the card just played onto the cards it takes, before they are collected. */
  inPlay: { p: number; c: Card; on: Card } | null;
  /** Tressette in two: the cards drawn face up after a trick. */
  reveal: TrickEntry[] | null;
}

export interface MatchConfig {
  game: GameId;
  mode: Mode;
  /** Players a perdere: 2 or 4. Ignored in the other modes. */
  perdN?: 2 | 4;
  seats: Seat[];
  level: Level;
  target: number;
  /** Tressette: accusi on (never a perdere). */
  accusi?: boolean;
  /** Tressette a perdere: cappotto on (default on). */
  cappotto?: boolean;
}

export interface Match {
  game: GameId;
  mode: Mode;
  n: number;
  seats: Seat[];
  level: Level;
  target: number;
  accusi: boolean;
  cappotto: boolean;
  /** Match score per team (per player when everyone plays for themselves). */
  match: number[];
  handNo: number;
  dealer: number;
  finished: boolean;
  h: Hand | null;
}

/** What happened in a step, so the table knows how to animate it and how long to linger. */
export type GameEvent =
  | { k: 'deal'; order: Card[] }
  | { k: 'accuso'; p: number; label: string; pts: number }
  | { k: 'play'; p: number; c: Card; sig: Signal | null }
  | { k: 'capture'; p: number; c: Card; take: Card[] }
  | { k: 'trickWon'; w: number; cards: Card[] }
  | { k: 'collect'; w: number; pts: string; ultima: boolean; scopa?: boolean; settebello?: boolean }
  | { k: 'draw'; p: number; c: Card }
  | { k: 'reveal'; cards: TrickEntry[] }
  | { k: 'deckEmpty' }
  | { k: 'dealRound'; order: Card[] }
  | { k: 'tableToLast'; p: number }
  | { k: 'handEnd'; cappotto: number };

export interface Step {
  event: GameEvent;
  state: Match;
}
