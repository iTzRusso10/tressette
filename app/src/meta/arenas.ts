// Trophies and arenas: the road of the game. Pure functions, shared with the server.
//
// You win trophies by winning matches and lose some by losing them. Every 8 trophies you reach a new
// arena: a new place in Naples with a more precious table. Once reached, an arena is yours: you never
// drop below its first trophy. After the last arena the trophies keep counting, for the rankings.

import type { Level } from '../engine/types.ts';

export const ARENA_SIZE = 8;

export interface Arena {
  /** 0-based. */
  index: number;
  id: string;
  name: string;
  /** One line about the place. */
  desc: string;
  /** The felt won (and put on the table) when the arena is reached; see shop.ts. */
  felt: string;
  /** A card back won with the arena, if any. */
  back?: string;
  /** Coins when the arena is reached. */
  coins: number;
}

export const ARENAS: Arena[] = [
  { index: 0, id: 'vicolo', name: 'Il Vicolo', desc: 'Un tavolino tra i panni stesi: si comincia da qui.', felt: 'smeraldo', coins: 0 },
  { index: 1, id: 'mercato', name: 'Il Mercato', desc: 'Tra i banchi della Pignasecca, una partita veloce.', felt: 'mercato', coins: 300 },
  { index: 2, id: 'mergellina', name: 'Mergellina', desc: 'Sul lungomare, con il Vesuvio di fronte.', felt: 'mergellina', coins: 400 },
  { index: 3, id: 'spaccanapoli', name: 'Spaccanapoli', desc: 'Nel cuore del centro antico, tra chiese e botteghe.', felt: 'spaccanapoli', coins: 500 },
  { index: 4, id: 'galleria', name: 'La Galleria', desc: 'Sotto la cupola di vetro della Galleria Umberto.', felt: 'galleria', coins: 700 },
  {
    index: 5,
    id: 'gran-caffe',
    name: 'Il Gran Caffè',
    desc: 'Velluto e ottone, tra un caffè e una sfogliatella.',
    felt: 'gran-caffe',
    back: 'ottone',
    coins: 900,
  },
  { index: 6, id: 'posillipo', name: 'Posillipo', desc: 'Una terrazza sul golfo, all’ora del tramonto.', felt: 'posillipo', coins: 1200 },
  { index: 7, id: 'capri', name: 'Capri', desc: 'Alla Piazzetta, dove si gioca per farsi vedere.', felt: 'capri', coins: 1500 },
  { index: 8, id: 'san-carlo', name: 'Teatro San Carlo', desc: 'Nel foyer del teatro più antico d’Europa.', felt: 'san-carlo', coins: 2000 },
  {
    index: 9,
    id: 'reggia',
    name: 'La Reggia',
    desc: 'Nei saloni della Reggia di Caserta: il tavolo del re.',
    felt: 'reggia',
    back: 'corona',
    coins: 3000,
  },
];

export const LAST_ARENA = ARENAS.length - 1;

/** The first trophy of an arena. */
export const arenaFloor = (index: number) => Math.max(0, Math.min(LAST_ARENA, index)) * ARENA_SIZE;

/** The arena you are in with these trophies. */
export const arenaOf = (trophies: number): Arena => ARENAS[Math.max(0, Math.min(LAST_ARENA, Math.floor(trophies / ARENA_SIZE)))];

/** Trophies won inside the current arena, 0..8 (after the last arena it keeps counting past 8). */
export function arenaProgress(trophies: number): { have: number; need: number } {
  const a = arenaOf(trophies);
  return { have: trophies - arenaFloor(a.index), need: ARENA_SIZE };
}

/** The result of a match, as far as trophies are concerned. */
export interface TrophyMatch {
  won: boolean;
  level: Level;
  online: boolean;
}

/**
 * Trophies for a match. A harder opponent pays more; against the easy computer you can't lose any.
 *   win:  Facile +1, Medio +2, Esperto +3, online +3
 *   loss: Facile 0, everything else −1
 */
export function trophyDelta(r: TrophyMatch): number {
  if (r.won) return r.online ? 3 : r.level === 'difficile' ? 3 : r.level === 'medio' ? 2 : 1;
  return !r.online && r.level === 'facile' ? 0 : -1;
}

export interface TrophyResult {
  trophies: number;
  /** What actually changed (a loss at the floor of an arena changes nothing). */
  delta: number;
  /** Arenas reached for the first time with this match (usually none, at most one or two). */
  arenas: Arena[];
}

/**
 * Applies a match. `best` is the highest number of trophies ever held: the floor is the first trophy of
 * the arena it reached, and new arenas are those above it.
 */
export function applyTrophies(trophies: number, best: number, r: TrophyMatch): TrophyResult & { best: number } {
  const floor = arenaFloor(arenaOf(best).index);
  const next = Math.max(floor, trophies + trophyDelta(r));
  const before = arenaOf(best).index;
  const nextBest = Math.max(best, next);
  const after = arenaOf(nextBest).index;
  return { trophies: next, delta: next - trophies, best: nextBest, arenas: ARENAS.slice(before + 1, after + 1) };
}

/** Everything won with an arena: its felt, maybe a back, and coins. */
export const arenaItems = (a: Arena) => [a.felt, ...(a.back ? [a.back] : [])];

/** Items won with all the arenas up to this one. */
export function itemsUpTo(index: number): string[] {
  return ARENAS.slice(0, index + 1).flatMap(arenaItems);
}
