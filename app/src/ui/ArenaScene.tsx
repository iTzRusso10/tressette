// Le illustrazioni delle dieci arene: un luogo di Napoli per arena, in stile flat a piani sovrapposti.
//
// Ogni scena è disegnata in una tela larga 600×200 con il soggetto nel quadrato centrale (x 200…400):
// con preserveAspectRatio "slice" si vede tutta a 3:1 e solo il centro a 1:1. I piani lontani sono
// mescolati con il colore del cielo (profondità atmosferica). Con `dim` ogni colore passa per `night()`:
// la stessa scena, scura e desaturata, come una silhouette notturna. Statica, niente animazioni.

import { memo, useId, type ReactNode } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const W = 600;
const H = 200;

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
function night(hex: string) {
  const [r, g, b] = rgb(hex);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return mix(mix('#0D0A22', '#8A84BE', Math.pow(l, 1.2)), hex, 0.08);
}

/** Due colori per scena (cielo e accento), per sfondi e bordi delle card. */
export const ARENA_SKY: Record<string, [string, string]> = {
  vicolo: ['#FF8F6B', '#14806A'],
  mercato: ['#7CC6EE', '#E04A4A'],
  mergellina: ['#6E9EE0', '#21A5A8'],
  spaccanapoli: ['#FFA36E', '#A53A4E'],
  galleria: ['#A9C6EA', '#C8A15A'],
  'gran-caffe': ['#2B2F6E', '#2E7A52'],
  posillipo: ['#E8578B', '#7C4BB8'],
  capri: ['#4FA9E8', '#22B8C8'],
  'san-carlo': ['#860F22', '#E0B04A'],
  reggia: ['#161838', '#E8BE4F'],
};

/* ------------------------------------------------------------------ geometria */

type Pt = [number, number];
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Più rettangoli [x, y, w, h] in un solo path. */
const rects = (rs: number[][]) => rs.map(([x, y, w, h]) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}z`).join('');

/** Finestre o porte ad arco [x, y, w, h]: rettangolo con il semicerchio in alto. */
const arches = (rs: number[][]) =>
  rs
    .map(([x, y, w, h]) => {
      const r = w / 2;
      return `M${r1(x)} ${r1(y + h)}V${r1(y + r)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(x + w)} ${r1(y + r)}V${r1(y + h)}z`;
    })
    .join('');

/** Più cerchi [x, y, r] in un solo path. */
const dots = (cs: number[][]) =>
  cs.map(([x, y, r]) => `M${r1(x - r)} ${r1(y)}a${r} ${r} 0 1 0 ${r1(2 * r)} 0a${r} ${r} 0 1 0 ${r1(-2 * r)} 0z`).join('');

/** Poligono chiuso. */
const poly = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';

/** Profilo di tetti a gradini da x0 fino al fondo: ogni passo è [larghezza, altezza del tetto]. */
function skyline(x0: number, base: number, steps: [number, number][]) {
  let d = `M${x0} ${base}`;
  let x = x0;
  for (const [w, y] of steps) {
    d += `V${y}H${x + w}`;
    x += w;
  }
  return d + `V${base}Z`;
}

/** Un punto sulla curva quadratica p0 → p2 con controllo c. */
const quad = (p0: Pt, c: Pt, p2: Pt, t: number): Pt => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1],
];

/** Una sequenza di numeri pseudo-casuali fissa (le scene sono sempre uguali). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ contesto e gradienti */

interface Ctx {
  /** Il colore come va disegnato (normale o notturno). */
  c: (hex: string) => string;
  /** Riferimento a un gradiente di questa istanza. */
  url: (name: string) => string;
  id: (name: string) => string;
  /** Versione notturna: luci spente. */
  dim: boolean;
}

type Stops = [number, string, number?][];

function stops(k: Ctx, list: Stops) {
  return list.map(([o, col, op], i) => <Stop key={i} offset={o} stopColor={k.c(col)} stopOpacity={op ?? 1} />);
}

/** Gradiente lineare, dall'alto in basso salvo indicazione. */
function lin(k: Ctx, name: string, list: Stops, dir: [number, number, number, number] = [0, 0, 0, 1]) {
  return (
    <LinearGradient key={name} id={k.id(name)} x1={dir[0]} y1={dir[1]} x2={dir[2]} y2={dir[3]}>
      {stops(k, list)}
    </LinearGradient>
  );
}

/** Gradiente radiale circolare, in coordinate della tela (per aloni di luce). Solo `r`: rx/ry non esistono sul web. */
function rad(k: Ctx, name: string, list: Stops, cx: number, cy: number, r: number) {
  return (
    <RadialGradient key={name} id={k.id(name)} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} fx={cx} fy={cy}>
      {stops(k, list)}
    </RadialGradient>
  );
}

/** Il cielo (o la parete di fondo) su tutta la tela. */
const Fill = ({ k, name }: { k: Ctx; name: string }) => <Rect x={0} y={0} width={W} height={H} fill={k.url(name)} />;

/** Un'ombra che sale dal basso: dà profondità e fa leggere il testo che le card ci mettono sopra. */
const Ground = ({ k, from = 110, color = '#2A0E3E', op = 0.5 }: { k: Ctx; from?: number; color?: string; op?: number }) => (
  <>
    <Defs>{lin(k, 'ground', [[0, color, 0], [1, color, op]])}</Defs>
    <Rect x={0} y={from} width={W} height={H - from} fill={k.url('ground')} />
  </>
);

/** Alone di luce attorno a una lampada (spento nella versione notturna). */
function Glow({ k, name, x, y, r, color, op = 0.75 }: { k: Ctx; name: string; x: number; y: number; r: number; color: string; op?: number }) {
  if (k.dim) return null;
  return (
    <>
      <Defs>{rad(k, name, [[0, color, op], [0.45, color, op * 0.35], [1, color, 0]], x, y, r)}</Defs>
      <Circle cx={x} cy={y} r={r} fill={k.url(name)} />
    </>
  );
}

/** Nuvole piatte: [x, y, larghezza] ciascuna, base dritta e tre gobbe. */
function clouds(list: number[][]) {
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

/** Un festone di lampadine tra due punti, con la corda che cede al centro. */
function Festoon({ k, a, b, sag, n }: { k: Ctx; a: Pt; b: Pt; sag: number; n: number }) {
  const ctl: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2];
  const bulbs = Array.from({ length: n }, (_, i) => quad(a, ctl, b, (i + 0.5) / n)).map(([x, y]) => [x, y + 2.4, 2.1]);
  return (
    <>
      <Path d={`M${a[0]} ${a[1]}Q${ctl[0]} ${ctl[1]} ${b[0]} ${b[1]}`} stroke={k.c('#3A2030')} strokeWidth={0.9} fill="none" />
      {k.dim ? null : <Path d={dots(bulbs.map(([x, y]) => [x, y, 4.5]))} fill="#FFE7A0" opacity={0.3} />}
      <Path d={dots(bulbs)} fill={k.c('#FFF1C4')} />
    </>
  );
}

/* ------------------------------------------------------------------ 1. Il Vicolo */

/** Un capo steso: camicia, lenzuolo, asciugamano o pantaloni, appeso al punto (x, y). */
function cloth(kind: 'camicia' | 'lenzuolo' | 'telo' | 'calzoni', x: number, y: number) {
  const p = (d: string) => d.replace(/X(-?[\d.]+)/g, (_, n) => String(r1(x + Number(n)))).replace(/Y(-?[\d.]+)/g, (_, n) => String(r1(y + Number(n))));
  switch (kind) {
    case 'camicia':
      return p('MX-8 Y0LX8 Y0LX15 Y6LX11 Y11LX8 Y8LX8 Y24LX-8 Y24LX-8 Y8LX-11 Y11LX-15 Y6Z');
    case 'lenzuolo':
      return p('MX-13 Y0LX13 Y0LX13 Y28QX6.5 Y31 X0 Y28QX-6.5 Y25 X-13 Y28Z');
    case 'telo':
      return p('MX-7 Y0LX7 Y0LX7 Y19LX-7 Y19Z');
    case 'calzoni':
      return p('MX-8 Y0LX8 Y0LX9 Y24LX2 Y24LX0 Y9LX-2 Y24LX-9 Y24Z');
  }
}

function Vicolo({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#FFC690';
  const far = mix('#C97C86', sky, 0.5);
  const dome = mix('#C98A8E', sky, 0.62);
  const mid = mix('#B8656E', sky, 0.28);
  // Le due corde dei panni, da un palazzo all'altro.
  const l1: [Pt, Pt, Pt] = [[236, 56], [300, 80], [364, 60]];
  const l2: [Pt, Pt, Pt] = [[244, 104], [300, 122], [356, 100]];
  const hang: [number, [Pt, Pt, Pt], 'camicia' | 'lenzuolo' | 'telo' | 'calzoni', string][] = [
    [0.17, l1, 'camicia', '#FFFFFF'],
    [0.4, l1, 'lenzuolo', '#9FD8F5'],
    [0.62, l1, 'telo', '#FF8FB1'],
    [0.82, l1, 'camicia', '#FFE066'],
    [0.26, l2, 'calzoni', '#7CF2D2'],
    [0.52, l2, 'lenzuolo', '#FFFFFF'],
    [0.77, l2, 'telo', '#FFB067'],
  ];
  // Finestre: [x, y, w, h] per ogni palazzo.
  const win = [
    [18, 26, 22, 34], [72, 26, 22, 34], [18, 88, 22, 34], [72, 88, 22, 34],
    [140, 40, 22, 32], [200, 40, 22, 32], [140, 94, 22, 32], [200, 94, 22, 32],
    [378, 46, 22, 32], [436, 46, 22, 32], [378, 98, 22, 32], [436, 98, 22, 32],
    [508, 24, 22, 34], [560, 24, 22, 34], [508, 86, 22, 34], [560, 86, 22, 34],
  ];
  const shutters = win.flatMap(([x, y, w, h]) => [[x - 8, y, 7, h], [x + w + 1, y, 7, h]]);
  const sills = win.map(([x, y, w, h]) => [x - 10, y + h, w + 20, 3]);
  const bars = Array.from({ length: 16 }, (_, i) => `M${132 + i * 7} 131V143`).join('');
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#FF8F6B'], [0.55, '#FFB487'], [1, '#FFE0AE']])}
        {lin(k, 'sideB', [[0, '#B86A3E'], [1, '#7A3E2E']], [0, 0, 1, 0])}
        {lin(k, 'sideC', [[0, '#7E2E2E'], [1, '#A94A3A']], [0, 0, 1, 0])}
        {lin(k, 'street', [[0, '#C79A8E'], [1, '#6B4452']])}
      </Defs>
      <Fill k={k} name="sky" />
      {/* In fondo al vicolo: una cupola e i tetti velati dalla foschia. */}
      <Path d="M280 112V96A20 26 0 0 1 320 96V112ZM297 72h6v-11h-6z" fill={c(dome)} />
      <Path d={skyline(255, 200, [[18, 98], [22, 90], [16, 102], [26, 94], [20, 100], [20, 88], [14, 96], [20, 104]])} fill={c(far)} />
      <Path d={skyline(262, 200, [[16, 122], [26, 116], [20, 126], [14, 118]])} fill={c(mid)} />
      <Path d="M262 200L286 160H314L338 200Z" fill={k.url('street')} />
      {/* I palazzi e i loro fianchi in ombra verso il fondo. */}
      <Path d={poly([[250, 22], [272, 74], [272, 174], [250, 200]])} fill={k.url('sideB')} />
      <Path d={poly([[350, 30], [328, 78], [328, 174], [350, 200]])} fill={k.url('sideC')} />
      <Rect x={-10} y={-10} width={125} height={215} fill={c('#E37F78')} />
      <Rect x={115} y={22} width={135} height={183} fill={c('#F0B35E')} />
      <Rect x={350} y={30} width={135} height={175} fill={c('#D9694E')} />
      <Rect x={485} y={-10} width={125} height={215} fill={c('#F2CB78')} />
      <Path d={rects([[110, 17, 145, 8], [345, 25, 145, 8]])} fill={c('#FFE6C2')} />
      <Path d={rects([[-10, 0, 125, 4], [485, 0, 125, 4]])} fill={c('#FFFFFF')} opacity={0.25} />
      {/* Finestre ad arco con le persiane verdi. */}
      <Path d={arches(win)} fill={c('#4A2036')} />
      <Path d={rects(shutters)} fill={c('#1E8A6E')} />
      <Path d={rects(sills)} fill={c('#FFF1DE')} opacity={0.85} />
      {/* Porte a piano terra: il portone e un basso illuminato. */}
      <Path d={arches([[24, 146, 46, 60], [520, 146, 46, 60], [160, 134, 46, 70]])} fill={c('#5A2232')} />
      <Path d={arches([[380, 144, 42, 60]])} fill={c('#FFD27A')} />
      <Path d={arches([[386, 152, 30, 52]])} fill={c('#FFB347')} opacity={0.6} />
      {/* Il balcone con le piante. */}
      <Path d={bars} stroke={c('#3A1A2A')} strokeWidth={1.6} />
      <Path d={rects([[128, 128, 116, 3.5], [124, 143, 124, 4]])} fill={c('#3A1A2A')} />
      <Path d={dots([[136, 122, 7], [148, 119, 8], [229, 121, 8], [238, 124, 6]])} fill={c('#3E9B5C')} />
      <Path d={dots([[138, 117, 2], [149, 114, 2.2], [144, 122, 1.8], [231, 116, 2.2], [236, 121, 1.8]])} fill={c('#FF4F7B')} />
      {/* I panni stesi. */}
      <Path d={`M${l1[0][0]} ${l1[0][1]}Q${l1[1][0]} ${l1[1][1]} ${l1[2][0]} ${l1[2][1]}M${l2[0][0]} ${l2[0][1]}Q${l2[1][0]} ${l2[1][1]} ${l2[2][0]} ${l2[2][1]}`} stroke={c('#3A1A2A')} strokeWidth={1.2} fill="none" />
      {hang.map(([t, l, kind, col], i) => {
        const [x, y] = quad(l[0], l[1], l[2], t);
        return <Path key={i} d={cloth(kind, x, y - 0.5)} fill={c(col)} />;
      })}
      {/* Il lampione a muro. */}
      <Glow k={k} name="lamp" x={336} y={134} r={38} color="#FFE7A0" />
      <Path d="M350 118H332V124" stroke={c('#2E1426')} strokeWidth={2} fill="none" />
      <Path d="M327 124H337L340 128L337 142H327L324 128Z" fill={c('#2E1426')} />
      <Path d="M328.5 128H335.5L334.5 140H329.5Z" fill={c('#FFE7A0')} />
      <Ground k={k} from={120} op={0.45} />
      {/* Il tavolino tra i panni stesi. */}
      <Path d="M274 198V172H278V184H290V188H278V198ZM326 198V172H322V184H310V188H322V198Z" fill={c('#3A1A2A')} />
      <Path d="M299 178H301V198H299Z" fill={c('#3A1A2A')} />
      <Ellipse cx={300} cy={177} rx={17} ry={4} fill={c('#14806A')} />
      <Path d="M283 177A17 4 0 0 0 317 177" stroke={c('#FFFFFF')} strokeOpacity={0.6} strokeWidth={1.4} fill="none" />
    </G>
  );
}

/* ------------------------------------------------------------------ 2. Il Mercato */

/** Una tenda a righe: trapezio, righe e smerlatura in fondo. */
function Awning({ k, x0, x1, top, bottom, spread, n, color }: { k: Ctx; x0: number; x1: number; top: number; bottom: number; spread: number; n: number; color: string }) {
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
      <Path d={poly([[tl, top], [tr, top], [x1, bottom], [x0, bottom]])} fill={k.c('#FFF8EE')} />
      <Path d={stripes + scC} fill={k.c(color)} />
      <Path d={scW} fill={k.c('#FFF8EE')} />
      <Path d={rects([[tl - 3, top - 4, tr - tl + 6, 5]])} fill={k.c('#7A4A2C')} />
    </>
  );
}

/** Un banco: pali, ombra sotto la tenda, cassette di frutta e bancone. */
function Stall({ k, x0, x1, top, bottom, counter, color, fruit, seed }: { k: Ctx; x0: number; x1: number; top: number; bottom: number; counter: number; color: string; fruit: string[]; seed: number }) {
  const { c } = k;
  const n = fruit.length;
  const cw = (x1 - x0 - 16) / n;
  const r = Math.min(6, cw / 6.4);
  const rnd = seeded(seed);
  const byColor: Record<string, number[][]> = {};
  const crates: number[][] = [];
  const slats: number[][] = [];
  fruit.forEach((col, i) => {
    const cx = x0 + 8 + i * cw;
    crates.push([cx + 2, counter - r * 2.6, cw - 4, r * 2.6]);
    slats.push([cx + 2, counter - r * 1.5, cw - 4, 1.4]);
    const list = (byColor[col] ??= []);
    const per = Math.max(3, Math.floor((cw - 6) / (r * 2)));
    for (let j = 0; j < per; j++) list.push([cx + 3 + r + j * ((cw - 6 - 2 * r) / (per - 1)), counter - r * 2.6 - r * 0.4 + rnd(), r]);
    for (let j = 0; j < per - 1; j++) list.push([cx + 3 + 2 * r + j * ((cw - 6 - 2 * r) / (per - 1)), counter - r * 2.6 - r * 1.9 + rnd(), r]);
  });
  const shine = Object.values(byColor)
    .flat()
    .map(([x, y, rr]) => [x - rr * 0.35, y - rr * 0.35, rr * 0.28]);
  return (
    <>
      <Path d={rects([[x0 + 4, top, 3, H - top], [x1 - 7, top, 3, H - top]])} fill={c('#6A3E28')} />
      <Path d={rects([[x0 + 7, bottom, x1 - x0 - 14, counter - bottom]])} fill={c('#5A2E3A')} opacity={0.55} />
      <Path d={rects(crates)} fill={c('#C98A4E')} />
      <Path d={rects(slats)} fill={c('#8E5A2E')} />
      {Object.entries(byColor).map(([col, list]) => (
        <Path key={col} d={dots(list)} fill={c(col)} />
      ))}
      <Path d={dots(shine)} fill={c('#FFFFFF')} opacity={0.45} />
      <Path d={rects([[x0 + 2, counter, x1 - x0 - 4, H - counter]])} fill={c('#A8693E')} />
      <Path d={rects([[x0 + 2, counter, x1 - x0 - 4, 3]])} fill={c('#E3A86C')} />
      <Awning k={k} x0={x0} x1={x1} top={top} bottom={bottom} spread={(x1 - x0) * 0.06} n={Math.round((x1 - x0) / 18)} color={color} />
    </>
  );
}

function Mercato({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#D4ECF2';
  const far = mix('#E7B3A0', sky, 0.55);
  const mid = mix('#E08D72', sky, 0.25);
  const farWin: number[][] = [];
  const midWin: number[][] = [];
  for (let x = 8; x < W; x += 26) for (const y of [52, 72]) farWin.push([x, y, 8, 11]);
  for (let x = 14; x < W; x += 34) for (const y of [84, 106]) midWin.push([x, y, 11, 15]);
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#7CC6EE'], [0.6, '#CBEAF2'], [1, '#FFE6C6']])}
        {lin(k, 'street', [[0, '#D6A383'], [1, '#9C6852']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={480} y={26} r={90} color="#FFF6D8" op={0.9} />
      <Path d={clouds([[60, 30, 70], [250, 20, 56], [400, 38, 64]])} fill={c('#FFFFFF')} opacity={0.75} />
      <Path d={skyline(0, 200, [[46, 44], [40, 36], [58, 48], [44, 40], [62, 34], [48, 46], [52, 38], [56, 44], [40, 32], [54, 42], [50, 36], [50, 46]])} fill={c(far)} />
      <Path d={rects(farWin)} fill={c(mix(far, '#8A5A6E', 0.3))} />
      <Path d={skyline(0, 200, [[70, 74], [64, 66], [80, 78], [56, 70], [72, 62], [66, 76], [78, 68], [60, 72], [54, 64]])} fill={c(mid)} />
      <Path d={rects(midWin)} fill={c('#7A4054')} opacity={0.7} />
      <Path d="M0 200V150H600V200Z" fill={k.url('street')} />
      {/* I banchi: due più indietro ai lati, quello grande al centro. */}
      <Stall k={k} x0={14} x1={188} top={86} bottom={108} counter={160} color="#2E9E6A" fruit={['#FFD93A', '#6DBE45', '#FF8A2A', '#E8322E']} seed={3} />
      <Stall k={k} x0={412} x1={586} top={86} bottom={108} counter={160} color="#2F5FA8" fruit={['#E8322E', '#FF8A2A', '#6B3A8C', '#6DBE45']} seed={7} />
      <Stall k={k} x0={194} x1={406} top={70} bottom={100} counter={160} color="#E04A4A" fruit={['#FF8A2A', '#FFD93A', '#E8322E', '#6DBE45', '#FF8A2A']} seed={11} />
      {/* Le lampadine tese sopra la strada. */}
      <Festoon k={k} a={[-10, 52]} b={[200, 46]} sag={8} n={9} />
      <Festoon k={k} a={[200, 46]} b={[400, 44]} sag={9} n={9} />
      <Festoon k={k} a={[400, 44]} b={[610, 54]} sag={8} n={9} />
      {/* Un mazzo di peperoncini appeso alla tenda. */}
      <Path d="M220 104V114M224 104V112" stroke={c('#6A3E28')} strokeWidth={1} />
      <Path d="M218 113L222 113L220 127ZM222 111L226 111L224 124ZM216 116L220 116L217 128Z" fill={c('#E8322E')} />
      <Path d="M380 104V113" stroke={c('#6A3E28')} strokeWidth={1} />
      <Path d="M376 113A4 5 0 1 0 384 113A4 5 0 1 0 376 113ZM381 117A3.5 4.5 0 1 0 388 117A3.5 4.5 0 1 0 381 117Z" fill={c('#FFF2DA')} />
      <Ground k={k} from={140} op={0.35} />
    </G>
  );
}

/* ------------------------------------------------------------------ 3. Mergellina */

/** Un gozzo con la striscia colorata e il riflesso. */
function boat(x: number, y: number, s: number) {
  const P = (d: number[]) => d.map((v, i) => r1(i % 2 ? y + v * s : x + v * s));
  const [a, b, c1, d1, e, f, g, h, i, j, k2, l] = P([-30, -3, -24, 9, 22, 9, 30, -3, 34, -7, -34, -7]);
  const hull = `M${k2} ${l}L${a} ${b}Q${c1} ${d1} ${c1 + 4 * s} ${d1}L${e - 4 * s} ${f}Q${g} ${h} ${i} ${j}Z`;
  const stripe = `M${k2} ${l}L${i} ${j}L${r1(i - 1 * s)} ${r1(j + 3 * s)}L${r1(k2 + 1 * s)} ${r1(l + 3 * s)}Z`;
  const refl = `M${r1(x - 28 * s)} ${r1(y + 12 * s)}h${r1(56 * s)}v${r1(2 * s)}h${r1(-56 * s)}zM${r1(x - 20 * s)} ${r1(y + 17 * s)}h${r1(40 * s)}v${r1(1.6 * s)}h${r1(-40 * s)}z`;
  return { hull, stripe, refl };
}

function Mergellina({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#F6C2A8';
  const b1 = boat(256, 146, 0.75);
  const b2 = boat(350, 162, 1.05);
  const b3 = boat(444, 140, 0.6);
  const masts = [480, 498, 520, 546, 566, 588].map((x, i) => `M${x} ${150}V${62 + (i % 3) * 12}`).join('');
  const hulls = [480, 498, 520, 546, 566, 588].map(x => [x - 9, 148, 18, 5]);
  const fronds = (x: number, y: number) =>
    [
      [-34, 10], [-28, -8], [-10, -20], [12, -20], [30, -6], [36, 12], [20, 20], [-18, 20],
    ]
      .map(([dx, dy]) => `M${x} ${y}Q${r1(x + dx * 0.5)} ${r1(y + dy * 0.5 - 8)} ${x + dx} ${y + dy}Q${r1(x + dx * 0.55)} ${r1(y + dy * 0.5 - 2)} ${x} ${y}Z`)
      .join('');
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#6E9EE0'], [0.55, '#F1B9B4'], [1, '#FFDDB0']])}
        {lin(k, 'sea', [[0, '#5BC1C4'], [0.25, '#21A5A8'], [1, '#0B5468']])}
        {lin(k, 'stone', [[0, '#F4EADB'], [1, '#C9B49A']])}
        {lin(k, 'vesuvio', [[0, mix('#7D6FB8', sky, 0.25)], [1, mix('#A58FC4', sky, 0.5)]])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={120} y={96} r={110} color="#FFE6B8" op={0.8} />
      {/* La costa lontana e il Vesuvio con il Somma. */}
      <Path d="M0 120V108Q40 100 90 106Q130 98 170 110L600 112V120Z" fill={c(mix('#B49AC8', sky, 0.55))} />
      <Path d="M150 121L204 102Q238 82 266 74L280 79Q298 70 316 58H340Q366 76 398 95Q440 112 480 121Z" fill={k.url('vesuvio')} />
      <Path d="M316 58H340Q366 76 398 95Q440 112 480 121H392Q370 100 352 86Q336 72 330 60Z" fill={c(mix('#C79AC0', sky, 0.35))} opacity={0.7} />
      <Path d="M266 74L280 79Q298 70 316 58L300 92Q286 100 270 96Z" fill={c(mix('#9480BE', sky, 0.35))} opacity={0.6} />
      <Path d={clouds([[380, 46, 80], [470, 30, 54], [190, 56, 50]])} fill={c('#FFF4EC')} opacity={0.7} />
      <Path d="M0 120H600V200H0Z" fill={k.url('sea')} />
      <Path d="M0 120H600V125H0Z" fill={c('#FFFFFF')} opacity={0.35} />
      <Path d={rects([[96, 130, 40, 1.4], [150, 138, 26, 1.4], [70, 146, 30, 1.4], [292, 132, 34, 1.4], [400, 128, 30, 1.4], [520, 136, 36, 1.4], [470, 168, 28, 1.4], [196, 172, 34, 1.4]])} fill={c('#FFFFFF')} opacity={0.5} />
      {/* Le barche a vela ormeggiate al porticciolo. */}
      <Path d={masts} stroke={c('#F7F1E6')} strokeWidth={1.3} />
      <Path d={rects(hulls)} fill={c('#F7F1E6')} />
      {/* I gozzi. */}
      {[b1, b2, b3].map((b, i) => (
        <G key={i}>
          <Path d={b.refl} fill={c('#0A3F50')} opacity={0.5} />
          <Path d={b.hull} fill={c('#FBF6EC')} />
          <Path d={b.stripe} fill={c(['#2F6FB5', '#D8433B', '#21A5A8'][i])} />
        </G>
      ))}
      <Path d="M340 147h16v8h-16z" fill={c('#FBF6EC')} />
      <Path d="M342 149h5v4h-5zM349 149h5v4h-5z" fill={c('#2F6FB5')} />
      {/* Il lungomare: palma, lampione e parapetto di pietra. */}
      <Path d="M80 184Q84 130 96 74" stroke={c('#4A3A3A')} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d={fronds(96, 74)} fill={c('#2F5C4A')} />
      <Path d="M546 184Q540 140 530 96" stroke={c('#4A3A3A')} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d={fronds(530, 96)} fill={c('#2F5C4A')} />
      <Glow k={k} name="lamp" x={172} y={112} r={26} color="#FFE7A0" op={0.6} />
      <Path d="M170.5 184V116h3v68z" fill={c('#2E2436')} />
      <Circle cx={172} cy={112} r={6} fill={c('#FFF1C8')} />
      <Path d="M0 200V182H600V200Z" fill={k.url('stone')} />
      <Path d="M0 182H600V186H0Z" fill={c('#FFFFFF')} opacity={0.6} />
      <Ground k={k} from={150} color="#0B2A40" op={0.35} />
    </G>
  );
}

/* ------------------------------------------------------------------ 4. Spaccanapoli */

function Spaccanapoli({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#FFD2A0';
  // Prospettiva centrale: la strada dritta che taglia la città fino al punto di fuga.
  const VX = 300;
  const VY = 134;
  const bottom = (x: number, side: number) => H + 6 + ((VY - H - 6) * (side < 0 ? x + 10 : 610 - x)) / (VX + 10);
  const top = (x: number, side: number, y0: number) => y0 + ((VY - y0) * (side < 0 ? x + 10 : 610 - x)) / (VX + 10);
  // Palazzi: [da x, a x, altezza del tetto all'inizio della strada, colore].
  const left: [number, number, number, string][] = [
    [-10, 92, -40, '#E9A05E'],
    [92, 172, -18, '#D9785E'],
    [172, 226, -30, '#F2C77E'],
    [226, 262, -8, '#C8655A'],
    [262, 286, -24, '#EAB36F'],
  ];
  const right: [number, number, number, string][] = [
    [314, 338, -16, '#E7A86E'],
    [338, 374, -36, '#D47062'],
    [374, 428, -12, '#F0BE78'],
    [428, 508, -32, '#C9705C'],
    [508, 610, -20, '#E89C66'],
  ];
  const quad4 = (x1: number, x2: number, side: number, y0: number, v1: number, v2: number): Pt[] => {
    const at = (x: number, v: number) => top(x, side, y0) + (bottom(x, side) - top(x, side, y0)) * v;
    return [[x1, at(x1, v1)], [x2, at(x2, v1)], [x2, at(x2, v2)], [x1, at(x1, v2)]];
  };
  const facades = (list: typeof left, side: number) =>
    list.map(([x1, x2, y0, col], i) => {
      const shade = side > 0 ? mix(col, '#6A2A4A', 0.18) : col;
      const fog = mix(shade, sky, Math.max(0, 1 - Math.abs(x1 - VX) / 220) * 0.45);
      const ws: string[] = [];
      const shops: string[] = [];
      const w = x2 - x1;
      const cols = w > 60 ? 3 : w > 30 ? 2 : 1;
      for (let j = 0; j < cols; j++) {
        const a = x1 + w * ((j + 0.3) / cols);
        const b = x1 + w * ((j + 0.7) / cols);
        for (const [v1, v2] of [[0.22, 0.36], [0.46, 0.6]]) ws.push(poly(quad4(a, b, side, y0, v1, v2)));
        shops.push(poly(quad4(a - w * 0.06, b + w * 0.06, side, y0, 0.76, 1)));
      }
      return (
        <G key={`${side}${i}`}>
          <Path d={poly(quad4(x1, x2, side, y0, 0, 1))} fill={c(fog)} />
          <Path d={poly(quad4(x1, x2, side, y0, 0, 0.035))} fill={c('#FFF0D8')} opacity={0.7} />
          <Path d={ws.join('')} fill={c(mix('#4A2036', fog, 0.25))} />
          <Path d={shops.join('')} fill={c(i % 2 ? '#FFD27A' : mix('#A53A4E', fog, 0.15))} />
        </G>
      );
    });
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#FF9B6A'], [0.6, '#FFC08E'], [1, '#FFE3B6']])}
        {lin(k, 'street', [[0, '#C8A094'], [1, '#5E4250']])}
        {lin(k, 'dome', [[0, '#F7D25A'], [1, '#3E9B6C']], [0, 0, 1, 0])}
      </Defs>
      <Fill k={k} name="sky" />
      {/* Il campanile e la cupola di maiolica, oltre i tetti. */}
      <Path d="M250 140V64H276V140ZM253 64L263 40L273 64ZM256 60h14v-6h-14z" fill={c(mix('#D9A58E', sky, 0.35))} />
      <Path d={arches([[256, 74, 6, 12], [264, 74, 6, 12], [256, 100, 6, 12], [264, 100, 6, 12]])} fill={c(mix('#8A4A5A', sky, 0.4))} />
      <Path d="M262 38h2v-6h-2z" fill={c(mix('#8A4A5A', sky, 0.4))} />
      <Path d="M326 140V96H384V140Z" fill={c(mix('#E3B39A', sky, 0.35))} />
      <Path d="M328 98A27 32 0 0 1 382 98Z" fill={k.url('dome')} opacity={0.85} />
      <Path d="M336 98Q340 74 355 66M346 98Q348 72 355 66M364 98Q362 72 355 66M374 98Q370 74 355 66" stroke={c('#2E6E5A')} strokeWidth={1.2} fill="none" opacity={0.6} />
      <Path d="M351 66h8v-10h-8zM354 56h2v-6h-2z" fill={c(mix('#B07A6A', sky, 0.3))} />
      {facades(left, -1)}
      {facades(right, 1)}
      <Festoon k={k} a={[120, 40]} b={[480, 40]} sag={14} n={15} />
      <Path d={poly([[-10, 206], [VX - 14, VY + 6], [VX + 14, VY + 6], [610, 206]])} fill={k.url('street')} />
      <Path d={poly([[260, 206], [VX - 3, VY + 8], [VX + 3, VY + 8], [340, 206]])} fill={c('#FFE2B0')} opacity={0.22} />
      <Ground k={k} from={120} op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 5. La Galleria */

function Galleria({ k }: { k: Ctx }) {
  const { c } = k;
  const iron = '#4A4258';
  const CX = 300;
  const CY = 150;
  const RX = 146;
  const RY = 124;
  // Meridiani e paralleli della cupola di vetro.
  const merid = [0.2, 0.42, 0.62, 0.8, 0.94]
    .map(f => `M${CX - RX * f} ${CY}A${r1(RX * f)} ${RY} 0 0 1 ${CX + RX * f} ${CY}`)
    .join('') + `M${CX} ${CY}V${CY - RY}`;
  const paral = [0.28, 0.55, 0.78]
    .map(f => {
      const y = CY - RY * f;
      const hw = RX * Math.sqrt(1 - f * f);
      return `M${r1(CX - hw)} ${r1(y)}Q${CX} ${r1(y + 10 * (1 - f))} ${r1(CX + hw)} ${r1(y)}`;
    })
    .join('');
  // Le volte a botte dei bracci, ai lati.
  const vaultRibs = Array.from({ length: 10 }, (_, i) => {
    const x = i < 5 ? 8 + i * 30 : 448 + (i - 5) * 30;
    return `M${x} 70Q${x + 15} 24 ${x + 30} 70`;
  }).join('');
  const arcade = (y: number, h: number, w: number, xs: number[]) => xs.map(x => [x, y, w, h]);
  const sideX = [12, 58, 104, 466, 512, 558];
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#8FB4E8'], [0.55, '#E9CFE2'], [1, '#FFD9B8']])}
        {lin(k, 'glass', [[0, '#F4FAFF', 0.7], [0.6, '#D8E6FA', 0.35], [1, '#FFE6C8', 0.2]])}
        {lin(k, 'stone', [[0, '#F6E6CC'], [1, '#D9BFA0']])}
        {lin(k, 'rays', [[0, '#FFFFFF', 0.4], [1, '#FFFFFF', 0]])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={360} y={40} r={130} color="#FFF4D6" op={0.75} />
      {/* Volte di vetro dei bracci. */}
      <Path d="M0 70V24H600V70Z" fill={k.url('glass')} />
      <Path d={vaultRibs} stroke={c(iron)} strokeWidth={1.6} fill="none" opacity={0.85} />
      <Path d="M0 46H600" stroke={c(iron)} strokeWidth={1} opacity={0.6} />
      {/* La cupola. */}
      <Path d={`M${CX - RX} ${CY}A${RX} ${RY} 0 0 1 ${CX + RX} ${CY}Z`} fill={k.url('glass')} />
      <Path d={merid + paral} stroke={c(iron)} strokeWidth={1.8} fill="none" />
      <Path d={`M${CX - RX} ${CY}A${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`} stroke={c(iron)} strokeWidth={4} fill="none" />
      <Path d={`M${CX - 12} ${CY - RY + 2}H${CX + 12}V${CY - RY - 8}H${CX - 12}Z`} fill={c(iron)} />
      <Path d={`M${CX - 8} ${CY - RY - 8}A8 6 0 0 1 ${CX + 8} ${CY - RY - 8}Z`} fill={c('#C8A15A')} />
      <Path d="M262 30L222 200H252L282 34ZM318 34L348 200H378L338 30Z" fill={k.url('rays')} />
      <Path d="M300 26L270 200H330Z" fill={k.url('rays')} />
      {/* Le pareti dei bracci con due ordini di archi. */}
      <Path d="M0 70H160V200H0ZM440 70H600V200H440Z" fill={k.url('stone')} />
      <Path d={arches([...arcade(82, 34, 30, sideX), ...arcade(130, 70, 30, sideX)])} fill={c('#7E6E86')} opacity={0.75} />
      <Path d={arches([...arcade(86, 30, 22, sideX.map(x => x + 4))])} fill={c('#BFD3F2')} opacity={0.7} />
      <Path d={rects([[0, 66, 160, 6], [440, 66, 160, 6], [0, 122, 160, 4], [440, 122, 160, 4]])} fill={c('#C8A15A')} />
      {/* Il cornicione sotto la cupola e il grande arco d'ingresso. */}
      <Path d={rects([[140, 150, 320, 12]])} fill={c('#F2DDBE')} />
      <Path d={rects([[140, 148, 320, 3], [140, 160, 320, 2]])} fill={c('#C8A15A')} />
      <Path d="M140 162H460V200H140Z" fill={k.url('stone')} />
      <Path d={arches([[262, 166, 76, 40], [176, 172, 44, 34], [380, 172, 44, 34]])} fill={c('#6E5E7E')} opacity={0.8} />
      <Path d={rects([[150, 162, 6, 38], [236, 162, 6, 38], [358, 162, 6, 38], [444, 162, 6, 38]])} fill={c('#E8D2B0')} />
      <Ground k={k} from={130} color="#3A2A4A" op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 6. Il Gran Caffè */

function GranCaffe({ k }: { k: Ctx }) {
  const { c } = k;
  const wood = '#1F4A36';
  const gold = '#E8C066';
  const wins = [[112, 98, 72, 74], [416, 98, 72, 74]];
  const upper: number[][] = [];
  for (const x of [118, 196, 274, 352, 430]) upper.push([x + 12, 12, 26, 38]);
  const sideUp: number[][] = [];
  for (const x of [14, 50, 534, 570]) for (const y of [20, 76]) sideUp.push([x, y, 18, 30]);
  const lit = [upper[1], upper[3]];
  // Tavolino tondo con due sedie, centrato in x.
  const table = (x: number, s: number) => {
    const ch = (dx: number, dir: number) =>
      `M${r1(x + dx)} ${r1(200 - 2 * s)}V${r1(200 - 26 * s)}h${r1(dir * 3 * s)}V${r1(200 - 14 * s)}h${r1(dir * 10 * s)}v${r1(3 * s)}h${r1(-dir * 10 * s)}V${r1(200 - 2 * s)}Z`;
    return {
      chairs: ch(-26 * s, 1) + ch(26 * s, -1),
      leg: `M${r1(x - 1.2 * s)} ${r1(200 - 22 * s)}h${r1(2.4 * s)}v${r1(20 * s)}h${r1(-2.4 * s)}z`,
      top: [x, 200 - 22 * s, 14 * s, 3.2 * s] as const,
    };
  };
  const tables = [table(70, 1), table(196, 1.15), table(404, 1.15), table(530, 1)];
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#1E2460'], [0.7, '#4A3C8E'], [1, '#8A5AA6']])}
        {lin(k, 'facade', [[0, '#C7A68E'], [1, '#9C7A72']])}
        {lin(k, 'warm', [[0, '#FFE6A8'], [1, '#FFB24C']])}
        {lin(k, 'walk', [[0, '#6A5468'], [1, '#2E2236']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Path d={dots([[40, 14, 1], [150, 8, 0.9], [262, 16, 1.1], [410, 6, 1], [520, 18, 0.9], [580, 8, 1.1]])} fill={c('#FFFFFF')} opacity={0.8} />
      {/* Palazzi accanto, più scuri, e il palazzo del caffè. */}
      <Path d="M0 200V8H96V200ZM504 200V8H600V200Z" fill={c('#5E4A66')} />
      <Path d={rects(sideUp)} fill={c('#3A2A48')} />
      <Path d="M96 200V30H504V200Z" fill={k.url('facade')} />
      <Path d={rects([[90, 24, 420, 8]])} fill={c('#E9D3BC')} />
      <Path d={arches(upper)} fill={c('#4A3550')} />
      <Path d={arches(lit)} fill={c('#FFD48A')} />
      <Path d={rects(upper.map(([x, y, w, h]) => [x - 4, y + h, w + 8, 3]))} fill={c('#E9D3BC')} />
      {/* La vetrina: legno verde, ottone, finestre calde. */}
      <Path d="M100 200V64H500V200Z" fill={c(wood)} />
      <Path d={rects([[100, 64, 400, 3], [106, 88, 388, 2]])} fill={c(gold)} />
      <Path d="M210 70H390V86H210Z" fill={c('#163A2A')} />
      <Path d="M210 70H390V86H210Z" stroke={c(gold)} strokeWidth={1.4} fill="none" />
      {/* Sull'insegna solo un fregio: una tazzina tra due volute. */}
      <Path d="M292 74H306V80Q306 83 299 83Q292 83 292 80ZM306 75.5Q310 75.5 310 78Q310 80 306 80" stroke={c(gold)} strokeWidth={1.2} fill="none" />
      <Path d="M236 78Q248 72 260 78Q272 84 284 78M316 78Q328 72 340 78Q352 84 364 78" stroke={c(gold)} strokeWidth={1.2} fill="none" />
      <Path d={arches(wins)} fill={k.url('warm')} />
      <Path d={arches([[252, 100, 96, 100]])} fill={k.url('warm')} />
      <Path d={rects([[298.5, 100, 3, 100], [112, 132, 72, 2], [416, 132, 72, 2], [146.5, 98, 3, 74], [450.5, 98, 3, 74]])} fill={c(wood)} />
      {/* Dentro: lampade a globo, banco e mensole. */}
      <Path d={rects([[258, 160, 84, 40], [118, 150, 60, 3], [422, 150, 60, 3], [118, 140, 60, 2], [422, 140, 60, 2]])} fill={c('#8A4E2A')} opacity={0.8} />
      <Path d={rects([[258, 160, 84, 3]])} fill={c(gold)} />
      <Path d="M276 100V114M324 100V114M148 98V108M452 98V108" stroke={c('#8A4E2A')} strokeWidth={1} />
      <Path d={dots([[276, 118, 5], [324, 118, 5], [148, 112, 4.5], [452, 112, 4.5]])} fill={c('#FFF6DA')} />
      <Path d={rects([[112, 172, 72, 4], [416, 172, 72, 4], [248, 96, 104, 4]])} fill={c(gold)} />
      {/* Lanterne sulla facciata. */}
      <Glow k={k} name="l1" x={226} y={112} r={20} color="#FFD98A" op={0.6} />
      <Glow k={k} name="l2" x={374} y={112} r={20} color="#FFD98A" op={0.6} />
      <Path d="M226 100V104M374 100V104" stroke={c(gold)} strokeWidth={1.6} />
      <Path d={dots([[226, 112, 7], [374, 112, 7]])} fill={c('#FFF1C4')} />
      <Path d="M0 186H600V200H0Z" fill={k.url('walk')} />
      <Ground k={k} from={150} color="#120A24" op={0.4} />
      {/* I tavolini di marmo e le sedie da bistrot. */}
      <Path d={tables.map(t => t.chairs).join('')} fill={c('#1A1222')} />
      <Path d={tables.map(t => t.leg).join('')} fill={c(gold)} />
      {tables.map((t, i) => (
        <Ellipse key={i} cx={t.top[0]} cy={t.top[1]} rx={t.top[2]} ry={t.top[3]} fill={c('#F6F0E8')} />
      ))}
    </G>
  );
}

/* ------------------------------------------------------------------ 7. Posillipo */

/** La chioma piatta di un pino marittimo: nuvole sovrapposte (e, con `top`, la luce sui lobi). */
function pine(cx: number, cy: number, w: number, top = false) {
  const h = w * 0.2;
  const lobes: number[][] = [];
  for (let i = 0; i < 5; i++) {
    const x = cx - w / 2 + (w * (i + 0.5)) / 5;
    const r = w / 6.5;
    if (top) lobes.push([x - r * 0.1, cy - (i % 2 ? h * 0.3 : 0) - r * 0.22, r * 0.8]);
    else lobes.push([x, cy - (i % 2 ? h * 0.3 : 0), r]);
  }
  const base = top ? '' : `M${r1(cx - w / 2)} ${r1(cy + h * 0.5)}Q${r1(cx)} ${r1(cy + h * 1.4)} ${r1(cx + w / 2)} ${r1(cy + h * 0.5)}Z`;
  return base + dots(lobes.map(([x, y, r]) => [r1(x), r1(y), r1(r)]));
}

function Posillipo({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#FF9E7A';
  const balusters: string[] = [];
  for (let x = 2; x < W; x += 12) balusters.push(`M${x} 182h8q-3 4-1 7q4 4-1 9h-4q-5-5-1-9q2-3-1-7z`);
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#5B2E8E'], [0.38, '#C84C8C'], [0.72, '#FF8A5C'], [1, '#FFC873']])}
        {lin(k, 'sea', [[0, '#C0608E'], [0.4, '#7A3E92'], [1, '#2A1650']])}
        {lin(k, 'stone', [[0, '#F7E6DA'], [1, '#C9A6B8']])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={300} y={112} r={120} color="#FFE2A0" op={0.85} />
      <Circle cx={300} cy={112} r={22} fill={c('#FFF1C8')} />
      {/* Le isole e la costa lontana, il Vesuvio a destra. */}
      <Path d="M0 120V114Q30 108 60 112Q90 104 130 116L150 120Z" fill={c(mix('#8A4A8E', sky, 0.45))} />
      <Path d="M410 120L456 100Q472 88 486 86L494 90Q506 80 520 78H532Q552 96 600 108V120Z" fill={c(mix('#7A3E86', sky, 0.4))} />
      <Path d="M0 120H600V200H0Z" fill={k.url('sea')} />
      {/* Il riflesso del sole sull'acqua. */}
      <Path d={rects([[280, 122, 40, 2], [270, 128, 60, 2], [284, 134, 32, 2], [262, 141, 76, 2.2], [288, 149, 24, 2.2], [254, 158, 92, 2.4], [276, 167, 48, 2.4]])} fill={c('#FFE2A0')} opacity={0.8} />
      {/* I pini marittimi che incorniciano il golfo. */}
      <Path d="M150 200Q146 140 168 92Q176 74 172 52" stroke={c('#3A1A3E')} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d="M166 94Q150 76 128 70" stroke={c('#3A1A3E')} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d={pine(168, 44, 190) + pine(108, 66, 92)} fill={c('#2E1840')} />
      <Path d={pine(168, 44, 190, true) + pine(108, 66, 92, true)} fill={c('#3B1E4E')} />
      <Path d="M470 200Q480 130 462 84Q456 62 466 40" stroke={c('#3A1A3E')} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d={pine(468, 34, 210)} fill={c('#2E1840')} />
      <Path d={pine(468, 34, 210, true)} fill={c('#3B1E4E')} />
      {/* La terrazza: balaustra e un vaso di gerani. */}
      <Path d={balusters.join('')} fill={k.url('stone')} />
      <Path d="M0 176H600V183H0ZM0 194H600V200H0Z" fill={c('#F7E6DA')} />
      <Path d="M0 176H600V178H0Z" fill={c('#FFFFFF')} opacity={0.7} />
      <Path d="M206 176L210 162H230L234 176Z" fill={c('#C8603A')} />
      <Path d={dots([[214, 158, 7], [224, 156, 8], [232, 160, 6]])} fill={c('#2F6A4A')} />
      <Path d={dots([[212, 154, 2.4], [222, 151, 2.6], [229, 155, 2.4], [218, 158, 2]])} fill={c('#FF4F7B')} />
      <Ground k={k} from={140} color="#1E0A36" op={0.4} />
    </G>
  );
}

/* ------------------------------------------------------------------ 8. Capri */

function Capri({ k }: { k: Ctx }) {
  const { c } = k;
  const sky = '#CFEFF7';
  const lit = '#E8C3A0';
  const shade = '#A9807A';
  const houses = [[20, 112, 22, 14], [46, 104, 18, 22], [68, 114, 24, 12], [30, 92, 16, 14], [96, 120, 18, 10], [54, 86, 14, 12]];
  return (
    <G>
      <Defs>
        {lin(k, 'sky', [[0, '#4FA9E8'], [0.6, '#A8DDF3'], [1, '#F2F6E6']])}
        {lin(k, 'sea', [[0, '#3BC6D2'], [0.35, '#22B8C8'], [1, '#0A5E96']])}
        {lin(k, 'rock', [[0, lit], [1, shade]], [0, 0, 1, 0])}
      </Defs>
      <Fill k={k} name="sky" />
      <Glow k={k} name="sun" x={420} y={30} r={110} color="#FFFBEA" op={0.7} />
      {/* La penisola sorrentina all'orizzonte. */}
      <Path d="M380 120L430 108Q470 100 520 106Q560 104 600 98V120Z" fill={c(mix('#7FA0C8', sky, 0.55))} />
      <Path d="M0 120H600V200H0Z" fill={k.url('sea')} />
      {/* I Faraglioni: Stella, di Mezzo (con l'arco) e di Fuori. */}
      <Path d="M206 132L214 82Q222 56 240 50Q258 48 270 62Q284 80 290 132Z" fill={k.url('rock')} />
      <Path d="M240 50Q258 48 270 62Q284 80 290 132H272Q270 92 252 66Z" fill={c(shade)} opacity={0.55} />
      <Path d="M296 132L302 98Q308 80 324 78Q344 78 352 96L358 132H338V120Q338 110 328 110Q318 110 318 120V132Z" fill={k.url('rock')} />
      <Path d="M340 82Q350 86 352 96L358 132H344Q348 100 340 82Z" fill={c(shade)} opacity={0.55} />
      <Path d="M366 132L372 92Q378 72 392 72Q404 74 408 92L412 132Z" fill={k.url('rock')} />
      <Path d="M396 73Q406 78 408 92L412 132H402Q404 96 396 73Z" fill={c(shade)} opacity={0.55} />
      <Path d="M226 64Q238 50 254 52Q262 56 266 62Q246 58 226 64ZM306 90Q316 78 334 80Q342 84 346 90Q326 86 306 90ZM376 84Q386 72 400 76Q404 80 405 84Q390 80 376 84Z" fill={c('#6E9A5A')} />
      <Path d="M200 132Q248 128 290 132Q300 129 318 132M338 132Q350 129 366 132Q392 129 418 132" stroke={c('#FFFFFF')} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.8} />
      <Path d={rects([[214, 138, 64, 2], [226, 144, 40, 2], [300, 138, 52, 2], [310, 144, 30, 2], [370, 138, 38, 2], [378, 143, 22, 2]])} fill={c('#0A5E7A')} opacity={0.35} />
      <Path d={clouds([[60, 34, 70], [470, 52, 60], [250, 24, 44]])} fill={c('#FFFFFF')} opacity={0.8} />
      {/* La costa di Capri a sinistra, con le case bianche. */}
      <Path d="M-10 200V70Q20 60 50 68Q90 76 110 100Q130 118 160 132Q176 148 170 170L180 200Z" fill={c('#C9A07E')} />
      <Path d="M-10 200V140Q40 132 90 150Q130 162 180 200Z" fill={c('#9C7A66')} />
      <Path d="M-10 92Q20 72 50 74Q70 78 84 96Q50 88 -10 110Z" fill={c('#5E8E4E')} />
      <Path d={rects(houses)} fill={c('#FFFFFF')} />
      <Path d={rects(houses.map(([x, y, w]) => [x + w * 0.3, y + 3, 4, 4]))} fill={c('#3E7BAE')} />
      <Path d={dots([[110, 112, 6], [118, 116, 5], [104, 118, 4]])} fill={c('#E6408A')} />
      {/* Una barca a vela e un motoscafo con la scia. */}
      <Path d="M472 150L472 108L498 148Z" fill={c('#FFFFFF')} />
      <Path d="M468 152L502 152L496 158H474Z" fill={c('#F4F0E8')} />
      <Path d="M300 176Q340 170 368 168L370 172Q342 174 300 180Z" fill={c('#FFFFFF')} opacity={0.6} />
      <Path d="M366 166H392L388 172H368Z" fill={c('#FFFFFF')} />
      <Path d="M372 166L378 161H386L388 166Z" fill={c('#9FE3FF')} />
      <Path d={rects([[440, 172, 40, 1.4], [520, 136, 30, 1.4], [150, 186, 40, 1.4], [440, 188, 50, 1.4]])} fill={c('#FFFFFF')} opacity={0.5} />
      {/* Un ramo di limone in primo piano. */}
      <Path d="M610 -4Q560 18 520 14" stroke={c('#4A5A2E')} strokeWidth={2.4} fill="none" />
      <Path d="M552 16Q540 28 526 30Q536 18 552 16ZM576 8Q574 22 562 30Q562 16 576 8ZM536 12Q522 4 508 8Q522 18 536 12ZM596 2Q600 18 592 26Q586 12 596 2Z" fill={c('#3E8A3E')} />
      <Ellipse cx={548} cy={30} rx={7} ry={9} fill={c('#FFD93A')} />
      <Ellipse cx={584} cy={26} rx={6} ry={8} fill={c('#FFD93A')} />
      <Ground k={k} from={150} color="#06304E" op={0.35} />
    </G>
  );
}

/* ------------------------------------------------------------------ 9. Teatro San Carlo */

function SanCarlo({ k }: { k: Ctx }) {
  const { c } = k;
  // Cinque ordini di palchi a ferro di cavallo: le file si curvano verso l'alto ai lati.
  const tiers = [0, 1, 2, 3, 4].map(i => {
    const yc = 38 + i * 26;
    const bend = 18 - i * 3.5;
    const y = (x: number) => yc - bend * ((x - 300) / 300) ** 2;
    const openings: number[][] = [];
    for (let j = -8; j <= 8; j++) {
      const u = j / 8;
      const x = 300 + Math.sign(u) * 330 * Math.abs(u) ** 1.2;
      const s = 1 + 0.5 * u * u;
      if (Math.abs(j) < 1 && (i === 1 || i === 2)) continue;
      openings.push([x - 11 * s, y(x) - 15 * s, 22 * s, 15 * s]);
    }
    let rail = `M-10 ${r1(y(-10))}`;
    for (let x = 20; x <= 610; x += 30) rail += `L${x} ${r1(y(x))}`;
    return { openings, rail };
  });
  const seatRows = [168, 180, 192]
    .map((y, i) => {
      let d = '';
      for (let x = 4 + (i % 2) * 7; x < W; x += 14) d += `M${x} ${y + 8}v-6a5 5 0 0 1 10 0v6z`;
      return d;
    })
    .join('');
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#5A0A1A'], [0.5, '#9A1A2E'], [1, '#5A0816']])}
        {lin(k, 'box', [[0, '#2A0408'], [1, '#6E0E1E']])}
        {lin(k, 'ceiling', [[0, '#FFE7A3'], [1, '#C98F2E']])}
        {lin(k, 'royal', [[0, '#C2283D'], [1, '#6E0A1A']])}
      </Defs>
      <Fill k={k} name="wall" />
      {/* Il soffitto dipinto. */}
      <Path d="M-10 -10H610V18Q300 40 -10 18Z" fill={k.url('ceiling')} />
      <Path d="M-10 18Q300 40 610 18" stroke={c('#7A4A10')} strokeWidth={1.4} fill="none" opacity={0.5} />
      {/* I palchi. */}
      {tiers.map((t, i) => (
        <G key={i}>
          <Path d={arches(t.openings)} fill={k.url('box')} />
          <Path d={t.rail} stroke={c('#E0B04A')} strokeWidth={3.2} fill="none" />
          <Path d={t.rail} stroke={c('#FFE7A3')} strokeWidth={1} fill="none" transform="translate(0 -1.2)" />
        </G>
      ))}
      {/* Il palco reale al centro, con la corona e i drappi. */}
      <Path d="M274 112V70A26 22 0 0 1 326 70V112Z" fill={k.url('royal')} />
      <Path d="M278 112V74A22 18 0 0 1 322 74V112Z" fill={c('#3A0610')} />
      <Path d="M278 74Q286 96 280 112H278ZM322 74Q314 96 320 112H322Z" fill={c('#C2283D')} />
      <Path d="M274 112V70A26 22 0 0 1 326 70V112" stroke={c('#E0B04A')} strokeWidth={2.6} fill="none" />
      <Path d="M286 46L290 36L295 43L300 32L305 43L310 36L314 46Z" fill={c('#FFE7A3')} />
      <Path d="M286 46H314V50H286Z" fill={c('#E0B04A')} />
      <Path d={dots([[290, 35, 1.5], [300, 31, 1.7], [310, 35, 1.5]])} fill={c('#FFF6D6')} />
      {/* Il lampadario. */}
      <Glow k={k} name="chand" x={300} y={30} r={70} color="#FFE7A3" op={0.7} />
      <Path d="M300 -2V14" stroke={c('#E0B04A')} strokeWidth={1.4} />
      <Path d="M276 22Q300 36 324 22L318 30Q300 40 282 30Z" fill={c('#E0B04A')} />
      <Path d="M286 16Q300 24 314 16L310 22Q300 28 290 22Z" fill={c('#FFE7A3')} />
      <Path d={dots([[278, 21, 2], [287, 26, 2], [300, 29, 2.2], [313, 26, 2], [322, 21, 2], [290, 15, 1.8], [300, 18, 1.8], [310, 15, 1.8]])} fill={c('#FFFBEA')} />
      {/* La platea. */}
      <Path d="M0 160H600V200H0Z" fill={c('#3A0610')} />
      <Path d={seatRows} fill={c('#B0182E')} />
      <Path d="M0 158H600V161H0Z" fill={c('#E0B04A')} />
      <Ground k={k} from={130} color="#1A0208" op={0.5} />
    </G>
  );
}

/* ------------------------------------------------------------------ 10. La Reggia */

function Reggia({ k }: { k: Ctx }) {
  const { c } = k;
  const gold = '#E8BE4F';
  // Il soffitto a cassettoni d'oro.
  const coffers: number[][] = [];
  for (let x = -6; x < W; x += 28) {
    coffers.push([x, 6, 22, 12]);
    coffers.push([x + 14, 24, 22, 10]);
  }
  // Colonne a coppie e archi verso la notte.
  const cols = [34, 50, 124, 140, 198, 214, 380, 396, 454, 470, 548, 564];
  const sideArches = [[66, 66, 52, 98], [146, 70, 46, 94], [408, 70, 46, 94], [482, 66, 52, 98]];
  const stars = seeded(5);
  const starDots: number[][] = [];
  for (const [x, y, w, h] of sideArches)
    for (let i = 0; i < 5; i++) starDots.push([x + 6 + stars() * (w - 12), y + 18 + stars() * (h * 0.5), 0.6 + stars() * 0.7]);
  // Lo scalone: gradini che si stringono salendo, con il tappeto rosso.
  const steps: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = 200 - t * 52;
    const hw = 140 - t * 72;
    steps.push(`M${r1(300 - hw)} ${r1(y)}H${r1(300 + hw)}`);
  }
  return (
    <G>
      <Defs>
        {lin(k, 'wall', [[0, '#0E1030'], [0.6, '#1E1E48'], [1, '#0A0A1E']])}
        {lin(k, 'night', [[0, '#0A1240'], [1, '#2A3A80']])}
        {lin(k, 'column', [[0, '#8A7A6A'], [0.45, '#F2E6CC'], [1, '#6A5A50']], [0, 0, 1, 0])}
        {lin(k, 'stairs', [[0, '#D8CCB8'], [1, '#6E6070']])}
        {lin(k, 'carpet', [[0, '#E0384E'], [1, '#7A0E22']])}
        {lin(k, 'portal', [[0, '#FFF0B8'], [1, '#E8A23C']])}
      </Defs>
      <Fill k={k} name="wall" />
      <Path d="M-10 -10H610V40Q300 56 -10 40Z" fill={c('#3A2A18')} />
      <Path d={rects(coffers)} fill={c(gold)} opacity={0.9} />
      <Path d={rects(coffers.map(([x, y, w, h]) => [x + 4, y + 3, w - 8, h - 6]))} fill={c('#8A5A12')} opacity={0.7} />
      <Path d="M-10 40Q300 56 610 40V46Q300 62 -10 46Z" fill={c(gold)} />
      {/* Gli archi laterali aperti sulla notte stellata. */}
      <Path d={arches(sideArches)} fill={k.url('night')} />
      <Path d={dots(starDots)} fill={c('#FFFFFF')} />
      <Path d={dots([[505, 92, 7]])} fill={c('#F2F0E0')} />
      <Path d={dots([[508, 90, 6]])} fill={c('#2A3A80')} />
      {/* Il grande portale in cima allo scalone, pieno di luce. */}
      <Glow k={k} name="portalGlow" x={300} y={110} r={110} color="#FFD27A" op={0.55} />
      <Path d={arches([[244, 56, 112, 96]])} fill={k.url('portal')} />
      <Path d={arches([[254, 66, 92, 86]])} fill={c('#FFF6D8')} opacity={0.5} />
      <Path d="M244 152V108A56 56 0 0 1 356 108V152" stroke={c(gold)} strokeWidth={3} fill="none" />
      <Path d="M292 50L296 42L300 48L304 42L308 50Z" fill={c(gold)} />
      {/* Le colonne. */}
      <Path d={rects(cols.map(x => [x, 54, 10, 110]))} fill={k.url('column')} />
      <Path d={rects(cols.map(x => [x - 3, 50, 16, 6]).concat(cols.map(x => [x - 3, 162, 16, 6])))} fill={c(gold)} />
      <Path d="M0 168H600V200H0Z" fill={c('#141230')} />
      <Path d="M0 168H600V170H0Z" fill={c(gold)} opacity={0.7} />
      {/* Lo scalone. */}
      <Path d="M160 200L228 148H372L440 200Z" fill={k.url('stairs')} />
      <Path d={steps.join('')} stroke={c('#5A4A5A')} strokeWidth={1} opacity={0.6} />
      <Path d="M268 200L290 148H310L332 200Z" fill={k.url('carpet')} />
      <Path d="M160 200L228 148V140L152 196ZM440 200L372 148V140L448 196Z" fill={c('#E9DCC4')} />
      {/* I candelabri d'oro ai lati della scala. */}
      <Glow k={k} name="c1" x={196} y={112} r={44} color="#FFD27A" op={0.7} />
      <Glow k={k} name="c2" x={404} y={112} r={44} color="#FFD27A" op={0.7} />
      <Path d="M194 166V124H198V166ZM402 166V124H406V166ZM184 122H208L204 128H188ZM392 122H416L412 128H396ZM188 176L196 162L204 176ZM396 176L404 162L412 176Z" fill={c(gold)} />
      <Path d={dots([[188, 116, 2.4], [196, 112, 2.8], [204, 116, 2.4], [396, 116, 2.4], [404, 112, 2.8], [412, 116, 2.4]])} fill={c('#FFF6D8')} />
      <Ground k={k} from={150} color="#05040E" op={0.55} />
    </G>
  );
}

/* ------------------------------------------------------------------ la scena */

const SCENES: Record<string, (p: { k: Ctx }) => ReactNode> = {
  vicolo: Vicolo,
  mercato: Mercato,
  mergellina: Mergellina,
  spaccanapoli: Spaccanapoli,
  galleria: Galleria,
  'gran-caffe': GranCaffe,
  posillipo: Posillipo,
  capri: Capri,
  'san-carlo': SanCarlo,
  reggia: Reggia,
};

/**
 * L'illustrazione di un'arena, a riempire width×height (da circa 1:1 a 3:1, il soggetto resta al centro).
 * `dim` per le arene non ancora raggiunte: la stessa scena di notte, scura e desaturata.
 */
export const ArenaScene = memo(function ArenaScene({ id, width, height, dim }: { id: string; width: number; height: number; dim?: boolean }) {
  const uid = 'as' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const Scene = SCENES[id] ?? Vicolo;
  const k: Ctx = {
    c: dim ? night : (hex: string) => hex,
    dim: !!dim,
    id: name => `${uid}-${name}`,
    url: name => `url(#${uid}-${name})`,
  };
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Scene k={k} />
      {dim ? <Rect x={0} y={0} width={W} height={H} fill="#0A0618" opacity={0.25} /> : null}
    </Svg>
  );
});
