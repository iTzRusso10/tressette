import { bpw, pw, rankOf, suitOf, SUITS, sval, type Card } from './cards';
import type { Accuso, GameId, Match, Mode, TrickEntry } from './types';

export const GAMES: Record<GameId, { name: string; modes: Mode[]; targets: number[]; tlabel: string; desc: string }> = {
  tressette: {
    name: 'Tressette',
    modes: ['2', '4', 'perdere'],
    targets: [11, 21, 31],
    tlabel: 'Si vince a',
    desc: 'Il gioco del tre e del sette: si risponde a seme, contano Assi e figure.',
  },
  briscola: {
    name: 'Briscola',
    modes: ['2', '4'],
    targets: [1, 2, 3],
    tlabel: 'Partite da vincere',
    desc: 'Tre carte in mano e un seme che comanda: chi fa più di 60 punti vince.',
  },
  scopa: {
    name: 'Scopa',
    modes: ['2', '4'],
    targets: [11, 16, 21],
    tlabel: 'Si vince a',
    desc: 'Prendi dal tavolo per valore o per somma e spazzalo tutto per fare scopa.',
  },
};

export const MODE_INFO: Record<GameId, Partial<Record<Mode, [string, string]>>> = {
  tressette: {
    '2': ['In due', 'Uno contro uno, si pesca dal mazzo.'],
    '4': ['In quattro', 'A coppie, col compagno di fronte.'],
    perdere: ['A perdere', 'In due o in quattro, vince chi prende meno.'],
  },
  briscola: { '2': ['In due', 'Uno contro uno, tre carte a testa.'], '4': ['In quattro', 'A coppie, col compagno di fronte.'] },
  scopa: { '2': ['In due', 'Uno contro uno, quattro carte in tavola.'], '4': ['In quattro', 'A coppie, col compagno di fronte.'] },
};

/** House rule: a perdere one only loses, at 31. */
export const targetsFor = (game: GameId, mode: Mode) => (game === 'tressette' && mode === 'perdere' ? [31] : GAMES[game].targets);

export const playersFor = (mode: Mode, perdN?: 2 | 4) => (mode === '2' ? 2 : mode === 'perdere' ? (perdN === 2 ? 2 : 4) : 4);

/** Teams: in four (not a perdere) partners sit opposite, otherwise everyone is on their own. */
export const teamOf = (m: Pick<Match, 'mode'>, p: number) => (m.mode === '4' ? p % 2 : p);
export const nTeams = (m: Pick<Match, 'mode' | 'n'>) => (m.mode === '4' ? 2 : m.n);
export const teamSeats = (m: Pick<Match, 'mode' | 'n'>, t: number) => Array.from({ length: m.n }, (_, i) => i).filter(p => teamOf(m, p) === t);
export const isPerdere = (m: Pick<Match, 'game' | 'mode'>) => m.game === 'tressette' && m.mode === 'perdere';

/** Tressette: you must follow suit if you can. */
export function legal(hand: Card[], trick: TrickEntry[]): Card[] {
  if (!trick.length) return hand.slice();
  const s = suitOf(trick[0].c);
  const f = hand.filter(c => suitOf(c) === s);
  return f.length ? f : hand.slice();
}

export function legalFor(game: GameId, hand: Card[], trick: TrickEntry[]): Card[] {
  return game === 'tressette' ? legal(hand, trick) : hand.slice();
}

/** Tressette: the strongest card of the suit led takes the trick. */
export function winEntry(trick: TrickEntry[]): TrickEntry {
  const s = suitOf(trick[0].c);
  let b = trick[0];
  for (const e of trick) if (suitOf(e.c) === s && pw(e.c) > pw(b.c)) b = e;
  return b;
}

export function winBriscola(trick: TrickEntry[], trump: number): TrickEntry {
  let b = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const e = trick[i];
    const bs = suitOf(b.c);
    const es = suitOf(e.c);
    if (es === bs ? bpw(e.c) > bpw(b.c) : es === trump) b = e;
  }
  return b;
}

/** Accusi: Napoletana (Asso, 2 and 3 of a suit) 3; three Assi, Due or Tre 3; all four 4. */
export function findAccusi(hand: Card[]): Omit<Accuso, 'p'>[] {
  const res: Omit<Accuso, 'p'>[] = [];
  for (let s = 0; s < 4; s++) {
    const ids = [s * 10, s * 10 + 1, s * 10 + 2];
    if (ids.every(c => hand.includes(c))) res.push({ label: 'Napoletana di ' + SUITS[s], pts: 3, cards: ids });
  }
  for (const r of [1, 2, 3]) {
    const ids = [0, 1, 2, 3].map(s => s * 10 + r - 1).filter(c => hand.includes(c));
    if (ids.length >= 3)
      res.push({
        label: (ids.length === 4 ? 'Quattro ' : 'Tris di ') + (r === 1 ? 'Assi' : r === 2 ? 'Due' : 'Tre'),
        pts: ids.length,
        cards: ids,
      });
  }
  return res;
}

/**
 * Scopa: the possible captures for card c.
 * If one or more table cards have the same value, you must take one of those (never a sum).
 * Otherwise every combination of two or more cards adding up to its value.
 */
export function scopaOptions(c: Card, table: Card[]): Card[][] {
  const v = sval(c);
  const singles = table.filter(x => sval(x) === v).map(x => [x]);
  if (singles.length) return singles;
  const res: Card[][] = [];
  const cur: Card[] = [];
  const rec = (i: number, sum: number) => {
    if (sum === v) {
      if (cur.length >= 2) res.push(cur.slice());
      return;
    }
    if (sum > v) return;
    for (let j = i; j < table.length; j++) {
      cur.push(table[j]);
      rec(j + 1, sum + sval(table[j]));
      cur.pop();
    }
  };
  rec(0, 0);
  return res;
}

export const sameSet = (a: Card[], b: Card[]) => a.length === b.length && a.every(x => b.includes(x));

export function handSort(game: GameId) {
  return (a: Card, b: Card) => {
    if (game === 'scopa') return rankOf(a) - rankOf(b) || suitOf(a) - suitOf(b);
    return suitOf(a) - suitOf(b) || (game === 'briscola' ? bpw(b) - bpw(a) : pw(b) - pw(a));
  };
}
