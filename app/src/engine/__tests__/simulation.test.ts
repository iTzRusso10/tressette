import { describe, expect, it } from 'vitest';
import { chooseMove } from '../ai';
import { ALL } from '../cards';
import { createMatch, play, startHand } from '../game';
import { seeded } from '../rng';
import type { GameId, Level, Match, Mode } from '../types';

// Plays whole matches computer against computer and checks that nothing breaks and every point adds up.
const MODES: { game: GameId; mode: Mode; perdN?: 2 | 4; target: number; label: string }[] = [
  { game: 'tressette', mode: '2', target: 21, label: 'Tressette in due' },
  { game: 'tressette', mode: '4', target: 21, label: 'Tressette in quattro' },
  { game: 'tressette', mode: 'perdere', perdN: 4, target: 31, label: 'Tressette a perdere in quattro' },
  { game: 'tressette', mode: 'perdere', perdN: 2, target: 31, label: 'Tressette a perdere in due' },
  { game: 'briscola', mode: '2', target: 3, label: 'Briscola in due' },
  { game: 'briscola', mode: '4', target: 3, label: 'Briscola in quattro' },
  { game: 'scopa', mode: '2', target: 11, label: 'Scopa in due' },
  { game: 'scopa', mode: '4', target: 11, label: 'Scopa in quattro' },
];
const seats = ['Tu', 'A', 'B', 'C'].map(name => ({ name, type: 'cpu' as const }));

function checkHand(m: Match) {
  const h = m.h!;
  const all = h.capt.flat();
  expect(all.slice().sort((a, b) => a - b)).toEqual(ALL.slice());
  if (m.game === 'tressette') {
    const thirds = h.terzi.reduce((a, b) => a + b, 0);
    expect(thirds).toBe(m.mode === 'perdere' ? 65 : 35);
    expect(h.ultima).toBeGreaterThanOrEqual(0);
  }
  if (m.game === 'briscola') expect(h.pts.reduce((a, b) => a + b, 0)).toBe(120);
}

function playMatch(cfg: (typeof MODES)[number], level: Level, seed: number) {
  const rng = seeded(seed);
  let m = createMatch({ ...cfg, seats, level }, rng);
  let hands = 0;
  while (!m.finished) {
    m = startHand(m, rng).at(-1)!.state;
    hands++;
    expect(hands).toBeLessThan(60);
    let moves = 0;
    while (!m.h!.over) {
      const p = m.h!.turn;
      const mv = chooseMove(m, p, rng);
      const steps = play(m, p, mv);
      expect(steps.length).toBeGreaterThan(0);
      m = steps.at(-1)!.state;
      expect(++moves).toBeLessThanOrEqual(40);
    }
    expect(moves).toBe(m.game === 'scopa' ? 36 : 40);
    checkHand(m);
  }
  const out = m.h!.result!.out!;
  expect(out.winners.length).toBeGreaterThan(0);
  if (cfg.mode === 'perdere' && !out.cappotto) expect(out.losers.length).toBeGreaterThan(0);
  return { m, hands };
}

describe('partite intere computer contro computer', () => {
  for (const cfg of MODES) {
    for (const level of ['facile', 'medio', 'difficile'] as Level[]) {
      it(`${cfg.label}, ${level}`, () => {
        const runs = level === 'difficile' ? 1 : 3;
        for (let s = 0; s < runs; s++) playMatch(cfg, level, 1000 + s);
      });
    }
  }
});
