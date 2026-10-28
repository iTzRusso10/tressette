// Il tavolo: un tavolino (la sponda: materiale, finiture, fregi) intorno a una grafica del panno (la
// superficie di gioco). Le due cose si scelgono e si combinano liberamente (catalog.ts).
import { memo, useId, useMemo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { itemOf, STARTER_TABLE, type ClothLook, type TableLook } from '@/meta/catalog';
import { designOf, type Ink } from './feltDesigns';
import { clamp, f, Loop, Pen, polar, roundRect, seeded, type P } from './feltGeometry';
import { RAIL, type Rect as R } from './layout';

/** La sponda intorno al panno, fuori dal rettangolo del panno (le carte non ci vanno mai sopra). */
export { RAIL };

const STARTER_FELT = 'verde-smeraldo';

/** L'aspetto di un tavolino dal suo id (la sponda di vetro se è sconosciuto o in arrivo). */
export function tableLook(id: string | undefined): TableLook {
  const item = id ? itemOf('table', id) : undefined;
  return item?.slot === 'table' && item.status === 'ready' ? item.look : STARTER_TABLE.look;
}

/** L'aspetto di una grafica del panno dal suo id (lo smeraldo se è sconosciuta o in arrivo). */
export function clothLook(id: string | undefined): ClothLook {
  const item = id ? itemOf('felt', id) : undefined;
  if (item?.slot === 'felt' && item.status === 'ready') return item.look;
  const starter = itemOf('felt', STARTER_FELT);
  return starter?.slot === 'felt' ? starter.look : { cloth: ['#14806A', '#0B4D42', '#06352E'], velvet: false, design: null };
}

/* ------------------------------------------------------------------ colori */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
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
/** a → b di t. */
export function mix(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
/** Luminanza relativa, 0 (nero) … 1 (bianco). */
export function luma(c: string) {
  const [r, g, b] = rgb(c).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Il panno come si disegna: quelli più scuri hanno il centro un po' più chiaro, così le carte bianche
 * e i nomi sul panno si staccano sempre e il panno sembra ancora un panno.
 */
function clothStops(look: ClothLook): [string, string, string] {
  const [c0, c1, c2] = look.cloth;
  const l = luma(c0);
  if (l >= 0.05) return look.cloth;
  const k = Math.min(0.22, (0.05 - l) * 5);
  return [mix(c0, '#FFFFFF', k), mix(c1, c0, 0.18), c2];
}

/* ------------------------------------------------------------------ la sponda: trame dei materiali */

interface RailCtx {
  W: number;
  H: number;
  B: number;
  R0: number;
  scale: number;
  look: TableLook;
  /** Il giro sulla linea di mezzo della sponda. */
  mid: Loop;
}

/** Venatura del legno: tratti lunghi lungo la sponda, a tre altezze. */
function grainPaths({ W, H, B, R0, scale }: RailCtx) {
  return [0.28, 0.52, 0.76].map((k, i) => ({
    d: roundRect(B * k, B * k, W - 2 * B * k, H - 2 * B * k, R0 - B * k),
    op: [0.4, 0.3, 0.36][i],
    dash: [
      [46, 9, 18, 5],
      [28, 6, 60, 8],
      [70, 7, 24, 10],
    ][i]
      .map(v => f(v * scale))
      .join(' '),
    off: f([0, 17, 40][i] * scale),
  }));
}

/** La radica: nodi a cerchi concentrici e fibre che ci girano intorno. */
function burlPath({ B, mid }: RailCtx) {
  const rng = seeded(71);
  const p = new Pen();
  const step = B * 3.2;
  for (let s = rng() * step; s < mid.len; s += step * (0.7 + rng() * 0.7)) {
    const [x, y] = mid.pt(s, (rng() - 0.5) * B * 0.5);
    const a = mid.angle(s) + (rng() - 0.5) * 40;
    const r = B * (0.22 + rng() * 0.2);
    for (let k = 1; k <= 3; k++) p.ellipse(x, y, r * k * 0.55 * 1.6, r * k * 0.55, a);
  }
  // Fibre mosse tra un nodo e l'altro.
  for (const n of [-0.3, 0.05, 0.32]) {
    const pts: P[] = [];
    for (let s = 0; s < mid.len; s += B * 0.9) pts.push(mid.pt(s, B * n + Math.sin(s / (B * 1.7) + n * 9) * B * 0.12));
    p.smooth(pts, true);
  }
  return p.d;
}

/** Il marmo: vene che attraversano la sponda in diagonale e una lunga che la percorre. */
function marblePath({ B, mid }: RailCtx) {
  const rng = seeded(83);
  const strong = new Pen();
  const soft = new Pen();
  const step = B * 4.5;
  for (let s = rng() * step; s < mid.len; s += step * (0.6 + rng() * 0.9)) {
    const pts: P[] = [];
    const tilt = (rng() - 0.5) * B * 3;
    for (let k = -1; k <= 1.01; k += 0.25) pts.push(mid.pt(s + tilt * k + (rng() - 0.5) * B * 0.5, (k * B) / 1.6));
    (rng() > 0.45 ? strong : soft).smooth(pts);
  }
  const long: P[] = [];
  for (let s = 0; s < mid.len; s += B * 1.2) long.push(mid.pt(s, Math.sin(s / (B * 5)) * B * 0.32 + Math.sin(s / (B * 1.9)) * B * 0.08));
  soft.smooth(long, true);
  return { strong: strong.d, soft: soft.d };
}

/** Il granito: puntini fitti di tre toni. */
function granitePaths({ B, mid }: RailCtx) {
  const rng = seeded(97);
  const out = [new Pen(), new Pen(), new Pen()];
  const n = Math.round((mid.len * B) / 7);
  for (let i = 0; i < n; i++) {
    const [x, y] = mid.pt(rng() * mid.len, (rng() - 0.5) * B);
    const r = B * (0.03 + rng() * rng() * 0.07);
    out[Math.floor(rng() * 3)].diamond(x, y, r, r * (0.7 + rng() * 0.6));
  }
  return out.map(p => p.d);
}

/** La scacchiera: due file di caselle lungo la sponda, alternate. */
function checkerPaths({ B, mid }: RailCtx) {
  const rows = B >= 7 ? 2 : 1;
  const cell = B / rows;
  const n = Math.round(mid.len / cell);
  const step = mid.len / n;
  const light = new Pen();
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < rows; r++) {
      if ((i + r) % 2) continue;
      const n0 = -B / 2 + r * cell;
      const n1 = n0 + cell;
      const s0 = i * step;
      const s1 = s0 + step;
      const sm = (s0 + s1) / 2;
      light.poly([mid.pt(s0, n0), mid.pt(sm, n0), mid.pt(s1, n0), mid.pt(s1, n1), mid.pt(sm, n1), mid.pt(s0, n1)], true);
    }
  }
  return light.d;
}

/** Le stelle sulla lacca o sul cosmo: puntini e qualche scintilla a quattro punte. */
function starPaths({ B, mid }: RailCtx) {
  const rng = seeded(109);
  const dots = new Pen();
  const sparks = new Pen();
  const n = Math.round(mid.len / (B * 0.85));
  for (let i = 0; i < n; i++) {
    const [x, y] = mid.pt(rng() * mid.len, (rng() - 0.5) * B * 0.8);
    const k = rng();
    if (k > 0.93) sparks.star(x, y, B * 0.3, B * 0.05, 4, -90);
    else dots.circle(x, y, B * (0.03 + k * k * 0.07));
  }
  return { dots: dots.d, sparks: sparks.d };
}

/** Il metallo spazzolato: tante righe sottili lungo la sponda, chiare e scure. */
function brushedPaths({ W, H, B, R0, scale }: RailCtx) {
  const n = Math.max(4, Math.round(B / 0.85));
  const out: { d: string; light: boolean; dash: string }[] = [];
  const rng = seeded(127);
  for (let i = 1; i < n; i++) {
    const k = (B * i) / n;
    out.push({
      d: roundRect(k, k, W - 2 * k, H - 2 * k, R0 - k),
      light: i % 2 === 0,
      dash: `${f((30 + rng() * 120) * scale)} ${f((4 + rng() * 14) * scale)}`,
    });
  }
  return out;
}

/** Il cristallo: faccette che tagliano la sponda di traverso. */
function facetPath({ B, mid }: RailCtx) {
  const p = new Pen();
  const step = B * 1.9;
  const n = Math.round(mid.len / step);
  const st = mid.len / n;
  for (let i = 0; i < n; i++) {
    const s = i * st;
    p.M(...mid.pt(s, -B / 2)).L(...mid.pt(s + st * 0.5, B / 2));
    p.M(...mid.pt(s + st * 0.5, B / 2)).L(...mid.pt(s + st, -B / 2));
  }
  return p.d;
}

/* ------------------------------------------------------------------ i fregi sugli angoli */

/**
 * Un fregio in un medaglione di raggio r centrato in (0,0): corona, alloro, orologio, diamante,
 * stella. Restituisce i pezzi da disegnare nel metallo, nella pietra e le linee incise.
 */
function emblemParts(kind: NonNullable<TableLook['emblem']>, x: number, y: number, r: number) {
  const metal = new Pen(x, y);
  const gem = new Pen(x, y);
  const engrave = new Pen(x, y);
  const k = r * 0.78;
  switch (kind) {
    case 'crown': {
      // Fascia, tre punte con le perle, la pietra al centro della fascia.
      const by = k * 0.42;
      metal.M(-k * 0.72, by).L(-k * 0.8, -k * 0.35).L(-k * 0.38, k * 0.02).L(0, -k * 0.62).L(k * 0.38, k * 0.02).L(k * 0.8, -k * 0.35).L(k * 0.72, by).Z();
      metal.rrect(-k * 0.76, by - k * 0.02, k * 1.52, k * 0.26, k * 0.06);
      metal.circle(-k * 0.8, -k * 0.45, k * 0.12).circle(0, -k * 0.74, k * 0.13).circle(k * 0.8, -k * 0.45, k * 0.12);
      gem.diamond(0, by + k * 0.11, k * 0.13, k * 0.1);
      engrave.M(-k * 0.6, by - k * 0.1).L(k * 0.6, by - k * 0.1);
      break;
    }
    case 'laurel': {
      // Due rami d'alloro che si chiudono in alto, una pietra in mezzo.
      for (const s of [-1, 1]) {
        const at = (t: number): P => polar(k * 0.78, 90 + s * (25 + t * 125)) as P;
        const pts: P[] = [];
        for (let i = 0; i <= 8; i++) pts.push(at(i / 8));
        engrave.smooth(pts);
        for (let i = 0; i < 4; i++) {
          const t = 0.12 + i * 0.25;
          const [px, py] = at(t);
          const [qx, qy] = at(t + 0.08);
          const len = Math.hypot(qx - px, qy - py) || 1;
          const ux = (qx - px) / len;
          const uy = (qy - py) / len;
          for (const o of [1, -1]) {
            const nx = -uy * o * s;
            const ny = ux * o * s;
            metal.leaf(px, py, px + (ux * 0.7 + nx * 0.7) * k * 0.42, py + (uy * 0.7 + ny * 0.7) * k * 0.42, k * 0.09);
          }
        }
      }
      gem.circle(0, 0, k * 0.22);
      break;
    }
    case 'clock': {
      // Il quadrante: anello, le ore, XII III VI IX in cifre romane se c'è posto, le lancette.
      engrave.circle(0, 0, k * 0.96);
      const roman = r >= 6;
      for (let i = 0; i < 12; i++) {
        const a = i * 30 - 90;
        if (roman && i % 3 === 0) continue;
        engrave.M(...polar(k * 0.86, a)).L(...polar(k * (i % 3 ? 0.72 : 0.62), a));
      }
      if (roman) {
        for (const [n, a] of [
          [12, -90],
          [3, 0],
          [6, 90],
          [9, 180],
        ]) {
          const [px, py] = polar(k * 0.66, a);
          const g = new Pen(x + px, y + py);
          // Le cifre romane, con le grazie: piccolissime, ma vere.
          romanTiny(g, n, k * 0.26);
          engrave.d += g.d;
        }
      }
      metal.petal(0, 0, ...polar(k * 0.42, -150), k * 0.07);
      metal.petal(0, 0, ...polar(k * 0.6, -60), k * 0.05);
      gem.circle(0, 0, k * 0.12);
      break;
    }
    case 'diamond': {
      // Un brillante visto di lato: corona, tavola e padiglione, con le faccette.
      const t = -k * 0.42;
      const g0 = -k * 0.12;
      const b = k * 0.78;
      gem.M(-k * 0.42, t).L(k * 0.42, t).L(k * 0.82, g0).L(0, b).L(-k * 0.82, g0).Z();
      engrave.M(-k * 0.82, g0).L(k * 0.82, g0);
      engrave.M(-k * 0.42, t).L(-k * 0.28, g0).L(0, t).L(k * 0.28, g0).L(k * 0.42, t);
      engrave.M(-k * 0.28, g0).L(0, b).L(k * 0.28, g0);
      break;
    }
    case 'star': {
      metal.star(0, 0, k * 0.98, k * 0.42, 5, -90);
      gem.circle(0, 0, k * 0.2);
      engrave.star(0, 0, k * 0.98, k * 0.42, 5, -90);
      break;
    }
  }
  return { metal: metal.d, gem: gem.d, engrave: engrave.d };
}

/** Le cifre romane XII, III, VI, IX in una penna, centrate, alte gh. */
function romanTiny(p: Pen, n: number, gh: number) {
  const s = n === 12 ? 'XII' : n === 3 ? 'III' : n === 6 ? 'VI' : 'IX';
  const wd = (ch: string) => (ch === 'I' ? 0.16 : 0.46) * gh;
  const gap = 0.14 * gh;
  const tot = [...s].reduce((a, ch) => a + wd(ch), 0) + gap * (s.length - 1);
  let x = -tot / 2;
  const t = -gh / 2;
  const b = gh / 2;
  for (const ch of s) {
    const W = wd(ch);
    if (ch === 'I') p.M(x + W / 2, t).L(x + W / 2, b);
    else if (ch === 'V') p.M(x, t).L(x + W / 2, b).L(x + W, t);
    else p.M(x, t).L(x + W, b).M(x + W, t).L(x, b);
    x += W + gap;
  }
  return p;
}

/* ------------------------------------------------------------------ il disegno */

export interface FeltArtProps {
  /** Id del tavolino (catalog.ts, posto «table»). */
  table: string;
  /** Id della grafica del panno (catalog.ts, posto «felt»). */
  felt: string;
  /** Misura esterna, sponda compresa. */
  width: number;
  height: number;
  /** 1 sul tavolo; più piccolo nelle anteprime, così sponda, angoli e linee restano in proporzione. */
  scale?: number;
  /** Disegna la sponda (false: solo un pezzo di panno). */
  rim?: boolean;
  /** Rende il disegno più marcato, per le anteprime piccole dove sparirebbe. */
  boost?: number;
}

const RAIL_LIGHT: Record<TableLook['rail'], { top: number; bottom: number }> = {
  glass: { top: 0.25, bottom: 0.05 },
  wood: { top: 0.2, bottom: 0.24 },
  leather: { top: 0.22, bottom: 0.26 },
  metal: { top: 0.34, bottom: 0.3 },
  stone: { top: 0.26, bottom: 0.24 },
  crystal: { top: 0.4, bottom: 0.12 },
  lacquer: { top: 0.3, bottom: 0.34 },
  cosmic: { top: 0.14, bottom: 0.32 },
};

/**
 * Il tavolo disegnato in un riquadro, come un vero tavolo da gioco: la sponda del tavolino (vetro,
 * legno, cuoio, metallo, pietra, cristallo, lacca o cielo, con angoli, borchie, fregi e alone) intorno
 * al panno, con la sua trama, la cucitura, la luce della lampada e il disegno della grafica.
 * Niente posizione né ombra esterna: vedi Felt.
 */
function FeltArtImpl({ table, felt, width, height, scale = 1, rim = true, boost = 1 }: FeltArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (s: string) => `${s}${uid}`;
  const look = tableLook(table);
  const cl = clothLook(felt);
  const B = rim ? Math.max(2, RAIL * scale) : 0;
  const w = width - 2 * B;
  const h = height - 2 * B;
  const rad = Math.min(34 * scale, w * 0.09);
  const R0 = rad + B;
  const cloth = clothStops(cl);
  const rail = look.rail;
  const glass = rail === 'glass';
  const crystal = rail === 'crystal';
  const metal = rail === 'metal';
  // Dettagli che in un'anteprima minuscola sarebbero solo rumore.
  const fine = scale >= 0.42;
  const railFine = B >= 4.5;
  // Le trame del materiale reggono anche su una sponda più sottile (le guarnizioni no).
  const texFine = B >= 3.4;

  /* ---------------- il panno */
  // Il disegno dipende solo dalla grafica e dalle misure: si ricalcola solo se cambiano.
  const design = useMemo(() => {
    const c = clothLook(felt);
    return designOf(c.design, w, h, rad, c.paint ?? []);
  }, [felt, w, h, rad]);
  // Il disegno impresso è un tono più chiaro del panno; la forza dipende da quanto è scuro il panno.
  const ink = mix(cloth[0], '#FFFFFF', 0.45);
  const dark = luma(cloth[1]) < 0.02;
  const baseOp = (dark ? 0.27 : 0.23) * (cl.velvet ? 1.1 : 1) * boost;
  const paintBoost = Math.min(1.5, 1 + (boost - 1) * 0.55);
  const emboss = Math.max(0.6, clamp(Math.min(w, h) * 0.0052, 0.8, 2) * 0.7);

  /* ---------------- la sponda */
  const ring = useMemo(() => (B ? roundRect(0, 0, width, height, R0) + roundRect(B, B, w, h, rad) : ''), [B, width, height, R0, w, h, rad]);
  const railCtx = useMemo<RailCtx | null>(
    () => (B && texFine ? { W: width, H: height, B, R0, scale, look, mid: new Loop(B / 2, B / 2, width - B, height - B, R0 - B / 2) } : null),
    [B, texFine, width, height, R0, scale, look],
  );
  const tex = look.texture;
  const texture = useMemo(() => {
    if (!railCtx) return null;
    switch (tex) {
      case 'grain':
        return { grain: grainPaths(railCtx) };
      case 'burl':
        return { burl: burlPath(railCtx), grain: grainPaths(railCtx).slice(1) };
      case 'marble':
        return { marble: marblePath(railCtx) };
      case 'granite':
        return { granite: granitePaths(railCtx) };
      case 'checker':
        return { checker: checkerPaths(railCtx) };
      case 'stars':
        return { stars: starPaths(railCtx) };
      case 'brushed':
        return { brushed: brushedPaths(railCtx) };
      default:
        return {};
    }
  }, [railCtx, tex]);
  const facets = useMemo(() => (railCtx && crystal ? facetPath(railCtx) : ''), [railCtx, crystal]);
  const hasStuds = !!look.studs;
  const studs = useMemo(() => {
    if (!B || !hasStuds || !railFine) return [];
    // Borchie distribuite sui tratti dritti della sponda.
    const out: P[] = [];
    const gap = Math.max(16, 30 * scale);
    const c = B / 2;
    const k = R0 + gap * 0.35;
    const run = (x0: number, y0: number, x1: number, y1: number) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / gap));
      for (let i = 0; i <= n; i++) out.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    };
    run(k, c, width - k, c);
    run(k, height - c, width - k, height - c);
    run(c, k, c, height - k);
    run(width - c, k, width - c, height - k);
    return out;
  }, [B, hasStuds, railFine, width, height, R0, scale]);

  // Metallo di guarnizioni e borchie: il filetto, o un tono più chiaro della sponda.
  const metalTone = look.trim ?? mix(look.rim[0], '#FFFFFF', 0.25);
  const metalDark = mix(look.rim[2], '#000000', 0.35);
  const gemColor = look.gem ?? cloth[0];
  const thread = mix(cloth[0], '#FFFFFF', 0.5);
  const leatherThread = mix(look.rim[0], '#FFFFFF', 0.55);
  const grainInk = mix(look.rim[2], '#000000', 0.35);
  const sw = Math.max(0.6, scale);
  const weave = Math.max(2.5, 3.2 * scale);
  const trimIn = Math.max(2.5, 6 * scale);
  // La cucitura corre un dito dentro la sponda, o dentro il filetto di metallo.
  const seamIn = look.trim ? trimIn + Math.max(3, 5 * scale) : Math.max(3, 7 * scale);
  const light = RAIL_LIGHT[rail];
  // Le vene del marmo: chiare su pietra scura (d'oro se c'è il filetto), scure su pietra chiara.
  const railDark = luma(look.rim[1]) < 0.12;
  const veinInk = railDark ? (look.trim ?? mix(look.rim[0], '#FFFFFF', 0.5)) : luma(look.rim[1]) < 0.4 ? mix(look.rim[0], '#FFFFFF', 0.55) : mix(look.rim[2], '#3A3440', 0.45);

  /* ---------------- strati del disegno */
  const layerColor = (c: Ink): string => {
    if (c === 'ink') return ink;
    if (c === 'shade') return '#000000';
    if (typeof c === 'number') return cl.paint?.[c] ?? cl.paint?.[0] ?? ink;
    return c;
  };
  const layerOp = (c: Ink, op: number) => Math.min(0.92, c === 'ink' || c === 'shade' ? baseOp * op : op * paintBoost);
  const defsExtra: ReactElement[] = [];
  const drawn: ReactElement[] = [];
  design?.layers.forEach((L, i) => {
    const color = layerColor(L.ink);
    const op = layerOp(L.ink, L.op);
    if (L.k === 'glow') {
      const gid = id(`g${i}`);
      defsExtra.push(
        <RadialGradient key={gid} id={gid} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={op} />
          <Stop offset="0.45" stopColor={color} stopOpacity={op * 0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>,
      );
      drawn.push(
        <Ellipse
          key={i}
          cx={L.cx}
          cy={L.cy}
          rx={Math.max(0.5, L.rx)}
          ry={Math.max(0.5, L.ry)}
          fill={`url(#${gid})`}
          transform={L.rot ? `rotate(${f(L.rot)} ${f(L.cx)} ${f(L.cy)})` : undefined}
        />,
      );
      return;
    }
    let paint = color;
    let alpha = op;
    if (L.fade) {
      const gid = id(`f${i}`);
      defsExtra.push(
        <RadialGradient key={gid} id={gid} cx={L.fade.cx} cy={L.fade.cy} r={L.fade.r} fx={L.fade.cx} fy={L.fade.cy} gradientUnits="userSpaceOnUse">
          {L.fade.stops.map(([o, k], j) => (
            <Stop key={j} offset={o} stopColor={color} stopOpacity={op * k} />
          ))}
        </RadialGradient>,
      );
      paint = `url(#${gid})`;
      alpha = 1;
    }
    const shape = (fillC: string, a: number, key: string | number) =>
      L.k === 'line' ? (
        <Path
          key={key}
          d={L.d}
          fill="none"
          stroke={fillC}
          strokeOpacity={a}
          strokeWidth={L.w}
          strokeLinecap={L.cap ?? 'round'}
          strokeLinejoin="round"
          strokeDasharray={L.dash}
        />
      ) : (
        <Path key={key} d={L.d} fill={fillC} fillOpacity={a} />
      );
    if (L.emboss) {
      // Impresso nel panno: una linea scura appena sotto, quella chiara sopra.
      drawn.push(
        <G key={`e${i}`} transform={`translate(0 ${f(emboss)})`}>
          {shape('#000000', Math.min(0.5, op * 0.6), 0)}
        </G>,
      );
    }
    drawn.push(shape(paint, alpha, i));
  });

  // L'alone del tavolino lungo il bordo interno.
  const glowC = look.glow;
  const emblem = look.emblem;
  const cornerPts: [number, number, number][] = [
    [R0, R0, 180],
    [width - R0, R0, 270],
    [width - R0, height - R0, 0],
    [R0, height - R0, 90],
  ];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={look.rim[0]} stopOpacity={glass ? 0.95 : crystal ? 0.9 : 1} />
          <Stop offset="0.5" stopColor={look.rim[1]} stopOpacity={glass ? 0.6 : crystal ? 0.66 : 1} />
          <Stop offset="1" stopColor={look.rim[2]} stopOpacity={glass ? 0.42 : crystal ? 0.58 : 1} />
        </LinearGradient>
        {/* La sponda è tonda: luce sopra, ombra sotto. */}
        <LinearGradient id={id('volume')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={light.top} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={light.bottom} />
        </LinearGradient>
        {/* Il metallo lucido prende due bande di luce. */}
        <LinearGradient id={id('shine')} x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.16" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="0.28" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="0.8" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        {/* Il riflesso della lacca e della pietra lucida: una riga di luce che si spegne verso il basso. */}
        <LinearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.04} />
        </LinearGradient>
        {tex === 'iridescent' ? (
          <LinearGradient id={id('iri')} x1="0" y1="0.2" x2="1" y2="0.8">
            {['#FF8AD8', '#B58CFF', '#7FD0FF', '#9FFFE0', '#FFE38A', '#FF8AD8'].map((c, i) => (
              <Stop key={i} offset={i / 5} stopColor={c} stopOpacity={0.5} />
            ))}
          </LinearGradient>
        ) : null}
        {rail === 'cosmic' ? (
          <RadialGradient id={id('neb')} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={look.glow ?? look.rim[0]} stopOpacity={0.55} />
            <Stop offset="1" stopColor={look.glow ?? look.rim[0]} stopOpacity={0} />
          </RadialGradient>
        ) : null}
        <RadialGradient id={id('cloth')} cx="50%" cy="38%" rx="72%" ry="64%">
          <Stop offset="0" stopColor={cloth[0]} />
          <Stop offset={cl.velvet ? '0.62' : '0.55'} stopColor={cloth[1]} />
          <Stop offset="1" stopColor={cloth[2]} />
        </RadialGradient>
        {/* La luce di una lampada sopra il tavolo. */}
        <RadialGradient id={id('lamp')} cx="50%" cy="30%" rx="46%" ry="34%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={cl.velvet ? 0.12 : 0.09} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        {/* La trama del tessuto: fili sottili nei due versi, appena visibili. Sul velluto ancora meno. */}
        <Pattern id={id('weave')} x={B} y={B} width={weave} height={weave} patternUnits="userSpaceOnUse">
          <Line x1={0} y1={weave} x2={weave} y2={0} stroke="#FFFFFF" strokeOpacity={cl.velvet ? 0.035 : 0.06} strokeWidth={0.7} />
          <Line x1={0} y1={0} x2={weave} y2={weave} stroke="#000000" strokeOpacity={cl.velvet ? 0.05 : 0.08} strokeWidth={0.7} />
        </Pattern>
        <ClipPath id={id('clip')}>
          <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} />
        </ClipPath>
        {B ? (
          <ClipPath id={id('ring')}>
            <Path d={ring} fillRule="evenodd" clipRule="evenodd" />
          </ClipPath>
        ) : null}
        {cl.velvet ? (
          <>
            {/* Velluto: un riflesso largo e morbido dall'alto e un bordo più profondo. */}
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
        {emblem && railFine ? (
          <RadialGradient id={id('medal')} cx="38%" cy="32%" rx="70%" ry="70%">
            <Stop offset="0" stopColor={mix(metalTone, '#FFFFFF', 0.45)} />
            <Stop offset="0.55" stopColor={metalTone} />
            <Stop offset="1" stopColor={mix(metalTone, '#000000', 0.35)} />
          </RadialGradient>
        ) : null}
        {defsExtra}
      </Defs>

      {/* ------------------------------------------------ la sponda */}
      {B ? (
        <>
          <Path d={ring} fillRule="evenodd" fill={`url(#${id('rim')})`} />
          {texture?.checker ? (
            // L'intarsio: caselle scure su tutta la sponda, quelle chiare sopra.
            <>
              <Path d={ring} fillRule="evenodd" fill={mix(look.rim[1], look.rim[2], 0.4)} />
              <Path d={texture.checker} fill={look.rim[0]} clipPath={`url(#${id('ring')})`} />
            </>
          ) : null}
          {texFine ? (
            <G clipPath={`url(#${id('ring')})`}>
              {rail === 'cosmic'
                ? // Nubi di luce lungo la sponda.
                  [0.08, 0.3, 0.52, 0.74, 0.92].map((t, i) => {
                    const [x, y] = railCtx!.mid.pt(railCtx!.mid.len * t);
                    return <Ellipse key={i} cx={x} cy={y} rx={B * 4.5} ry={B * 2.2} fill={`url(#${id('neb')})`} opacity={i % 2 ? 0.7 : 1} />;
                  })
                : null}
              {texture?.grain?.map((g, i) => (
                <Path
                  key={i}
                  d={g.d}
                  fill="none"
                  stroke={grainInk}
                  strokeWidth={sw * 0.7}
                  strokeLinecap="round"
                  strokeOpacity={g.op}
                  strokeDasharray={g.dash}
                  strokeDashoffset={g.off}
                />
              ))}
              {texture?.burl ? <Path d={texture.burl} fill="none" stroke={grainInk} strokeOpacity={0.32} strokeWidth={sw * 0.55} /> : null}
              {texture?.marble ? (
                <>
                  <Path d={texture.marble.soft} fill="none" stroke={veinInk} strokeOpacity={0.32} strokeWidth={sw * 0.5} />
                  <Path d={texture.marble.strong} fill="none" stroke={veinInk} strokeOpacity={0.2} strokeWidth={sw * 1.6} />
                  <Path d={texture.marble.strong} fill="none" stroke={veinInk} strokeOpacity={0.6} strokeWidth={sw * 0.55} />
                </>
              ) : null}
              {texture?.granite ? (
                <>
                  <Path d={texture.granite[0]} fill="#000000" fillOpacity={0.45} />
                  <Path d={texture.granite[1]} fill="#FFFFFF" fillOpacity={0.4} />
                  <Path d={texture.granite[2]} fill={mix(look.rim[0], '#FFFFFF', 0.3)} fillOpacity={0.5} />
                </>
              ) : null}
              {texture?.brushed?.map((b, i) => (
                <Path
                  key={i}
                  d={b.d}
                  fill="none"
                  stroke={b.light ? '#FFFFFF' : '#000000'}
                  strokeOpacity={b.light ? 0.16 : 0.1}
                  strokeWidth={0.5}
                  strokeDasharray={b.dash}
                />
              ))}
              {texture?.stars ? (
                <>
                  <Path d={texture.stars.dots} fill={look.trim ?? '#FFFFFF'} fillOpacity={0.75} />
                  <Path d={texture.stars.sparks} fill="#FFFFFF" fillOpacity={0.85} />
                </>
              ) : null}
              {facets ? <Path d={facets} fill="none" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={0.6} /> : null}
            </G>
          ) : null}
          {tex === 'iridescent' ? <Path d={ring} fillRule="evenodd" fill={`url(#${id('iri')})`} /> : null}
          <Path d={ring} fillRule="evenodd" fill={`url(#${id('volume')})`} />
          {metal ? <Path d={ring} fillRule="evenodd" fill={`url(#${id('shine')})`} /> : null}
          {(rail === 'lacquer' || rail === 'stone' || crystal || rail === 'cosmic') && texFine ? (
            // Lucido: una riga di luce sul dorso della sponda.
            <Path
              d={roundRect(B * 0.3, B * 0.3, width - B * 0.6, height - B * 0.6, R0 - B * 0.3)}
              fill="none"
              stroke={`url(#${id('gloss')})`}
              strokeOpacity={rail === 'stone' ? 0.5 : crystal ? 0.9 : 0.75}
              strokeWidth={Math.max(0.6, B * 0.1)}
            />
          ) : null}
          {rail === 'leather' && texFine ? (
            // Cuoio imbottito, cucito a metà.
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
            // Una riga incisa a metà del metallo.
            <Path d={roundRect(B / 2, B / 2, width - B, height - B, R0 - B / 2)} fill="none" stroke={metalDark} strokeOpacity={0.45} strokeWidth={sw * 0.8} />
          ) : null}
          {/* Il bordo esterno prende la luce; il labbro interno scende nel panno. */}
          <Path
            d={roundRect(0.5, 0.5, width - 1, height - 1, R0 - 0.5)}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={glass ? 0.9 : crystal ? 0.8 : rail === 'cosmic' ? 0.22 : 0.35}
            strokeWidth={1}
          />
          <Path
            d={roundRect(B - 0.5, B - 0.5, w + 1, h + 1, rad + 0.5)}
            fill="none"
            stroke={crystal ? '#FFFFFF' : '#000000'}
            strokeOpacity={glass ? 0.18 : crystal ? 0.55 : 0.42}
            strokeWidth={1}
          />
        </>
      ) : null}

      {/* ------------------------------------------------ il panno */}
      <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('cloth')})`} />
      {fine ? <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('weave')})`} /> : null}
      <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('lamp')})`} />
      {drawn.length ? (
        <G clipPath={`url(#${id('clip')})`}>
          <G transform={`translate(${B} ${B})`}>{drawn}</G>
        </G>
      ) : null}
      {cl.velvet ? (
        <>
          <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('sheen')})`} />
          <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill={`url(#${id('vignette')})`} />
        </>
      ) : null}
      {B && look.trim ? (
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
        // La cucitura dove il panno è fissato al tavolo.
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
      {/* La sponda fa un'ombra morbida sul panno. */}
      {B ? (
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
            strokeOpacity={cl.velvet ? 0.3 : 0.24}
            strokeWidth={Math.max(2, 5 * scale)}
          />
          {glowC ? (
            // L'alone: una luce che sale dal bordo interno, solo lungo il bordo.
            <>
              <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill="none" stroke={glowC} strokeOpacity={0.1} strokeWidth={Math.max(6, 26 * scale)} />
              <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill="none" stroke={glowC} strokeOpacity={0.16} strokeWidth={Math.max(3, 11 * scale)} />
              <Rect x={B} y={B} width={w} height={h} rx={rad} ry={rad} fill="none" stroke={glowC} strokeOpacity={0.5} strokeWidth={Math.max(1, 2.4 * scale)} />
            </>
          ) : null}
        </G>
      ) : null}
      {B && glowC ? (
        <Path d={roundRect(B - 0.5, B - 0.5, w + 1, h + 1, rad + 0.5)} fill="none" stroke={mix(glowC, '#FFFFFF', 0.35)} strokeOpacity={0.85} strokeWidth={1} />
      ) : null}

      {/* ------------------------------------------------ guarnizioni sulla sponda */}
      {studs.map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y + 0.4} r={B * 0.22} fill="#000000" fillOpacity={0.35} />
          <Circle cx={x} cy={y} r={B * 0.2} fill={metalTone} />
          <Circle cx={x - B * 0.06} cy={y - B * 0.06} r={B * 0.08} fill="#FFFFFF" fillOpacity={0.8} />
        </G>
      ))}
      {B && (look.corners || emblem) && railFine
        ? cornerPts.map(([cx, cy, a0], i) => {
            // Una guarnizione di metallo su ogni angolo della sponda, con un rombo o un fregio nel mezzo.
            const r = R0 - B / 2;
            const p = (a: number) => polar(r, a).map((v, k) => v + (k ? cy : cx)) as [number, number];
            const [x0, y0] = p(a0 + 6);
            const [x1, y1] = p(a0 + 84);
            const [mx, my] = p(a0 + 45);
            const arc = `M${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y1)}`;
            const k = B * 0.95;
            const dia = new Pen(mx, my, a0 + 45).diamond(0, 0, k * 0.7, k).d;
            const em = emblem ? emblemParts(emblem, mx, my, B * 0.86) : null;
            return (
              <G key={i}>
                {look.corners ? (
                  <>
                    <Path d={arc} fill="none" stroke={metalDark} strokeOpacity={0.85} strokeWidth={B * 0.95 + 1.6} strokeLinecap="round" />
                    <Path d={arc} fill="none" stroke={metalTone} strokeWidth={B * 0.95} strokeLinecap="round" />
                    <Path d={arc} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={B * 0.2} strokeLinecap="round" />
                    {[
                      [x0, y0],
                      [x1, y1],
                    ].map(([x, y], j) => (
                      <Circle key={j} cx={x} cy={y} r={B * 0.16} fill={metalDark} fillOpacity={0.7} />
                    ))}
                  </>
                ) : null}
                {em ? (
                  // Il fregio: un medaglione di metallo con il disegno in rilievo e la pietra.
                  <>
                    <Circle cx={mx} cy={my + 0.6} r={B * 0.9} fill="#000000" fillOpacity={0.35} />
                    <Circle cx={mx} cy={my} r={B * 0.86} fill={mix(look.rim[2], '#000000', 0.45)} stroke={`url(#${id('medal')})`} strokeWidth={B * 0.16} />
                    <Path d={em.metal} fill={`url(#${id('medal')})`} stroke={metalDark} strokeOpacity={0.5} strokeWidth={0.35} />
                    <Path d={em.engrave} fill="none" stroke={emblem === 'diamond' ? '#FFFFFF' : metalTone} strokeOpacity={emblem === 'diamond' ? 0.75 : 0.9} strokeWidth={0.45} strokeLinecap="round" />
                    {em.gem ? <Path d={em.gem} fill={gemColor} fillOpacity={emblem === 'diamond' ? 0.75 : 1} stroke={emblem === 'diamond' ? '#FFFFFF' : metalDark} strokeWidth={0.35} /> : null}
                    {emblem === 'diamond' ? <Path d={em.engrave} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.35} /> : null}
                    <Path d={new Pen(mx, my).arc(0, 0, B * 0.7, 200, 250).d} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={Math.max(0.5, B * 0.08)} strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <Path d={dia} fill={metalTone} stroke={metalDark} strokeWidth={1} />
                    {/* Una pietra nel mezzo, del colore scelto o del panno. */}
                    <Circle cx={mx} cy={my} r={B * 0.26} fill={gemColor} stroke={metalDark} strokeWidth={0.6} />
                    <Circle cx={mx - B * 0.08} cy={my - B * 0.08} r={B * 0.09} fill="#FFFFFF" fillOpacity={0.85} />
                  </>
                )}
              </G>
            );
          })
        : null}
      {B && look.corners && !railFine
        ? // In miniatura: solo la pietra negli angoli.
          cornerPts.map(([cx, cy, a0], i) => {
            const [mx, my] = polar(R0 - B / 2, a0 + 45).map((v, k) => v + (k ? cy : cx));
            return <Circle key={i} cx={mx} cy={my} r={Math.max(0.9, B * 0.42)} fill={metalTone} stroke={metalDark} strokeWidth={0.4} />;
          })
        : null}
    </Svg>
  );
}

export const FeltArt = memo(FeltArtImpl);

/** Il tavolo in partita: il tavolino con il suo panno. Disegnato una volta, non si muove mai. */
export function Felt({ rect, table = STARTER_TABLE.id, felt = STARTER_FELT }: { rect: R; table?: string; felt?: string }) {
  const rad = Math.min(34, rect.w * 0.09);
  const W = rect.w + RAIL * 2;
  const H = rect.h + RAIL * 2;
  return (
    <View
      testID="fixed-felt"
      pointerEvents="none"
      style={[styles.wrap, { left: rect.x - RAIL, top: rect.y - RAIL, width: W, height: H, borderRadius: rad + RAIL }]}
    >
      <FeltArt table={table} felt={felt} width={W} height={H} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', boxShadow: '0px 22px 46px rgba(40,8,70,0.45), 0px 3px 8px rgba(40,8,70,0.3)' },
});
