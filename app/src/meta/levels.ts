// Livello giocatore: 100 livelli con esperienza crescente, poi gradi di Prestigio senza fine.

import { BALANCE } from './balance.ts';

const { levelBase, levelStep, maxLevel, prestigeStep } = BALANCE.xp;

/** Esperienza totale per arrivare al livello L (1 → 0). */
export const xpForLevel = (level: number) => {
  const k = Math.max(0, Math.min(maxLevel, level) - 1);
  return k * levelBase + (levelStep * k * (k - 1)) / 2;
};

/** Esperienza per arrivare al livello 100. */
export const XP_MAX_LEVEL = xpForLevel(maxLevel);

export interface LevelInfo {
  /** 1…100. */
  level: number;
  /** Gradi di Prestigio dopo il 100 (0 prima). */
  prestige: number;
  /** Punti fatti nel livello (o nel grado di Prestigio) e punti che servono. */
  have: number;
  need: number;
}

export function levelInfo(xp: number): LevelInfo {
  const x = Math.max(0, Math.floor(xp));
  if (x >= XP_MAX_LEVEL) {
    const over = x - XP_MAX_LEVEL;
    return { level: maxLevel, prestige: Math.floor(over / prestigeStep), have: over % prestigeStep, need: prestigeStep };
  }
  let lo = 1;
  let hi = maxLevel;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (xpForLevel(mid) <= x) lo = mid;
    else hi = mid - 1;
  }
  return { level: lo, prestige: 0, have: x - xpForLevel(lo), need: xpForLevel(lo + 1) - xpForLevel(lo) };
}

export const levelOf = (xp: number) => levelInfo(xp).level;
export const levelProgress = (xp: number) => {
  const i = levelInfo(xp);
  return i.need ? i.have / i.need : 0;
};

/** Come si scrive: «Livello 42», «Prestigio 3». */
export function levelLabel(xp: number): string {
  const i = levelInfo(xp);
  return i.prestige > 0 ? `Prestigio ${i.prestige}` : `Livello ${i.level}`;
}

const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];
export function roman(n: number): string {
  let x = Math.max(1, Math.floor(n));
  let s = '';
  for (const [v, r] of ROMAN)
    while (x >= v) {
      s += r;
      x -= v;
    }
  return s;
}
