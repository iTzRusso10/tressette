// Monete, bonus giornaliero e giorni. Funzioni pure: il server (Supabase) usa le stesse regole.
// I numeri sono in balance.ts; i livelli in levels.ts.

import { BALANCE } from './balance.ts';

export const START_COINS = BALANCE.coins.start;
export const BONUS_LADDER = BALANCE.coins.bonusLadder;
/** Poste online da scegliere; 0 è una partita amichevole. */
export const STAKES = [0, 100, 500, 1000, 5000] as const;
export const REFILL = BALANCE.coins.refill;
export const REFILL_BELOW = BALANCE.coins.refillBelow;

export interface BonusState {
  /** Giorno (AAAA-MM-GG) dell'ultimo ritiro, o null. */
  lastDay: string | null;
  /** Giorni di fila, contando l'ultimo ritiro. */
  streak: number;
}

/** Il giorno locale di un istante, AAAA-MM-GG. */
export function dayOf(t: Date): string {
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

export const canClaimOn = (s: BonusState, day: string) => s.lastDay !== day;
export const canClaim = (s: BonusState, now: Date) => canClaimOn(s, dayOf(now));

/**
 * La serie che raggiungerebbe il prossimo ritiro: uno in più se ieri hai ritirato. Saltare non azzera
 * tutto: ogni giorno saltato fa scendere di un gradino (minimo 1), così una giornata persa costa poco.
 */
export function nextStreakOn(s: BonusState, day: string): number {
  if (!s.lastDay) return 1;
  const gap = daysBetween(s.lastDay, day);
  if (gap <= 0) return s.streak;
  return gap === 1 ? s.streak + 1 : Math.max(1, s.streak - (gap - 1));
}
export const nextStreak = (s: BonusState, now: Date) => nextStreakOn(s, dayOf(now));

export const bonusFor = (streak: number) => BONUS_LADDER[Math.min(BONUS_LADDER.length, Math.max(1, streak)) - 1];

/** Il bonus di un giorno. Lancia un errore se è già stato ritirato. */
export function claimBonusOn(s: BonusState, day: string): { state: BonusState; amount: number } {
  if (!canClaimOn(s, day)) throw new Error('Bonus già ritirato oggi');
  const streak = nextStreakOn(s, day);
  return { state: { lastDay: day, streak }, amount: bonusFor(streak) };
}
export const claimBonus = (s: BonusState, now: Date) => claimBonusOn(s, dayOf(now));

export { levelInfo, levelLabel, levelOf, levelProgress, xpForLevel } from './levels.ts';
