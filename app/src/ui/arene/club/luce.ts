// «Il Club dei Signori»: la luce calcolata (docs/direzione-artistica.md §5.3, 5.14).
//
// Due luci sole, come nella stanza vera:
// - la LAMPADA verde da biliardo sopra il tavolo (#FFD9A0, calda): forte, cade verso il basso a cono, si spegne
//   in fretta con la distanza; sopra il paralume quasi niente;
// - la LUNA dalla finestra di fondo (#CFE2FF, fredda): debole, da in alto a destra e da dietro; prende i lati che
//   guardano la finestra e cresce avvicinandosi al fondo.
// Ogni faccia di un oggetto ha il colore del suo materiale moltiplicato per la luce che riceve in quel punto con
// quella normale (Lambert). Così i lati verso la lampada sono caldi, quelli verso la finestra hanno il filo
// freddo, e tutto quello che è lontano da tutte e due scende nel bruno della sala. Con `spenta` (arena non
// ancora raggiunta: «luci spente») resta solo la luna e una luce di servizio debolissima.
//
// Funzioni pure.
import { LAMPADA, STANZA, type V3 } from './camera';

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const esa = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

export function mescola(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return esa(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}

const len = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const norm = (v: V3): V3 => {
  const l = len(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const liscio = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Verso la luna (da dove viene la luce fredda): in alto, un poco a destra, dietro la finestra. */
export const VERSO_LUNA: V3 = norm([0.2, 0.52, 1]);

const CALDA: V3 = [1, 0.85, 0.63];
const FREDDA: V3 = [0.72, 0.84, 1];
const AMBIENTE: V3 = [1, 0.93, 0.9];

export interface Luci {
  /** Luci spente: niente lampada, solo luna e servizio. */
  spenta?: boolean;
}

/** Quanta luce della lampada arriva in p su una faccia con normale n (0…~1). */
export function lampada(p: V3, n: V3): number {
  const d: V3 = [LAMPADA[0] - p[0], LAMPADA[1] - p[1], LAMPADA[2] - p[2]];
  const dist = len(d);
  const L: V3 = [d[0] / dist, d[1] / dist, d[2] / dist];
  const lambert = Math.max(0, dot(norm(n), L));
  // Il paralume manda la luce in basso: sopra la sua altezza ne passa pochissima.
  const giu = (LAMPADA[1] - p[1]) / dist;
  const cono = p[1] > LAMPADA[1] - 0.02 ? 0.08 : 0.22 + 0.78 * liscio(0.1, 0.78, giu);
  return (lambert * cono * 1.35) / (1 + (dist / 1.9) ** 2);
}

/** Quanta luna: debole, cresce verso la finestra. */
export function luna(p: V3, n: V3): number {
  const vicino = Math.max(0, Math.min(1, (p[2] - 1.5) / (STANZA.fondo - 1.5)));
  return Math.max(0, dot(norm(n), VERSO_LUNA)) * (0.08 + 0.3 * vicino * vicino);
}

/** Il colore di un materiale `base` nel punto p con normale n. `forza` scala la lampada (es. 0 per l'ombra). */
export function illumina(base: string, p: V3, n: V3, o: Luci = {}, forza = 1): string {
  const [r, g, b] = rgb(base);
  const w = o.spenta ? 0 : lampada(p, n) * forza;
  const m = luna(p, n) * (o.spenta ? 1.25 : 1);
  const a = o.spenta ? 0.17 : 0.3;
  const k = (i: 0 | 1 | 2) => a * AMBIENTE[i] + w * CALDA[i] * 1.75 + m * FREDDA[i] * 1.2;
  return esa(r * k(0), g * k(1), b * k(2));
}

/** Normali delle facce principali. */
export const N = {
  su: [0, 1, 0] as V3,
  giu: [0, -1, 0] as V3,
  fronte: [0, 0, -1] as V3,
  sinistra: [-1, 0, 0] as V3,
  destra: [1, 0, 0] as V3,
};

/** I materiali della sala, come colori pieni (prima della luce). Sono quelli di Lampara (token.ts). */
export const MAT = {
  noce: '#7A4E30',
  noceScuro: '#4A2E1C',
  noceFondo: '#3B2418',
  cuoio: '#9A4A2A',
  cuoioScuro: '#6A2E1A',
  ottone: '#E2BC6A',
  ottoneScuro: '#8A6526',
  velluto: '#24406E',
  vellutoScuro: '#14264A',
  marmo: '#EDE6DA',
  parquet: '#6A4428',
  parquetScuro: '#4E301C',
  tappeto: '#561722',
  tappetoBordo: '#2A1A3A',
  tappetoOro: '#C9A15A',
  vetroVerde: '#1E7A4A',
  muro: '#3A3226',
  libri: ['#7A1E2A', '#1E3A5A', '#2E5A3A', '#8A6A3A', '#5A2A4A', '#A85A2A', '#2A2A3A'],
} as const;
