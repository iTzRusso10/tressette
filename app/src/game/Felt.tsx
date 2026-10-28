import { memo, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { itemById, type FeltLook } from '@/meta/shop';
import { RAIL, type Rect as R } from './layout';

/** The rail around the cloth, outside the felt rectangle (the cards never go over it). */
export { RAIL };

const SMERALDO: FeltLook = {
  cloth: ['#14806A', '#0B4D42', '#06352E'],
  rim: ['#FFFFFF', '#FFE3F0', '#FFFFFF'],
  trim: null,
  velvet: false,
  rail: 'glass',
};

/** The look of a felt from its id in the shop (emerald when unknown). */
export function feltLook(id: string | undefined): FeltLook {
  const item = id ? itemById(id) : undefined;
  return item?.slot === 'felt' ? item.look : SMERALDO;
}

/* ------------------------------------------------------------------ colors */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex([r, g, b]: [number, number, number]) {
  return (
    '#' +
    [r, g, b]
      .map(v =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
/** a → b by t. */
function mix(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
/** Relative luminance, 0 (black) … 1 (white). */
function luma(c: string) {
  const [r, g, b] = rgb(c).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The cloth as drawn: the darkest felts (Reggia, Lava, Galleria…) get a slightly lighter center, so the
 * white cards and the names on the felt always stand out and the cloth still reads as cloth.
 */
function clothStops(look: FeltLook): [string, string, string] {
  const [c0, c1, c2] = look.cloth;
  const l = luma(c0);
  if (l >= 0.05) return look.cloth;
  const k = Math.min(0.22, (0.05 - l) * 5);
  return [mix(c0, '#FFFFFF', k), mix(c1, c0, 0.18), c2];
}

/* ------------------------------------------------------------------ designs on the felt */

/** Path strings of a design, in the cloth's own coordinates (0,0 is its top left corner). */
interface Design {
  /** Lines. */
  line: string;
  /** Small solid shapes: dots, diamonds. */
  fill: string;
  /** Line width. */
  sw: number;
  /** How strong the design is (the repeated ones are lighter). */
  k: number;
}

const f = (n: number) => Math.round(n * 100) / 100;

/** A tiny path builder that can rotate and move what it draws. */
class Pen {
  d = '';
  constructor(
    private ox = 0,
    private oy = 0,
    private a = 0,
  ) {}
  private p(x: number, y: number) {
    const c = Math.cos(this.a);
    const s = Math.sin(this.a);
    return `${f(this.ox + x * c - y * s)} ${f(this.oy + x * s + y * c)}`;
  }
  M(x: number, y: number) {
    this.d += `M${this.p(x, y)}`;
    return this;
  }
  L(x: number, y: number) {
    this.d += `L${this.p(x, y)}`;
    return this;
  }
  Q(x1: number, y1: number, x: number, y: number) {
    this.d += `Q${this.p(x1, y1)} ${this.p(x, y)}`;
    return this;
  }
  C(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.d += `C${this.p(x1, y1)} ${this.p(x2, y2)} ${this.p(x, y)}`;
    return this;
  }
  Z() {
    this.d += 'Z';
    return this;
  }
  circle(x: number, y: number, r: number) {
    this.M(x - r, y);
    this.d += `A${f(r)} ${f(r)} 0 1 0 ${this.p(x + r, y)}A${f(r)} ${f(r)} 0 1 0 ${this.p(x - r, y)}Z`;
    return this;
  }
  /** A pointed petal (a lens) from (x0,y0) to (x1,y1), `w` wide in the middle. */
  petal(x0: number, y0: number, x1: number, y1: number, w: number) {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / len) * w;
    const ny = ((x1 - x0) / len) * w;
    return this.M(x0, y0)
      .Q(mx + nx, my + ny, x1, y1)
      .Q(mx - nx, my - ny, x0, y0)
      .Z();
  }
  diamond(x: number, y: number, rx: number, ry = rx) {
    return this.M(x, y - ry)
      .L(x + rx, y)
      .L(x, y + ry)
      .L(x - rx, y)
      .Z();
  }
  rrect(x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    this.M(x + rr, y)
      .L(x + w - rr, y)
      .Q(x + w, y, x + w, y + rr)
      .L(x + w, y + h - rr)
      .Q(x + w, y + h, x + w - rr, y + h);
    return this.L(x + rr, y + h)
      .Q(x, y + h, x, y + h - rr)
      .L(x, y + rr)
      .Q(x, y, x + rr, y)
      .Z();
  }
}

const polar = (r: number, deg: number): [number, number] => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];

/** Draws a design for a cloth `w`×`h` with corner radius `rad`. Pure: the same sizes give the same drawing. */
export function designOf(id: string, w: number, h: number, rad: number): Design | null {
  const m = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const sw = Math.max(0.8, Math.min(2, m * 0.0052));
  const line = new Pen();
  const fill = new Pen();
  switch (id) {
    case 'filetto': {
      // A double line a finger from the edge, with a diamond in the middle of each side.
      const d = Math.max(5, Math.min(18, m * 0.046));
      const g = Math.max(2.5, sw * 2.4);
      line.rrect(d, d, w - 2 * d, h - 2 * d, Math.max(3, rad - d));
      line.rrect(d + g, d + g, w - 2 * (d + g), h - 2 * (d + g), Math.max(2, rad - d - g));
      const k = Math.max(2.2, m * 0.012);
      fill.diamond(cx, d + g / 2, k * 1.6, k).diamond(cx, h - d - g / 2, k * 1.6, k);
      fill.diamond(d + g / 2, cy, k, k * 1.6).diamond(w - d - g / 2, cy, k, k * 1.6);
      return { line: line.d, fill: fill.d, sw: sw * 0.9, k: 1 };
    }
    case 'rosone': {
      const R = m * 0.3;
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
      return { line: c.d, fill: dots.d, sw, k: 1 };
    }
    case 'maiolica': {
      // Tiles of the cloister: a diamond in each tile, a four-petal flower inside, a dot where tiles meet.
      const s = Math.max(22, m / 4.2);
      const nx = Math.ceil(w / s / 2) + 1;
      const ny = Math.ceil(h / s / 2) + 1;
      for (let i = -nx; i <= nx; i++) {
        for (let j = -ny; j <= ny; j++) {
          const x = cx + i * s;
          const y = cy + j * s;
          line.diamond(x, y, s / 2);
          for (let q = 0; q < 4; q++) {
            const [x0, y0] = polar(s * 0.07, q * 90);
            const [x1, y1] = polar(s * 0.34, q * 90);
            line.petal(x + x0, y + y0, x + x1, y + y1, s * 0.075);
          }
          fill.circle(x, y, s * 0.045);
          fill.circle(x + s / 2, y + s / 2, s * 0.06);
        }
      }
      return { line: line.d, fill: fill.d, sw: sw * 0.8, k: 0.72 };
    }
    case 'onde': {
      // Rows of soft waves, every other row shifted by half a wave.
      const sp = Math.max(12, m / 8.5);
      const L = sp * 1.7;
      const A = sp * 0.2;
      const rows = Math.ceil(h / sp / 2) + 1;
      for (let j = -rows; j <= rows; j++) {
        const y = cy + j * sp;
        const shift = (Math.abs(j) % 2) * (L / 2);
        let x = cx - Math.ceil((cx + L) / L) * L - shift;
        line.M(x, y);
        let up = true;
        while (x < w + L) {
          line.Q(x + L / 4, y + (up ? -A : A), x + L / 2, y);
          x += L / 2;
          up = !up;
        }
      }
      return { line: line.d, fill: '', sw: sw * 0.85, k: 0.75 };
    }
    case 'sole': {
      // A Vietri sun: a disc with rings, flames that alternate long and short, a ring of dots.
      const r1 = m * 0.11;
      const R = m * 0.36;
      const c = new Pen(cx, cy);
      c.circle(0, 0, r1)
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
        c.M(bx0, by0).Q(mx0, my0, tx, ty).Q(mx1, my1, bx1, by1);
      }
      const dots = new Pen(cx, cy);
      dots.circle(0, 0, r1 * 0.2);
      for (let i = 0; i < 32; i++) {
        const [x, y] = polar(R * 1.1, i * 11.25);
        dots.circle(x, y, Math.max(0.9, m * 0.004));
      }
      return { line: c.d, fill: dots.d, sw, k: 1 };
    }
    case 'vesuvio': {
      // The volcano seen from the bay: Somma and the cone, the plume, the horizon and a few waves.
      const V = Math.min(w * 0.82, m * 1.05);
      const by = cy + V * 0.13;
      const c = new Pen(cx, by);
      c.M(-V / 2, 0)
        .C(-V * 0.32, -V * 0.04, -V * 0.2, -V * 0.22, -V * 0.13, -V * 0.29)
        .Q(-V * 0.09, -V * 0.32, -V * 0.05, -V * 0.28)
        .Q(-V * 0.02, -V * 0.25, V * 0.02, -V * 0.29)
        .L(V * 0.06, -V * 0.335)
        .L(V * 0.12, -V * 0.335)
        .C(V * 0.2, -V * 0.22, V * 0.33, -V * 0.05, V / 2, 0);
      // The plume, a slow curl.
      c.M(V * 0.09, -V * 0.35)
        .C(V * 0.06, -V * 0.42, V * 0.14, -V * 0.45, V * 0.12, -V * 0.51)
        .C(V * 0.1, -V * 0.57, V * 0.2, -V * 0.6, V * 0.28, -V * 0.56);
      c.M(-V * 0.58, 0).L(V * 0.58, 0);
      for (const [x0, y0, len] of [
        [-V * 0.36, V * 0.05, V * 0.22],
        [V * 0.08, V * 0.05, V * 0.26],
        [-V * 0.14, V * 0.1, V * 0.24],
      ]) {
        const n = 4;
        const L = len / n;
        c.M(x0, y0);
        for (let i = 0; i < n; i++) c.Q(x0 + L * (i + 0.5), y0 + (i % 2 ? 1 : -1) * V * 0.008, x0 + L * (i + 1), y0);
      }
      const dots = new Pen(cx, by);
      dots.circle(V * 0.34, -V * 0.5, V * 0.01).circle(V * 0.39, -V * 0.47, V * 0.007);
      return { line: c.d, fill: dots.d, sw, k: 1 };
    }
    case 'corno': {
      // The cornicello: a horn that tapers and curls to one side, with its gold cap, inside a ring.
      const Hc = m * 0.44;
      const w0 = Hc * 0.22;
      const base = Hc * 0.4;
      type P = [number, number];
      const bez = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
        const u = 1 - t;
        return [
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ];
      };
      const tip: P = [w0 * 2.3, base - Hc * 0.98];
      const outer: [P, P, P, P] = [[-w0 / 2, base], [-w0 * 0.7, base - Hc * 0.5], [-w0 * 0.2, base - Hc * 0.98], tip];
      const inner: [P, P, P, P] = [[w0 / 2, base], [w0 * 0.42, base - Hc * 0.4], [w0 * 0.9, base - Hc * 0.78], tip];
      const c = new Pen(cx - w0 * 0.7, cy, (-8 * Math.PI) / 180);
      c.M(...outer[0])
        .C(...outer[1], ...outer[2], ...outer[3])
        .C(...inner[2], ...inner[1], ...inner[0])
        .Z();
      // The ribs follow the curve and get closer towards the tip.
      for (const t of [0.12, 0.23, 0.33, 0.42]) {
        const [ox, oy] = bez(...outer, t);
        const [ix, iy] = bez(...inner, t * 0.96);
        const mx = (ox + ix) / 2;
        const my = (oy + iy) / 2 + w0 * 0.12 * (1 - t);
        c.M(ox, oy).Q(mx, my, ix, iy);
      }
      // A highlight along the horn.
      const hl: [P, P, P, P] = [
        [-w0 * 0.12, base - Hc * 0.6],
        [w0 * 0.05, base - Hc * 0.75],
        [w0 * 0.4, base - Hc * 0.86],
        [w0 * 0.85, base - Hc * 0.93],
      ];
      c.M(...hl[0]).C(...hl[1], ...hl[2], ...hl[3]);
      // The cap: a band with a little crown edge, and the ring to hang it.
      const capH = Hc * 0.09;
      c.rrect(-w0 * 0.64, base, w0 * 1.28, capH, Hc * 0.02);
      c.M(-w0 * 0.64, base + capH * 0.5).L(w0 * 0.64, base + capH * 0.5);
      c.circle(0, base + capH + w0 * 0.22, w0 * 0.2);
      const ring = new Pen(cx, cy);
      ring.circle(0, -Hc * 0.05, Hc * 0.66);
      const dots = new Pen(cx, cy - Hc * 0.05);
      for (let i = 0; i < 4; i++) {
        const [x, y] = polar(Hc * 0.66, i * 90 - 90);
        dots.diamond(x, y, Hc * 0.035);
      }
      for (let i = 0; i < 4; i++) {
        const [x, y] = polar(Hc * 0.66, i * 90 - 45);
        dots.circle(x, y, Hc * 0.012);
      }
      return { line: c.d + ring.d, fill: dots.d, sw, k: 1 };
    }
    case 'stemma': {
      // A shield with a crown, between two laurel branches.
      const Ws = m * 0.24;
      const Hs = Ws * 1.18;
      const top = cy - Hs * 0.42;
      const c = new Pen(cx, top);
      const shield = (k: number, dy: number) => {
        const hw = (Ws / 2) * k;
        const hh = Hs * k;
        c.M(-hw, dy)
          .L(hw, dy)
          .L(hw, dy + hh * 0.5)
          .C(hw, dy + hh * 0.8, hw * 0.45, dy + hh * 0.92, 0, dy + hh)
          .C(-hw * 0.45, dy + hh * 0.92, -hw, dy + hh * 0.8, -hw, dy + hh * 0.5)
          .Z();
      };
      shield(1, 0);
      shield(0.82, Hs * 0.075);
      // A band across the shield.
      c.M(-Ws * 0.41, Hs * 0.38)
        .L(Ws * 0.41, Hs * 0.38)
        .M(-Ws * 0.41, Hs * 0.48)
        .L(Ws * 0.41, Hs * 0.48);
      // The crown.
      const cw = Ws * 0.78;
      const cb = -Hs * 0.08;
      const ch = Hs * 0.3;
      c.M(-cw / 2, cb)
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
      // The laurels: a curved stem on each side with leaves along it.
      for (const side of [-1, 1]) {
        const R = Ws * 0.95;
        const ox = 0;
        const oy = Hs * 0.42;
        const a0 = 100;
        const a1 = 200;
        const pt = (a: number): [number, number] => {
          const [x, y] = polar(R, a);
          return [ox + side * -x, oy + y * 0.95];
        };
        const [sx, sy] = pt(a0);
        c.M(sx, sy);
        for (let a = a0 + 5; a <= a1; a += 5) {
          const [x, y] = pt(a);
          c.L(x, y);
        }
        for (let i = 0; i < 7; i++) {
          const a = a0 + 12 + i * 13;
          const [x, y] = pt(a);
          const [tx, ty] = pt(a + 4);
          const dx = tx - x;
          const dy = ty - y;
          const len = Math.hypot(dx, dy) || 1;
          const L = Ws * 0.2;
          // One leaf outward, one inward, both pointing along the stem.
          for (const out of [1, -1]) {
            const nx = (-dy / len) * side * out;
            const ny = (dx / len) * side * out;
            c.petal(x, y, x + (dx / len) * L * 0.7 + nx * L * 0.7, y + (dy / len) * L * 0.7 + ny * L * 0.7, L * 0.16);
          }
        }
      }
      return { line: c.d, fill: dots.d, sw, k: 1 };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ the drawing */

/** A rounded rectangle with true circular corners, as a path (so rings line up with <Rect rx>). */
function roundRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const a = (ex: number, ey: number) => `A${f(rr)} ${f(rr)} 0 0 1 ${f(ex)} ${f(ey)}`;
  return (
    `M${f(x + rr)} ${f(y)}H${f(x + w - rr)}${a(x + w, y + rr)}V${f(y + h - rr)}${a(x + w - rr, y + h)}` +
    `H${f(x + rr)}${a(x, y + h - rr)}V${f(y + rr)}${a(x + rr, y)}Z`
  );
}

/** Points evenly spread along the straight parts of the rail's middle line, for the studs. */
function studPoints(W: number, H: number, R0: number, c: number, gap: number): [number, number][] {
  const out: [number, number][] = [];
  const run = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / gap));
    for (let i = 0; i <= n; i++) out.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const k = R0 + gap * 0.35;
  run(k, c, W - k, c);
  run(k, H - c, W - k, H - c);
  run(c, k, c, H - k);
  run(W - c, k, W - c, H - k);
  return out;
}

export interface FeltArtProps {
  /** Felt id (shop.ts). */
  felt: string;
  /** Design id (shop.ts), 'nessuno' for plain cloth. */
  pattern: string;
  /** Outer size, rail included. */
  width: number;
  height: number;
  /** 1 on the table; smaller in previews, so rail, corners and lines keep their proportions. */
  scale?: number;
  /** Draw the rail (false: just a piece of cloth). */
  rim?: boolean;
  /** Makes the design stronger, for small previews where it would disappear. */
  boost?: number;
}

/**
 * The felt drawn in a box, like a real card table: a rail (glass, padded leather, wood or polished
 * metal, with corners and studs on the rarer ones) around a cloth with its weave, a stitched seam,
 * the light from above and the chosen design pressed into it. No position, no shadow: see Felt.
 */
function FeltArtImpl({ felt, pattern, width, height, scale = 1, rim = true, boost = 1 }: FeltArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (s: string) => `${s}${uid}`;
  const look = feltLook(felt);
  const B = rim ? Math.max(2, RAIL * scale) : 0;
  const w = width - 2 * B;
  const h = height - 2 * B;
  const rad = Math.min(34 * scale, w * 0.09);
  const R0 = rad + B;
  const cloth = clothStops(look);
  const glass = look.rail === 'glass';
  const metal = look.rail === 'metal';
  // Details that would only be noise in a tiny preview.
  const fine = scale >= 0.42;
  const railFine = B >= 4.5;

  const design = useMemo(() => designOf(pattern, w, h, rad), [pattern, w, h, rad]);
  // The design is drawn in a lighter tone of the cloth (or in the trim's metal), pressed into the felt.
  const ink = look.trim ? mix(look.trim, cloth[0], 0.2) : mix(cloth[0], '#FFFFFF', 0.45);
  const dark = luma(cloth[1]) < 0.02;
  const op = Math.min(0.9, (dark ? 0.27 : 0.23) * (look.velvet ? 1.1 : 1) * boost * (design?.k ?? 1));
  const emboss = Math.max(0.6, (design?.sw ?? 1) * 0.7);

  const ring = useMemo(() => (B ? roundRect(0, 0, width, height, R0) + roundRect(B, B, w, h, rad) : ''), [B, width, height, R0, w, h, rad]);
  const hasStuds = !!look.studs;
  const studs = useMemo(
    () => (B && hasStuds && railFine ? studPoints(width, height, R0, B / 2, Math.max(16, 30 * scale)) : []),
    [B, hasStuds, railFine, width, height, R0, scale],
  );

  // Metal fittings and studs: the trim's metal, or a lighter tone of the rail.
  const metalTone = look.trim ?? mix(look.rim[0], '#FFFFFF', 0.25);
  const metalDark = mix(look.rim[2], '#000000', 0.35);
  // The seam: a lighter thread on the cloth, a darker one on leather.
  const thread = mix(cloth[0], '#FFFFFF', 0.5);
  const leatherThread = mix(look.rim[0], '#FFFFFF', 0.55);
  const grain = mix(look.rim[2], '#000000', 0.35);
  const sw = Math.max(0.6, scale);
  const weave = Math.max(2.5, 3.2 * scale);
  const trimIn = Math.max(2.5, 6 * scale);
  // The seam runs a finger inside the rail, or inside the metal trim.
  const seamIn = look.trim ? trimIn + Math.max(3, 5 * scale) : Math.max(3, 7 * scale);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={look.rim[0]} stopOpacity={glass ? 0.95 : 1} />
          <Stop offset="0.5" stopColor={look.rim[1]} stopOpacity={glass ? 0.6 : 1} />
          <Stop offset="1" stopColor={look.rim[2]} stopOpacity={glass ? 0.42 : 1} />
        </LinearGradient>
        {/* The rail is rounded: light on top, shade below. */}
        <LinearGradient id={id('volume')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={glass ? 0.25 : metal ? 0.34 : 0.2} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={glass ? 0.05 : metal ? 0.3 : 0.24} />
        </LinearGradient>
        {/* Polished metal catches two bands of light. */}
        <LinearGradient id={id('shine')} x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.16" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="0.28" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="0.8" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={id('cloth')} cx="50%" cy="38%" rx="72%" ry="64%">
          <Stop offset="0" stopColor={cloth[0]} />
          <Stop offset={look.velvet ? '0.62' : '0.55'} stopColor={cloth[1]} />
          <Stop offset="1" stopColor={cloth[2]} />
        </RadialGradient>
        {/* The light of a lamp over the table. */}
        <RadialGradient id={id('lamp')} cx="50%" cy="30%" rx="46%" ry="34%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={look.velvet ? 0.12 : 0.09} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        {/* The weave of the cloth: fine threads both ways, barely there. On velvet, softer still. */}
        <Pattern id={id('weave')} x={B} y={B} width={weave} height={weave} patternUnits="userSpaceOnUse">
          <Line x1={0} y1={weave} x2={weave} y2={0} stroke="#FFFFFF" strokeOpacity={look.velvet ? 0.035 : 0.06} strokeWidth={0.7} />
          <Line x1={0} y1={0} x2={weave} y2={weave} stroke="#000000" strokeOpacity={look.velvet ? 0.05 : 0.08} strokeWidth={0.7} />
        </Pattern>
        <ClipPath id={id('clip')}>
          <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} />
        </ClipPath>
        {look.velvet ? (
          <>
            {/* Velvet: a wide, soft sheen from above and a deeper edge. */}
            <RadialGradient id={id('sheen')} cx="50%" cy="22%" rx="62%" ry="48%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.13} />
              <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0.04} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={id('vignette')} cx="50%" cy="46%" rx="72%" ry="70%">
              <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.34} />
            </RadialGradient>
          </>
        ) : null}
      </Defs>

      {/* ------------------------------------------------ the rail */}
      {B ? (
        <>
          <Path d={ring} fillRule="evenodd" fill={`url(#${id('rim')})`} />
          <Path d={ring} fillRule="evenodd" fill={`url(#${id('volume')})`} />
          {metal ? <Path d={ring} fillRule="evenodd" fill={`url(#${id('shine')})`} /> : null}
          {look.rail === 'wood' && railFine ? (
            // The grain of the wood, running along the rail.
            <G fill="none" stroke={grain} strokeWidth={sw * 0.7} strokeLinecap="round">
              <Path
                d={roundRect(B * 0.28, B * 0.28, width - B * 0.56, height - B * 0.56, R0 - B * 0.28)}
                strokeOpacity={0.4}
                strokeDasharray={`${f(46 * scale)} ${f(9 * scale)} ${f(18 * scale)} ${f(5 * scale)}`}
              />
              <Path
                d={roundRect(B * 0.52, B * 0.52, width - B * 1.04, height - B * 1.04, R0 - B * 0.52)}
                strokeOpacity={0.3}
                strokeDasharray={`${f(28 * scale)} ${f(6 * scale)} ${f(60 * scale)} ${f(8 * scale)}`}
                strokeDashoffset={f(17 * scale)}
              />
              <Path
                d={roundRect(B * 0.76, B * 0.76, width - B * 1.52, height - B * 1.52, R0 - B * 0.76)}
                strokeOpacity={0.36}
                strokeDasharray={`${f(70 * scale)} ${f(7 * scale)} ${f(24 * scale)} ${f(10 * scale)}`}
                strokeDashoffset={f(40 * scale)}
              />
            </G>
          ) : null}
          {look.rail === 'leather' && railFine ? (
            // Padded leather, stitched along the middle.
            <Path
              d={roundRect(B / 2, B / 2, width - B, height - B, R0 - B / 2)}
              fill="none"
              stroke={leatherThread}
              strokeOpacity={0.85}
              strokeWidth={sw * 0.9}
              strokeDasharray={`${f(3.4 * scale)} ${f(2.6 * scale)}`}
              strokeLinecap="round"
            />
          ) : null}
          {metal && railFine ? (
            // An engraved line along the middle of the metal.
            <Path d={roundRect(B / 2, B / 2, width - B, height - B, R0 - B / 2)} fill="none" stroke={metalDark} strokeOpacity={0.45} strokeWidth={sw * 0.8} />
          ) : null}
          {/* The outer edge catches the light; the inner lip drops into the cloth. */}
          <Path d={roundRect(0.5, 0.5, width - 1, height - 1, R0 - 0.5)} fill="none" stroke="#FFFFFF" strokeOpacity={glass ? 0.9 : 0.35} strokeWidth={1} />
          <Path d={roundRect(B - 0.5, B - 0.5, w + 1, h + 1, rad + 0.5)} fill="none" stroke="#000000" strokeOpacity={glass ? 0.18 : 0.42} strokeWidth={1} />
        </>
      ) : null}

      {/* ------------------------------------------------ the cloth */}
      <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('cloth')})`} />
      {fine ? <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('weave')})`} /> : null}
      <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('lamp')})`} />
      {design ? (
        <G clipPath={`url(#${id('clip')})`}>
          <G transform={`translate(${B} ${B})`}>
            {/* Pressed into the cloth: a dark line just below, the light line on top. */}
            <G opacity={Math.min(0.5, op * 0.6)} transform={`translate(0 ${f(emboss)})`}>
              <Path d={design.line} fill="none" stroke="#000000" strokeWidth={design.sw} strokeLinecap="round" strokeLinejoin="round" />
              {design.fill ? <Path d={design.fill} fill="#000000" /> : null}
            </G>
            <G opacity={op}>
              <Path d={design.line} fill="none" stroke={ink} strokeWidth={design.sw} strokeLinecap="round" strokeLinejoin="round" />
              {design.fill ? <Path d={design.fill} fill={ink} /> : null}
            </G>
          </G>
        </G>
      ) : null}
      {look.velvet ? (
        <>
          <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('sheen')})`} />
          <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('vignette')})`} />
        </>
      ) : null}
      {look.trim ? (
        <Rect
          x={B + trimIn}
          y={B + trimIn}
          width={w - 2 * trimIn}
          height={h - 2 * trimIn}
          rx={Math.max(2, rad - trimIn)}
          ry={Math.max(2, rad - trimIn)}
          fill="none"
          stroke={look.trim}
          strokeOpacity={0.85}
          strokeWidth={Math.max(0.75, 1.3 * scale)}
        />
      ) : null}
      {fine && rim ? (
        // The seam where the cloth is stitched to the table.
        <Rect
          x={B + seamIn}
          y={B + seamIn}
          width={w - 2 * seamIn}
          height={h - 2 * seamIn}
          rx={Math.max(2, rad - seamIn)}
          ry={Math.max(2, rad - seamIn)}
          fill="none"
          stroke={look.trim ? mix(look.trim, cloth[1], 0.35) : thread}
          strokeOpacity={look.trim ? 0.4 : 0.3}
          strokeWidth={sw}
          strokeDasharray={`${f(4.5 * scale)} ${f(3.5 * scale)}`}
          strokeLinecap="round"
        />
      ) : null}
      {/* The rail casts a soft shadow on the cloth. */}
      <G clipPath={`url(#${id('clip')})`}>
        <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill="none" stroke="#000" strokeOpacity={0.1} strokeWidth={Math.max(4, 16 * scale)} />
        <Rect
          x={B}
          y={B}
          width={w}
          height={h}
          rx={rad}
          ry={rad}
          fill="none"
          stroke="#000"
          strokeOpacity={look.velvet ? 0.3 : 0.24}
          strokeWidth={Math.max(2, 5 * scale)}
        />
      </G>

      {/* ------------------------------------------------ fittings on the rail */}
      {studs.map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y + 0.4} r={B * 0.22} fill="#000000" fillOpacity={0.35} />
          <Circle cx={x} cy={y} r={B * 0.2} fill={metalTone} />
          <Circle cx={x - B * 0.06} cy={y - B * 0.06} r={B * 0.08} fill="#FFFFFF" fillOpacity={0.8} />
        </G>
      ))}
      {B && look.corners && railFine
        ? [
            [R0, R0, 180],
            [width - R0, R0, 270],
            [width - R0, height - R0, 0],
            [R0, height - R0, 90],
          ].map(([cx, cy, a0], i) => {
            // A metal fitting over each corner of the rail, with a diamond in the middle.
            const r = R0 - B / 2;
            const p = (a: number) => polar(r, a).map((v, k) => v + (k ? cy : cx)) as [number, number];
            const [x0, y0] = p(a0 + 6);
            const [x1, y1] = p(a0 + 84);
            const [mx, my] = p(a0 + 45);
            const arc = `M${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y1)}`;
            const k = B * 0.95;
            const dia = new Pen(mx, my, ((a0 + 45) * Math.PI) / 180).diamond(0, 0, k * 0.7, k).d;
            return (
              <G key={i}>
                <Path d={arc} fill="none" stroke={metalDark} strokeOpacity={0.85} strokeWidth={B * 0.95 + 1.6} strokeLinecap="round" />
                <Path d={arc} fill="none" stroke={metalTone} strokeWidth={B * 0.95} strokeLinecap="round" />
                <Path d={arc} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={B * 0.2} strokeLinecap="round" />
                {[
                  [x0, y0],
                  [x1, y1],
                ].map(([x, y], j) => (
                  <Circle key={j} cx={x} cy={y} r={B * 0.16} fill={metalDark} fillOpacity={0.7} />
                ))}
                <Path d={dia} fill={metalTone} stroke={metalDark} strokeWidth={1} />
                {/* A stone in the middle, the colour of the cloth. */}
                <Circle cx={mx} cy={my} r={B * 0.26} fill={cloth[0]} stroke={metalDark} strokeWidth={0.6} />
                <Circle cx={mx - B * 0.08} cy={my - B * 0.08} r={B * 0.09} fill="#FFFFFF" fillOpacity={0.85} />
              </G>
            );
          })
        : null}
    </Svg>
  );
}

export const FeltArt = memo(FeltArtImpl);

/** The table: the felt with its rail and the chosen design. Drawn once, never moves. */
export function Felt({ rect, felt = 'smeraldo', pattern = 'nessuno' }: { rect: R; felt?: string; pattern?: string }) {
  const rad = Math.min(34, rect.w * 0.09);
  const W = rect.w + RAIL * 2;
  const H = rect.h + RAIL * 2;
  return (
    <View
      testID="fixed-felt"
      pointerEvents="none"
      style={[styles.wrap, { left: rect.x - RAIL, top: rect.y - RAIL, width: W, height: H, borderRadius: rad + RAIL }]}
    >
      <FeltArt felt={felt} pattern={pattern} width={W} height={H} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', boxShadow: '0px 22px 46px rgba(40,8,70,0.45), 0px 3px 8px rgba(40,8,70,0.3)' },
});
