import { handSort, type Card, type Match } from '@/engine';
import { CARD_RATIO } from '@/ui/theme';

export type Side = 'b' | 'r' | 't' | 'l';

export interface Place {
  x: number;
  y: number;
  /** Rotation in degrees. */
  r: number;
  /** Scale relative to the base card size (the size of your hand). */
  s: number;
  up: boolean;
  z: number;
  /** 0 when the card is out of play (collected, or not dealt yet). */
  o: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TagPos {
  x: number;
  y: number;
  /** How the tag lines up with its point: from the left, centered, from the right. */
  a: 'l' | 'c' | 'r';
}

export interface Geometry {
  W: number;
  H: number;
  /** Base card size: your hand. */
  cw: number;
  ch: number;
  felt: Rect;
  /** Where cards are played: the felt, minus the side players' names in four. */
  area: Rect;
  topBar: number;
  tags: Record<Side, TagPos>;
  deck: { x: number; y: number; s: number };
  /** Opponents' cards, relative to the base size. */
  os: number;
  /** Cards on the table (trick or Scopa), relative to the base size. */
  ts: number;
  handTop: number;
  rowGap: number;
  /** Where the hand area is centered (wide screens keep the game in a column). */
  cx: number;
  colW: number;
}

export const TAG_H = 42;
export const TAG_W = 132;
const PAD = 12;
const TOP_BAR = 54;

export const sideOf = (m: Match, viewer: number, p: number): Side => {
  const rel = (p - viewer + m.n) % m.n;
  return m.n === 2 ? (rel ? 't' : 'b') : (['b', 'r', 't', 'l'] as Side[])[rel];
};

/** Cards in a full hand: the layout is sized for it so nothing moves during the hand. */
export const fullHand = (m: Match) => (m.game === 'tressette' ? 10 : 3);
export const hasDeck = (m: Match) => m.game !== 'tressette' || m.n === 2;

export function measure(m: Match, W: number, H: number): Geometry {
  const colW = Math.min(W, 620);
  const cx = W / 2;
  const left = cx - colW / 2;
  const full = fullHand(m);
  const perRow = full > 5 ? 5 : full;
  const rows = full > 5 ? 2 : 1;
  // Your cards: as large as the width allows, and never more than about a third of the height.
  const overlap = rows === 2 ? 0.05 : -0.08;
  let cw = (colW - 2 * PAD) / (perRow - overlap * (perRow - 1));
  cw = Math.min(cw, rows === 2 ? 104 : 112);
  const rowGapK = 0.44;
  const handH = (k: number) => k * CARD_RATIO * (1 + (rows - 1) * rowGapK);
  const maxHand = H * (rows === 2 ? 0.3 : 0.24);
  if (handH(cw) > maxHand) cw = maxHand / (CARD_RATIO * (1 + (rows - 1) * rowGapK));
  cw = Math.floor(cw);
  const ch = cw * CARD_RATIO;
  const rowGap = rows === 2 ? ch * rowGapK : 0;
  // Room below for the arc and the tilt of the outer cards.
  const handTop = H - PAD - ch - rowGap - ch * 0.05;

  const os = m.game === 'tressette' && m.n === 2 ? 0.4 : 0.46;
  const oppTop = TOP_BAR + 6;
  const oppH = ch * os;
  const topTagY = oppTop + oppH + 4;
  const myTagY = handTop - 10 - TAG_H;
  const feltTop = topTagY + TAG_H + 4;
  const feltBottom = myTagY - 6;
  const felt: Rect = { x: left + PAD, y: feltTop, w: colW - 2 * PAD, h: Math.max(120, feltBottom - feltTop) };

  // In four the side players' names sit on the felt's top corners: cards are played below them.
  const band = m.n === 4 ? TAG_H + 16 : 0;
  const area: Rect = { x: felt.x, y: felt.y + band, w: felt.w, h: felt.h - band - (m.n === 4 ? 4 : 0) };

  // Cards on the table.
  let ts: number;
  if (m.game === 'scopa') {
    const fitW = (area.w - 24) / (4 * cw * 1.06);
    const fitH = (area.h - 16) / (3 * ch * 1.04);
    ts = Math.min(0.8, fitW, fitH);
  } else {
    // Two cards one above the other (offset 0.58 or 0.6 of a card each way), plus a margin.
    const fitH = (area.h - 16) / (ch * 2.24);
    const fitW = (area.w - 24) / (cw * (m.n === 2 ? 1.2 : 3));
    ts = Math.min(1, fitH, fitW);
  }

  const tags: Record<Side, TagPos> = {
    b: { x: left + PAD, y: myTagY, a: 'l' },
    t: { x: cx, y: topTagY, a: 'c' },
    l: { x: left + PAD + 4, y: felt.y + 10, a: 'l' },
    r: { x: left + colW - PAD - 4, y: felt.y + 10, a: 'r' },
  };
  const ds = Math.min(0.5, os * 1.15);
  const deck = { x: left + PAD + (cw * ds) / 2 + 6, y: oppTop + (ch * ds) / 2, s: ds };
  return { W, H, cw, ch, felt, area, topBar: TOP_BAR, tags, deck, os, ts, handTop, rowGap, cx, colW };
}

/** Scopa: each card on the table keeps its slot until it is taken, so nothing jumps around. */
export function assignSlots(prev: Map<Card, number>, table: Card[]): Map<Card, number> {
  const next = new Map<Card, number>();
  const used = new Set<number>();
  for (const c of table) {
    const s = prev.get(c);
    if (s !== undefined && !used.has(s)) {
      next.set(c, s);
      used.add(s);
    }
  }
  for (const c of table) {
    if (next.has(c)) continue;
    let s = 0;
    while (used.has(s)) s++;
    next.set(c, s);
    used.add(s);
  }
  return next;
}

function scopaSlot(g: Geometry, slot: number, rowsNeeded: number) {
  const cols = 4;
  const rows = Math.max(1, Math.min(4, rowsNeeded));
  const sw = g.cw * g.ts * 1.06;
  const sh = g.ch * g.ts * (rows > 3 ? 0.78 : 1.04);
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  const x = g.area.x + g.area.w / 2 + (col - (cols - 1) / 2) * sw;
  const y = g.area.y + g.area.h / 2 + (row - (rows - 1) / 2) * sh;
  return { x, y };
}

/** A small, stable tilt per card, so the table looks played on rather than printed. */
const tilt = (c: Card, k = 1) => (((c * 37) % 9) - 4) * 0.9 * k;

export interface LayoutInput {
  m: Match;
  viewer: number;
  g: Geometry;
  selected: Card | null;
  slots: Map<Card, number>;
}

export function layoutCards({ m, viewer, g, selected, slots }: LayoutInput): Record<number, Place> {
  const h = m.h!;
  const out: Record<number, Place> = {};
  const n = m.n;
  const tagAnchor = (side: Side) => {
    const t = g.tags[side];
    const x = t.a === 'l' ? t.x + 22 : t.a === 'r' ? t.x - 22 : t.x;
    return { x, y: t.y + TAG_H / 2 };
  };

  // Out of play: collected cards rest, invisible, on their taker's name.
  h.capt.forEach((cards, p) => {
    const a = tagAnchor(sideOf(m, viewer, p));
    cards.forEach(c => (out[c] = { x: a.x, y: a.y, r: 0, s: 0.3, up: true, z: 1, o: 0 }));
  });

  // Deck, with the Briscola card face up and across, under it.
  const d = g.deck;
  h.deck.forEach((c, i) => {
    if (m.game === 'briscola' && c === h.brisc && i === 0) {
      out[c] = { x: d.x + g.cw * d.s * 0.62, y: d.y, r: 90, s: d.s, up: true, z: 10, o: 1 };
    } else {
      const k = Math.min(i, 6) * 0.35;
      out[c] = { x: d.x - k, y: d.y - k, r: 0, s: d.s, up: false, z: 20 + i, o: 1 };
    }
  });

  // Hands.
  for (let p = 0; p < n; p++) {
    const side = sideOf(m, viewer, p);
    const hand = h.hands[p];
    if (side === 'b') {
      const sorted = hand.slice().sort(handSort(m.game));
      const k = sorted.length;
      const two = fullHand(m) > 5 && k > 5;
      const backN = two ? Math.ceil(k / 2) : 0;
      sorted.forEach((c, idx) => {
        const row = two && idx < backN ? 0 : 1;
        const inRow = two ? (row === 0 ? backN : k - backN) : k;
        const j = two && row === 1 ? idx - backN : idx;
        const t = inRow > 1 ? j / (inRow - 1) - 0.5 : 0;
        const step = Math.min(g.cw * (fullHand(m) > 5 ? 0.95 : 1.08), (g.colW - 24 - g.cw) / Math.max(1, inRow - 1));
        const x = g.cx + (j - (inRow - 1) / 2) * step;
        const baseY = g.handTop + g.ch / 2 + (two ? (row === 1 ? g.rowGap : 0) : g.rowGap);
        // A gentle arc: the outer cards sit a little lower and lean out.
        const y = baseY + t * t * g.ch * 0.12 - (selected === c ? g.ch * 0.2 : 0);
        // A lifted card comes to the front, over the other row and your name.
        out[c] = { x, y, r: t * (inRow > 3 ? 7 : 4), s: 1, up: true, z: selected === c ? 650 : 200 + row * 20 + j, o: 1 };
      });
    } else {
      const k = hand.length;
      const s = g.os;
      if (side === 't') {
        const step = Math.min(g.cw * s * 0.5, (g.colW * 0.56) / Math.max(1, k));
        hand.forEach((c, j) => {
          const t = k > 1 ? j / (k - 1) - 0.5 : 0;
          out[c] = {
            x: g.cx + (j - (k - 1) / 2) * step,
            y: g.topBar + 6 + (g.ch * s) / 2 + t * t * 6,
            r: -t * 8,
            s,
            up: false,
            z: 100 + j,
            o: 1,
          };
        });
      } else {
        // Side players: a fan along the edge, half off the felt.
        const ss = s * 0.82;
        const step = Math.min(g.cw * ss * 0.36, (g.felt.h * 0.5) / Math.max(1, k));
        const ex = side === 'l' ? g.felt.x - g.ch * ss * 0.12 : g.felt.x + g.felt.w + g.ch * ss * 0.12;
        const cy = g.felt.y + g.felt.h * 0.5;
        hand.forEach((c, j) => {
          const t = k > 1 ? j / (k - 1) - 0.5 : 0;
          out[c] = {
            x: ex + (side === 'l' ? -1 : 1) * t * t * 8,
            y: cy + (j - (k - 1) / 2) * step,
            r: (side === 'l' ? 90 : -90) + t * 10 * (side === 'l' ? 1 : -1),
            s: ss,
            up: false,
            z: 100 + j,
            o: 1,
          };
        });
      }
    }
  }

  const fx = g.area.x + g.area.w / 2;
  const fy = g.area.y + g.area.h / 2;

  // The trick: each card lands in front of whoever played it.
  if (m.game !== 'scopa') {
    const dy = g.ch * g.ts * (n === 2 ? 0.58 : 0.6);
    const dx = g.cw * g.ts * 0.98;
    h.trick.forEach((e, i) => {
      const side = sideOf(m, viewer, e.p);
      const off = { b: [0, dy], t: [0, -dy], l: [-dx, 0], r: [dx, 0] }[side];
      const glow = h.glow?.includes(e.c);
      out[e.c] = { x: fx + off[0], y: fy + off[1], r: tilt(e.c), s: g.ts * (glow ? 1.06 : 1), up: true, z: 300 + i, o: 1 };
    });
  }

  // Scopa: the table, in stable slots.
  if (m.game === 'scopa') {
    const maxSlot = Math.max(-1, ...[...slots.values()]);
    const rowsNeeded = Math.max(2, Math.floor(maxSlot / 4) + 1);
    h.table.forEach(c => {
      const sl = slots.get(c) ?? 0;
      const p = scopaSlot(g, sl, rowsNeeded);
      const glow = h.glow?.includes(c);
      out[c] = { x: p.x, y: p.y, r: tilt(c, 0.5), s: g.ts * (glow ? 1.05 : 1), up: true, z: 150 + sl, o: 1 };
    });
    if (h.inPlay) {
      const target = out[h.inPlay.on];
      const glow = h.glow?.includes(h.inPlay.c);
      out[h.inPlay.c] = {
        x: (target?.x ?? fx) + g.cw * g.ts * 0.22,
        y: (target?.y ?? fy) + g.ch * g.ts * 0.14,
        r: 6,
        s: g.ts * (glow ? 1.05 : 1),
        up: true,
        z: 400,
        o: 1,
      };
    }
  }

  // Tressette in two: the two cards drawn are shown to everyone for a moment.
  if (h.reveal) {
    h.reveal.forEach((e, i) => {
      out[e.c] = { x: fx + (i ? 1 : -1) * g.cw * g.ts * 0.58, y: fy, r: i ? 3 : -3, s: g.ts, up: true, z: 500 + i, o: 1 };
    });
  }

  return out;
}
