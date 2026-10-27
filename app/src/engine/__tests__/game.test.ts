import { describe, expect, it } from 'vitest';
import { ALL, SETTEBELLO, type Card } from '../cards';
import { createMatch, matchOutcome, play, primiera, scopaResult, startHand } from '../game';
import { seeded } from '../rng';
import type { BriscolaRow, Match, MatchConfig, ScopaRow, TressetteRow } from '../types';

const C = (s: number, r: number) => s * 10 + r - 1;
const seats = [
  { name: 'Tu', type: 'human' as const },
  { name: 'A', type: 'cpu' as const },
  { name: 'B', type: 'cpu' as const },
  { name: 'C', type: 'cpu' as const },
];

function matchWith(cfg: Partial<MatchConfig> & Pick<MatchConfig, 'game' | 'mode'>, setup: (m: Match) => void): Match {
  const m0 = createMatch({ seats, level: 'medio', target: 31, ...cfg }, seeded(1));
  const m = startHand(m0, seeded(2)).at(-1)!.state;
  const h = m.h!;
  h.deck = [];
  h.accusi = [];
  h.known = h.hands.map(() => []);
  setup(m);
  return m;
}

const last = (steps: ReturnType<typeof play>) => steps.at(-1)!;

describe('Tressette a perdere', () => {
  it('l’obiettivo è sempre 31, anche se si sceglie altro', () => {
    const m = createMatch({ game: 'tressette', mode: 'perdere', perdN: 2, seats, level: 'medio', target: 11 });
    expect(m.target).toBe(31);
    expect(m.n).toBe(2);
    expect(m.accusi).toBe(false);
    expect(m.cappotto).toBe(true);
  });

  it('l’Asso di bastoni vale 11', () => {
    const m = matchWith({ game: 'tressette', mode: 'perdere', perdN: 2 }, m => {
      const h = m.h!;
      h.hands = [[C(3, 1)], [C(3, 4)]];
      h.turn = 0;
      h.terzi = [0, 3];
    });
    const s = last(play(play(m, 0, { c: C(3, 1) }).at(-1)!.state, 1, { c: C(3, 4) }));
    const rows = s.state.h!.result!.rows as TressetteRow[];
    // 33 thirds for the Asso di bastoni + 3 for the last trick.
    expect(rows[0]).toMatchObject({ cardsT: 33, ult: true, pts: 12 });
    expect(rows[1]).toMatchObject({ cardsT: 3, pts: 1 });
  });

  it('cappotto: chi prende tutti i punti, ultima compresa, vince subito', () => {
    const m = matchWith({ game: 'tressette', mode: 'perdere', perdN: 2 }, m => {
      const h = m.h!;
      h.hands = [[C(0, 1)], [C(0, 4)]];
      h.turn = 0;
      h.terzi = [59, 0];
    });
    const st = last(play(play(m, 0, { c: C(0, 1) }).at(-1)!.state, 1, { c: C(0, 4) }));
    expect(st.event).toEqual({ k: 'handEnd', cappotto: 0 });
    expect(st.state.finished).toBe(true);
    expect(st.state.h!.result!.out).toMatchObject({ winners: [0], cappotto: true });
  });

  it('niente cappotto se l’altro ha almeno un terzo', () => {
    const m = matchWith({ game: 'tressette', mode: 'perdere', perdN: 2 }, m => {
      const h = m.h!;
      h.hands = [[C(0, 1)], [C(0, 4)]];
      h.turn = 0;
      h.terzi = [58, 1];
    });
    const st = last(play(play(m, 0, { c: C(0, 1) }).at(-1)!.state, 1, { c: C(0, 4) }));
    expect(st.event).toEqual({ k: 'handEnd', cappotto: -1 });
    expect(st.state.finished).toBe(false);
  });

  it('il cappotto si può disattivare e non vale fuori dal perdere', () => {
    for (const cfg of [
      { game: 'tressette' as const, mode: 'perdere' as const, perdN: 2 as const, cappotto: false },
      { game: 'tressette' as const, mode: '2' as const },
    ]) {
      const m = matchWith(cfg, m => {
        const h = m.h!;
        h.hands = [[C(0, 1)], [C(0, 4)]];
        h.turn = 0;
        h.terzi = [59, 0];
      });
      const st = last(play(play(m, 0, { c: C(0, 1) }).at(-1)!.state, 1, { c: C(0, 4) }));
      expect(st.event).toEqual({ k: 'handEnd', cappotto: -1 });
    }
  });

  it('chi arriva a 31 perde, vince chi ha meno punti', () => {
    const m = createMatch({ game: 'tressette', mode: 'perdere', perdN: 4, seats, level: 'medio', target: 31 });
    m.match = [31, 12, 8, 20];
    expect(matchOutcome(m)).toEqual({ winners: [2], losers: [0] });
    m.match = [30, 12, 8, 20];
    expect(matchOutcome(m)).toBeNull();
  });

  it('in quattro ognuno gioca per sé', () => {
    const m = createMatch({ game: 'tressette', mode: 'perdere', perdN: 4, seats, level: 'medio', target: 31 });
    expect(m.match).toHaveLength(4);
  });
});

describe('Tressette', () => {
  it('a pari merito sopra l’obiettivo si continua', () => {
    const m = createMatch({ game: 'tressette', mode: '2', seats, level: 'medio', target: 11 });
    m.match = [12, 12];
    expect(matchOutcome(m)).toBeNull();
    m.match = [13, 12];
    expect(matchOutcome(m)).toEqual({ winners: [0], losers: [] });
  });

  it('in due si pesca dal mazzo e le carte pescate si vedono', () => {
    const m = matchWith({ game: 'tressette', mode: '2' }, m => {
      const h = m.h!;
      h.hands = [
        [C(0, 3), C(1, 5)],
        [C(0, 4), C(2, 6)],
      ];
      h.deck = [C(3, 7), C(3, 8)];
      h.turn = 0;
    });
    const steps = play(play(m, 0, { c: C(0, 3) }).at(-1)!.state, 1, { c: C(0, 4) });
    const kinds = steps.map(s => s.event.k);
    expect(kinds).toEqual(['play', 'trickWon', 'collect', 'reveal', 'draw', 'deckEmpty']);
    const h = steps.at(-1)!.state.h!;
    // The winner draws the top card.
    expect(h.hands[0]).toContain(C(3, 8));
    expect(h.hands[1]).toContain(C(3, 7));
    expect(h.known[1]).toContain(C(3, 7));
    expect(h.turn).toBe(0);
  });

  it('segnali solo in quattro e solo con la carta di apertura', () => {
    const m = matchWith({ game: 'tressette', mode: '4' }, m => {
      const h = m.h!;
      h.hands = [
        [C(0, 3), C(0, 5)],
        [C(0, 4), C(1, 5)],
        [C(0, 6), C(1, 6)],
        [C(0, 7), C(1, 7)],
      ];
      h.turn = 0;
    });
    const s = play(m, 0, { c: C(0, 5), sig: 'Busso' }).at(-1)!;
    expect(s.event).toEqual({ k: 'play', p: 0, c: C(0, 5), sig: 'Busso' });
    expect(s.state.h!.signal).toEqual({ p: 0, type: 'Busso' });
    expect(() => play(s.state, 1, { c: C(0, 4), sig: 'Volo' })).toThrow();
  });

  it('non si può rispondere fuori seme se si ha il seme', () => {
    const m = matchWith({ game: 'tressette', mode: '2' }, m => {
      const h = m.h!;
      h.hands = [[C(0, 3)], [C(0, 4), C(2, 6)]];
      h.turn = 0;
    });
    const s = play(m, 0, { c: C(0, 3) }).at(-1)!.state;
    expect(() => play(s, 1, { c: C(2, 6) })).toThrow();
  });
});

describe('Briscola', () => {
  it('la mano si vince con più di 60, 60 a 60 è pari', () => {
    const m = matchWith({ game: 'briscola', mode: '2', target: 1 }, m => {
      const h = m.h!;
      h.hands = [[C(0, 4)], [C(0, 5)]];
      h.turn = 0;
      h.pts = [60, 60];
      h.trump = 1;
    });
    const s = last(play(play(m, 0, { c: C(0, 4) }).at(-1)!.state, 1, { c: C(0, 5) }));
    const rows = s.state.h!.result!.rows as BriscolaRow[];
    expect(rows.map(r => r.total)).toEqual([0, 0]);
    expect(s.state.finished).toBe(false);
  });

  it('dopo la presa si pesca, prima chi ha preso', () => {
    const m = matchWith({ game: 'briscola', mode: '2' }, m => {
      const h = m.h!;
      h.hands = [
        [C(0, 4), C(0, 6)],
        [C(0, 1), C(0, 9)],
      ];
      h.deck = [C(2, 2), C(2, 3)];
      h.trump = 2;
      h.brisc = C(2, 2);
      h.turn = 0;
    });
    const steps = play(play(m, 0, { c: C(0, 4) }).at(-1)!.state, 1, { c: C(0, 1) });
    expect(steps.filter(s => s.event.k === 'draw').map(s => s.event)).toEqual([
      { k: 'draw', p: 1, c: C(2, 3) },
      { k: 'draw', p: 0, c: C(2, 2) },
    ]);
    expect(steps.at(-1)!.state.h!.pts[1]).toBe(11);
  });
});

describe('Scopa', () => {
  it('scopa quando si spazza il tavolo, ma non all’ultima giocata', () => {
    const m = matchWith({ game: 'scopa', mode: '2', target: 11 }, m => {
      const h = m.h!;
      h.hands = [[C(0, 5), C(1, 1)], [C(2, 5)]];
      h.table = [C(3, 5)];
      h.turn = 0;
    });
    const a = play(m, 0, { c: C(0, 5), take: [C(3, 5)] });
    expect(a.find(s => s.event.k === 'collect')!.event).toMatchObject({ scopa: true });
    expect(a.at(-1)!.state.h!.scope[0]).toBe(1);
    const b = play(a.at(-1)!.state, 1, { c: C(2, 5), take: [] });
    const c = play(b.at(-1)!.state, 0, { c: C(1, 1), take: [] });
    // Nobody took the last cards on the table: they go to the last capture.
    expect(c.some(s => s.event.k === 'tableToLast' && s.event.p === 0)).toBe(true);
  });

  it('presa all’ultima giocata che svuota il tavolo: niente scopa', () => {
    const m = matchWith({ game: 'scopa', mode: '2', target: 11 }, m => {
      const h = m.h!;
      h.hands = [[C(0, 5)], []];
      h.table = [C(3, 5)];
      h.turn = 0;
    });
    const st = play(m, 0, { c: C(0, 5), take: [C(3, 5)] });
    expect(st.find(s => s.event.k === 'collect')!.event).toMatchObject({ scopa: false });
  });

  it('se c’è la carta uguale non si può prendere per somma', () => {
    const m = matchWith({ game: 'scopa', mode: '2', target: 11 }, m => {
      const h = m.h!;
      h.hands = [[C(0, 5)], [C(1, 9)]];
      h.table = [C(3, 5), C(1, 2), C(2, 3)];
      h.turn = 0;
    });
    expect(() => play(m, 0, { c: C(0, 5), take: [C(1, 2), C(2, 3)] })).toThrow();
    expect(() => play(m, 0, { c: C(0, 5), take: [] })).toThrow();
  });

  it('primiera, carte, denari e settebello', () => {
    expect(primiera([C(0, 7), C(1, 7), C(2, 7), C(3, 7)])).toBe(84);
    expect(primiera([C(0, 6), C(1, 1)])).toBe(34);
    const m = matchWith({ game: 'scopa', mode: '2', target: 11 }, m => {
      const h = m.h!;
      const half = ALL.filter(c => c % 2 === 0);
      h.capt = [half, ALL.filter(c => c % 2 === 1)];
    });
    const rows = scopaResult(m) as ScopaRow[];
    // 20 cards each: no point for cards.
    expect(rows.map(r => r.pCards)).toEqual([0, 0]);
    expect(rows[0].sb).toBe(SETTEBELLO % 2 === 0);
    expect(rows.reduce((a, r) => a + r.pSb, 0)).toBe(1);
  });

  it('tre Re in tavola: si ridistribuisce', () => {
    for (let seed = 0; seed < 300; seed++) {
      const m = startHand(createMatch({ game: 'scopa', mode: '2', seats, level: 'medio', target: 11 }, seeded(seed)), seeded(seed)).at(-1)!.state;
      const kings = m.h!.table.filter((c: Card) => c % 10 === 9).length;
      expect(kings).toBeLessThan(3);
    }
  });
});
