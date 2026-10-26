import { describe, expect, it, vi } from 'vitest';
import { chooseMove, createMatch, play, seeded, startHand, type GameId, type Match, type Mode } from '@/engine';
import { assignSlots, layoutCards, measure, sideOf, TAG_H, TAG_W, type Geometry, type Place } from '../layout';

vi.mock('@/ui/theme', () => ({ CARD_RATIO: 575 / 360 }));

// Checks the geometry on many screens: cards on the table stay on the felt, hands stay on screen,
// nothing slides under the score bar or over the names.
const SCREENS: [number, number][] = [
  [320, 568],
  [375, 647],
  [393, 793],
  [430, 880],
  [768, 1000],
  [1280, 720],
];
const MODES: { game: GameId; mode: Mode; perdN?: 2 | 4 }[] = [
  { game: 'tressette', mode: '2' },
  { game: 'tressette', mode: '4' },
  { game: 'tressette', mode: 'perdere', perdN: 4 },
  { game: 'tressette', mode: 'perdere', perdN: 2 },
  { game: 'briscola', mode: '2' },
  { game: 'briscola', mode: '4' },
  { game: 'scopa', mode: '2' },
  { game: 'scopa', mode: '4' },
];
const seats = ['Tu', 'A', 'B', 'C'].map(name => ({ name, type: 'cpu' as const }));

/** The box around a card, rotation included. */
function box(p: Place, g: Geometry) {
  const w = g.cw * p.s;
  const h = g.ch * p.s;
  const a = (p.r * Math.PI) / 180;
  const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { x0: p.x - bw / 2, x1: p.x + bw / 2, y0: p.y - bh / 2, y1: p.y + bh / 2 };
}

function tagRects(m: Match, g: Geometry) {
  return Array.from({ length: m.n }, (_, p) => g.tags[sideOf(m, 0, p)]).map(t => {
    const left = t.a === 'l' ? t.x : t.a === 'r' ? t.x - TAG_W : t.x - TAG_W / 2;
    return { x0: left, x1: left + TAG_W, y0: t.y, y1: t.y + TAG_H };
  });
}

const hits = (a: { x0: number; x1: number; y0: number; y1: number }, b: { x0: number; x1: number; y0: number; y1: number }) =>
  a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1;

function check(m: Match, g: Geometry, slots: Map<number, number>, where: string) {
  const places = layoutCards({ m, viewer: 0, g, selected: null, slots });
  const tags = tagRects(m, g);
  const h = m.h!;
  const f = g.felt;
  const onTable = m.game === 'scopa' ? h.table : h.trick.map(e => e.c);
  for (const c of onTable) {
    const b = box(places[c], g);
    expect(b.x0, `${where}: carta ${c} esce a sinistra dal panno`).toBeGreaterThanOrEqual(f.x - 1);
    expect(b.x1, `${where}: carta ${c} esce a destra dal panno`).toBeLessThanOrEqual(f.x + f.w + 1);
    expect(b.y0, `${where}: carta ${c} esce in alto dal panno`).toBeGreaterThanOrEqual(f.y - 1);
    expect(b.y1, `${where}: carta ${c} esce in basso dal panno`).toBeLessThanOrEqual(f.y + f.h + 1);
    tags.forEach((t, i) => expect(hits(b, t), `${where}: carta ${c} copre il nome ${i}`).toBe(false));
  }
  for (const c of h.hands[0]) {
    const b = box(places[c], g);
    expect(b.x0, `${where}: la tua carta ${c} esce a sinistra`).toBeGreaterThanOrEqual(0);
    expect(b.x1, `${where}: la tua carta ${c} esce a destra`).toBeLessThanOrEqual(g.W);
    expect(b.y1, `${where}: la tua carta ${c} esce in basso`).toBeLessThanOrEqual(g.H);
    expect(b.y0, `${where}: la tua carta ${c} copre il tuo nome`).toBeGreaterThanOrEqual(g.tags.b.y + TAG_H - 2);
  }
  const top = m.n === 2 ? 1 : 2;
  for (const c of h.hands[top]) {
    const b = box(places[c], g);
    expect(b.y0, `${where}: le carte in alto finiscono sotto il tabellone`).toBeGreaterThanOrEqual(g.topBar);
    expect(b.y1, `${where}: le carte in alto coprono il nome`).toBeLessThanOrEqual(g.tags.t.y + 1);
  }
  // The names fit inside the column and don't overlap each other.
  tags.forEach(t => {
    expect(t.x0).toBeGreaterThanOrEqual(0);
    expect(t.x1).toBeLessThanOrEqual(g.W);
  });
  for (let i = 0; i < tags.length; i++)
    for (let j = i + 1; j < tags.length; j++) {
      expect(hits(tags[i], tags[j]), `${where}: due nomi si sovrappongono`).toBe(false);
    }
  expect(f.y, `${where}: il panno sale sotto il nome in alto`).toBeGreaterThanOrEqual(g.tags.t.y + TAG_H);
  expect(f.y + f.h, `${where}: il panno scende sotto il tuo nome`).toBeLessThanOrEqual(g.tags.b.y);
}

describe('geometria del tavolo', () => {
  for (const md of MODES)
    it(`${md.game} ${md.mode}${md.perdN ? ' ' + md.perdN : ''}`, () => {
      for (const [W, H] of SCREENS) {
        const rng = seeded(W + H);
        let m = createMatch({ ...md, seats, level: 'facile', target: 11 }, rng);
        const g = measure(m, W, H);
        let slots = new Map<number, number>();
        const steps = startHand(m, rng);
        m = steps.at(-1)!.state;
        // Every intermediate state of a whole hand.
        let checked = 0;
        while (!m.h!.over) {
          const steps = play(m, m.h!.turn, chooseMove(m, m.h!.turn, rng));
          for (const st of steps) {
            if (st.state.h!.over) continue;
            slots = assignSlots(slots, st.state.h!.table);
            check(st.state, g, slots, `${W}×${H}`);
            checked++;
          }
          m = steps.at(-1)!.state;
        }
        expect(checked).toBeGreaterThan(30);
      }
    });
});
