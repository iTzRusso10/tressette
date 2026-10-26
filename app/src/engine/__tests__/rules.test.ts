import { describe, expect, it } from 'vitest';
import { ALL, ASSO_BASTONI, cardName, fmtThirds, rankOf, SETTEBELLO, suitOf, tz } from '../cards';
import { findAccusi, legal, playersFor, scopaOptions, targetsFor, winBriscola, winEntry } from '../rules';

// Shorthand: card from suit (0 Coppe, 1 Denari, 2 Spade, 3 Bastoni) and rank (1..10).
const C = (s: number, r: number) => s * 10 + r - 1;

describe('carte', () => {
  it('codifica', () => {
    expect(SETTEBELLO).toBe(C(1, 7));
    expect(ASSO_BASTONI).toBe(C(3, 1));
    expect(cardName(16)).toBe('Sette di Denari');
    expect(cardName(30)).toBe('Asso di Bastoni');
    expect(suitOf(39)).toBe(3);
    expect(rankOf(39)).toBe(10);
  });

  it('una mano di Tressette vale 11, a perdere 21 (Asso di bastoni da 11)', () => {
    const normal = ALL.reduce((a, c) => a + tz(c, false), 0) + 3;
    const perdere = ALL.reduce((a, c) => a + tz(c, true), 0) + 3;
    expect(Math.floor(normal / 3)).toBe(11);
    expect(perdere / 3).toBeCloseTo(21 + 2 / 3);
    expect(Math.floor(perdere / 3)).toBe(21);
    expect(tz(ASSO_BASTONI, true)).toBe(33);
    expect(tz(ASSO_BASTONI, false)).toBe(3);
    expect(tz(C(0, 1), true)).toBe(3);
  });

  it('terzi in testo', () => {
    expect(fmtThirds(0)).toBe('0');
    expect(fmtThirds(1)).toBe('⅓');
    expect(fmtThirds(5)).toBe('1⅔');
    expect(fmtThirds(33)).toBe('11');
  });
});

describe('regole della casa', () => {
  it('a perdere si perde solo a 31', () => {
    expect(targetsFor('tressette', 'perdere')).toEqual([31]);
    expect(targetsFor('tressette', '2')).toEqual([11, 21, 31]);
  });
  it('a perdere si gioca in due o in quattro', () => {
    expect(playersFor('perdere', 2)).toBe(2);
    expect(playersFor('perdere', 4)).toBe(4);
    expect(playersFor('perdere')).toBe(4);
  });
});

describe('Tressette', () => {
  it('si risponde a seme', () => {
    const hand = [C(0, 5), C(1, 3), C(1, 4)];
    expect(legal(hand, [{ p: 0, c: C(1, 1) }])).toEqual([C(1, 3), C(1, 4)]);
    expect(legal(hand, [{ p: 0, c: C(2, 1) }])).toEqual(hand);
    expect(legal(hand, [])).toEqual(hand);
  });

  it('prende la più forte del seme uscito: 3, 2, Asso, Re…', () => {
    const t = (cs: number[]) => winEntry(cs.map((c, p) => ({ p, c }))).p;
    expect(t([C(0, 1), C(0, 3), C(0, 2)])).toBe(1);
    expect(t([C(0, 4), C(1, 3), C(0, 5)])).toBe(2);
    expect(t([C(0, 10), C(0, 1)])).toBe(1);
    expect(t([C(0, 2), C(0, 1)])).toBe(0);
  });

  it('accusi', () => {
    const nap = findAccusi([C(1, 1), C(1, 2), C(1, 3), C(0, 5)]);
    expect(nap).toEqual([{ label: 'Napoletana di Denari', pts: 3, cards: [C(1, 1), C(1, 2), C(1, 3)] }]);
    const tris = findAccusi([C(0, 3), C(1, 3), C(2, 3)]);
    expect(tris[0]).toMatchObject({ label: 'Tris di Tre', pts: 3 });
    const four = findAccusi([C(0, 1), C(1, 1), C(2, 1), C(3, 1)]);
    expect(four[0]).toMatchObject({ label: 'Quattro Assi', pts: 4 });
    expect(findAccusi([C(0, 1), C(1, 1), C(2, 2)])).toEqual([]);
  });
});

describe('Briscola', () => {
  it('la briscola taglia, altrimenti vince il seme uscito', () => {
    const trump = 2;
    const t = (cs: number[]) => winBriscola(cs.map((c, p) => ({ p, c })), trump).p;
    expect(t([C(0, 1), C(2, 2)])).toBe(1);
    expect(t([C(0, 2), C(0, 3)])).toBe(1);
    expect(t([C(0, 3), C(1, 1)])).toBe(0);
    expect(t([C(0, 1), C(0, 3)])).toBe(0);
    expect(t([C(2, 4), C(2, 1)])).toBe(1);
  });
});

describe('Scopa', () => {
  it('se c’è una carta uguale va presa quella', () => {
    const table = [C(0, 3), C(1, 2), C(2, 1), C(3, 3)];
    expect(scopaOptions(C(1, 3), table)).toEqual([[C(0, 3)], [C(3, 3)]]);
  });
  it('altrimenti per somma, con due o più carte', () => {
    const table = [C(0, 2), C(1, 3), C(2, 1), C(3, 4)];
    const o = scopaOptions(C(1, 5), table).map(x => x.slice().sort((a, b) => a - b));
    expect(o).toEqual(
      expect.arrayContaining([
        [C(0, 2), C(1, 3)].sort((a, b) => a - b),
        [C(2, 1), C(3, 4)].sort((a, b) => a - b),
      ]),
    );
    expect(o).toHaveLength(2);
  });
  it('senza prese possibili si cala', () => {
    expect(scopaOptions(C(0, 10), [C(0, 2), C(1, 3)])).toEqual([]);
  });
});
