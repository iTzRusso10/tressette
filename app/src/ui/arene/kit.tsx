// Gli attrezzi comuni delle scene delle arene: colori, geometria, prospettiva ed elementi ricorrenti
// (tavolo da gioco, sedie, lampadari, candele, colonne, stelle, nuvole).
//
// Ogni scena è disegnata in una tela 600×200 con il soggetto nel quadrato centrale (x 200…400): con
// preserveAspectRatio "slice" si vede tutta a 3:1 e solo il centro a 1:1. Niente animazioni e niente
// Math.random: dove serve il caso, una sequenza fissa (`seeded`).

import type { ReactNode } from 'react';
import { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export const W = 600;
export const H = 200;

/* ------------------------------------------------------------------ colori */

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Da `a` a `b`: t = 0 è `a`, t = 1 è `b`. */
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** La versione notturna di un colore: tiene la luminosità (compressa) e quasi niente della tinta. */
export function night(hex: string) {
  const [r, g, b] = rgb(hex);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return mix(mix('#0D0A22', '#8A84BE', Math.pow(l, 1.2)), hex, 0.08);
}

/* ------------------------------------------------------------------ geometria */

export type Pt = [number, number];
export const r1 = (n: number) => Math.round(n * 10) / 10;

/** Più rettangoli [x, y, w, h] in un solo path. */
export const rects = (rs: number[][]) => rs.map(([x, y, w, h]) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}z`).join('');

/** Finestre o porte ad arco tondo [x, y, w, h]: rettangolo con il semicerchio in alto. */
export const arches = (rs: number[][]) =>
  rs
    .map(([x, y, w, h]) => {
      const r = w / 2;
      return `M${r1(x)} ${r1(y + h)}V${r1(y + r)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(x + w)} ${r1(y + r)}V${r1(y + h)}z`;
    })
    .join('');

/** Archi a sesto acuto (gotici) [x, y, w, h]: la punta è in y. */
export const pointed = (rs: number[][]) =>
  rs
    .map(([x, y, w, h]) => {
      const s = y + w * 0.866;
      return `M${r1(x)} ${r1(y + h)}V${r1(s)}A${r1(w)} ${r1(w)} 0 0 1 ${r1(x + w / 2)} ${r1(y)}A${r1(w)} ${r1(w)} 0 0 1 ${r1(x + w)} ${r1(s)}V${r1(y + h)}z`;
    })
    .join('');

/** Archi inflessi alla veneziana [x, y, w, h]: la punta a goccia è in y. */
export const ogees = (rs: number[][]) =>
  rs
    .map(([x, y, w, h]) => {
      const m = x + w / 2;
      return (
        `M${r1(x)} ${r1(y + h)}V${r1(y + w * 0.62)}` +
        `C${r1(x)} ${r1(y + w * 0.2)} ${r1(m - w * 0.12)} ${r1(y + w * 0.3)} ${r1(m)} ${r1(y)}` +
        `C${r1(m + w * 0.12)} ${r1(y + w * 0.3)} ${r1(x + w)} ${r1(y + w * 0.2)} ${r1(x + w)} ${r1(y + w * 0.62)}V${r1(y + h)}z`
      );
    })
    .join('');

/** Più cerchi [x, y, r] in un solo path. */
export const dots = (cs: number[][]) =>
  cs.map(([x, y, r]) => `M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0z`).join('');

/** Più ellissi [x, y, rx, ry] in un solo path. */
export const ovals = (es: number[][]) =>
  es.map(([x, y, rx, ry]) => `M${r1(x - rx)} ${r1(y)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0z`).join('');

/** Poligono chiuso. */
export const poly = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';

/** Profilo di tetti a gradini da x0 fino al fondo: ogni passo è [larghezza, altezza del tetto]. */
export function skyline(x0: number, base: number, steps: [number, number][]) {
  let d = `M${x0} ${base}`;
  let x = x0;
  for (const [w, y] of steps) {
    d += `V${y}H${x + w}`;
    x += w;
  }
  return d + `V${base}Z`;
}

/** Un punto sulla curva quadratica p0 → p2 con controllo c. */
export const quad = (p0: Pt, c: Pt, p2: Pt, t: number): Pt => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1],
];

/** Una sequenza di numeri pseudo-casuali fissa (le scene sono sempre uguali). */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Stelline sparse in un riquadro [x0, y0, x1, y1]: [x, y, r] con un seme fisso. */
export function starField(seed: number, n: number, box: [number, number, number, number], rMin = 0.5, rMax = 1.3) {
  const rnd = seeded(seed);
  return Array.from({ length: n }, () => [box[0] + rnd() * (box[2] - box[0]), box[1] + rnd() * (box[3] - box[1]), rMin + rnd() * rnd() * (rMax - rMin)]);
}

/** Scintille a quattro punte [x, y, r]. */
export const sparkles = (list: number[][]) =>
  list
    .map(([x, y, r]) => `M${r1(x)} ${r1(y - r)}Q${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)}Q${r1(x)} ${r1(y)} ${r1(x)} ${r1(y + r)}Q${r1(x)} ${r1(y)} ${r1(x - r)} ${r1(y)}Q${r1(x)} ${r1(y)} ${r1(x)} ${r1(y - r)}Z`)
    .join('');

/** Raggi a ventaglio da un centro: n spicchi larghi `spread` radianti ciascuno, da a0 ad a1. */
export function rays(cx: number, cy: number, r: number, n: number, a0: number, a1: number, spread: number) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n;
    d += poly([
      [cx, cy],
      [cx + Math.cos(a - spread / 2) * r, cy + Math.sin(a - spread / 2) * r],
      [cx + Math.cos(a + spread / 2) * r, cy + Math.sin(a + spread / 2) * r],
    ]);
  }
  return d;
}

/** Un anello d'arco di pietra [x, y, w, h] spesso t (va disegnato con fillRule="evenodd"). */
export const archRing = (x: number, y: number, w: number, h: number, t: number) => arches([[x, y, w, h]]) + arches([[x + t, y + t, w - 2 * t, h - t]]);

/* ------------------------------------------------------------------ prospettiva */

/**
 * Una stanza in prospettiva centrale, dalla sezione davanti `f` (fuori dalla tela) alla parete di fondo
 * `b`, entrambe [x0, y0, x1, y1]. P(t, u, v) è il punto alla profondità t (0 davanti, 1 in fondo) e alle
 * coordinate u, v (0…1) della sezione: u = 0 parete sinistra, v = 1 pavimento. La profondità è corretta:
 * gli intervalli uguali si accorciano verso il fondo.
 */
export function room(b: number[], f: number[] = [-90, -80, 690, 280]) {
  const D = (f[2] - f[0]) / (b[2] - b[0]);
  const s = (t: number) => (t * D) / (1 + t * (D - 1));
  const P = (t: number, u: number, v: number): Pt => {
    const k = s(t);
    const x0 = f[0] + (b[0] - f[0]) * k;
    const x1 = f[2] + (b[2] - f[2]) * k;
    const y0 = f[1] + (b[1] - f[1]) * k;
    const y1 = f[3] + (b[3] - f[3]) * k;
    return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v];
  };
  const left = poly([P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)]);
  const right = poly([P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)]);
  const ceil = poly([P(0, 0, 0), P(0, 1, 0), P(1, 1, 0), P(1, 0, 0)]);
  const floor = poly([P(0, 0, 1), P(0, 1, 1), P(1, 1, 1), P(1, 0, 1)]);
  /** Un riquadro su una parete laterale (side -1 sinistra, 1 destra) da t0 a t1 e da v0 a v1. */
  const side = (sd: number, t0: number, t1: number, v0: number, v1: number) => {
    const u = sd < 0 ? 0 : 1;
    return poly([P(t0, u, v0), P(t1, u, v0), P(t1, u, v1), P(t0, u, v1)]);
  };
  /** Un riquadro sul pavimento (v = 1) o sul soffitto (v = 0). */
  const flat = (v: number, t0: number, t1: number, u0: number, u1: number) => poly([P(t0, u0, v), P(t0, u1, v), P(t1, u1, v), P(t1, u0, v)]);
  /** La scala alla profondità t, rispetto alla parete di fondo (1 in fondo, D davanti). */
  const sc = (t: number) => (P(t, 1, 0)[0] - P(t, 0, 0)[0]) / (b[2] - b[0]);
  /** Il riquadro [x0, y0, x1, y1] della sezione alla profondità t. */
  const sec = (t: number) => [...P(t, 0, 0), ...P(t, 1, 1)];
  return { P, s, sc, sec, left, right, ceil, floor, side, flat };
}

/** Pavimento a scacchi: le caselle di una parità, nT in profondità e nU in larghezza. */
export function checker(flat: (v: number, t0: number, t1: number, u0: number, u1: number) => string, nT: number, nU: number, uMin = 0, uMax = 1, parity = 0) {
  let d = '';
  for (let i = 0; i < nT; i++)
    for (let j = 0; j < nU; j++) if ((i + j) % 2 === parity) d += flat(1, i / nT, (i + 1) / nT, uMin + ((uMax - uMin) * j) / nU, uMin + ((uMax - uMin) * (j + 1)) / nU);
  return d;
}

/* ------------------------------------------------------------------ contesto e gradienti */

export interface Ctx {
  /** Il colore come va disegnato (normale o notturno). */
  c: (hex: string) => string;
  /** Riferimento a un gradiente di questa istanza. */
  url: (name: string) => string;
  id: (name: string) => string;
  /** Versione notturna: luci spente. */
  dim: boolean;
}

export type Stops = [number, string, number?][];

function stops(k: Ctx, list: Stops) {
  return list.map(([o, col, op], i) => <Stop key={i} offset={o} stopColor={k.c(col)} stopOpacity={op ?? 1} />);
}

/** Gradiente lineare, dall'alto in basso salvo indicazione. */
export function lin(k: Ctx, name: string, list: Stops, dir: [number, number, number, number] = [0, 0, 0, 1]) {
  return (
    <LinearGradient key={name} id={k.id(name)} x1={dir[0]} y1={dir[1]} x2={dir[2]} y2={dir[3]}>
      {stops(k, list)}
    </LinearGradient>
  );
}

/** Gradiente radiale circolare, in coordinate della tela. Solo `r`: rx/ry non esistono sul web. */
export function rad(k: Ctx, name: string, list: Stops, cx: number, cy: number, r: number) {
  return (
    <RadialGradient key={name} id={k.id(name)} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} fx={cx} fy={cy}>
      {stops(k, list)}
    </RadialGradient>
  );
}

/** Il cielo (o la parete di fondo) su tutta la tela. */
export const Fill = ({ k, name }: { k: Ctx; name: string }) => <Rect x={0} y={0} width={W} height={H} fill={k.url(name)} />;

/** Un'ombra che sale dal basso: dà profondità e fa leggere il testo che le card ci mettono sopra. */
export const Ground = ({ k, from = 110, color = '#2A0E3E', op = 0.5 }: { k: Ctx; from?: number; color?: string; op?: number }) => (
  <>
    <Defs>{lin(k, 'ground', [[0, color, 0], [1, color, op]])}</Defs>
    <Rect x={0} y={from} width={W} height={H - from} fill={k.url('ground')} />
  </>
);

/** Ombra ai lati (vignetta): chiude la scena larga e porta l'occhio al centro. */
export const Vignette = ({ k, color = '#000000', op = 0.35 }: { k: Ctx; color?: string; op?: number }) => (
  <>
    <Defs>{lin(k, 'vignette', [[0, color, op], [0.3, color, 0], [0.7, color, 0], [1, color, op]], [0, 0, 1, 0])}</Defs>
    <Rect x={0} y={0} width={W} height={H} fill={k.url('vignette')} />
  </>
);

/** Alone di luce (spento nella versione notturna). */
export function Glow({ k, name, x, y, r, color, op = 0.75 }: { k: Ctx; name: string; x: number; y: number; r: number; color: string; op?: number }) {
  if (k.dim) return null;
  // Gli aloni hanno un prefisso loro: non si scontrano con i gradienti della scena.
  const id = `glow-${name}`;
  return (
    <>
      <Defs>{rad(k, id, [[0, color, op], [0.45, color, op * 0.35], [1, color, 0]], x, y, r)}</Defs>
      <Circle cx={x} cy={y} r={r} fill={k.url(id)} />
    </>
  );
}

/** Nuvole piatte: [x, y, larghezza] ciascuna, base dritta e tre gobbe. */
export function clouds(list: number[][]) {
  return list
    .map(([x, y, w]) => {
      const h = w * 0.16;
      return (
        `M${r1(x)} ${r1(y)}h${r1(w)}` +
        `a${r1(h)} ${r1(h)} 0 0 0 ${r1(-w * 0.22)} ${r1(-h)}` +
        `a${r1(h * 1.5)} ${r1(h * 1.5)} 0 0 0 ${r1(-w * 0.34)} ${r1(-h * 0.6)}` +
        `a${r1(h * 1.1)} ${r1(h * 1.1)} 0 0 0 ${r1(-w * 0.28)} ${r1(h * 0.7)}` +
        `a${r1(h * 0.9)} ${r1(h * 0.9)} 0 0 0 ${r1(-w * 0.16)} ${r1(h * 0.9)}z`
      );
    })
    .join('');
}

/** Un mare di nuvole: gobbe tonde lungo la linea y, da x0 a x1, piene fino al fondo della tela (con `full`). */
export function cloudBank(seed: number, x0: number, x1: number, y: number, r: number, full = true) {
  const rnd = seeded(seed);
  const bumps: number[][] = [];
  for (let x = x0; x < x1 + r; ) {
    const rr = r * (0.6 + rnd() * 0.7);
    bumps.push([x, y + rnd() * r * 0.35, rr]);
    x += rr * 1.25;
  }
  // Il rettangolo va in senso antiorario come i cerchi: con la regola nonzero non lascia buchi dove si sovrappongono.
  if (!full) return dots(bumps);
  return dots(bumps) + `M${r1(x0 - r)} ${r1(y)}v${r1(H - y + 10)}h${r1(x1 - x0 + 2 * r)}v${r1(-(H - y + 10))}z`;
}

/** Un festone di lampadine tra due punti, con la corda che cede al centro. */
export function Festoon({ k, a, b, sag, n, cord = '#3A2030', bulb = '#FFF1C4' }: { k: Ctx; a: Pt; b: Pt; sag: number; n: number; cord?: string; bulb?: string }) {
  const ctl: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2];
  const bulbs = Array.from({ length: n }, (_, i) => quad(a, ctl, b, (i + 0.5) / n)).map(([x, y]) => [x, y + 2.4, 2]);
  return (
    <>
      <Path d={`M${a[0]} ${a[1]}Q${ctl[0]} ${ctl[1]} ${b[0]} ${b[1]}`} stroke={k.c(cord)} strokeWidth={0.9} fill="none" />
      {k.dim ? null : <Path d={dots(bulbs.map(([x, y]) => [x, y, 4.5]))} fill="#FFE7A0" opacity={0.3} />}
      <Path d={dots(bulbs)} fill={k.c(bulb)} />
    </>
  );
}

/** Una tenda a righe: trapezio, righe e smerlatura in fondo. */
export function Awning({ k, x0, x1, top, bottom, spread, n, color, cloth = '#FFF8EE' }: { k: Ctx; x0: number; x1: number; top: number; bottom: number; spread: number; n: number; color: string; cloth?: string }) {
  const tl = x0 + spread;
  const tr = x1 - spread;
  const at = (i: number): [number, number] => [tl + ((tr - tl) * i) / n, x0 + ((x1 - x0) * i) / n];
  let stripes = '';
  let scW = '';
  let scC = '';
  for (let i = 0; i < n; i++) {
    const [a, b] = at(i);
    const [a2, b2] = at(i + 1);
    const r = (b2 - b) / 2;
    const sc = `M${r1(b)} ${bottom}A${r1(r)} ${r1(r)} 0 0 0 ${r1(b2)} ${bottom}Z`;
    if (i % 2) {
      stripes += poly([[a, top], [a2, top], [b2, bottom], [b, bottom]]);
      scC += sc;
    } else scW += sc;
  }
  return (
    <>
      <Path d={poly([[tl, top], [tr, top], [x1, bottom], [x0, bottom]])} fill={k.c(cloth)} />
      <Path d={stripes + scC} fill={k.c(color)} />
      <Path d={scW} fill={k.c(cloth)} />
      <Path d={rects([[x0, bottom - 1.5, x1 - x0, 1.5]])} fill={k.c('#000000')} opacity={0.12} />
    </>
  );
}

/* ------------------------------------------------------------------ arredi */

/**
 * Il tavolo da gioco visto di fronte: il piano ovale con il panno in (x, y), largo w, con due carte
 * coperte e un mazzetto. Le carte sono solo dorsi: niente semi né figure.
 */
export function CardTable({
  k,
  x,
  y,
  w,
  felt = '#14806A',
  wood = '#6A3A22',
  rim,
  back = '#B8283A',
  pedestal = false,
  shadow = 0.28,
}: {
  k: Ctx;
  x: number;
  y: number;
  w: number;
  felt?: string;
  wood?: string;
  rim?: string;
  back?: string;
  /** Una gamba sola al centro, a calice (tavoli preziosi). */
  pedestal?: boolean;
  shadow?: number;
}) {
  const { c } = k;
  const h = w * 0.42;
  const ry = w * 0.12;
  const lw = w * 0.045;
  const top = rim ?? mix(wood, '#FFFFFF', 0.12);
  const dark = mix(wood, '#000000', 0.35);
  const apron = `M${r1(x - w / 2)} ${r1(y)}A${r1(w / 2)} ${r1(ry)} 0 0 0 ${r1(x + w / 2)} ${r1(y)}V${r1(y + w * 0.06)}A${r1(w / 2)} ${r1(ry)} 0 0 1 ${r1(x - w / 2)} ${r1(y + w * 0.06)}Z`;
  const legs = pedestal
    ? `M${r1(x - w * 0.05)} ${r1(y + ry)}Q${r1(x - w * 0.03)} ${r1(y + h * 0.6)} ${r1(x - w * 0.16)} ${r1(y + h)}H${r1(x + w * 0.16)}Q${r1(x + w * 0.03)} ${r1(y + h * 0.6)} ${r1(x + w * 0.05)} ${r1(y + ry)}Z`
    : rects([
        [x - w * 0.42, y + ry * 0.5, lw, h - ry * 0.5],
        [x + w * 0.42 - lw, y + ry * 0.5, lw, h - ry * 0.5],
      ]);
  // Una carta coperta distesa sul panno: un parallelogramma bianco con il dorso dentro.
  const card = (cx: number, cy: number, sk: number) => {
    const cw = w * 0.13;
    const cd = w * 0.05;
    const o: Pt[] = [[cx - cw / 2 + sk, cy - cd / 2], [cx + cw / 2 + sk, cy - cd / 2], [cx + cw / 2 - sk, cy + cd / 2], [cx - cw / 2 - sk, cy + cd / 2]];
    const i = o.map(([px, py]) => [cx + (px - cx) * 0.78, cy + (py - cy) * 0.66] as Pt);
    return { o: poly(o), i: poly(i) };
  };
  const c1 = card(x - w * 0.17, y - ry * 0.12, w * 0.012);
  const c2 = card(x + w * 0.16, y + ry * 0.18, -w * 0.016);
  const deck = [0, 1, 2].map(j => card(x, y - ry * 0.35 - j * w * 0.008, 0));
  return (
    <>
      {shadow > 0 ? <Ellipse cx={x} cy={y + h} rx={w * 0.56} ry={w * 0.06} fill={c('#000000')} opacity={shadow} /> : null}
      {pedestal ? null : <Path d={rects([[x - w * 0.3, y + ry, lw * 0.9, h * 0.82 - ry], [x + w * 0.3 - lw * 0.9, y + ry, lw * 0.9, h * 0.82 - ry]])} fill={c(dark)} />}
      <Path d={legs} fill={c(wood)} />
      <Path d={apron} fill={c(dark)} />
      <Ellipse cx={x} cy={y} rx={w / 2} ry={ry} fill={c(top)} />
      <Ellipse cx={x} cy={y + w * 0.004} rx={w / 2 - w * 0.04} ry={ry - w * 0.024} fill={c(felt)} />
      <Path d={c1.o + c2.o + deck.map(d => d.o).join('')} fill={c('#F7F0E2')} />
      <Path d={c1.i + c2.i + deck[2].i} fill={c(back)} />
      <Path d={`M${r1(x - w / 2 + w * 0.05)} ${r1(y - ry * 0.35)}A${r1(w / 2)} ${r1(ry)} 0 0 1 ${r1(x + w / 2 - w * 0.05)} ${r1(y - ry * 0.35)}`} stroke={c('#FFFFFF')} strokeOpacity={0.35} strokeWidth={w * 0.012} fill="none" />
    </>
  );
}

/** Una sedia di profilo con i piedi a terra in yFloor: dir 1 guarda a destra, -1 a sinistra. */
export function chair(x: number, yFloor: number, s: number, dir: number) {
  const bx = x - dir * 7 * s;
  const fx = x + dir * 7 * s;
  const lo = Math.min(bx, fx);
  return rects([
    [bx - 1.1 * s, yFloor - 32 * s, 2.2 * s, 32 * s],
    [lo - 1 * s, yFloor - 15 * s, 16 * s, 2.6 * s],
    [fx - 1 * s, yFloor - 15 * s, 2 * s, 15 * s],
    [bx - (dir > 0 ? 1.1 : 2.4) * s, yFloor - 28 * s, 3.5 * s, 2 * s],
    [bx - (dir > 0 ? 1.1 : 2.4) * s, yFloor - 22 * s, 3.5 * s, 2 * s],
  ]);
}

/** Un lampadario a bracci con le candele, appeso in (x, y); con `drops` ha i pendenti di cristallo. */
export function Chandelier({
  k,
  x,
  y,
  s = 1,
  metal = '#E0B04A',
  flame = '#FFF6D6',
  glow,
  name,
  drops = false,
  hang = 0,
  tiers = 2,
}: {
  k: Ctx;
  x: number;
  y: number;
  s?: number;
  metal?: string;
  flame?: string;
  glow?: string;
  name?: string;
  drops?: boolean;
  hang?: number;
  tiers?: number;
}) {
  const { c } = k;
  let arms = '';
  const lights: number[][] = [];
  const cups: number[][] = [];
  const crystals: number[][] = [];
  for (let t = 0; t < tiers; t++) {
    const span = (26 - t * 9) * s;
    const ay = y + (14 - t * 9) * s;
    const n = t === 0 ? 3 : 2;
    for (let i = -n; i <= n; i++) {
      if (i === 0) continue;
      const dx = (span * i) / n;
      const ex = x + dx;
      const ey = ay - 6 * s;
      arms += `M${r1(x)} ${r1(ay + 4 * s)}Q${r1(x + dx * 0.7)} ${r1(ay + 10 * s)} ${r1(ex)} ${r1(ey)}`;
      cups.push([ex - 2.2 * s, ey - 1 * s, 4.4 * s, 1.6 * s]);
      lights.push([ex, ey - 3.6 * s, 1.9 * s]);
      if (drops) crystals.push([x + dx * 0.72, ay + 9.5 * s, 1.3 * s], [x + dx * 0.4, ay + 9 * s, 1.1 * s]);
    }
  }
  return (
    <>
      {name && glow ? <Glow k={k} name={name} x={x} y={y + 6 * s} r={56 * s} color={glow} op={0.6} /> : null}
      {hang > 0 ? <Path d={`M${x} ${y - hang}V${y}`} stroke={c(metal)} strokeWidth={1.2 * s} /> : null}
      <Path d={arms} stroke={c(metal)} strokeWidth={1.4 * s} fill="none" />
      <Path d={rects([[x - 1.6 * s, y - 2 * s, 3.2 * s, 20 * s], ...cups])} fill={c(metal)} />
      <Path d={ovals([[x, y + 17 * s, 5 * s, 3 * s]])} fill={c(metal)} />
      {drops ? <Path d={dots([...crystals, [x, y + 22 * s, 1.8 * s]])} fill={c('#EAF4FF')} /> : null}
      {k.dim ? null : <Path d={dots(lights.map(([lx, ly, r]) => [lx, ly, r * 1.9]))} fill={flame} opacity={0.22} />}
      <Path d={dots(lights)} fill={c(flame)} />
    </>
  );
}

/** Candele [x, base, altezza, larghezza]: corpi, fiamme e (accese) un piccolo alone. */
export function Candles({ k, list, wax = '#F4E8D2', flame = '#FFD27A' }: { k: Ctx; list: number[][]; wax?: string; flame?: string }) {
  const { c } = k;
  const bodies = rects(list.map(([x, b, h, w = 3]) => [x - w / 2, b - h, w, h]));
  const flames = list
    .map(([x, b, h, w = 3]) => {
      const t = b - h;
      const f = w * 1.25;
      return `M${r1(x)} ${r1(t - f * 2.2)}Q${r1(x + f * 0.75)} ${r1(t - f * 0.5)} ${r1(x)} ${r1(t - 0.3)}Q${r1(x - f * 0.75)} ${r1(t - f * 0.5)} ${r1(x)} ${r1(t - f * 2.2)}Z`;
    })
    .join('');
  return (
    <>
      {k.dim ? null : <Path d={dots(list.map(([x, b, h, w = 3]) => [x, b - h - w * 1.2, w * 3.4]))} fill={flame} opacity={0.2} />}
      <Path d={bodies} fill={c(wax)} />
      <Path d={flames} fill={c(k.dim ? '#7A7090' : flame)} />
    </>
  );
}

/** Colonne [x] da top a bottom, larghe w, con capitello e base. */
export function Columns({ k, xs, top, bottom, w, shaft, cap }: { k: Ctx; xs: number[]; top: number; bottom: number; w: number; shaft: string; cap: string }) {
  const { c } = k;
  return (
    <>
      <Path d={rects(xs.map(x => [x - w / 2, top, w, bottom - top]))} fill={shaft} />
      <Path d={xs.map(x => `M${r1(x - w * 0.18)} ${r1(top + w * 0.4)}V${r1(bottom - w * 0.4)}M${r1(x + w * 0.18)} ${r1(top + w * 0.4)}V${r1(bottom - w * 0.4)}`).join('')} stroke={c('#000000')} strokeOpacity={0.12} strokeWidth={Math.max(0.6, w * 0.06)} />
      <Path d={rects(xs.flatMap(x => [[x - w * 0.75, top - w * 0.45, w * 1.5, w * 0.45], [x - w * 0.62, top, w * 1.24, w * 0.2], [x - w * 0.75, bottom, w * 1.5, w * 0.4], [x - w * 0.62, bottom - w * 0.2, w * 1.24, w * 0.2]]))} fill={c(cap)} />
    </>
  );
}

/** Un dorso di carta in piedi [x, y, w, h] (bordo chiaro e fondo colorato, con un rombo al centro). */
export function cardBacks(list: number[][]) {
  const outer = rects(list);
  const inner = list.map(([x, y, w, h]) => rects([[x + w * 0.12, y + w * 0.12, w * 0.76, h - w * 0.24]])).join('');
  const mark = list
    .map(([x, y, w, h]) =>
      poly([
        [x + w / 2, y + h / 2 - w * 0.22],
        [x + w * 0.7, y + h / 2],
        [x + w / 2, y + h / 2 + w * 0.22],
        [x + w * 0.3, y + h / 2],
      ]),
    )
    .join('');
  return { outer, inner, mark };
}

export type SceneFn = (p: { k: Ctx }) => ReactNode;
