// Coins, the daily bonus and levels. Pure functions: the server (Supabase) runs the same rules
// once accounts are on; until then they run on the device.

export const START_COINS = 1000;
/** Daily bonus by day of the streak: the 7th day and beyond pay the top. */
export const BONUS_LADDER = [100, 150, 200, 250, 300, 400, 500] as const;
/** Online stakes to choose from; 0 is a friendly game. */
export const STAKES = [0, 100, 500, 1000, 5000] as const;
/** Free coins from a video when the wallet runs low. */
export const REFILL = 200;
export const REFILL_BELOW = 100;
/** Coins for winning against the computer, by level. */
export const CPU_WIN_COINS = { facile: 20, medio: 40, difficile: 80 } as const;

export interface BonusState {
  /** Local day (YYYY-MM-DD) of the last claim, or null. */
  lastDay: string | null;
  /** Days in a row, counting the last claim. */
  streak: number;
}

/** The local calendar day of a time, as YYYY-MM-DD. */
export function dayOf(t: Date): string {
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const ua = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const ub = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((ub - ua) / 86400000);
}

export const canClaim = (s: BonusState, now: Date) => s.lastDay !== dayOf(now);

/** The streak the next claim would reach: one more if yesterday was claimed, otherwise back to 1. */
export function nextStreak(s: BonusState, now: Date): number {
  if (!s.lastDay) return 1;
  const gap = daysBetween(s.lastDay, dayOf(now));
  if (gap <= 0) return s.streak;
  return gap === 1 ? s.streak + 1 : 1;
}

export const bonusFor = (streak: number) => BONUS_LADDER[Math.min(BONUS_LADDER.length, Math.max(1, streak)) - 1];

/** Claims today's bonus. Throws if already claimed today. */
export function claimBonus(s: BonusState, now: Date): { state: BonusState; amount: number } {
  if (!canClaim(s, now)) throw new Error('Bonus già ritirato oggi');
  const streak = nextStreak(s, now);
  return { state: { lastDay: dayOf(now), streak }, amount: bonusFor(streak) };
}

/* ------------------------------------------------------------------ levels */

/** Experience needed to reach a level: 0, 100, 300, 600, 1000… (each level 100 more than the last). */
export const xpForLevel = (level: number) => (50 * (level - 1) * level) | 0;

export function levelOf(xp: number): number {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}

/** How far into the current level, 0..1. */
export function levelProgress(xp: number): number {
  const l = levelOf(xp);
  const a = xpForLevel(l);
  const b = xpForLevel(l + 1);
  return (xp - a) / (b - a);
}

/** Experience for a finished hand and for the end of a match. */
export const XP = { hand: 10, win: 50, loss: 15, scopa: 5 } as const;
