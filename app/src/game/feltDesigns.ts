// I disegni del panno: geometria pura, a strati. Ogni disegno riceve le misure del panno (senza sponda)
// e restituisce gli strati da disegnare: linee, superfici e aloni, nel colore del panno (impressi) o
// nei colori della grafica (`paint`). Le stesse misure danno sempre lo stesso disegno.
//
// Regola d'oro: le carte bianche giocate al centro devono restare leggibili. I disegni stanno ai
// bordi e negli angoli; quello che passa dal centro è molto tenue o scuro (buco nero, eclissi).

import { clamp, four, Loop, Pen, polar, roundRect, seeded, type P } from './feltGeometry';

/**
 * Il colore di uno strato: 'ink' è un tono chiaro del panno e 'shade' il nero (tutti e due impressi,
 * con un'opacità relativa alla forza di base); un numero è un colore di `paint`; altrimenti un esadecimale.
 */
export type Ink = 'ink' | 'shade' | number | `#${string}`;

/** Un'opacità che sfuma col raggio (userSpace): [offset 0…1, moltiplicatore]. */
export interface Fade {
  cx: number;
  cy: number;
  r: number;
  stops: [number, number][];
}

export type Layer =
  | { k: 'line'; d: string; ink: Ink; op: number; w: number; dash?: string; cap?: 'round' | 'butt' | 'square'; emboss?: boolean; fade?: Fade }
  | { k: 'fill'; d: string; ink: Ink; op: number; emboss?: boolean; fade?: Fade }
  | { k: 'glow'; cx: number; cy: number; rx: number; ry: number; rot?: number; ink: Ink; op: number };

export interface Design {
  layers: Layer[];
}

interface Ctx {
  w: number;
  h: number;
  rad: number;
  m: number;
  cx: number;
  cy: number;
  /** Spessore di linea di base. */
  sw: number;
  /** Un dito dal bordo. */
  E: number;
  paint: string[];
}

/* ------------------------------------------------------------------ piccoli aiuti */

const line = (d: string, ink: Ink, op: number, w: number, o: Partial<Extract<Layer, { k: 'line' }>> = {}): Layer => ({ k: 'line', d, ink, op, w, ...o });
const fill = (d: string, ink: Ink, op: number, o: Partial<Extract<Layer, { k: 'fill' }>> = {}): Layer => ({ k: 'fill', d, ink, op, ...o });
const glow = (cx: number, cy: number, rx: number, ry: number, ink: Ink, op: number, rot = 0): Layer => ({ k: 'glow', cx, cy, rx, ry, ink, op, rot });
/** Un disegno impresso nel panno: linee e pieni nel tono chiaro del panno. */
const mono = (l: string, fl: string, sw: number, k = 1): Design => ({
  layers: [line(l, 'ink', k, sw, { emboss: true }), ...(fl ? [fill(fl, 'ink', k, { emboss: true })] : [])],
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Quanto un punto è lontano dal centro del panno: 0 al centro, 1 sul bordo (ellittico). */
const fromCenter = (c: Ctx, x: number, y: number) => Math.hypot((x - c.cx) / (c.w / 2), (y - c.cy) / (c.h / 2));

/** Un rettangolo arrotondato concentrico al panno, a `d` dal bordo. */
const inset = (c: Ctx, d: number) => roundRect(d, d, c.w - 2 * d, c.h - 2 * d, Math.max(2, c.rad - d));

/**
 * Un cielo di stelle con seme fisso. `weight(x, y)` (0…1) dice quanto è fitto il cielo in quel punto.
 * Restituisce tre grandezze e qualche stella più viva con i raggi.
 */
function starfield(c: Ctx, seed: number, n: number, weight: (x: number, y: number) => number, rMin: number, rMax: number) {
  const rng = seeded(seed);
  const small = new Pen();
  const mid = new Pen();
  const big = new Pen();
  const spark = new Pen();
  const bright: P[] = [];
  let placed = 0;
  for (let i = 0; i < n * 6 && placed < n; i++) {
    const x = rng() * c.w;
    const y = rng() * c.h;
    const k = rng();
    if (rng() > weight(x, y)) continue;
    placed++;
    const mag = k * k * k;
    const r = rMin + (rMax - rMin) * mag;
    if (mag < 0.12) small.diamond(x, y, r * 1.1);
    else if (mag < 0.55) mid.circle(x, y, r);
    else {
      big.circle(x, y, r);
      if (mag > 0.8) {
        spark.star(x, y, r * 4.2, r * 0.35, 4, -90);
        bright.push([x, y]);
      }
    }
  }
  return { small: small.d, mid: mid.d, big: big.d, spark: spark.d, bright };
}

function starLayers(s: ReturnType<typeof starfield>, ink: Ink, k = 1): Layer[] {
  return [fill(s.small, ink, 0.32 * k), fill(s.mid, ink, 0.5 * k), fill(s.big, ink, 0.75 * k), fill(s.spark, ink, 0.45 * k)];
}

/** Una spirale (gradi): dal raggio r0 a r1 in `turns` giri, nel verso `dir` (±1). */
function spiral(cx: number, cy: number, r0: number, r1: number, a0: number, turns: number, dir = 1): P[] {
  const out: P[] = [];
  const n = Math.max(6, Math.round(turns * 18));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = polar(lerp(r0, r1, t), a0 + dir * t * turns * 360);
    out.push([cx + x, cy + y]);
  }
  return out;
}

/** Le cifre romane (I, V, X) come linee con le grazie, centrate in (0,0), alte `gh`. */
export function romanGlyphs(p: Pen, n: number, gh: number) {
  const s = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] ?? '';
  const wid = (ch: string) => (ch === 'I' ? 0.2 : 0.5) * gh;
  const gap = 0.12 * gh;
  const total = [...s].reduce((a, ch) => a + wid(ch), 0) + gap * Math.max(0, s.length - 1);
  let x = -total / 2;
  const t = -gh / 2;
  const b = gh / 2;
  const se = gh * 0.1;
  for (const ch of s) {
    const W = wid(ch);
    const mx = x + W / 2;
    if (ch === 'I') {
      p.M(mx, t).L(mx, b);
      p.M(mx - se, t).L(mx + se, t).M(mx - se, b).L(mx + se, b);
    } else if (ch === 'V') {
      p.M(x, t).L(mx, b).L(x + W, t);
      p.M(x - se * 0.6, t).L(x + se, t).M(x + W - se, t).L(x + W + se * 0.6, t);
    } else {
      p.M(x, t).L(x + W, b).M(x + W, t).L(x, b);
      p.M(x - se * 0.6, t).L(x + se, t).M(x + W - se, t).L(x + W + se * 0.6, t);
      p.M(x - se * 0.6, b).L(x + se, b).M(x + W - se, b).L(x + W + se * 0.6, b);
    }
    x += W + gap;
  }
  return p;
}

/** Il rosone a otto petali (anche quello d'oro di Palazzo Imperiale). */
function rosoneGeom(cx: number, cy: number, R: number) {
  const c = new Pen(cx, cy);
  for (let i = 0; i < 8; i++) {
    const [x0, y0] = polar(R * 0.2, i * 45 - 90);
    const [x1, y1] = polar(R, i * 45 - 90);
    c.petal(x0, y0, x1, y1, R * 0.17);
    const [a0, b0] = polar(R * 0.2, i * 45 - 67.5);
    const [a1, b1] = polar(R * 0.62, i * 45 - 67.5);
    c.petal(a0, b0, a1, b1, R * 0.1);
  }
  c.circle(0, 0, R * 0.2).circle(0, 0, R * 1.1);
  const dots = new Pen(cx, cy);
  dots.circle(0, 0, R * 0.07);
  for (let i = 0; i < 24; i++) {
    const [x, y] = polar(R * 1.2, i * 15);
    dots.circle(x, y, Math.max(0.9, R * 0.022));
  }
  return { line: c.d, fill: dots.d };
}

/** Una corona d'alloro intorno a (cx, cy): due rami che salgono dal fiocco in basso. */
function laurelGeom(cx: number, cy: number, R: number, leaf: number) {
  const leaves = new Pen();
  const stem = new Pen();
  for (const s of [-1, 1]) {
    const a = (t: number) => 90 + s * (10 + t * 148);
    const pt = (t: number): P => {
      const [x, y] = polar(R, a(t));
      return [cx + x, cy + y];
    };
    const pts: P[] = [];
    for (let i = 0; i <= 24; i++) pts.push(pt(i / 24));
    stem.smooth(pts);
    const N = 9;
    for (let i = 0; i < N; i++) {
      const t = 0.05 + (i / N) * 0.92;
      const [x, y] = pt(t);
      const [x2, y2] = pt(t + 0.02);
      const tx = (x2 - x) / (dist([x, y], [x2, y2]) || 1);
      const ty = (y2 - y) / (dist([x, y], [x2, y2]) || 1);
      const L = leaf * (1 - 0.38 * t);
      // Una foglia verso fuori e una verso dentro, tutte e due in avanti lungo il ramo.
      for (const out of [1, -1]) {
        const nx = (x - cx) / R;
        const ny = (y - cy) / R;
        const dx = tx * 0.78 + nx * 0.62 * out;
        const dy = ty * 0.78 + ny * 0.62 * out;
        leaves.leaf(x, y, x + dx * L, y + dy * L, L * 0.21);
      }
    }
    // La foglia in cima.
    const [ex, ey] = pt(1);
    const [px, py] = pt(0.97);
    const ux = (ex - px) / (dist([ex, ey], [px, py]) || 1);
    const uy = (ey - py) / (dist([ex, ey], [px, py]) || 1);
    leaves.leaf(ex, ey, ex + ux * leaf * 0.75, ey + uy * leaf * 0.75, leaf * 0.15);
  }
  // Il fiocco: due anelli e due code.
  const bow = new Pen(cx, cy + R);
  const k = leaf * 0.55;
  bow.petal(0, 0, -k * 1.5, -k * 0.55, k * 0.42).petal(0, 0, k * 1.5, -k * 0.55, k * 0.42);
  bow.petal(0, 0, -k * 0.9, k * 1.5, k * 0.22).petal(0, 0, k * 0.9, k * 1.5, k * 0.22);
  bow.circle(0, 0, k * 0.3);
  return { stem: stem.d, leaves: leaves.d + bow.d };
}

/**
 * Il riccio di filigrana in un angolo: un braccio lungo il lato alto che finisce in una voluta, lo
 * stesso specchiato sul lato sinistro, un piccolo giglio sulla diagonale. `p` è la penna dell'angolo.
 */
function scrollCorner(p: Pen, S: number, o: number) {
  const lines = new Pen();
  const fills = new Pen();
  for (const q of [p, p.swap()]) {
    const L = Pen.affine(q.m);
    const at = (x: number, y: number): P => [o + x * S, o + y * S];
    // Il braccio principale e la sua voluta.
    L.M(...at(0.1, 0.12)).C(...at(0.26, 0.03), ...at(0.5, 0.02), ...at(0.66, 0.07));
    const sp = spiral(o + 0.71 * S, o + 0.155 * S, 0.085 * S, 0.018 * S, -120, 1.15, 1);
    L.L(...sp[0]).smooth(sp);
    // Un ricciolo più piccolo che torna verso l'angolo.
    L.M(...at(0.38, 0.035)).C(...at(0.42, 0.14), ...at(0.34, 0.2), ...at(0.27, 0.17));
    const sp2 = spiral(o + 0.29 * S, o + 0.135 * S, 0.035 * S, 0.01 * S, 60, 0.9, -1);
    L.smooth(sp2);
    lines.d += L.d;
    const F = Pen.affine(q.m);
    F.leaf(...at(0.52, 0.03), ...at(0.6, 0.12), 0.022 * S);
    F.leaf(...at(0.48, 0.035), ...at(0.43, 0.1), 0.018 * S);
    F.circle(...at(0.8, 0.07), 0.016 * S);
    F.circle(...at(0.86, 0.05), 0.011 * S);
    fills.d += F.d;
  }
  // Il giglietto sulla diagonale.
  const D = Pen.affine(p.m);
  const c: P = [o + 0.11 * S, o + 0.11 * S];
  D.petal(c[0], c[1], c[0] + 0.17 * S, c[1] + 0.17 * S, 0.04 * S);
  D.petal(c[0] + 0.03 * S, c[1] + 0.03 * S, c[0] + 0.2 * S, c[1] + 0.07 * S, 0.026 * S);
  D.petal(c[0] + 0.03 * S, c[1] + 0.03 * S, c[0] + 0.07 * S, c[1] + 0.2 * S, 0.026 * S);
  D.circle(c[0], c[1], 0.022 * S);
  fills.d += D.d;
  return { lines: lines.d, fills: fills.d };
}

/** Una cornice con gli angoli rientranti (un quarto di cerchio scavato in ogni angolo). */
function notched(x0: number, y0: number, x1: number, y1: number, c: number) {
  const p = new Pen();
  p.M(x0 + c, y0).L(x1 - c, y0);
  p.arc(x1, y0, c, 180, 90, false).L(x1, y1 - c);
  p.arc(x1, y1, c, 270, 180, false).L(x0 + c, y1);
  p.arc(x0, y1, c, 0, -90, false).L(x0, y0 + c);
  p.arc(x0, y0, c, 90, 0, false).Z();
  return p.d;
}

/** Un ingranaggio: `T` denti alti `d` sul cerchio di raggio R. */
function gear(cx: number, cy: number, R: number, T: number, d: number) {
  const pts: P[] = [];
  const s = 360 / T;
  for (let i = 0; i < T; i++) {
    const a = i * s;
    for (const [k, r] of [
      [0, R],
      [0.14, R + d],
      [0.4, R + d],
      [0.54, R],
    ] as [number, number][]) {
      const [x, y] = polar(r, a + k * s);
      pts.push([cx + x, cy + y]);
    }
  }
  return new Pen().poly(pts, true).d;
}

/** La greca: un'unità ogni 12u, alta 4u (coordinate della penna: x lungo il lato, y verso dentro). */
function meander(p: Pen, len: number, u: number, y0: number) {
  const n = Math.max(1, Math.floor(len / (12 * u)));
  const x0 = (len - n * 12 * u) / 2;
  const Y = (k: number) => y0 + k * u;
  p.M(0, Y(4)).L(x0, Y(4));
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 12 * u;
    p.L(x, Y(4))
      .L(x, Y(0))
      .L(x + 8 * u, Y(0))
      .L(x + 8 * u, Y(2))
      .L(x + 4 * u, Y(2))
      .L(x + 4 * u, Y(4))
      .L(x + 12 * u, Y(4));
  }
  p.L(len, Y(4));
}

/** Le quattro penne dei lati: x lungo il lato (in senso orario), y verso l'interno del panno. */
function sides(c: Ctx, ins: number, band: number) {
  const { w, h } = c;
  return [
    { p: () => new Pen(ins + band, ins, 0), len: w - 2 * (ins + band) },
    { p: () => new Pen(w - ins, ins + band, 90), len: h - 2 * (ins + band) },
    { p: () => new Pen(w - ins - band, h - ins, 180), len: w - 2 * (ins + band) },
    { p: () => new Pen(ins, h - ins - band, 270), len: h - 2 * (ins + band) },
  ];
}

/** Un fulmine: spezzata che si divide a metà, con il suo seme. */
function bolt(rng: () => number, a: P, b: P, depth: number, rough: number): P[] {
  let pts: P[] = [a, b];
  for (let d = 0; d < depth; d++) {
    const next: P[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const len = dist(p0, p1);
      const nx = -(p1[1] - p0[1]) / (len || 1);
      const ny = (p1[0] - p0[0]) / (len || 1);
      const off = (rng() - 0.5) * 2 * rough * len;
      const t = 0.4 + rng() * 0.2;
      next.push([lerp(p0[0], p1[0], t) + nx * off, lerp(p0[1], p1[1], t) + ny * off], p1);
    }
    pts = next;
  }
  return pts;
}

/* ------------------------------------------------------------------ i disegni */

type Draw = (c: Ctx) => Design | null;

const DESIGNS: Record<string, Draw> = {
  /* ---------- quelli di prima */
  filetto: c => {
    const { w, h, m, cx, cy, sw, rad } = c;
    const d = clamp(m * 0.046, 5, 18);
    const g = Math.max(2.5, sw * 2.4);
    const l = new Pen().rrect(d, d, w - 2 * d, h - 2 * d, Math.max(3, rad - d)).rrect(d + g, d + g, w - 2 * (d + g), h - 2 * (d + g), Math.max(2, rad - d - g));
    const k = Math.max(2.2, m * 0.012);
    const fl = new Pen().diamond(cx, d + g / 2, k * 1.6, k).diamond(cx, h - d - g / 2, k * 1.6, k);
    fl.diamond(d + g / 2, cy, k, k * 1.6).diamond(w - d - g / 2, cy, k, k * 1.6);
    return mono(l.d, fl.d, sw * 0.9);
  },
  rosone: c => {
    const r = rosoneGeom(c.cx, c.cy, c.m * 0.3);
    return mono(r.line, r.fill, c.sw);
  },
  maiolica: c => {
    // Le piastrelle del chiostro: un rombo per piastrella, un fiore a quattro petali, un punto dove si incontrano.
    const { w, h, m, cx, cy, sw, paint } = c;
    const s = Math.max(22, m / 4.2);
    const nx = Math.ceil(w / s / 2) + 1;
    const ny = Math.ceil(h / s / 2) + 1;
    const tiles = new Pen();
    const petals = new Pen();
    const dots = new Pen();
    for (let i = -nx; i <= nx; i++) {
      for (let j = -ny; j <= ny; j++) {
        const x = cx + i * s;
        const y = cy + j * s;
        tiles.diamond(x, y, s / 2);
        for (let q = 0; q < 4; q++) {
          const [x0, y0] = polar(s * 0.07, q * 90);
          const [x1, y1] = polar(s * 0.34, q * 90);
          petals.petal(x + x0, y + y0, x + x1, y + y1, s * 0.075);
        }
        dots.circle(x, y, s * 0.045);
        dots.circle(x + s / 2, y + s / 2, s * 0.06);
      }
    }
    if (paint.length >= 2) {
      // Bianche e gialle, più vive verso il bordo e appena accennate al centro, dove passano le carte.
      const fade = { cx, cy, r: Math.hypot(w, h) / 2, stops: [[0, 0.35], [0.45, 0.55], [1, 1]] as [number, number][] };
      return {
        layers: [
          line(tiles.d, 0, 0.16, sw * 0.8, { emboss: true, fade }),
          fill(petals.d, 1, 0.22, { fade }),
          fill(dots.d, 0, 0.24, { fade }),
        ],
      };
    }
    return { layers: [line(tiles.d + petals.d, 'ink', 0.72, sw * 0.8, { emboss: true }), fill(dots.d, 'ink', 0.72, { emboss: true })] };
  },
  onde: c => {
    const { w, h, m, cx, cy, sw } = c;
    const sp = Math.max(12, m / 8.5);
    const L = sp * 1.7;
    const A = sp * 0.2;
    const rows = Math.ceil(h / sp / 2) + 1;
    const p = new Pen();
    for (let j = -rows; j <= rows; j++) {
      const y = cy + j * sp;
      const shift = (Math.abs(j) % 2) * (L / 2);
      let x = cx - Math.ceil((cx + L) / L) * L - shift;
      p.M(x, y);
      let up = true;
      while (x < w + L) {
        p.Q(x + L / 4, y + (up ? -A : A), x + L / 2, y);
        x += L / 2;
        up = !up;
      }
    }
    return { layers: [line(p.d, 'ink', 0.75, sw * 0.85, { emboss: true })] };
  },
  sole: c => {
    // Un sole di Vietri: disco con anelli, fiamme lunghe e corte, un giro di puntini.
    const { m, cx, cy, sw } = c;
    const r1 = m * 0.11;
    const R = m * 0.36;
    const p = new Pen(cx, cy);
    p.circle(0, 0, r1)
      .circle(0, 0, r1 * 0.62)
      .circle(0, 0, r1 * 1.24);
    for (let i = 0; i < 16; i++) {
      const a = i * 22.5 - 90;
      const long = i % 2 === 0;
      const tip = long ? R : R * 0.74;
      const wv = long ? 9 : 7;
      const [bx0, by0] = polar(r1 * 1.4, a - wv);
      const [bx1, by1] = polar(r1 * 1.4, a + wv);
      const [tx, ty] = polar(tip, a);
      const [mx0, my0] = polar((r1 * 1.4 + tip) / 2, a - wv * 0.15);
      const [mx1, my1] = polar((r1 * 1.4 + tip) / 2, a + wv * 0.15);
      p.M(bx0, by0).Q(mx0, my0, tx, ty).Q(mx1, my1, bx1, by1);
    }
    const dots = new Pen(cx, cy);
    dots.circle(0, 0, r1 * 0.2);
    for (let i = 0; i < 32; i++) {
      const [x, y] = polar(R * 1.1, i * 11.25);
      dots.circle(x, y, Math.max(0.9, m * 0.004));
    }
    return mono(p.d, dots.d, sw);
  },
  vesuvio: c => {
    // Il vulcano visto dal golfo: il Somma e il cono, il pennacchio, l'orizzonte e qualche onda.
    const { w, m, cx, cy, sw } = c;
    const V = Math.min(w * 0.82, m * 1.05);
    const by = cy + V * 0.13;
    const p = new Pen(cx, by);
    p.M(-V / 2, 0)
      .C(-V * 0.32, -V * 0.04, -V * 0.2, -V * 0.22, -V * 0.13, -V * 0.29)
      .Q(-V * 0.09, -V * 0.32, -V * 0.05, -V * 0.28)
      .Q(-V * 0.02, -V * 0.25, V * 0.02, -V * 0.29)
      .L(V * 0.06, -V * 0.335)
      .L(V * 0.12, -V * 0.335)
      .C(V * 0.2, -V * 0.22, V * 0.33, -V * 0.05, V / 2, 0);
    p.M(V * 0.09, -V * 0.35)
      .C(V * 0.06, -V * 0.42, V * 0.14, -V * 0.45, V * 0.12, -V * 0.51)
      .C(V * 0.1, -V * 0.57, V * 0.2, -V * 0.6, V * 0.28, -V * 0.56);
    p.M(-V * 0.58, 0).L(V * 0.58, 0);
    for (const [x0, y0, len] of [
      [-V * 0.36, V * 0.05, V * 0.22],
      [V * 0.08, V * 0.05, V * 0.26],
      [-V * 0.14, V * 0.1, V * 0.24],
    ]) {
      const n = 4;
      const L = len / n;
      p.M(x0, y0);
      for (let i = 0; i < n; i++) p.Q(x0 + L * (i + 0.5), y0 + (i % 2 ? 1 : -1) * V * 0.008, x0 + L * (i + 1), y0);
    }
    const dots = new Pen(cx, by);
    dots.circle(V * 0.34, -V * 0.5, V * 0.01).circle(V * 0.39, -V * 0.47, V * 0.007);
    return mono(p.d, dots.d, sw);
  },
  corno: c => {
    // Il cornicello: un corno che si assottiglia e si piega da un lato, con il cappuccio, dentro un anello.
    const { m, cx, cy, sw } = c;
    const Hc = m * 0.44;
    const w0 = Hc * 0.22;
    const base = Hc * 0.4;
    const bz = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
      const u = 1 - t;
      return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ];
    };
    const tip: P = [w0 * 2.3, base - Hc * 0.98];
    const outer: [P, P, P, P] = [[-w0 / 2, base], [-w0 * 0.7, base - Hc * 0.5], [-w0 * 0.2, base - Hc * 0.98], tip];
    const inner: [P, P, P, P] = [[w0 / 2, base], [w0 * 0.42, base - Hc * 0.4], [w0 * 0.9, base - Hc * 0.78], tip];
    const p = new Pen(cx - w0 * 0.7, cy, -8);
    p.M(...outer[0])
      .C(...outer[1], ...outer[2], ...outer[3])
      .C(...inner[2], ...inner[1], ...inner[0])
      .Z();
    for (const t of [0.12, 0.23, 0.33, 0.42]) {
      const [ox, oy] = bz(...outer, t);
      const [ix, iy] = bz(...inner, t * 0.96);
      p.M(ox, oy).Q((ox + ix) / 2, (oy + iy) / 2 + w0 * 0.12 * (1 - t), ix, iy);
    }
    p.M(-w0 * 0.12, base - Hc * 0.6).C(w0 * 0.05, base - Hc * 0.75, w0 * 0.4, base - Hc * 0.86, w0 * 0.85, base - Hc * 0.93);
    const capH = Hc * 0.09;
    p.rrect(-w0 * 0.64, base, w0 * 1.28, capH, Hc * 0.02);
    p.M(-w0 * 0.64, base + capH * 0.5).L(w0 * 0.64, base + capH * 0.5);
    p.circle(0, base + capH + w0 * 0.22, w0 * 0.2);
    const ring = new Pen(cx, cy).circle(0, -Hc * 0.05, Hc * 0.66);
    const dots = new Pen(cx, cy - Hc * 0.05);
    for (let i = 0; i < 4; i++) {
      const [x, y] = polar(Hc * 0.66, i * 90 - 90);
      dots.diamond(x, y, Hc * 0.035);
    }
    for (let i = 0; i < 4; i++) {
      const [x, y] = polar(Hc * 0.66, i * 90 - 45);
      dots.circle(x, y, Hc * 0.012);
    }
    return mono(p.d + ring.d, dots.d, sw);
  },
  stemma: c => {
    // Uno scudo con la corona, tra due rami d'alloro.
    const { m, cx, cy, sw } = c;
    const Ws = m * 0.24;
    const Hs = Ws * 1.18;
    const top = cy - Hs * 0.42;
    const p = new Pen(cx, top);
    const shield = (k: number, dy: number) => {
      const hw = (Ws / 2) * k;
      const hh = Hs * k;
      p.M(-hw, dy)
        .L(hw, dy)
        .L(hw, dy + hh * 0.5)
        .C(hw, dy + hh * 0.8, hw * 0.45, dy + hh * 0.92, 0, dy + hh)
        .C(-hw * 0.45, dy + hh * 0.92, -hw, dy + hh * 0.8, -hw, dy + hh * 0.5)
        .Z();
    };
    shield(1, 0);
    shield(0.82, Hs * 0.075);
    p.M(-Ws * 0.41, Hs * 0.38)
      .L(Ws * 0.41, Hs * 0.38)
      .M(-Ws * 0.41, Hs * 0.48)
      .L(Ws * 0.41, Hs * 0.48);
    const cw = Ws * 0.78;
    const cb = -Hs * 0.08;
    const ch = Hs * 0.3;
    p.M(-cw / 2, cb)
      .L(-cw / 2 - cw * 0.04, cb - ch * 0.75)
      .L(-cw * 0.25, cb - ch * 0.35)
      .L(0, cb - ch)
      .L(cw * 0.25, cb - ch * 0.35)
      .L(cw / 2 + cw * 0.04, cb - ch * 0.75)
      .L(cw / 2, cb)
      .Z();
    const dots = new Pen(cx, top);
    dots.circle(-cw / 2 - cw * 0.04, cb - ch * 0.75 - ch * 0.12, ch * 0.1);
    dots.circle(0, cb - ch - ch * 0.13, ch * 0.11);
    dots.circle(cw / 2 + cw * 0.04, cb - ch * 0.75 - ch * 0.12, ch * 0.1);
    dots.diamond(0, Hs * 0.22, Ws * 0.06, Ws * 0.09);
    dots.diamond(0, Hs * 0.68, Ws * 0.05, Ws * 0.07);
    for (const side of [-1, 1]) {
      const R = Ws * 0.95;
      const oy = Hs * 0.42;
      const pt = (a: number): P => {
        const [x, y] = polar(R, a);
        return [side * -x, oy + y * 0.95];
      };
      const [sx, sy] = pt(100);
      p.M(sx, sy);
      for (let a = 105; a <= 200; a += 5) p.L(...pt(a));
      for (let i = 0; i < 7; i++) {
        const a = 112 + i * 13;
        const [x, y] = pt(a);
        const [tx, ty] = pt(a + 4);
        const dx = tx - x;
        const dy = ty - y;
        const len = Math.hypot(dx, dy) || 1;
        const L = Ws * 0.2;
        for (const out of [1, -1]) {
          const nx = (-dy / len) * side * out;
          const ny = (dx / len) * side * out;
          p.petal(x, y, x + (dx / len) * L * 0.7 + nx * L * 0.7, y + (dy / len) * L * 0.7 + ny * L * 0.7, L * 0.16);
        }
      }
    }
    return mono(p.d, dots.d, sw);
  },

  /* ---------- italiani */
  tricolore: c => {
    // Un nastro verde, bianco e rosso lungo il bordo, un dito dentro la sponda.
    const { m, sw, E } = c;
    const sb = clamp(m * 0.0115, 1.6, 4.2);
    const ins = E * 0.85;
    const out: Layer[] = [line(inset(c, ins - 0.5), 'shade', 0.6, 0.6)];
    const ops = [0.62, 0.55, 0.62];
    for (let i = 0; i < 3; i++) out.push(line(inset(c, ins + sb * (i + 0.5)), i, ops[i], sb, { emboss: i === 0 }));
    out.push(line(inset(c, ins + sb * 3 + 0.5), 'shade', 0.6, 0.6));
    out.push(line(inset(c, ins + sb * 3 + sw * 2.4), 1, 0.16, sw * 0.5, { dash: `${sw * 3} ${sw * 3}` }));
    return { layers: out };
  },
  ceramica: c => {
    // Caltagirone: in ogni angolo un ventaglio di petali gialli bordati di blu, foglie verdi, un mozzo blu.
    const { m, sw, E, rad, w, h } = c;
    const R = clamp(m * 0.2, 28, 110);
    const q = E * 0.7 + rad * 0.42 + R * 0.08;
    const petals = four(w, h, p => {
      for (let i = 0; i < 5; i++) {
        const a = 9 + i * 18;
        const [x0, y0] = polar(R * 0.3, a);
        const [x1, y1] = polar(R * 0.86, a);
        p.petal(q + x0, q + y0, q + x1, q + y1, R * 0.1);
      }
    });
    const leaves = four(w, h, p => {
      for (let i = 0; i < 4; i++) {
        const a = 18 + i * 18;
        const [x0, y0] = polar(R * 0.34, a);
        const [x1, y1] = polar(R * 0.62, a);
        p.leaf(q + x0, q + y0, q + x1, q + y1, R * 0.05);
      }
    });
    const hub = four(w, h, p => p.circle(q, q, R * 0.22));
    const hubIn = four(w, h, p => p.circle(q, q, R * 0.12));
    const arcs = four(w, h, p => p.arc(q, q, R * 0.98, 2, 88));
    const dots = four(w, h, p => {
      for (let i = 0; i < 9; i++) {
        const [x, y] = polar(R * 1.07, 5 + i * 10);
        p.circle(q + x, q + y, R * 0.025);
      }
    });
    return {
      layers: [
        line(inset(c, E * 0.5), 1, 0.38, sw * 1.3),
        line(inset(c, E * 0.5 + sw * 2.6), 0, 0.36, sw * 0.8),
        fill(leaves, 2, 0.55, { emboss: true }),
        fill(petals, 0, 0.62, { emboss: true }),
        line(petals, 1, 0.5, sw * 0.7),
        line(arcs, 1, 0.42, sw * 1.1),
        fill(hub, 1, 0.62, { emboss: true }),
        fill(hubIn, 0, 0.7),
        fill(dots, 3, 0.45),
      ],
    };
  },
  limoni: c => {
    // Un rametto con due limoni e le foglie in ogni angolo.
    const { m, sw, w, h, E } = c;
    const U = clamp(m * 0.24, 34, 130);
    const o = E * 0.5 + c.rad * 0.22;
    const at = (x: number, y: number): P => [o + x * U, o + y * U];
    const lemon = (p: Pen, x: number, y: number, a: number, b: number, rot: number) => {
      const q = Pen.affine(p.m);
      const L = new Pen(...at(x, y), rot);
      const pts: P[] = [
        [-1.13 * a, 0],
        [-0.9 * a, -0.4 * b],
        [-0.55 * a, -0.9 * b],
        [0, -b],
        [0.55 * a, -0.9 * b],
        [0.9 * a, -0.4 * b],
        [1.13 * a, 0],
        [0.9 * a, 0.4 * b],
        [0.55 * a, 0.9 * b],
        [0, b],
        [-0.55 * a, 0.9 * b],
        [-0.9 * a, 0.4 * b],
      ].map(([px, py]) => q.p(...L.p(px, py)));
      return new Pen().smooth(pts, true).d;
    };
    const lemons = four(w, h, p => {
      p.d += lemon(p, 0.5, 0.2, 0.17 * U, 0.122 * U, 18);
      p.d += lemon(p, 0.22, 0.47, 0.15 * U, 0.108 * U, 72);
    });
    const shine = four(w, h, p => {
      p.ellipse(...at(0.45, 0.165), 0.06 * U, 0.03 * U, 18);
      p.ellipse(...at(0.19, 0.42), 0.05 * U, 0.026 * U, 72);
    });
    const leaves = four(w, h, p => {
      p.leaf(...at(0.17, 0.11), ...at(0.48, 0.02), 0.07 * U);
      p.leaf(...at(0.1, 0.18), ...at(0.03, 0.5), 0.065 * U);
      p.leaf(...at(0.33, 0.27), ...at(0.6, 0.4), 0.06 * U);
      p.leaf(...at(0.28, 0.3), ...at(0.4, 0.58), 0.055 * U);
    });
    const ribs = four(w, h, p => {
      p.M(...at(0.17, 0.11)).L(...at(0.46, 0.025));
      p.M(...at(0.1, 0.18)).L(...at(0.035, 0.48));
      p.M(...at(0.33, 0.27)).L(...at(0.58, 0.39));
      p.M(...at(0.28, 0.3)).L(...at(0.395, 0.56));
    });
    const twig = four(w, h, p => {
      p.M(...at(0.03, 0.03)).C(...at(0.14, 0.1), ...at(0.24, 0.2), ...at(0.36, 0.28));
      p.M(...at(0.22, 0.18)).Q(...at(0.32, 0.17), ...at(0.4, 0.15));
    });
    return {
      layers: [
        line(twig, 1, 0.5, sw * 1.3, { emboss: true }),
        fill(leaves, 1, 0.62, { emboss: true }),
        line(ribs, '#FFFFFF', 0.16, sw * 0.5),
        fill(lemons, 0, 0.78, { emboss: true }),
        line(lemons, '#8A6A00', 0.35, sw * 0.5),
        fill(shine, '#FFFFFF', 0.32),
      ],
    };
  },
  ulivo: c => {
    // Rami d'ulivo che girano intorno a ogni angolo, foglie strette e qualche oliva.
    const { m, sw, w, h, E, rad } = c;
    const q = E * 1.2 + rad * 0.12;
    const L = clamp(m * 0.36, 50, 210);
    const stems = new Pen();
    const leaves = new Pen();
    for (const p of [new Pen(0, 0, 0, 1, 1), new Pen(w, 0, 0, -1, 1), new Pen(w, h, 0, -1, -1), new Pen(0, h, 0, 1, -1)]) {
      const A: P = [L, q];
      const C: P = [q, q];
      const Bp: P = [q, L];
      const at = (t: number): P => {
        const u = 1 - t;
        return [u * u * A[0] + 2 * u * t * C[0] + t * t * Bp[0], u * u * A[1] + 2 * u * t * C[1] + t * t * Bp[1]];
      };
      const pts: P[] = [];
      for (let i = 0; i <= 20; i++) pts.push(p.p(...at(i / 20)));
      stems.smooth(pts);
      const lf = clamp(m * 0.062, 9, 34);
      for (let i = 0; i < 9; i++) {
        const t = 0.04 + i * 0.115;
        const [x, y] = at(t);
        const [x2, y2] = at(Math.min(1, t + 0.01));
        const d = dist([x, y], [x2, y2]) || 1;
        const tx = (x2 - x) / d;
        const ty = (y2 - y) / d;
        const side = i % 2 ? 1 : -1;
        const k = lf * (0.72 + 0.28 * Math.sin(Math.PI * t));
        const ang = (side * 42 * Math.PI) / 180;
        const dx = tx * Math.cos(ang) - ty * Math.sin(ang);
        const dy = tx * Math.sin(ang) + ty * Math.cos(ang);
        const a = p.p(x, y);
        const b = p.p(x + dx * k, y + dy * k);
        leaves.leaf(a[0], a[1], b[0], b[1], k * 0.17);
        // E dall'altra parte, verso l'inizio del ramo.
        if (i % 3 === 1) {
          const b2 = p.p(x - dx * k * 0.85, y - dy * k * 0.85);
          leaves.leaf(a[0], a[1], b2[0], b2[1], k * 0.15);
        }
      }
      for (const t of [0.3, 0.68]) {
        const [x, y] = at(t);
        const [ox, oy] = p.p(x + lf * 0.32, y + lf * 0.32);
        leaves.ellipse(ox, oy, lf * 0.13, lf * 0.18, 30);
      }
    }
    return { layers: [line(stems.d, 'ink', 1.05, sw * 0.9, { emboss: true }), fill(leaves.d, 'ink', 1.05, { emboss: true })] };
  },
  piazza: c => {
    // I sampietrini a ventaglio: file di archi sfalsati, con le fughe tra le pietre.
    const { w, h, m, cx, sw } = c;
    const R = Math.max(14, m / 9);
    const p = new Pen();
    const rows = Math.ceil(h / R) + 2;
    const cols = Math.ceil(w / (2 * R)) + 2;
    for (let j = 0; j < rows; j++) {
      const y = j * R;
      const off = (j % 2) * R;
      for (let i = -cols; i <= cols; i++) {
        const x = cx + i * 2 * R + off;
        if (x < -R * 1.2 || x > w + R * 1.2) continue;
        p.arc(x, y, R, 180, 360);
        p.arc(x, y, R * 0.66, 180, 360);
        p.arc(x, y, R * 0.33, 180, 360);
        for (let k = 1; k < 9; k++) {
          const a = 180 + k * 20 + (j % 2 ? 6 : -6);
          const [x0, y0] = polar(R * 0.66, a);
          const [x1, y1] = polar(R, a);
          p.M(x + x0, y + y0).L(x + x1, y + y1);
        }
        for (let k = 1; k < 4; k++) {
          const a = 180 + k * 45;
          const [x0, y0] = polar(R * 0.33, a);
          const [x1, y1] = polar(R * 0.66, a);
          p.M(x + x0, y + y0).L(x + x1, y + y1);
        }
      }
    }
    return { layers: [line(p.d, 'ink', 0.5, sw * 0.7, { emboss: true })] };
  },
  mosaico: c => {
    // Una cornice di tessere: fascia chiara, bordi scuri, la greca rossa; negli angoli un quadrato col rombo.
    const { m, E, rad } = c;
    const u = clamp(m * 0.0072, 1.6, 3.4);
    const band = 9 * u;
    const ins = Math.max(E * 0.7, rad * 0.34);
    const bg = new Pen();
    const frame = new Pen();
    const key = new Pen();
    const grid = new Pen();
    for (const s of sides(c, ins, band)) {
      const L = s.len;
      bg.d += s.p().poly([[0, 0], [L, 0], [L, band], [0, band]], true).d;
      frame.d += s.p().poly([[0, 0], [L, 0], [L, u], [0, u]], true).d;
      frame.d += s.p().poly([[0, 8 * u], [L, 8 * u], [L, band], [0, band]], true).d;
      const k = s.p();
      meander(k, L, u, 2.5 * u);
      key.d += k.d;
      const g = s.p();
      for (let x = 0; x <= L + 0.01; x += u) g.M(x, 0).L(x, band);
      for (let y = 0; y <= band + 0.01; y += u) g.M(0, y).L(L, y);
      grid.d += g.d;
    }
    // Gli angoli.
    const corner = new Pen();
    const cfill = new Pen();
    const cgrid = new Pen();
    for (const [x, y] of [
      [ins, ins],
      [c.w - ins - band, ins],
      [c.w - ins - band, c.h - ins - band],
      [ins, c.h - ins - band],
    ]) {
      bg.rrect(x, y, band, band, 0);
      corner.rrect(x, y, band, band, 0).rrect(x + u, y + u, band - 2 * u, band - 2 * u, 0);
      cfill.diamond(x + band / 2, y + band / 2, 2.5 * u);
      for (let k = 0; k <= 9; k++) cgrid.M(x + k * u, y).L(x + k * u, y + band).M(x, y + k * u).L(x + band, y + k * u);
    }
    return {
      layers: [
        fill(bg.d, 2, 0.3),
        fill(frame.d, 1, 0.42),
        line(corner.d, 1, 0.42, u, { cap: 'square' }),
        line(key.d, 0, 0.62, u, { cap: 'square' }),
        fill(cfill.d, 0, 0.6),
        line(grid.d + cgrid.d, 1, 0.2, Math.max(0.4, u * 0.18), { cap: 'butt' }),
      ],
    };
  },
  marmo: c => {
    // Venature di marmo: due che tagliano gli angoli, una lunga e tenue in diagonale, qualche ramo.
    const { w, h, m, sw } = c;
    const rng = seeded(11);
    const vein = (a: P, b: P, n: number, amp: number): P[] => {
      const out: P[] = [];
      const len = dist(a, b);
      const nx = -(b[1] - a[1]) / len;
      const ny = (b[0] - a[0]) / len;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const off = i === 0 || i === n ? 0 : (rng() - 0.5) * 2 * amp;
        out.push([lerp(a[0], b[0], t) + nx * off, lerp(a[1], b[1], t) + ny * off]);
      }
      return out;
    };
    const main = [
      { pts: vein([-0.05 * w, 0.24 * h], [0.5 * w, -0.04 * h], 8, m * 0.03), k: 1 },
      { pts: vein([0.55 * w, 1.04 * h], [1.05 * w, 0.58 * h], 8, m * 0.03), k: 1 },
      { pts: vein([-0.05 * w, 0.8 * h], [1.05 * w, 0.1 * h], 12, m * 0.05), k: 0.5 },
    ];
    const strong = new Pen();
    const soft = new Pen();
    const fine = new Pen();
    for (const v of main) {
      const tgt = v.k === 1 ? strong : soft;
      tgt.smooth(v.pts);
      // Due rami da ogni vena.
      for (const idx of [2, 5]) {
        const a = v.pts[idx];
        const b: P = [a[0] + (rng() - 0.5) * m * 0.5, a[1] + (rng() - 0.3) * m * 0.35];
        fine.smooth(vein(a, b, 5, m * 0.02));
      }
    }
    return {
      layers: [
        line(strong.d, 'ink', 0.28, sw * 5),
        line(strong.d, 'ink', 0.75, sw * 1.2),
        line(strong.d, 'ink', 1, sw * 0.45),
        line(soft.d, 'ink', 0.2, sw * 4),
        line(soft.d, 'ink', 0.45, sw * 0.7),
        line(fine.d, 'ink', 0.6, sw * 0.4),
        line(fine.d, 'shade', 0.3, sw * 1.4),
      ],
    };
  },
  venezia: c => {
    // Il cielo arancio in alto, un sole basso sull'orizzonte e le onde della laguna in basso.
    const { w, h, m, sw } = c;
    const rng = seeded(23);
    const horizon = h * 0.76;
    const waves = new Pen();
    const glints = new Pen();
    for (let k = 0; k < 8; k++) {
      const y = horizon + (h - horizon) * Math.pow((k + 0.6) / 8.2, 1.35);
      const L = clamp(m * (0.035 + k * 0.009), 6, 40);
      const A = L * 0.16;
      let x = -rng() * L * 2;
      while (x < w) {
        const n = 2 + Math.floor(rng() * 3);
        waves.M(x, y);
        for (let i = 0; i < n; i++) waves.Q(x + L * (i + 0.5), y + (i % 2 ? A : -A), x + L * (i + 1), y);
        x += L * n + L * (0.6 + rng() * 1.4);
      }
      // I riflessi del sole sotto di lui.
      const sx = w * 0.72;
      const gw = m * (0.02 + k * 0.012);
      glints.M(sx - gw * (0.4 + rng() * 0.6), y + A * 0.4).L(sx + gw * (0.4 + rng() * 0.6), y + A * 0.4);
    }
    const sun = new Pen().arc(w * 0.72, horizon, m * 0.075, 180, 360).Z().d;
    return {
      layers: [
        glow(w * 0.5, -h * 0.06, w * 0.8, h * 0.45, 0, 0.3),
        glow(w * 0.72, horizon, m * 0.32, m * 0.16, 0, 0.26),
        fill(sun, 0, 0.42),
        line(new Pen().M(0, horizon).L(w, horizon).d, 1, 0.3, sw * 0.6),
        glow(w * 0.5, h * 1.02, w * 0.8, (h - horizon) * 1.1, 1, 0.3),
        line(waves.d, 1, 0.5, sw * 0.8),
        line(glints.d, 0, 0.45, sw * 0.9, { cap: 'round' }),
      ],
    };
  },
  giglio: c => {
    // Il giglio di Firenze, grande al centro e piccolo negli angoli, dentro un filetto.
    const { m, cx, cy, sw, w, h, E } = c;
    const giglio = (ox: number, oy: number, S: number) => {
      let d = '';
      for (const sx of [1, -1]) {
        const p = new Pen(ox, oy, 0, sx * S, S);
        // Petalo laterale che sale e si arriccia verso il basso.
        p.M(0.04, 0.56)
          .C(0.08, 0.38, 0.2, 0.14, 0.36, 0.1)
          .C(0.47, 0.07, 0.53, 0.18, 0.47, 0.27)
          .C(0.44, 0.31, 0.39, 0.3, 0.405, 0.25)
          .C(0.42, 0.2, 0.37, 0.18, 0.31, 0.22)
          .C(0.22, 0.29, 0.15, 0.42, 0.12, 0.56)
          .Z();
        // Lo stame con il bottone.
        p.M(0.055, 0.47).Q(0.1, 0.25, 0.19, 0.105).L(0.205, 0.115).Q(0.12, 0.26, 0.085, 0.47).Z();
        p.circle(0.205, 0.08, 0.04);
        // Il ricciolo sotto la fascia.
        p.M(0.05, 0.635)
          .C(0.1, 0.7, 0.2, 0.72, 0.27, 0.7)
          .C(0.34, 0.68, 0.37, 0.76, 0.32, 0.8)
          .C(0.3, 0.82, 0.265, 0.8, 0.28, 0.77)
          .C(0.22, 0.8, 0.12, 0.76, 0.035, 0.68)
          .Z();
        d += p.d;
      }
      const q = new Pen(ox, oy, 0, S, S);
      q.petal(0, 0.56, 0, 0.0, 0.105);
      q.rrect(-0.3, 0.565, 0.6, 0.07, 0.02);
      q.petal(0, 0.635, 0, 0.92, 0.06);
      return d + q.d;
    };
    const S = m * 0.36;
    const s2 = clamp(m * 0.085, 12, 42);
    let small = '';
    for (const [x, y] of [
      [E * 2.2 + s2 * 0.3, E * 1.6],
      [w - E * 2.2 - s2 * 0.3, E * 1.6],
      [w - E * 2.2 - s2 * 0.3, h - E * 1.6 - s2],
      [E * 2.2 + s2 * 0.3, h - E * 1.6 - s2],
    ])
      small += giglio(x, y, s2);
    return {
      layers: [
        line(inset(c, E * 0.9), 'ink', 0.8, sw * 0.8, { emboss: true }),
        fill(giglio(cx, cy - S * 0.5, S), 'ink', 1, { emboss: true }),
        fill(small, 'ink', 1, { emboss: true }),
      ],
    };
  },

  /* ---------- eleganti */
  filigrana: c => {
    // Filigrana d'oro: un filo lungo il bordo con le perline, riccioli negli angoli.
    const { m, sw, w, h, E } = c;
    const S = clamp(m * 0.3, 44, 170);
    const scrolls = { lines: '', fills: '' };
    for (const p of [new Pen(0, 0, 0, 1, 1), new Pen(w, 0, 0, -1, 1), new Pen(w, h, 0, -1, -1), new Pen(0, h, 0, 1, -1)]) {
      const s = scrollCorner(p, S, E * 0.9);
      scrolls.lines += s.lines;
      scrolls.fills += s.fills;
    }
    const beads = new Pen();
    const ins = E * 0.55;
    const loop = new Loop(ins, ins, w - 2 * ins, h - 2 * ins, Math.max(2, c.rad - ins));
    const step = Math.max(5, sw * 5.5);
    const zone = S * 0.92;
    for (let s = 0; s < loop.len; s += step) {
      const [x, y] = loop.pt(s, sw * 3.4);
      if ((x < zone || x > w - zone) && (y < zone || y > h - zone)) continue;
      beads.circle(x, y, Math.max(0.6, sw * 0.62));
    }
    // Un fiocchetto a metà dei lati lunghi.
    const mid = new Pen();
    for (const [x, y, a] of [
      [w / 2, ins + sw * 3.4, 0],
      [w / 2, h - ins - sw * 3.4, 180],
    ] as [number, number, number][]) {
      const q = new Pen(x, y, a);
      const k = clamp(m * 0.03, 4, 14);
      q.diamond(0, k * 0.55, k * 0.32, k * 0.55);
      q.petal(0, k * 0.5, -k * 1.6, k * 0.25, k * 0.2).petal(0, k * 0.5, k * 1.6, k * 0.25, k * 0.2);
      mid.d += q.d;
    }
    return {
      layers: [
        line(inset(c, ins), 0, 0.5, sw * 0.7, { emboss: true }),
        fill(beads.d, 0, 0.45),
        line(scrolls.lines, 0, 0.58, sw * 0.85, { emboss: true }),
        fill(scrolls.fills + mid.d, 0, 0.55, { emboss: true }),
      ],
    };
  },
  satin: c => {
    // Il riflesso della seta: due bande di luce morbide in diagonale e un'ombra tra loro.
    const { w, h, m } = c;
    return {
      layers: [
        glow(w * 0.3, h * 0.28, Math.hypot(w, h) * 0.42, m * 0.11, '#FFFFFF', 0.12, 38),
        glow(w * 0.58, h * 0.5, Math.hypot(w, h) * 0.45, m * 0.07, '#000000', 0.12, 38),
        glow(w * 0.76, h * 0.74, Math.hypot(w, h) * 0.38, m * 0.08, '#FFFFFF', 0.08, 38),
        glow(w * 0.12, h * 0.9, m * 0.4, m * 0.05, '#FFFFFF', 0.05, 38),
      ],
    };
  },
  damasco: c => {
    // Il damasco: un reticolo a ogiva e in ogni cella una palmetta, tono su tono.
    const { w, h, m, cx, cy, sw } = c;
    const s = clamp(m / 3.3, 40, 150);
    const H = s * 0.78;
    const A = s / 2;
    const N = Math.ceil(w / s / 2) + 1;
    const lat = new Pen();
    const motifs = new Pen();
    const knots = new Pen();
    const ky = Math.ceil(h / H / 2) + 2;
    for (let i = -N; i <= N; i++) {
      const sg = i % 2 === 0 ? 1 : -1;
      const pts: P[] = [];
      for (let y = -H; y <= h + H; y += H / 8) pts.push([cx + i * s + sg * A * Math.sin((Math.PI * (y - cy)) / H), y]);
      lat.smooth(pts);
      for (let k = -ky; k <= ky; k++) {
        // Le palmette dove la cella è più larga, i nodi dove le linee si toccano.
        const yw = cy + H * (2 * k + (sg > 0 ? -0.5 : 0.5));
        const yk = cy + H * (2 * k + (sg > 0 ? 0.5 : -0.5));
        const mx = cx + (i + 0.5) * s;
        if (mx < -s || mx > w + s) continue;
        knots.diamond(mx, yk, s * 0.035, s * 0.055);
        const U = s * 0.44;
        const q = new Pen(mx, yw);
        q.petal(0, U * 0.35, 0, -U * 0.6, U * 0.12);
        q.leaf(0, U * 0.32, U * 0.44, -U * 0.18, U * 0.11).leaf(0, U * 0.32, -U * 0.44, -U * 0.18, U * 0.11);
        q.leaf(0, U * 0.4, U * 0.3, U * 0.55, U * 0.06).leaf(0, U * 0.4, -U * 0.3, U * 0.55, U * 0.06);
        q.diamond(0, -U * 0.74, U * 0.05, U * 0.08);
        q.circle(U * 0.2, -U * 0.42, U * 0.04).circle(-U * 0.2, -U * 0.42, U * 0.04);
        motifs.d += q.d;
      }
    }
    return {
      layers: [line(lat.d, 'ink', 0.55, sw * 0.7, { emboss: true }), fill(motifs.d + knots.d, 'ink', 0.58, { emboss: true })],
    };
  },
  palazzo: c => {
    // Cornici d'oro con gli angoli rientranti e un rosone al centro.
    const { w, h, m, cx, cy, sw, E } = c;
    const ins = E * 1.05;
    const cN = clamp(m * 0.06, 8, 32);
    const g = sw * 3.2;
    const frame = notched(ins, ins, w - ins, h - ins, cN) + notched(ins + g, ins + g, w - ins - g, h - ins - g, cN - g * 0.4);
    const r = rosoneGeom(cx, cy, m * 0.24);
    const dia = new Pen();
    const k = clamp(m * 0.014, 2.5, 7);
    dia.diamond(cx, ins + g / 2, k * 1.7, k).diamond(cx, h - ins - g / 2, k * 1.7, k);
    dia.diamond(ins + g / 2, cy, k, k * 1.7).diamond(w - ins - g / 2, cy, k, k * 1.7);
    return {
      layers: [
        line(frame, 0, 0.5, sw * 0.8, { emboss: true }),
        fill(dia.d, 0, 0.55, { emboss: true }),
        line(r.line, 0, 0.2, sw * 0.9, { emboss: true }),
        fill(r.fill, 0, 0.24),
      ],
    };
  },
  ricamo: c => {
    // Un ricamo d'oro lungo tutto il bordo: un tralcio ondulato con foglie, riccioli e puntini.
    const { w, h, m, sw, E, rad } = c;
    const ins = E * 1.55;
    const loop = new Loop(ins, ins, w - 2 * ins, h - 2 * ins, Math.max(2, rad - ins));
    const N = Math.max(8, Math.round(loop.len / clamp(m * 0.12, 22, 60)));
    const lam = loop.len / N;
    const A = clamp(m * 0.02, 2.6, 8);
    const stem: P[] = [];
    for (let s = 0; s < loop.len; s += lam / 10) stem.push(loop.pt(s, A * Math.sin((2 * Math.PI * s) / lam)));
    const st = new Pen().smooth(stem, true);
    const leaves = new Pen();
    const curls = new Pen();
    for (let k = 0; k < N; k++) {
      const s = lam * (k + 0.25);
      const a = loop.pt(s, A);
      const b = loop.pt(s + lam * 0.16, A + lam * 0.3);
      leaves.leaf(a[0], a[1], b[0], b[1], lam * 0.07);
      const s2 = lam * (k + 0.75);
      const base = loop.pt(s2, -A);
      const tip = loop.pt(s2 + lam * 0.1, -A - lam * 0.16);
      const cc = loop.pt(s2 + lam * 0.14, -A - lam * 0.1);
      curls.M(...base).Q(...loop.pt(s2 + lam * 0.02, -A - lam * 0.14), ...tip);
      const ang = (Math.atan2(tip[1] - cc[1], tip[0] - cc[0]) * 180) / Math.PI;
      curls.smooth(spiral(cc[0], cc[1], dist(cc, tip), lam * 0.015, ang, 0.8, 1));
      const dot = loop.pt(lam * (k + 0.5), A * 2.3);
      leaves.circle(dot[0], dot[1], Math.max(0.7, lam * 0.025));
    }
    return {
      layers: [
        line(inset(c, E * 0.55), 0, 0.32, sw * 0.7, { dash: `${sw * 2.6} ${sw * 1.6}` }),
        line(st.d, 0, 0.55, sw * 1.05, { emboss: true }),
        line(curls.d, 0, 0.5, sw * 0.8, { emboss: true }),
        fill(leaves.d, 0, 0.5, { emboss: true }),
      ],
    };
  },
  cristallo: c => {
    // Le sfaccettature di un cristallo: triangoli grandi, più vivi verso i bordi, quasi fermi al centro.
    const { w, h, m, cx, cy } = c;
    const rng = seeded(31);
    const g = clamp(m / 4.2, 30, 150);
    const nx = Math.max(2, Math.round(w / g));
    const ny = Math.max(2, Math.round(h / g));
    const pts: P[][] = [];
    for (let i = 0; i <= nx; i++) {
      pts.push([]);
      for (let j = 0; j <= ny; j++) {
        const edgeX = i === 0 || i === nx;
        const edgeY = j === 0 || j === ny;
        const jx = edgeX ? 0 : (rng() - 0.5) * 0.55;
        const jy = edgeY ? 0 : (rng() - 0.5) * 0.55;
        pts[i].push([((i + jx) * w) / nx, ((j + jy) * h) / ny]);
      }
    }
    const bins = [new Pen(), new Pen(), new Pen(), new Pen()];
    const edges = new Pen();
    const tri = (a: P, b: P, d: P) => {
      const x = (a[0] + b[0] + d[0]) / 3;
      const y = (a[1] + b[1] + d[1]) / 3;
      const wgt = 0.2 + 0.8 * clamp((fromCenter(c, x, y) - 0.25) / 0.75, 0, 1);
      const v = ((rng() * 2 - 1) * 0.8 + 0.35 * (1 - x / w - y / h)) * wgt;
      const bin = v > 0.32 ? 0 : v > 0.1 ? 1 : v < -0.32 ? 3 : v < -0.1 ? 2 : -1;
      if (bin >= 0) bins[bin].poly([a, b, d], true);
      edges.poly([a, b, d], true);
    };
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const a = pts[i][j];
        const b = pts[i + 1][j];
        const d = pts[i + 1][j + 1];
        const e = pts[i][j + 1];
        if ((i + j) % 2) {
          tri(a, b, d);
          tri(a, d, e);
        } else {
          tri(a, b, e);
          tri(b, d, e);
        }
      }
    }
    // Qualche scintilla vicino ai bordi.
    const spark = new Pen();
    for (const [x, y] of [
      [0.14 * w, 0.1 * h],
      [0.9 * w, 0.22 * h],
      [0.08 * w, 0.62 * h],
      [0.82 * w, 0.9 * h],
    ])
      spark.star(x, y, m * 0.03, m * 0.004, 4, -90);
    return {
      layers: [
        fill(bins[0].d, '#FFFFFF', 0.11),
        fill(bins[1].d, '#FFFFFF', 0.05),
        fill(bins[2].d, '#000000', 0.07),
        fill(bins[3].d, '#000000', 0.14),
        line(edges.d, '#FFFFFF', 0.1, 0.7),
        glow(cx, cy, m * 0.42, m * 0.34, '#FFFFFF', 0.05),
        fill(spark.d, '#FFFFFF', 0.55),
      ],
    };
  },
  onice: c => {
    // L'onice: fasce bianche ondulate che entrano da due angoli opposti, e una vena sottile.
    const { w, h, m, sw } = c;
    const bands = (ox: number, oy: number, a0: number, seed: number) => {
      const rng = seeded(seed);
      const out: { d: string; k: number; wd: number }[] = [];
      for (let k = 0; k < 9; k++) {
        const r0 = m * (0.15 + 0.034 * k + (rng() - 0.5) * 0.01);
        const ph = rng() * 6;
        const pts: P[] = [];
        for (let a = -15; a <= 105; a += 5) {
          const t = (a * Math.PI) / 180;
          const r = r0 * (1 + 0.06 * Math.sin(3 * t + ph) + 0.03 * Math.sin(7 * t + k));
          const [x, y] = polar(r, a0 + a);
          pts.push([ox + x, oy + y]);
        }
        out.push({ d: new Pen().smooth(pts).d, k: 1 - k / 10, wd: k % 3 === 0 ? 1.5 : 0.6 });
      }
      return out;
    };
    const all = [...bands(-m * 0.08, -m * 0.06, 0, 3), ...bands(w + m * 0.08, h + m * 0.06, 180, 4)];
    const rng = seeded(9);
    const v: P[] = [];
    for (let i = 0; i <= 10; i++) v.push([lerp(0.28 * w, 1.02 * w, i / 10) + (rng() - 0.5) * m * 0.04, lerp(1.02 * h, 0.32 * h, i / 10) + (rng() - 0.5) * m * 0.04]);
    return {
      layers: [
        ...all.map(b => line(b.d, '#FFFFFF', 0.15 * b.k, sw * b.wd)),
        line(new Pen().smooth(v).d, '#FFFFFF', 0.1, sw * 0.5),
        glow(0, 0, m * 0.5, m * 0.42, '#FFFFFF', 0.05),
        glow(w, h, m * 0.5, m * 0.42, '#FFFFFF', 0.05),
      ],
    };
  },

  /* ---------- fantasy */
  fiore: c => {
    // Un fiore di giada a otto petali, bordato d'oro, e un bocciolo in ogni angolo.
    const { m, cx, cy, sw, w, h, E } = c;
    const R = m * 0.3;
    const outer = new Pen(cx, cy);
    const inner = new Pen(cx, cy);
    for (let i = 0; i < 8; i++) {
      const a = i * 45 - 90;
      outer.leaf(...polar(R * 0.16, a), ...polar(R, a), R * 0.2);
      const b = a + 22.5;
      inner.leaf(...polar(R * 0.12, b), ...polar(R * 0.62, b), R * 0.14);
    }
    const heart = new Pen(cx, cy).circle(0, 0, R * 0.12);
    const ring = new Pen(cx, cy).circle(0, 0, R * 0.17);
    const dots = new Pen(cx, cy);
    for (let i = 0; i < 12; i++) dots.circle(...polar(R * 0.22, i * 30), R * 0.017);
    const halo = new Pen(cx, cy).circle(0, 0, R * 1.14);
    const k = clamp(m * 0.055, 7, 26);
    const buds = four(w, h, p => {
      for (let i = 0; i < 4; i++) {
        const a = i * 90 + 45;
        const [x, y] = polar(k, a);
        p.leaf(E * 1.6 + k, E * 1.6 + k, E * 1.6 + k + x, E * 1.6 + k + y, k * 0.3);
      }
    });
    return {
      layers: [
        fill(outer.d, 0, 0.14),
        line(outer.d, 1, 0.3, sw * 0.7),
        fill(inner.d, 0, 0.2),
        line(inner.d, 1, 0.32, sw * 0.6),
        fill(heart.d, 1, 0.26),
        line(ring.d, 1, 0.38, sw * 0.6),
        fill(dots.d, 1, 0.35),
        line(halo.d, 1, 0.2, sw * 0.6, { dash: `${sw * 1.5} ${sw * 3}` }),
        fill(buds, 0, 0.32),
        line(buds, 1, 0.4, sw * 0.6),
      ],
    };
  },
  fulmini: c => {
    // Fulmini che entrano dai bordi e si spengono prima del centro.
    const { w, h, m, sw } = c;
    const rng = seeded(41);
    const main = new Pen();
    const twigs = new Pen();
    const starts: P[] = [];
    for (const [a, b] of [
      [
        [0.12 * w, -0.02 * h],
        [0.34 * w, 0.27 * h],
      ],
      [
        [1.02 * w, 0.14 * h],
        [0.7 * w, 0.33 * h],
      ],
      [
        [-0.02 * w, 0.72 * h],
        [0.25 * w, 0.66 * h],
      ],
      [
        [0.86 * w, 1.02 * h],
        [0.68 * w, 0.74 * h],
      ],
    ] as [P, P][]) {
      starts.push(a);
      const pts = bolt(rng, a, b, 5, 0.32);
      main.poly(pts);
      for (const at of [Math.floor(pts.length * 0.3), Math.floor(pts.length * 0.55)]) {
        const p0 = pts[at];
        const dir = Math.atan2(b[1] - a[1], b[0] - a[0]) + (rng() > 0.5 ? 1 : -1) * (0.45 + rng() * 0.35);
        const len = dist(a, b) * (0.28 + rng() * 0.15);
        twigs.poly(bolt(rng, p0, [p0[0] + Math.cos(dir) * len, p0[1] + Math.sin(dir) * len], 4, 0.3));
      }
    }
    return {
      layers: [
        ...starts.map(([x, y]) => glow(x, y, m * 0.2, m * 0.2, 0, 0.16)),
        line(main.d, 0, 0.07, sw * 7),
        line(main.d, 0, 0.22, sw * 2.4),
        line(twigs.d, 0, 0.14, sw * 1.6),
        line(main.d, 1, 0.7, sw * 0.75),
        line(twigs.d, 1, 0.45, sw * 0.5),
      ],
    };
  },
  ghiaccio: c => {
    // Brina negli angoli: cristalli che crescono dal bordo, e qualche fiocco di neve.
    const { w, h, m, sw, E, rad } = c;
    const rng = seeded(53);
    const big = new Pen();
    const small = new Pen();
    const q = E * 0.5 + rad * 0.22;
    const dendrite = (p: Pen, x: number, y: number, ang: number, len: number, depth: number) => {
      const [ex, ey] = polar(len, ang);
      const tgt = depth === 2 ? big : small;
      tgt.M(...p.p(x, y)).L(...p.p(x + ex, y + ey));
      if (depth === 0) return;
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        const bx = x + ex * t;
        const by = y + ey * t;
        const sl = len * 0.36 * (1 - t * 0.55);
        for (const s of [-1, 1]) dendrite(p, bx, by, ang + s * (58 + (rng() - 0.5) * 10), sl, depth - 1);
      }
    };
    for (const p of [new Pen(0, 0, 0, 1, 1), new Pen(w, 0, 0, -1, 1), new Pen(w, h, 0, -1, -1), new Pen(0, h, 0, 1, -1)]) {
      const angles = [10, 34, 56, 80];
      const lens = [0.22, 0.28, 0.27, 0.2];
      angles.forEach((a, i) => dendrite(p, q, q, a + (rng() - 0.5) * 8, m * lens[i] * (0.85 + rng() * 0.3), 2));
    }
    const flakes = new Pen();
    for (const [fx, fy] of [
      [0.5 * w, 0.06 * h],
      [0.94 * w, 0.5 * h],
      [0.5 * w, 0.94 * h],
      [0.06 * w, 0.46 * h],
      [0.3 * w, 0.12 * h],
      [0.72 * w, 0.88 * h],
    ]) {
      const r = m * (0.018 + rng() * 0.012);
      for (let i = 0; i < 6; i++) {
        const a = i * 60 + 30;
        const [x, y] = polar(r, a);
        flakes.M(fx, fy).L(fx + x, fy + y);
        const [mx, my] = polar(r * 0.55, a);
        for (const s of [-1, 1]) {
          const [bx, by] = polar(r * 0.3, a + s * 50);
          flakes.M(fx + mx, fy + my).L(fx + mx + bx, fy + my + by);
        }
      }
    }
    return {
      layers: [
        glow(0, 0, m * 0.42, m * 0.42, 0, 0.14),
        glow(w, 0, m * 0.42, m * 0.42, 0, 0.14),
        glow(w, h, m * 0.42, m * 0.42, 0, 0.14),
        glow(0, h, m * 0.42, m * 0.42, 0, 0.14),
        line(big.d, 0, 0.42, sw * 0.75),
        line(small.d, 0, 0.3, sw * 0.45),
        line(flakes.d, 0, 0.32, sw * 0.5),
      ],
    };
  },
  nebbia: c => {
    // Una nebbia viola che si posa sui bordi e lascia libero il centro.
    const { w, h } = c;
    const g: [number, number, number, number, number, number][] = [
      [0.12, 0.14, 0.5, 0.1, -8, 0.2],
      [0.88, 0.3, 0.42, 0.09, 10, 0.16],
      [0.22, 0.86, 0.5, 0.1, 6, 0.2],
      [0.84, 0.9, 0.46, 0.11, -5, 0.18],
      [0.5, 0.02, 0.6, 0.08, 0, 0.14],
      [0.5, 0.98, 0.6, 0.08, 0, 0.16],
      [0.02, 0.5, 0.1, 0.42, 0, 0.14],
      [0.98, 0.56, 0.1, 0.4, 0, 0.14],
      [0.46, 0.46, 0.4, 0.05, -12, 0.06],
      [0.62, 0.62, 0.32, 0.04, -12, 0.05],
    ];
    return { layers: g.map(([x, y, rx, ry, rot, op]) => glow(x * w, y * h, rx * w, ry * h, 0, op, rot)) };
  },

  /* ---------- spazio e mitologia */
  'via-lattea': c => {
    const { w, h, m, cx, cy, sw } = c;
    const ang = (-Math.atan2(h, w) * 180) / Math.PI;
    const D = Math.hypot(w, h) / 2;
    const ux = Math.cos((ang * Math.PI) / 180);
    const uy = Math.sin((ang * Math.PI) / 180);
    const band: Layer[] = [];
    [-0.62, -0.4, -0.18, 0.04, 0.26, 0.48, 0.66].forEach((t, i) => {
      band.push(glow(cx + t * D * ux, cy + t * D * uy, m * 0.36, m * (0.08 + (i % 3) * 0.02), i % 2 ? 1 : 0, i % 2 ? 0.08 : 0.1, ang));
    });
    [-0.5, -0.1, 0.3].forEach(t => band.push(glow(cx + t * D * ux, cy + t * D * uy, m * 0.3, m * 0.018, '#000000', 0.12, ang + 4)));
    const s = starfield(
      c,
      7,
      clamp((w * h) / 240, 50, 900),
      (x, y) => {
        const d = Math.abs((x - cx) * uy - (y - cy) * ux);
        return 0.22 + 0.78 * Math.exp(-((d / (m * 0.15)) ** 2));
      },
      sw * 0.32,
      sw * 1.05,
    );
    return { layers: [...band, ...starLayers(s, 0)] };
  },
  nebulosa: c => {
    const { w, h, m, sw } = c;
    const s = starfield(c, 13, clamp((w * h) / 650, 30, 400), (x, y) => clamp(fromCenter(c, x, y) - 0.2, 0.15, 1), sw * 0.3, sw * 1);
    return {
      layers: [
        glow(0.12 * w, 0.12 * h, 0.42 * w, 0.22 * h, 0, 0.22, 30),
        glow(0.2 * w, 0.06 * h, 0.3 * w, 0.12 * h, 0, 0.18, -10),
        glow(0.06 * w, 0.26 * h, 0.12 * w, 0.18 * h, 1, 0.14, 0),
        glow(0.9 * w, 0.18 * h, 0.26 * w, 0.14 * h, 1, 0.16, -20),
        glow(0.88 * w, 0.88 * h, 0.44 * w, 0.2 * h, 0, 0.22, 25),
        glow(0.78 * w, 0.96 * h, 0.3 * w, 0.1 * h, 1, 0.14, 0),
        glow(0.1 * w, 0.82 * h, 0.24 * w, 0.14 * h, 1, 0.15, 15),
        glow(0.16 * w, 0.14 * h, 0.2 * w, m * 0.02, '#000000', 0.12, 35),
        glow(0.84 * w, 0.86 * h, 0.22 * w, m * 0.02, '#000000', 0.12, 28),
        ...starLayers(s, '#FFFFFF'),
      ],
    };
  },
  'buco-nero': c => {
    // Un disco di luce inclinato intorno all'ombra, e l'anello di fotoni sopra.
    const { m, cx, cy, sw, w, h } = c;
    const rx = m * 0.44;
    const k = 0.2;
    const disk = (a0: number, a1: number) => new Pen(cx, cy, -8, 1, k).arc(0, 0, rx, a0, a1).d;
    const back = disk(180, 360);
    const front = disk(0, 180);
    const ring = new Pen(cx, cy).circle(0, 0, m * 0.165).d;
    const shadow = new Pen(cx, cy).circle(0, 0, m * 0.15).d;
    const s = starfield(c, 17, clamp((w * h) / 1400, 15, 160), (x, y) => clamp(fromCenter(c, x, y) - 0.3, 0.1, 1), sw * 0.3, sw * 0.9);
    const diskLayers = (d: string) => [line(d, 0, 0.07, m * 0.07), line(d, 0, 0.14, m * 0.032), line(d, 1, 0.32, sw * 2.2), line(d, '#FFFFFF', 0.45, sw * 0.7)];
    return {
      layers: [
        ...starLayers(s, '#FFFFFF', 0.8),
        glow(cx, cy, m * 0.62, m * 0.34, 0, 0.16, -8),
        ...diskLayers(back),
        fill(shadow, '#000000', 0.6),
        line(ring, 0, 0.14, sw * 6),
        line(ring, 1, 0.32, sw * 2),
        line(ring, '#FFFFFF', 0.6, sw * 0.7),
        ...diskLayers(front),
      ],
    };
  },
  universo: c => {
    // Due galassie a spirale negli angoli, nebulose e stelle dappertutto.
    const { w, h, m, sw } = c;
    const galaxy = (x: number, y: number, S: number, tilt: number, rot: number, col: number): Layer[] => {
      const arms = new Pen();
      for (const ph of [0, 180]) {
        const pts: P[] = [];
        for (let t = 0; t <= 2.4 * Math.PI; t += 0.18) {
          const r = S * 0.07 * Math.exp(0.36 * t);
          if (r > S * 0.55) break;
          const [px, py] = polar(r, ph + (t * 180) / Math.PI);
          pts.push(new Pen(x, y, rot, 1, tilt).p(px, py));
        }
        arms.smooth(pts);
      }
      return [
        glow(x, y, S * 0.6, S * 0.6 * tilt, col, 0.14, rot),
        line(arms.d, col, 0.1, S * 0.12),
        line(arms.d, col, 0.24, S * 0.035),
        line(arms.d, '#FFFFFF', 0.26, sw * 0.5),
        glow(x, y, S * 0.14, S * 0.14 * Math.max(tilt, 0.6), '#FFFFFF', 0.45, rot),
      ];
    };
    const s = starfield(c, 19, clamp((w * h) / 480, 40, 650), (x, y) => clamp(fromCenter(c, x, y) - 0.1, 0.25, 1), sw * 0.3, sw * 1.05);
    return {
      layers: [
        glow(0.1 * w, 0.14 * h, 0.4 * w, 0.18 * h, 1, 0.18, 25),
        glow(0.92 * w, 0.84 * h, 0.4 * w, 0.18 * h, 0, 0.16, 20),
        glow(0.5 * w, 0.5 * h, 0.5 * w, 0.06 * h, 2, 0.04, -30),
        ...galaxy(0.8 * w, 0.17 * h, m * 0.34, 0.5, -25, 0),
        ...galaxy(0.19 * w, 0.83 * h, m * 0.26, 0.45, 30, 1),
        ...starLayers(s, 2),
      ],
    };
  },
  'sole-cremisi': c => {
    // Un sole rosso che sorge dal centro: alone, disco e raggi che sfumano verso il bordo.
    const { w, h, m, cx, cy, sw } = c;
    const r1 = m * 0.27;
    const r2 = Math.hypot(w, h) * 0.6;
    const rays = new Pen(cx, cy);
    for (let i = 0; i < 32; i++) {
      const a = i * (360 / 32);
      const hw = i % 2 ? 1 : 1.8;
      const R = i % 2 ? r2 * 0.75 : r2;
      rays.M(...polar(r1, a - hw * 0.5))
        .L(...polar(R, a - hw))
        .L(...polar(R, a + hw))
        .L(...polar(r1, a + hw * 0.5))
        .Z();
    }
    const fade: Fade = { cx, cy, r: r2, stops: [[0, 0], [r1 / r2, 1], [0.7, 0.3], [1, 0]] };
    return {
      layers: [
        glow(cx, cy, m * 0.64, m * 0.64, 0, 0.26),
        glow(cx, cy, m * 0.22, m * 0.22, 1, 0.22),
        fill(rays.d, 1, 0.17, { fade }),
        line(new Pen(cx, cy).circle(0, 0, m * 0.2).d, 1, 0.3, sw),
        line(new Pen(cx, cy).circle(0, 0, m * 0.235).d, 1, 0.15, sw * 0.6),
      ],
    };
  },
  luna: c => {
    // Una falce di luna in alto a destra, con il suo alone, e qualche stella.
    const { w, h, m, sw } = c;
    const R = clamp(m * 0.11, 9, 70);
    const mx = w * 0.78;
    const my = h * 0.19;
    const dx = R * 0.42;
    const dy = -R * 0.2;
    const R2 = R * 0.9;
    // I due cerchi si incontrano in due punti: la falce è l'arco lontano del primo e quello vicino del secondo.
    const d = Math.hypot(dx, dy);
    const a = (R * R - R2 * R2 + d * d) / (2 * d);
    const hh = Math.sqrt(Math.max(0, R * R - a * a));
    const base = Math.atan2(dy, dx);
    const px = a * Math.cos(base);
    const py = a * Math.sin(base);
    const P1: P = [px - hh * Math.sin(base), py + hh * Math.cos(base)];
    const P2: P = [px + hh * Math.sin(base), py - hh * Math.cos(base)];
    const deg = (p: P, o: P) => (Math.atan2(p[1] - o[1], p[0] - o[0]) * 180) / Math.PI;
    let a1 = deg(P1, [0, 0]);
    let a2 = deg(P2, [0, 0]);
    if (a2 < a1) a2 += 360;
    const moon = new Pen(mx, my);
    // L'arco lontano del primo cerchio va da P1 a P2 dalla parte opposta al secondo cerchio.
    moon.arc(0, 0, R, a1, a2);
    let b1 = deg(P2, [dx, dy]);
    let b2 = deg(P1, [dx, dy]);
    if (b2 > b1) b2 -= 360;
    moon.arc(dx, dy, R2, b1, b2, false).Z();
    void a2;
    const s = starfield(c, 29, clamp((w * h) / 1500, 15, 180), (x, y) => clamp(fromCenter(c, x, y) - 0.3, 0.12, 1) * (Math.hypot(x - mx, y - my) < R * 2.5 ? 0 : 1), sw * 0.3, sw * 1);
    return {
      layers: [
        glow(mx, my, R * 3.2, R * 3.2, 0, 0.12),
        fill(new Pen(mx, my).circle(0, 0, R).d, 0, 0.05),
        fill(moon.d, 0, 0.62),
        ...starLayers(s, 0),
      ],
    };
  },
  eclissi: c => {
    // Al centro la luna nera e intorno la corona del sole, con i suoi filamenti e un punto di luce.
    const { w, h, m, cx, cy, sw } = c;
    const rng = seeded(37);
    const r = m * 0.152;
    const streams = new Pen(cx, cy);
    for (let i = 0; i < 56; i++) {
      const a = i * (360 / 56) + (rng() - 0.5) * 4;
      const L = m * (0.2 + rng() * rng() * 0.26);
      const bend = (rng() - 0.5) * 6;
      streams.M(...polar(r * 1.03, a)).Q(...polar((r + L) / 2, a + bend), ...polar(L, a + bend * 1.6));
    }
    const s = starfield(c, 43, clamp((w * h) / 1800, 12, 140), (x, y) => clamp(fromCenter(c, x, y) - 0.4, 0.1, 1), sw * 0.3, sw * 0.9);
    const [bx, by] = polar(r, -40);
    return {
      layers: [
        ...starLayers(s, 1, 0.8),
        glow(cx, cy, m * 0.4, m * 0.4, 0, 0.24),
        glow(cx, cy, m * 0.23, m * 0.23, 1, 0.26),
        line(streams.d, 0, 0.14, sw * 0.55),
        fill(new Pen(cx, cy).circle(0, 0, r).d, '#000000', 0.62),
        line(new Pen(cx, cy).circle(0, 0, r * 1.01).d, 1, 0.55, sw * 0.9),
        glow(cx + bx, cy + by, m * 0.06, m * 0.06, 1, 0.55),
        fill(new Pen(cx + bx, cy + by).star(0, 0, m * 0.045, m * 0.004, 4, -90).d, 1, 0.7),
      ],
    };
  },
  costellazioni: c => {
    // Quattro costellazioni vere negli angoli: Orsa Maggiore, Cassiopea, Orione e Cigno.
    const { w, h, m, sw, E } = c;
    const S = clamp(m * 0.3, 50, 180);
    type Con = { stars: [number, number, number][]; links: [number, number][] };
    const UMA: Con = {
      stars: [[0, 0.24, 2], [0.18, 0.13, 2], [0.33, 0.17, 2], [0.47, 0.25, 1], [0.5, 0.45, 2], [0.76, 0.5, 2], [0.78, 0.28, 3]],
      links: [[0, 1], [1, 2], [2, 3], [3, 6], [6, 5], [5, 4], [4, 3]],
    };
    const CAS: Con = { stars: [[0, 0.12, 2], [0.24, 0.38, 2], [0.5, 0.2, 3], [0.74, 0.42, 2], [1, 0.1, 2]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] };
    const ORI: Con = {
      stars: [[0.2, 0.06, 3], [0.74, 0.12, 2], [0.42, 0.5, 2], [0.52, 0.47, 2], [0.62, 0.44, 2], [0.3, 0.92, 2], [0.82, 0.86, 3], [0.47, -0.06, 1]],
      links: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 7], [7, 1]],
    };
    const CYG: Con = { stars: [[0.5, 0, 3], [0.5, 0.38, 2], [0.5, 0.95, 2], [0.06, 0.3, 2], [0.94, 0.5, 2], [0.5, 0.62, 1]], links: [[0, 1], [1, 5], [5, 2], [3, 1], [1, 4]] };
    const place: [Con, number, number, number, number][] = [
      [UMA, E * 1.8, E * 2.2, S, S * 0.75],
      [CAS, w - E * 1.8 - S * 0.9, E * 2.4, S * 0.9, S * 0.55],
      [ORI, w - E * 1.8 - S * 0.75, h - E * 2 - S * 0.95, S * 0.75, S * 0.95],
      [CYG, E * 2, h - E * 2 - S * 0.9, S * 0.8, S * 0.9],
    ];
    const links = new Pen();
    const big = new Pen();
    const mid = new Pen();
    const glows: Layer[] = [];
    for (const [con, ox, oy, sx, sy] of place) {
      const at = (i: number): P => [ox + con.stars[i][0] * sx, oy + con.stars[i][1] * sy];
      for (const [a, b] of con.links) {
        // La linea si ferma un po' prima delle stelle.
        const A = at(a);
        const B = at(b);
        const L = dist(A, B);
        const g = Math.min(L * 0.2, sw * 3.5);
        const ux = (B[0] - A[0]) / L;
        const uy = (B[1] - A[1]) / L;
        links.M(A[0] + ux * g, A[1] + uy * g).L(B[0] - ux * g, B[1] - uy * g);
      }
      con.stars.forEach(([, , mag], i) => {
        const [x, y] = at(i);
        const r = sw * (0.55 + mag * 0.42);
        (mag >= 2 ? big : mid).circle(x, y, r);
        if (mag === 3) glows.push(glow(x, y, sw * 7, sw * 7, 0, 0.3));
      });
    }
    const s = starfield(c, 47, clamp((w * h) / 1300, 15, 220), (x, y) => clamp(fromCenter(c, x, y) - 0.15, 0.15, 1), sw * 0.25, sw * 0.7);
    return {
      layers: [
        fill(s.small + s.mid, 1, 0.28),
        fill(s.big, 1, 0.4),
        line(links.d, 1, 0.32, sw * 0.6),
        ...glows,
        fill(mid.d, 0, 0.6),
        fill(big.d, 0, 0.85),
      ],
    };
  },
  olimpo: c => {
    // Marmo chiaro con la greca d'oro sul bordo, una corona d'alloro intorno al centro.
    const { w, h, m, cx, cy, E, rad, sw } = c;
    const gold = '#B08A3A';
    const u = clamp(m * 0.0085, 1.7, 4);
    const ins = Math.max(E * 0.8, rad * 0.32);
    const band = 6 * u;
    const key = new Pen();
    const rails = new Pen();
    for (const s of sides(c, ins, band)) {
      const k = s.p();
      meander(k, s.len, u, u);
      key.d += k.d;
      rails.d += s.p().M(0, 0).L(s.len, 0).M(0, band).L(s.len, band).d;
    }
    const sq = new Pen();
    const ros = new Pen();
    for (const [x, y] of [
      [ins, ins],
      [w - ins - band, ins],
      [w - ins - band, h - ins - band],
      [ins, h - ins - band],
    ]) {
      sq.rrect(x, y, band, band, 0);
      for (let i = 0; i < 4; i++) ros.petal(x + band / 2, y + band / 2, x + band / 2 + polar(band * 0.36, i * 90 + 45)[0], y + band / 2 + polar(band * 0.36, i * 90 + 45)[1], band * 0.1);
    }
    const veins = new Pen();
    const rng = seeded(61);
    for (const [a, b] of [
      [
        [0, 0.3 * h],
        [0.4 * w, 0],
      ],
      [
        [0.65 * w, h],
        [w, 0.62 * h],
      ],
    ] as [P, P][]) {
      const pts: P[] = [];
      for (let i = 0; i <= 8; i++) pts.push([lerp(a[0], b[0], i / 8) + (rng() - 0.5) * m * 0.04, lerp(a[1], b[1], i / 8) + (rng() - 0.5) * m * 0.04]);
      veins.smooth(pts);
    }
    const lau = laurelGeom(cx, cy, m * 0.36, clamp(m * 0.07, 9, 36));
    return {
      layers: [
        line(veins.d, '#000000', 0.06, sw * 1.2),
        line(rails.d, gold, 0.55, sw * 0.8),
        line(key.d, gold, 0.6, u * 0.85, { cap: 'square' }),
        line(sq.d, gold, 0.55, sw * 0.8),
        fill(ros.d, gold, 0.55),
        line(lau.stem, gold, 0.22, sw * 0.8),
        fill(lau.leaves, gold, 0.2),
      ],
    };
  },
  crono: c => {
    // Il quadrante del tempo: anelli, minuti, ore in cifre romane, le lancette appena accennate.
    const { m, cx, cy, sw } = c;
    const R = m * 0.44;
    const rings = new Pen(cx, cy).circle(0, 0, R).circle(0, 0, R * 0.955).circle(0, 0, R * 0.66);
    const ticks = new Pen(cx, cy);
    const hours = new Pen(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = i * 6 - 90;
      if (i % 5) ticks.M(...polar(R * 0.955, a)).L(...polar(R * 0.925, a));
      else hours.M(...polar(R * 0.955, a)).L(...polar(R * 0.895, a));
    }
    const nums = new Pen();
    for (let k = 1; k <= 12; k++) {
      const a = k * 30 - 90;
      const [x, y] = polar(R * 0.79, a);
      const p = new Pen(cx + x, cy + y);
      romanGlyphs(p, k, R * 0.105);
      nums.d += p.d;
    }
    const hands = new Pen(cx, cy);
    hands.petal(0, 0, ...polar(R * 0.42, 10 * 30 - 90 + 5), R * 0.022);
    hands.petal(0, 0, ...polar(R * 0.6, 2 * 30 - 90), R * 0.016);
    hands.circle(0, 0, R * 0.03);
    return {
      layers: [
        line(rings.d, 0, 0.22, sw * 0.8, { emboss: true }),
        line(ticks.d, 0, 0.2, sw * 0.5),
        line(hours.d, 0, 0.3, sw * 1.2, { emboss: true }),
        line(nums.d, 0, 0.28, sw * 0.75, { emboss: true }),
        fill(hands.d, 0, 0.1),
      ],
    };
  },

  /* ---------- esclusivi */
  destino: c => {
    // Guilloché: anelli di linee intrecciate intorno al centro e lungo il bordo, che non finiscono mai.
    const { w, h, m, cx, cy, sw, E, rad } = c;
    const ringOf = (Rm: number, A: number, n: number, J: number) => {
      const p = new Pen();
      for (let j = 0; j < J; j++) {
        const pts: P[] = [];
        const N = n * 10;
        for (let i = 0; i < N; i++) {
          const t = (i / N) * 2 * Math.PI;
          const r = Rm + A * Math.sin(n * t + (j * 2 * Math.PI) / J);
          pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
        }
        p.poly(pts, true);
      }
      return p.d;
    };
    const outer = ringOf(m * 0.37, m * 0.05, 24, 5);
    const inner = ringOf(m * 0.29, m * 0.022, 36, 3);
    const ins = E * 1.5;
    const loop = new Loop(ins, ins, w - 2 * ins, h - 2 * ins, Math.max(2, rad - ins));
    const lam = loop.len / Math.max(12, Math.round(loop.len / (m * 0.07)));
    const A = E * 0.42;
    const border = new Pen();
    for (let j = 0; j < 4; j++) {
      const pts: P[] = [];
      for (let s = 0; s < loop.len; s += lam / 10) pts.push(loop.pt(s, A * Math.sin((2 * Math.PI * s) / lam + (j * Math.PI) / 2)));
      border.poly(pts, true);
    }
    return {
      layers: [
        line(outer, 0, 0.22, sw * 0.45),
        line(inner, 1, 0.2, sw * 0.4),
        line(new Pen(cx, cy).circle(0, 0, m * 0.425).circle(0, 0, m * 0.315).d, 0, 0.3, sw * 0.6),
        line(border.d, 1, 0.26, sw * 0.45),
        line(inset(c, ins - A - sw * 2) + inset(c, ins + A + sw * 2), 0, 0.38, sw * 0.6, { emboss: true }),
      ],
    };
  },
  maestro: c => {
    // Cornici d'oro doppie, una cornice interna con gli angoli rientranti, filigrana negli angoli.
    const { w, h, m, sw, E } = c;
    const S = clamp(m * 0.26, 40, 150);
    const sc = { lines: '', fills: '' };
    for (const p of [new Pen(0, 0, 0, 1, 1), new Pen(w, 0, 0, -1, 1), new Pen(w, h, 0, -1, -1), new Pen(0, h, 0, 1, -1)]) {
      const s = scrollCorner(p, S, E * 1.5);
      sc.lines += s.lines;
      sc.fills += s.fills;
    }
    const ins2 = E * 2.5;
    const cN = clamp(m * 0.05, 7, 26);
    const palm = new Pen();
    const k = clamp(m * 0.04, 6, 20);
    for (const [x, y, a] of [
      [w / 2, E * 1.45, 0],
      [w / 2, h - E * 1.45, 180],
      [E * 1.45, h / 2, 270],
      [w - E * 1.45, h / 2, 90],
    ] as [number, number, number][]) {
      const q = new Pen(x, y, a);
      q.petal(0, 0, 0, k * 1.3, k * 0.22);
      q.leaf(0, k * 0.1, k * 0.85, k * 0.95, k * 0.16).leaf(0, k * 0.1, -k * 0.85, k * 0.95, k * 0.16);
      q.circle(0, -k * 0.05, k * 0.14);
      palm.d += q.d;
    }
    return {
      layers: [
        line(inset(c, E), 0, 0.5, sw * 1.1, { emboss: true }),
        line(inset(c, E + sw * 3), 0, 0.38, sw * 0.5),
        line(notched(ins2 + S * 0.5, ins2 + S * 0.15, w - ins2 - S * 0.5, h - ins2 - S * 0.15, cN), 0, 0.26, sw * 0.6),
        line(sc.lines, 0, 0.55, sw * 0.85, { emboss: true }),
        fill(sc.fills + palm.d, 0, 0.5, { emboss: true }),
      ],
    };
  },
  leggenda: c => {
    // Raggi d'oro che partono dal centro, larghi e stretti alternati, e sfumano verso il bordo.
    const { w, h, m, cx, cy } = c;
    const r2 = Math.hypot(w, h) * 0.6;
    const rays = new Pen(cx, cy);
    for (let i = 0; i < 40; i++) {
      const a = i * 9;
      const hw = i % 2 ? 1.1 : 2.3;
      const R = i % 2 ? r2 * 0.72 : r2;
      rays.M(0, 0)
        .L(...polar(R, a - hw))
        .L(...polar(R, a + hw))
        .Z();
    }
    const fade: Fade = { cx, cy, r: r2, stops: [[0, 0], [0.1, 0.45], [0.4, 1], [1, 0.2]] };
    return {
      layers: [fill(rays.d, 0, 0.2, { fade }), glow(cx, cy, m * 0.3, m * 0.3, 1, 0.08)],
    };
  },
  alloro: c => {
    const { m, cx, cy, sw } = c;
    const l = laurelGeom(cx, cy, m * 0.38, clamp(m * 0.075, 10, 40));
    return { layers: [line(l.stem, 0, 0.32, sw * 0.9, { emboss: true }), fill(l.leaves, 0, 0.32, { emboss: true })] };
  },
  tempo: c => {
    // Anelli concentrici come ingranaggi: tacche, denti, archi, e due ruote che spuntano dagli angoli.
    const { w, h, m, cx, cy, sw } = c;
    const ticks = new Pen(cx, cy);
    for (let i = 0; i < 120; i++) {
      const a = i * 3;
      ticks.M(...polar(m * 0.45, a)).L(...polar(m * (i % 10 ? 0.437 : 0.42), a));
    }
    const arcs = new Pen(cx, cy).arc(0, 0, m * 0.485, -150, -30).arc(0, 0, m * 0.485, 30, 150);
    const corner = (x: number, y: number, R: number, rot: number) => {
      const p = new Pen();
      p.d += gear(x, y, R, 14, R * 0.14);
      p.circle(x, y, R * 0.36).circle(x, y, R * 0.12);
      for (let i = 0; i < 6; i++) p.M(...new Pen(x, y, rot).p(...polar(R * 0.36, i * 60))).L(...new Pen(x, y, rot).p(...polar(R * 0.82, i * 60)));
      p.circle(x, y, R * 0.82);
      return p.d;
    };
    const R = m * 0.12;
    return {
      layers: [
        line(new Pen(cx, cy).circle(0, 0, m * 0.45).d, 0, 0.3, sw * 0.8, { emboss: true }),
        line(ticks.d, 0, 0.25, sw * 0.5),
        line(gear(cx, cy, m * 0.39, 60, m * 0.014), 0, 0.26, sw * 0.6, { emboss: true }),
        line(new Pen(cx, cy).circle(0, 0, m * 0.34).d, 1, 0.3, sw * 0.6, { dash: `${sw * 2} ${sw * 4}` }),
        line(arcs.d, 1, 0.26, sw * 1.2),
        line(gear(cx, cy, m * 0.29, 36, m * 0.012), 0, 0.18, sw * 0.5),
        line(corner(R * 0.55, R * 0.55, R, 8) + corner(w - R * 0.55, h - R * 0.55, R, 20), 0, 0.3, sw * 0.7, { emboss: true }),
      ],
    };
  },
  immortali: c => {
    // Nero assoluto: una luce viola che sale dai bordi, una doppia cornice d'oro, stelle a otto punte.
    const { w, h, m, cx, cy, sw, E, rad } = c;
    const k = 1 - Math.SQRT1_2;
    const rr = Math.max(2, rad - E);
    const stars = new Pen();
    const R = clamp(m * 0.03, 4, 16);
    for (const [x, y] of [
      [E + rr * k, E + rr * k],
      [w - E - rr * k, E + rr * k],
      [w - E - rr * k, h - E - rr * k],
      [E + rr * k, h - E - rr * k],
    ])
      stars.star(x, y, R, R * 0.36, 8, -90);
    const small = new Pen();
    for (const [x, y] of [
      [cx, E],
      [cx, h - E],
      [E, cy],
      [w - E, cy],
    ])
      small.diamond(x, y, R * 0.5, R * 0.5);
    return {
      layers: [
        glow(cx, 0, w * 0.6, h * 0.12, 1, 0.24),
        glow(cx, h, w * 0.6, h * 0.12, 1, 0.24),
        glow(0, cy, w * 0.1, h * 0.5, 1, 0.2),
        glow(w, cy, w * 0.1, h * 0.5, 1, 0.2),
        line(inset(c, E) + inset(c, E + sw * 3), 0, 0.45, sw * 0.7, { emboss: true }),
        fill(stars.d + small.d, 0, 0.62, { emboss: true }),
        line(new Pen(cx, cy).star(0, 0, m * 0.36, m * 0.15, 8, -90).d, 0, 0.1, sw * 0.6),
        line(new Pen(cx, cy).circle(0, 0, m * 0.15).d, 0, 0.1, sw * 0.6),
      ],
    };
  },
};

/** Gli id dei disegni che si sanno fare. */
export const DESIGN_IDS = Object.keys(DESIGNS);

/** Disegna `id` per un panno w×h con angoli di raggio `rad`. Puro: le stesse misure danno lo stesso disegno. */
export function designOf(id: string | null, w: number, h: number, rad: number, paint: readonly string[] = []): Design | null {
  if (!id || !DESIGNS[id] || w < 8 || h < 8) return null;
  const m = Math.min(w, h);
  return DESIGNS[id]({
    w,
    h,
    rad,
    m,
    cx: w / 2,
    cy: h / 2,
    sw: clamp(m * 0.0052, 0.8, 2),
    E: clamp(m * 0.046, 5, 18),
    paint: [...paint],
  });
}
