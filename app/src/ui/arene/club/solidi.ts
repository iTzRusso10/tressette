// «Il Club dei Signori»: i mobili come solidi veri (scatole e cilindri a facce), illuminati e ordinati.
//
// Ogni mobile si costruisce nelle sue coordinate (metri, fronte verso −z), si gira (imbardata) e si posa nella
// stanza. Poi: si tolgono le facce che non guardano la camera, si colora ogni faccia con la luce che riceve
// (luce.ts) e si disegnano dalla più lontana alla più vicina. Funzioni pure, nessun React.
import { pr, r1, type Camera, type V3 } from './camera';
import { illumina, type Luci } from './luce';

export interface Faccia {
  /** I vertici nella stanza (in senso qualsiasi: la normale si dà a parte). */
  p: V3[];
  /** La normale verso l'esterno. */
  n: V3;
  /** Il materiale (colore pieno prima della luce). */
  m: string;
  /** Moltiplica la lampada su questa faccia (0: in ombra portata). */
  forza?: number;
  /** Disegnala anche se non guarda la camera (rari casi: bordi sottili). */
  sempre?: boolean;
}

export interface Disegno {
  d: string;
  fill: string;
  /** Distanza dalla camera del centro, per l'ordine. */
  z: number;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Imbardata (gradi, positivi verso sinistra guardando dall'alto) e traslazione di un punto locale. */
export function posa(p: V3, yaw: number, t: V3): V3 {
  const a = (yaw * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [t[0] + p[0] * c + p[2] * s, t[1] + p[1], t[2] - p[0] * s + p[2] * c];
}

const ruota = (n: V3, yaw: number): V3 => posa(n, yaw, [0, 0, 0]);

/** Una scatola [x0,x1]×[y0,y1]×[z0,z1] nelle coordinate locali: sei facce. */
export function scatola(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: string, mFronte?: string): Faccia[] {
  return [
    { p: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], n: [0, 0, -1], m: mFronte ?? m },
    { p: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], n: [0, 0, 1], m },
    { p: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], n: [-1, 0, 0], m },
    { p: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], n: [1, 0, 0], m },
    { p: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], n: [0, 1, 0], m },
    { p: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], n: [0, -1, 0], m },
  ];
}

/**
 * Un cilindro con l'asse lungo `asse` ('x' o 'z'), centro della sezione (c1, c2) (y e l'altra coordinata),
 * raggio r, da a0 ad a1 lungo l'asse; `da`…`a` gli angoli (gradi, 0 = verso +y… girando verso l'esterno) delle
 * facce laterali (per un rotolo: mezzo giro sopra). Con `tappi` aggiunge le due basi a poligono.
 */
export function cilindro(asse: 'x' | 'z', cy: number, cw: number, r: number, a0: number, a1: number, m: string, o: { da?: number; a?: number; facce?: number; tappi?: boolean; segno?: 1 | -1 } = {}): Faccia[] {
  const da = o.da ?? -90;
  const fino = o.a ?? 270;
  const n = o.facce ?? 8;
  const sg = o.segno ?? 1;
  const out: Faccia[] = [];
  const P = (ang: number, t: number): V3 => {
    const a = (ang * Math.PI) / 180;
    const y = cy + Math.cos(a) * r;
    const w = cw + Math.sin(a) * r * sg;
    return asse === 'x' ? [t, y, w] : [w, y, t];
  };
  const N = (ang: number): V3 => {
    const a = (ang * Math.PI) / 180;
    return asse === 'x' ? [0, Math.cos(a), Math.sin(a) * sg] : [Math.sin(a) * sg, Math.cos(a), 0];
  };
  for (let i = 0; i < n; i++) {
    const g0 = da + ((fino - da) * i) / n;
    const g1 = da + ((fino - da) * (i + 1)) / n;
    out.push({ p: [P(g0, a0), P(g1, a0), P(g1, a1), P(g0, a1)], n: N((g0 + g1) / 2), m });
  }
  if (o.tappi) {
    const ring = (t: number) => Array.from({ length: n + 1 }, (_, i) => P(da + ((fino - da) * i) / n, t));
    const ax: V3 = asse === 'x' ? [1, 0, 0] : [0, 0, 1];
    out.push({ p: ring(a0), n: [-ax[0], 0, -ax[2]], m });
    out.push({ p: ring(a1), n: ax, m });
  }
  return out;
}

/** Posa un insieme di facce nella stanza. */
export function posaFacce(f: Faccia[], yaw: number, t: V3): Faccia[] {
  return f.map(x => ({ ...x, p: x.p.map(p => posa(p, yaw, t)), n: ruota(x.n, yaw) }));
}

/** Facce visibili, colorate e in ordine (dalla più lontana). */
export function disegna(cam: Camera, facce: Faccia[], luci: Luci): Disegno[] {
  const occhio: V3 = [0, cam.ye, cam.zc];
  const out: Disegno[] = [];
  for (const f of facce) {
    const c: V3 = [0, 1, 2].map(i => f.p.reduce((s, p) => s + p[i], 0) / f.p.length) as unknown as V3;
    if (!f.sempre && dot(f.n, sub(occhio, c)) <= 0) continue;
    const pts = f.p.map(p => pr(cam, p[0], p[1], p[2]));
    const d = 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';
    const dist = Math.hypot(c[0] - occhio[0], c[1] - occhio[1], c[2] - occhio[2]);
    out.push({ d, fill: illumina(f.m, c, f.n, luci, f.forza ?? 1), z: dist });
  }
  return out.sort((a, b) => b.z - a.z);
}
