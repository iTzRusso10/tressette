// Napoletane cards are numbered 0..39.
// suit = c / 10 (0 Coppe, 1 Denari, 2 Spade, 3 Bastoni), rank = c % 10 + 1 (8 Fante, 9 Cavallo, 10 Re).
// 16 is the Settebello, 30 the Asso di bastoni.

export type Card = number;

export const ALL: readonly Card[] = Array.from({ length: 40 }, (_, i) => i);

export const suitOf = (c: Card) => (c / 10) | 0;
export const rankOf = (c: Card) => (c % 10) + 1;

export const SUITS = ['Coppe', 'Denari', 'Spade', 'Bastoni'] as const;
export const RANK_NAMES = ['', 'Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'] as const;
export const RANK_SHORT = ['', 'A', '2', '3', '4', '5', '6', '7', 'F', 'C', 'R'] as const;

export const cardName = (c: Card) => `${RANK_NAMES[rankOf(c)]} di ${SUITS[suitOf(c)]}`;

export const SETTEBELLO: Card = 16;
export const ASSO_BASTONI: Card = 30;

/** Tressette strength: 3, 2, Asso, Re, Cavallo, Fante, 7, 6, 5, 4. Indexed by rank. */
export const POW = [0, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7] as const;
/** Tressette points in thirds: Asso 3, 2/3/figure 1, the rest 0. Indexed by rank. */
export const TZ = [0, 3, 1, 1, 0, 0, 0, 0, 1, 1, 1] as const;
/** Briscola points and strength, indexed by rank. */
export const BPTS = [0, 11, 0, 10, 0, 0, 0, 0, 2, 3, 4] as const;
export const BPOW = [0, 10, 1, 9, 2, 3, 4, 5, 6, 7, 8] as const;
/** Scopa primiera values, indexed by rank. */
export const PRIM = [0, 16, 12, 13, 14, 15, 18, 21, 10, 10, 10] as const;

export const pw = (c: Card) => POW[rankOf(c)];
export const bp = (c: Card) => BPTS[rankOf(c)];
export const bpw = (c: Card) => BPOW[rankOf(c)];
export const sval = (c: Card) => rankOf(c);

/**
 * Tressette points of a card, in thirds.
 * House rule: a perdere the Asso di bastoni is worth 11 points (33 thirds), so a hand is worth 21.
 */
export const tz = (c: Card, perdere: boolean) => (perdere && c === ASSO_BASTONI ? 33 : TZ[rankOf(c)]);

/** Thirds as text: 7 -> "2⅓". */
export function fmtThirds(t: number): string {
  const w = Math.floor(t / 3);
  const r = t % 3;
  const fr = r === 1 ? '⅓' : r === 2 ? '⅔' : '';
  return w ? w + fr : fr || '0';
}
