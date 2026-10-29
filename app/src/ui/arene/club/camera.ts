// «Il Club dei Signori»: la stanza in metri e la camera che la guarda (docs/direzione-artistica.md §5.14).
//
// La scena non è un disegno a misura fissa: è una stanza vera (x a destra, y in alto, z in profondità, in metri)
// vista da una camera con prospettiva a un punto di fuga e le verticali dritte (come una foto d'architettura,
// con lo spostamento dell'obiettivo invece dell'inclinazione). Ogni inquadratura (3:1 nella strada delle arene,
// circa 1:1 nella home, verticale a tutto schermo in «Esplora») è la stessa stanza vista da un punto diverso:
// più indietro e più bassa quando è larga, più vicina e più alta quando è stretta. Così il tavolo, la lampada e
// la finestra restano sempre dentro, e la profondità è sempre giusta.
//
// Funzioni pure, nessun React: si possono provare e usare in qualsiasi piano.

export type V3 = readonly [number, number, number];
export type Pt = [number, number];

/** Le misure della stanza e degli arredi (metri). */
export const STANZA = {
  /** Pareti laterali in x = ±mezza, pavimento y = 0, soffitto y = alto, parete di fondo z = fondo. */
  mezza: 3.7,
  alto: 3.9,
  fondo: 8.6,
  /** Fin dove arrivano le pareti verso la camera (la stanza continua dietro di lei). */
  inizio: -4.5,
  /** Il tavolo da gioco: centro, altezza del piano, misure (le proporzioni del panno vero, 0,56). */
  tavolo: { z: 4.3, y: 0.78, w: 1.72, d: 0.96, spessore: 0.1 },
  /** La lampada da biliardo sopra il tavolo: bordo basso del paralume e lunghezza. */
  lampada: { y: 1.62, alto: 0.24, lungo: 0.98, raggio: 0.2 },
  /** La finestra ad arco sulla parete di fondo: centro x 0, davanzale, imposta dell'arco, larghezza, spessore del muro. */
  finestra: { davanzale: 1.25, imposta: 2.7, w: 1.66, muro: 0.38 },
} as const;

/** La posizione delle lampadine, sotto il paralume: da qui parte la luce calda. */
export const LAMPADA: V3 = [0, STANZA.lampada.y - 0.04, STANZA.tavolo.z];

export interface Camera {
  /** Altezza dell'occhio e posizione della camera in z (x è sempre 0: la scena è simmetrica). */
  ye: number;
  zc: number;
  /** Punti dello schermo per unità normalizzata (x / distanza). */
  s: number;
  /** Il punto di fuga (dove va a finire l'asse della camera) in coordinate della tela disegnata. */
  cx: number;
  cy: number;
  /** La tela disegnata: la vista più il margine per la parallasse (m per lato). */
  w: number;
  h: number;
  m: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Proietta un punto della stanza sulla tela. */
export function pr(c: Camera, x: number, y: number, z: number): Pt {
  const d = Math.max(0.05, z - c.zc);
  return [c.cx + (c.s * x) / d, c.cy - (c.s * (y - c.ye)) / d];
}

/** La scala (punti per metro) alla profondità z. */
export const scala = (c: Camera, z: number) => c.s / Math.max(0.05, z - c.zc);

export const r1 = (n: number) => Math.round(n * 10) / 10;

/** Un poligono di punti della stanza, come path SVG. */
export function poli(c: Camera, pts: readonly V3[]): string {
  return 'M' + pts.map(p => pr(c, p[0], p[1], p[2])).map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';
}

/** Un poligono di punti già sullo schermo. */
export const poli2 = (pts: readonly Pt[]) => 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';

/** Un rettangolo verticale parallelo alla parete di fondo, a profondità z: [x0, y0, x1, y1]. */
export function frontale(c: Camera, z: number, x0: number, y0: number, x1: number, y1: number): string {
  return poli(c, [
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
  ]);
}

/** Un rettangolo orizzontale (pavimento, piano, mensola) all'altezza y: da x0 a x1, da z0 a z1. */
export function orizzontale(c: Camera, y: number, x0: number, x1: number, z0: number, z1: number): string {
  return poli(c, [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ]);
}

/** Un rettangolo su una parete laterale (x fisso): da z0 a z1, da y0 a y1. */
export function laterale(c: Camera, x: number, z0: number, z1: number, y0: number, y1: number): string {
  return poli(c, [
    [x, y0, z0],
    [x, y0, z1],
    [x, y1, z1],
    [x, y1, z0],
  ]);
}

export type Modo = 'scena' | 'esplora';

/**
 * Sceglie dove sta la camera e come inquadra, per una vista larga `w` × alta `h` (più `m` punti di margine per
 * lato, disegnati ma fuori dalla vista, per la parallasse).
 * - Larga (3:1): camera bassa e indietro, si vede la sala intera, il tavolo piccolo al centro.
 * - Circa quadrata: più vicina e più alta, il tavolo si legge bene.
 * - Verticale («Esplora»): vicina e alta, il tavolo grande; sopra il soffitto a cassettoni, sotto il pavimento.
 * Dentro deve sempre stare il «necessario»: la finestra con la luna, la lampada, il tavolo con le gambe, le
 * poltrone (in «Esplora» solo il loro bracciolo: le si vede girando lo sguardo).
 */
export function inquadra(w: number, h: number, modo: Modo = 'scena', m = 0): Camera {
  const A = w / Math.max(1, h);
  const t = clamp01((A - 0.5) / (3 - 0.5));
  const T = STANZA.tavolo;
  const esplora = modo === 'esplora';
  // L'occhio sta sotto la lampada (1,45 m: seduto al tavolo vicino): il paralume si vede di lato, con la bocca accesa.
  const ye = esplora ? lerp(1.5, 1.45, t) : lerp(1.52, 1.42, t);
  const zc = esplora ? lerp(0.7, -1.2, t) : lerp(0.1, -2.6, t);
  const F = STANZA.finestra;
  // Il necessario, in coordinate normalizzate (x / d, y / d).
  const half = esplora ? lerp(1.05, 1.9, t) : lerp(1.75, 2.15, t);
  const E: V3[] = [
    [0, F.imposta + F.w / 2 + 0.05, STANZA.fondo], // cima dell'arco
    [0, LAMPADA[1] + 0.35, T.z],
    [-half, 0, T.z + 0.9],
    [half, 0, T.z + 0.9],
    [-T.w / 2, 0, T.z - T.d / 2 - 0.12], // piedi davanti del tavolo
    [T.w / 2, 0, T.z - T.d / 2 - 0.12],
  ];
  let nx0 = Infinity;
  let nx1 = -Infinity;
  let ny0 = Infinity;
  let ny1 = -Infinity;
  for (const [x, y, z] of E) {
    const d = z - zc;
    nx0 = Math.min(nx0, x / d);
    nx1 = Math.max(nx1, x / d);
    ny0 = Math.min(ny0, (y - ye) / d);
    ny1 = Math.max(ny1, (y - ye) / d);
  }
  const pad = esplora ? 1.04 : 1.1;
  // In «Esplora» il terzo basso dello schermo è per la targa col nome: la scena si compone nei due terzi alti.
  const hu = esplora ? h * 0.7 : h;
  const s = Math.min(w / ((nx1 - nx0) * pad), hu / ((ny1 - ny0) * pad));
  const yc = (ny0 + ny1) / 2;
  return { ye, zc, s, cx: m + w / 2, cy: m + hu / 2 + s * yc, w: w + 2 * m, h: h + 2 * m, m };
}

/** Fin dove disegnare la stanza verso la camera: mai dietro di lei. */
export const inizio = (c: Camera) => Math.max(STANZA.inizio, c.zc + 0.35);

/** La stessa camera su una tela più alta di `dy` punti sopra e sotto (un piano della parallasse che sporge). */
export function sporgente(c: Camera, dy: number): Camera {
  return { ...c, cy: c.cy + dy, h: c.h + 2 * dy };
}
