// «Il Club dei Signori»: i cinque piani della scena, disegnati dalla stanza in metri (camera.ts) con la luce
// calcolata (luce.ts). Ogni piano è una funzione che restituisce gli elementi SVG nelle coordinate della tela
// della camera; il componente (ClubDeiSignori.tsx) li mette in un Svg solo (scena ferma) o in un Svg per piano
// (parallasse e vita).
//
//   P0 cielo   la notte sul golfo vista dalla finestra: luna fredda, Vesuvio, la costa, la lampara (vita)
//   P1 sala    pareti, soffitto a cassettoni, librerie e boiserie in noce, la finestra ad arco, le tende di
//              velluto (una si muove: vita), il pavimento a listoni, il tappeto, la luna sul pavimento
//   P2 mezzo   le poltrone Chesterfield, il tavolino col sigaro (il fumo: vita), il busto di marmo, il globo
//   P3 tavolo  il tavolo da gioco (vettoriale, o il tavolino equipaggiato in prospettiva: ClubDeiSignori.tsx),
//              la lampada verde da biliardo, il cono e la pozza di luce, l'ombra di contatto
//   P4 primo   un'ala di poltrona e un fusto d'ottone, scuri e fuori fuoco, ai bordi
//
// Nessun Math.random: le file di libri e le stelle vengono da seeded().
import type { ReactNode } from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import { frontale, inizio, laterale, LAMPADA, orizzontale, poli, poli2, pr, r1, scala, STANZA, type Camera, type Pt, type V3 } from './camera';
import { illumina, lampada as luceLampada, MAT, mescola, N, type Luci } from './luce';
import { cilindro, disegna, type Faccia, posaFacce, scatola } from './solidi';

export interface Ctx {
  cam: Camera;
  luci: Luci;
  /** Id unico di un gradiente in questa istanza. */
  u: (nome: string) => string;
}

const url = (k: Ctx, n: string) => `url(#${k.u(n)})`;
const spenta = (k: Ctx) => !!k.luci.spenta;

/** I punti chiave della scena sullo schermo (per la vita, la polvere, il tavolo equipaggiato). */
export interface Ancore {
  /** Il piano del tavolo: angoli lontani (sinistra, destra) e vicini. */
  tavolo: { fs: Pt; fd: Pt; vs: Pt; vd: Pt };
  /** Il cono di luce: bordo del paralume e del piano. */
  cono: { x0: number; y0: number; x1: number; y1: number };
  lampara: Pt;
  fumo: Pt;
  /** La tenda di destra: riquadro sullo schermo. */
  tenda: { x0: number; y0: number; x1: number; y1: number };
  /** Scala (punti per metro) al tavolo. */
  sTavolo: number;
}

const T = STANZA.tavolo;
const F = STANZA.finestra;

/* ------------------------------------------------------------------ geometria comune */

/** Il contorno della finestra ad arco sulla parete di fondo, alla profondità z (allargato di `piu` metri). */
function arco(c: Camera, z: number, piu = 0): string {
  const r = F.w / 2 + piu;
  const [x0, yb] = pr(c, -r, F.davanzale - piu, z);
  const [x1] = pr(c, r, F.davanzale - piu, z);
  const [, yi] = pr(c, 0, F.imposta, z);
  const R = r * scala(c, z);
  return `M${r1(x0)} ${r1(yb)}V${r1(yi)}A${r1(R)} ${r1(R)} 0 0 1 ${r1(x1)} ${r1(yi)}V${r1(yb)}Z`;
}

/** Il riquadro sullo schermo della finestra vista dentro il muro (il vetro). */
export function vetro(c: Camera) {
  const z = STANZA.fondo + F.muro;
  const [x0, yb] = pr(c, -F.w / 2, F.davanzale, z);
  const [x1] = pr(c, F.w / 2, F.davanzale, z);
  const [, yt] = pr(c, 0, F.imposta + F.w / 2, z);
  return { x0, x1, yb, yt };
}

export function ancore(c: Camera): Ancore {
  const zf = T.z + T.d / 2;
  const zv = T.z - T.d / 2;
  const v = vetro(c);
  const [lx, ly] = pr(c, 0, STANZA.lampada.y, T.z);
  const [, ty] = pr(c, 0, T.y, T.z);
  const s = scala(c, T.z);
  const tz = STANZA.fondo - 0.3;
  const [tx0, ty0] = pr(c, 0.86, 3.5, tz);
  const [tx1, ty1] = pr(c, 1.5, 0, tz);
  return {
    tavolo: { fs: pr(c, -T.w / 2, T.y, zf), fd: pr(c, T.w / 2, T.y, zf), vs: pr(c, -T.w / 2, T.y, zv), vd: pr(c, T.w / 2, T.y, zv) },
    cono: { x0: lx - STANZA.lampada.lungo * 0.5 * s, y0: ly, x1: lx + STANZA.lampada.lungo * 0.5 * s, y1: ty },
    lampara: [v.x0 + (v.x1 - v.x0) * 0.78, v.yb - (v.yb - v.yt) * 0.43],
    fumo: pr(c, TAVOLINO[0] - 0.05, 0.62, TAVOLINO[2] - 0.04),
    tenda: { x0: tx0, y0: ty0, x1: tx1, y1: ty1 },
    sTavolo: s,
  };
}

/* ------------------------------------------------------------------ P0 · il cielo sul golfo */

export function Cielo({ k }: { k: Ctx }) {
  const { cam: c } = k;
  const v = vetro(c);
  const W = v.x1 - v.x0;
  const Hh = v.yb - v.yt;
  // L'orizzonte: un terzo del vetro sopra il davanzale; la luna in alto a destra.
  const oy = v.yb - Hh * 0.5;
  const luna: Pt = [v.x0 + W * 0.7, v.yt + Hh * 0.2];
  const rl = W * 0.1;
  const rnd = seeded(13);
  const stelle = Array.from({ length: 26 }, () => [v.x0 - W * 0.3 + rnd() * W * 1.6, v.yt - Hh * 0.2 + rnd() * (oy - v.yt) * 1.1, 0.35 + rnd() * rnd() * 0.9]);
  const pallini = (l: number[][]) => l.map(([x, y, r]) => `M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0z`).join('');
  // Il Vesuvio: il Somma a sinistra e il cono, bassi sull'orizzonte; la costa con le luci.
  const vx = v.x0 + W * 0.3;
  const vw = W * 0.75;
  const ves = `M${r1(vx - vw * 0.9)} ${r1(oy)}C${r1(vx - vw * 0.55)} ${r1(oy - Hh * 0.05)} ${r1(vx - vw * 0.35)} ${r1(oy - Hh * 0.13)} ${r1(vx - vw * 0.18)} ${r1(oy - Hh * 0.145)}L${r1(vx - vw * 0.08)} ${r1(oy - Hh * 0.13)}L${r1(vx + vw * 0.02)} ${r1(oy - Hh * 0.165)}L${r1(vx + vw * 0.1)} ${r1(oy - Hh * 0.16)}C${r1(vx + vw * 0.3)} ${r1(oy - Hh * 0.1)} ${r1(vx + vw * 0.55)} ${r1(oy - Hh * 0.03)} ${r1(vx + vw)} ${r1(oy)}Z`;
  const costa = `M${r1(v.x0 - W)} ${r1(oy + 1.2)}H${r1(v.x1 + W)}V${r1(oy + Hh * 0.025)}C${r1(v.x1)} ${r1(oy + Hh * 0.02)} ${r1(v.x0)} ${r1(oy + Hh * 0.035)} ${r1(v.x0 - W)} ${r1(oy + Hh * 0.03)}Z`;
  const luciCosta = Array.from({ length: 16 }, (_, i) => [v.x0 - W * 0.2 + ((i + rnd() * 0.6) / 16) * W * 1.4, oy + Hh * (0.012 + rnd() * 0.012), 0.45 + rnd() * 0.35]);
  // Il riflesso della luna sul mare: una scia di trattini che si allarga verso di noi.
  let scia = '';
  for (let i = 0; i < 9; i++) {
    const y = oy + Hh * 0.04 + i * Hh * 0.04;
    const ww = rl * (0.3 + i * 0.22) * (0.7 + 0.6 * ((i * 7) % 3) / 2);
    scia += `M${r1(luna[0] - ww / 2)} ${r1(y)}h${r1(ww)}v${r1(Math.max(0.6, Hh * 0.006))}h${r1(-ww)}z`;
  }
  const sp = spenta(k) ? 0.75 : 1;
  return (
    <G>
      <Defs>
        <LinearGradient id={k.u('cielo')} x1="0" y1={v.yt - Hh * 0.3} x2="0" y2={oy} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor="#060B1C" />
          <Stop offset={0.65} stopColor="#0E1A3A" />
          <Stop offset={1} stopColor="#2A3E66" />
        </LinearGradient>
        <LinearGradient id={k.u('mare')} x1="0" y1={oy} x2="0" y2={v.yb} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor="#16264A" />
          <Stop offset={1} stopColor="#070C1A" />
        </LinearGradient>
        <RadialGradient id={k.u('alone')} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor="#CFE2FF" stopOpacity={0.5 * sp} />
          <Stop offset={0.35} stopColor="#CFE2FF" stopOpacity={0.14 * sp} />
          <Stop offset={1} stopColor="#CFE2FF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={c.w} height={oy + 1} fill={url(k, 'cielo')} />
      <Rect x={0} y={oy} width={c.w} height={c.h - oy} fill={url(k, 'mare')} />
      <Path d={pallini(stelle)} fill="#E8F0FF" opacity={0.75} />
      <Ellipse cx={luna[0]} cy={luna[1]} rx={rl * 5} ry={rl * 5} fill={url(k, 'alone')} />
      <Circle cx={luna[0]} cy={luna[1]} r={rl} fill="#F2F4EC" />
      {/* il terminatore: la luna non è un disco piatto */}
      <Path d={`M${r1(luna[0] + rl * 0.2)} ${r1(luna[1] - rl)}A${r1(rl)} ${r1(rl)} 0 0 1 ${r1(luna[0] + rl * 0.2)} ${r1(luna[1] + rl)}A${r1(rl * 0.8)} ${r1(rl)} 0 0 0 ${r1(luna[0] + rl * 0.2)} ${r1(luna[1] - rl)}Z`} fill="#B8C6DA" opacity={0.45} />
      <Path d={pallini([[luna[0] - rl * 0.35, luna[1] - rl * 0.2, rl * 0.18], [luna[0] + rl * 0.1, luna[1] + rl * 0.35, rl * 0.12], [luna[0] - rl * 0.1, luna[1] + rl * 0.05, rl * 0.08]])} fill="#C8D0DA" opacity={0.6} />
      <Path d={ves} fill="#0A1228" />
      <Path d={costa} fill="#070D1E" />
      <Path d={pallini(luciCosta)} fill="#FFC870" opacity={spenta(k) ? 0.5 : 0.85} />
      <Path d={scia} fill="#DCE8FF" opacity={0.55 * sp} />
    </G>
  );
}

/** La lampara sul golfo: la barca con la sua luce. Si disegna intorno a (0, 0): la vita la sposta come vista. */
export function Lampara({ k, s }: { k: Ctx; s: number }) {
  const a = spenta(k) ? 0.6 : 1;
  return (
    <G>
      <Defs>
        <RadialGradient id={k.u('lampara')} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor="#FFD9A0" stopOpacity={0.75 * a} />
          <Stop offset={1} stopColor="#FFD9A0" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={0} cy={0} rx={s * 2.4} ry={s * 2.4} fill={url(k, 'lampara')} />
      <Path d={`M${r1(-s * 0.15)} ${r1(s * 0.4)}h${r1(s * 0.3)}v${r1(s * 1.6)}h${r1(-s * 0.3)}z`} fill="#FFB860" opacity={0.5 * a} />
      <Path d={`M${r1(-s * 0.9)} ${r1(s * 0.15)}h${r1(s * 1.8)}l${r1(-s * 0.3)} ${r1(s * 0.35)}h${r1(-s * 1.2)}z`} fill="#050914" />
      <Circle cx={0} cy={-s * 0.2} r={s * 0.38} fill="#FFF1C8" opacity={a} />
    </G>
  );
}

/* ------------------------------------------------------------------ P1 · la sala */

/** I libri di una fila: [x0, x1] lungo il ripiano, base y, altezza utile, alla profondità z (parete di fondo). */
function fila(rnd: () => number, x0: number, x1: number, y: number, h: number) {
  const out: { x: number; w: number; h: number; col: number; inclinato: number }[] = [];
  let x = x0 + 0.01;
  while (x < x1 - 0.03) {
    // Ogni tanto un vuoto, ogni tanto un libro appoggiato.
    if (rnd() < 0.05) {
      x += 0.05 + rnd() * 0.08;
      continue;
    }
    const w = 0.028 + rnd() * 0.035;
    if (x + w > x1 - 0.01) break;
    const hh = h * (0.68 + rnd() * 0.27);
    out.push({ x, w, h: hh, col: Math.floor(rnd() * MAT.libri.length), inclinato: rnd() < 0.04 ? 1 : 0 });
    x += w + 0.002;
  }
  return out;
}

const RIPIANI = [0.42, 0.98, 1.54, 2.1, 2.66];
const ALTO_LIB = 3.12;

/** Una libreria sulla parete di fondo da x0 a x1 (fronte a z). */
function libreriaFondo(k: Ctx, x0: number, x1: number, seme: number): ReactNode {
  const { cam: c, luci } = k;
  const z = STANZA.fondo - 0.42;
  const zl = STANZA.fondo - 0.36;
  const rnd = seeded(seme);
  const fill: Record<string, string[]> = {};
  const add = (col: string, d: string) => (fill[col] ??= []).push(d);
  // Il fondo degli scaffali, scurissimo; i libri; i ripiani; il telaio.
  const interno = illumina(MAT.noceFondo, [(x0 + x1) / 2, 1.5, STANZA.fondo], N.fronte, luci, 0.6);
  const parti: ReactNode[] = [<Path key="int" d={frontale(c, STANZA.fondo - 0.02, x0, 0.36, x1, ALTO_LIB)} fill={mescola(interno, '#000000', 0.35)} />];
  const oro: string[] = [];
  for (let i = 0; i < RIPIANI.length; i++) {
    const y = RIPIANI[i];
    const h = (i < RIPIANI.length - 1 ? RIPIANI[i + 1] : ALTO_LIB) - y - 0.05;
    for (const b of fila(rnd, x0 + 0.05, x1 - 0.05, y + 0.03, h)) {
      const col = illumina(MAT.libri[b.col], [b.x, y + b.h / 2, zl], N.fronte, luci);
      if (b.inclinato) {
        const p: V3[] = [
          [b.x, y + 0.03, zl],
          [b.x + b.w, y + 0.03, zl],
          [b.x + b.w + b.h * 0.3, y + 0.03 + b.h * 0.95, zl],
          [b.x + b.h * 0.3, y + 0.03 + b.h * 0.95, zl],
        ];
        add(col, poli(c, p));
      } else {
        add(col, frontale(c, zl, b.x, y + 0.03, b.x + b.w, y + 0.03 + b.h));
        if (b.col % 3 !== 2 && b.w > 0.034) {
          oro.push(frontale(c, zl - 0.001, b.x + 0.004, y + 0.03 + b.h * 0.72, b.x + b.w - 0.004, y + 0.03 + b.h * 0.76));
          oro.push(frontale(c, zl - 0.001, b.x + 0.004, y + 0.03 + b.h * 0.18, b.x + b.w - 0.004, y + 0.03 + b.h * 0.2));
        }
      }
    }
  }
  for (const [col, ds] of Object.entries(fill)) parti.push(<Path key={col} d={ds.join('')} fill={col} />);
  parti.push(<Path key="oro" d={oro.join('')} fill={illumina(MAT.ottone, [(x0 + x1) / 2, 1.5, zl], N.fronte, luci)} opacity={0.75} />);
  // Telaio: ripiani (con lo spessore visto dall'alto o dal basso), montanti, zoccolo con le ante, cornicione.
  const f: Faccia[] = [];
  for (const y of RIPIANI.slice(1)) f.push(...scatola(x0, x1, y - 0.035, y, z, STANZA.fondo, MAT.noce));
  f.push(...scatola(x0 - 0.06, x0 + 0.04, 0, ALTO_LIB, z - 0.02, STANZA.fondo, MAT.noce));
  f.push(...scatola(x1 - 0.04, x1 + 0.06, 0, ALTO_LIB, z - 0.02, STANZA.fondo, MAT.noce));
  const mezzo = (x0 + x1) / 2;
  f.push(...scatola(mezzo - 0.03, mezzo + 0.03, 0.42, ALTO_LIB, z - 0.01, STANZA.fondo, MAT.noce));
  f.push(...scatola(x0 - 0.06, x1 + 0.06, 0, RIPIANI[0], z - 0.06, STANZA.fondo, MAT.noceScuro));
  f.push(...scatola(x0 - 0.12, x1 + 0.12, ALTO_LIB, ALTO_LIB + 0.18, z - 0.1, STANZA.fondo, MAT.noce));
  for (const d of disegna(c, f, luci)) parti.push(<Path key={'t' + parti.length} d={d.d} fill={d.fill} />);
  // Le ante dello zoccolo: due riquadri incisi per campata, e il pomolo d'ottone.
  const ante: string[] = [];
  const pomoli: string[] = [];
  for (const [a, b] of [[x0 + 0.04, mezzo - 0.03], [mezzo + 0.03, x1 - 0.04]]) {
    ante.push(frontale(c, z - 0.065, a + 0.06, 0.08, b - 0.06, RIPIANI[0] - 0.08));
    const [px, py] = pr(c, (a + b) / 2, RIPIANI[0] - 0.14, z - 0.07);
    const pr2 = Math.max(0.6, 0.016 * scala(c, z));
    pomoli.push(`M${r1(px - pr2)} ${r1(py)}a${r1(pr2)} ${r1(pr2)} 0 1 0 ${r1(2 * pr2)} 0a${r1(pr2)} ${r1(pr2)} 0 1 0 ${r1(-2 * pr2)} 0z`);
  }
  parti.push(<Path key="ante" d={ante.join('')} fill="none" stroke="#000000" strokeOpacity={0.35} strokeWidth={Math.max(0.5, 0.012 * scala(c, z))} />);
  parti.push(<Path key="pom" d={pomoli.join('')} fill={illumina(MAT.ottone, [mezzo, 0.3, z], N.fronte, luci)} />);
  // Il filo di luce calda sul bordo dei ripiani: la lampada li prende di taglio.
  return <G key={'lib' + seme}>{parti}</G>;
}

/** Libreria su una parete laterale (verso: -1 sinistra, 1 destra), da z0 a z1. */
function libreriaLato(k: Ctx, verso: -1 | 1, z0: number, z1: number, seme: number): ReactNode {
  const { cam: c, luci } = k;
  const xm = verso * STANZA.mezza;
  const xf = verso * (STANZA.mezza - 0.4);
  const xl = verso * (STANZA.mezza - 0.36);
  const n: V3 = [-verso, 0, 0];
  const rnd = seeded(seme);
  const fill: Record<string, string[]> = {};
  const parti: ReactNode[] = [<Path key="int" d={laterale(c, xm - verso * 0.02, z0, z1, 0.36, ALTO_LIB)} fill={mescola(illumina(MAT.noceFondo, [xm, 1.5, (z0 + z1) / 2], n, luci, 0.6), '#000000', 0.35)} />];
  for (let i = 0; i < RIPIANI.length; i++) {
    const y = RIPIANI[i];
    const h = (i < RIPIANI.length - 1 ? RIPIANI[i + 1] : ALTO_LIB) - y - 0.05;
    for (const b of fila(rnd, z0 + 0.05, z1 - 0.05, y + 0.03, h)) {
      const col = illumina(MAT.libri[b.col], [xl, y + b.h / 2, b.x], n, luci);
      (fill[col] ??= []).push(laterale(c, xl, b.x, b.x + b.w, y + 0.03, y + 0.03 + b.h));
    }
  }
  for (const [col, ds] of Object.entries(fill)) parti.push(<Path key={col} d={ds.join('')} fill={col} />);
  const f: Faccia[] = [];
  const lo = Math.min(xf, xm);
  const hi = Math.max(xf, xm);
  for (const y of RIPIANI.slice(1)) f.push(...scatola(lo, hi, y - 0.035, y, z0, z1, MAT.noce));
  for (let zz = z0; zz <= z1 + 0.01; zz += (z1 - z0) / Math.max(1, Math.round((z1 - z0) / 1.15))) f.push(...scatola(lo - (verso < 0 ? 0 : 0.02), hi + (verso < 0 ? 0.02 : 0), 0.42, ALTO_LIB, zz - 0.04, zz + 0.04, MAT.noce));
  f.push(...scatola(lo - (verso < 0 ? 0 : 0.06), hi + (verso < 0 ? 0.06 : 0), 0, RIPIANI[0], z0, z1, MAT.noceScuro));
  f.push(...scatola(lo - (verso < 0 ? 0 : 0.12), hi + (verso < 0 ? 0.12 : 0), ALTO_LIB, ALTO_LIB + 0.18, z0, z1, MAT.noce));
  for (const d of disegna(c, f, luci)) parti.push(<Path key={'t' + parti.length} d={d.d} fill={d.fill} />);
  return <G key={'lat' + seme}>{parti}</G>;
}

/** Le tende di velluto blu ai lati della finestra (verso -1 sinistra, 1 destra), con le pieghe. */
export function Tenda({ k, verso }: { k: Ctx; verso: -1 | 1 }) {
  const { cam: c, luci } = k;
  const z = STANZA.fondo - 0.3;
  const x0 = verso * 0.78;
  const x1 = verso * 1.42;
  const pieghe = 7;
  const facce: ReactNode[] = [];
  // Ogni piega è una striscia con la normale che gira: luce e ombra alternate, più strette verso il fermatenda.
  for (let i = 0; i < pieghe; i++) {
    const a = x0 + ((x1 - x0) * i) / pieghe;
    const b = x0 + ((x1 - x0) * (i + 1)) / pieghe;
    const giro = (i % 2 ? 1 : -1) * 0.55;
    const nn: V3 = [giro, 0, -1];
    // Raccolta in basso dal cordone (a 1,05 m): la tenda si stringe verso l'esterno e poi riscende.
    const stringe = (x: number) => verso * 0.78 + (x - verso * 0.78) * 0.55 + verso * 0.18;
    const top = 3.62;
    const y1 = 1.12;
    const p1: V3[] = [
      [a, top, z],
      [b, top, z],
      [stringe(b), y1, z - 0.04],
      [stringe(a), y1, z - 0.04],
    ];
    const p2: V3[] = [
      [stringe(a), y1, z - 0.04],
      [stringe(b), y1, z - 0.04],
      [b + verso * 0.02, 0.02, z - 0.02],
      [a + verso * 0.02, 0.02, z - 0.02],
    ];
    const col = illumina(MAT.velluto, [(a + b) / 2, 2.2, z], nn, luci);
    const col2 = illumina(MAT.velluto, [(a + b) / 2, 0.6, z], nn, luci);
    facce.push(<Path key={'a' + i} d={poli(c, p1)} fill={col} />);
    facce.push(<Path key={'b' + i} d={poli(c, p2)} fill={col2} />);
  }
  // Il cordone d'oro con la nappa.
  const [cx, cy] = pr(c, verso * 0.98, 1.12, z - 0.07);
  const s = scala(c, z);
  const oro = illumina(MAT.ottone, [verso * 1, 1.1, z], N.fronte, luci);
  // La luce della luna sul bordo verso la finestra (velluto: il bordo prende la luce di striscio).
  const [bx0, by0] = pr(c, x0, 3.62, z);
  const [bx1, by1] = pr(c, verso * 0.96, 1.12, z - 0.04);
  const [bx2, by2] = pr(c, x0 + verso * 0.02, 0.02, z - 0.02);
  const filo = Math.max(0.7, 0.025 * s);
  return (
    <G>
      {facce}
      <Path d={`M${r1(bx0)} ${r1(by0)}L${r1(bx1)} ${r1(by1)}L${r1(bx2)} ${r1(by2)}`} stroke="#9AB4E0" strokeOpacity={spenta(k) ? 0.35 : 0.45} strokeWidth={filo} fill="none" />
      <Path d={`M${r1(cx - 0.12 * s)} ${r1(cy - 0.02 * s)}h${r1(0.24 * s)}v${r1(0.04 * s)}h${r1(-0.24 * s)}z`} fill={oro} />
      <Path d={`M${r1(cx - 0.035 * s)} ${r1(cy)}h${r1(0.07 * s)}l${r1(0.02 * s)} ${r1(0.2 * s)}h${r1(-0.11 * s)}z`} fill={oro} />
    </G>
  );
}

export function Sala({ k, tendaDestra = true }: { k: Ctx; tendaDestra?: boolean }) {
  const { cam: c, luci } = k;
  const M = STANZA.mezza;
  const A = STANZA.alto;
  const Z = STANZA.fondo;
  const Zi = inizio(c);
  const s0 = scala(c, Z);
  // Muri: la parte alta dipinta (verde bottiglia scuro), la boiserie in noce sotto.
  const muroFondo = illumina('#2E3A30', [0, 2.6, Z], N.fronte, luci);
  const muroLato = (v: -1 | 1) => illumina('#2E3A30', [v * M, 2.6, 3], [-v, 0, 0], luci);
  const parti: ReactNode[] = [];
  // Soffitto a cassettoni.
  const soffitto = illumina(MAT.noceScuro, [0, A, 4], N.giu, luci);
  parti.push(<Path key="soff" d={orizzontale(c, A, -M, M, Zi, Z)} fill={soffitto} />);
  const travi: string[] = [];
  for (let zz = STANZA.inizio + 0.6; zz < Z; zz += 1.45) if (zz > Zi) travi.push(orizzontale(c, A - 0.001, -M, M, zz, zz + 0.16));
  for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) travi.push(orizzontale(c, A - 0.001, x - 0.08, x + 0.08, Zi, Z));
  parti.push(<Path key="travi" d={travi.join('')} fill={mescola(soffitto, '#000000', 0.35)} />);
  // Pareti.
  parti.push(<Path key="ml" d={laterale(c, -M, Zi, Z, 0, A)} fill={muroLato(-1)} />);
  parti.push(<Path key="mr" d={laterale(c, M, Zi, Z, 0, A)} fill={muroLato(1)} />);
  // La parete di fondo con il foro della finestra (il vetro è dentro il muro, a z + muro).
  parti.push(<Path key="mf" d={frontale(c, Z, -M, 0, M, A) + arco(c, Z)} fill={muroFondo} fillRule="evenodd" />);
  // La strombatura: il muro tra il filo della parete e il vetro, presa dalla luna.
  parti.push(<Path key="sguincio" d={arco(c, Z, 0.08) + arco(c, Z + F.muro)} fill={illumina('#5A5446', [0, 2, Z], [0, 0.4, -1], luci, 0.4)} fillRule="evenodd" />);
  parti.push(<Path key="sguincio-luna" d={arco(c, Z) + arco(c, Z + F.muro)} fill="#9AB4E0" opacity={0.18} fillRule="evenodd" />);
  // Il davanzale di marmo, la cornice e la chiave dell'arco.
  const dav: Faccia[] = scatola(-F.w / 2 - 0.16, F.w / 2 + 0.16, F.davanzale - 0.07, F.davanzale, Z - 0.1, Z + F.muro, MAT.marmo);
  for (const d of disegna(c, dav, luci)) parti.push(<Path key={'dav' + parti.length} d={d.d} fill={d.fill} />);
  parti.push(<Path key="cornice" d={arco(c, Z, 0.1) + arco(c, Z, 0.02)} fill={illumina(MAT.noce, [0, 2.6, Z], N.fronte, luci)} fillRule="evenodd" />);
  // Il cornicione in alto lungo la parete di fondo e una fascia d'ottone.
  parti.push(<Path key="corn" d={frontale(c, Z - 0.02, -M, A - 0.22, M, A)} fill={illumina(MAT.noce, [0, A - 0.1, Z], N.fronte, luci)} />);
  parti.push(<Path key="corn2" d={frontale(c, Z - 0.03, -M, A - 0.26, M, A - 0.23)} fill={illumina(MAT.ottone, [0, A - 0.2, Z], N.fronte, luci)} opacity={0.8} />);
  // Le librerie: sul fondo ai lati della finestra, poi lungo le pareti.
  parti.push(libreriaFondo(k, -M + 0.42, -1.5, 11));
  parti.push(libreriaFondo(k, 1.5, M - 0.42, 17));
  parti.push(libreriaLato(k, -1, 1.6, Z, 31));
  parti.push(libreriaLato(k, 1, 1.6, Z, 37));
  // La boiserie sulle pareti laterali, prima delle librerie (verso la camera).
  for (const v of [-1, 1] as const) {
    const x = v * M;
    const nn: V3 = [-v, 0, 0];
    parti.push(<Path key={'bo' + v} d={laterale(c, x - v * 0.001, Zi, 1.6, 0, 1.05)} fill={illumina(MAT.noce, [x, 0.5, 1], nn, luci)} />);
    const pannelli: string[] = [];
    for (let zz = STANZA.inizio + 0.2; zz < 1.4; zz += 0.9) if (zz > Zi) pannelli.push(laterale(c, x - v * 0.002, zz + 0.08, zz + 0.78, 0.14, 0.9));
    parti.push(<Path key={'bp' + v} d={pannelli.join('')} fill="none" stroke="#000000" strokeOpacity={0.3} strokeWidth={Math.max(0.5, 0.02 * s0)} />);
  }
  // Il vetro: una velatura fredda, i montanti e i traversi (la luce passa da dietro: sono controluce).
  const zv = Z + F.muro;
  const sv = scala(c, zv);
  const [mx] = pr(c, 0, 0, zv);
  const [, yd] = pr(c, 0, F.davanzale, zv);
  const [, yt] = pr(c, 0, F.imposta + F.w / 2, zv);
  const ww = (F.w / 2) * sv;
  const mont = Math.max(0.8, 0.035 * sv);
  const traversi = [F.davanzale + (F.imposta - F.davanzale) * 0.5, F.imposta].map(y => pr(c, 0, y, zv)[1]);
  parti.push(<Path key="vetro" d={arco(c, zv)} fill="#3A5A8A" opacity={0.1} />);
  parti.push(
    <Path
      key="telaio"
      d={`M${r1(mx - mont / 2)} ${r1(yt)}V${r1(yd)}h${r1(mont)}V${r1(yt)}z` + traversi.map(y => `M${r1(mx - ww)} ${r1(y - mont / 2)}h${r1(2 * ww)}v${r1(mont)}h${r1(-2 * ww)}z`).join('')}
      fill="#0B0F18"
      stroke="#0B0F18"
      strokeWidth={0}
    />,
  );
  parti.push(<Path key="telaio-luna" d={`M${r1(mx + mont / 2)} ${r1(yt + ww * 0.1)}V${r1(yd)}`} stroke="#9AB4E0" strokeOpacity={0.35} strokeWidth={Math.max(0.5, mont * 0.25)} />);
  // Il bastone d'ottone delle tende e il cappello di velluto (mantovana).
  parti.push(<Path key="bast" d={frontale(c, Z - 0.32, -1.6, 3.66, 1.6, 3.7)} fill={illumina(MAT.ottone, [0, 3.66, Z - 0.3], N.fronte, luci)} />);
  parti.push(<Tenda key="ts" k={k} verso={-1} />);
  if (tendaDestra) parti.push(<Tenda key="td" k={k} verso={1} />);
  return <G>{parti}</G>;
}

/** Il pavimento: listoni di noce verso il fondo, il tappeto bordeaux, la luna e la pozza della lampada. */
export function Pavimento({ k }: { k: Ctx }) {
  const { cam: c, luci } = k;
  const M = STANZA.mezza;
  const Z = STANZA.fondo;
  const Zi = inizio(c);
  const parti: ReactNode[] = [];
  parti.push(<Path key="pav" d={orizzontale(c, 0, -M, M, Zi, Z)} fill={illumina(MAT.parquet, [0, 0, 6.5], N.su, luci, 0.5)} />);
  // La pozza calda sul pavimento intorno al tavolo (prima del tappeto: si vede ai bordi).
  const giunti: string[] = [];
  for (let x = -M; x <= M; x += 0.16) giunti.push(`M${pr(c, x, 0, Zi).map(r1).join(' ')}L${pr(c, x, 0, Z).map(r1).join(' ')}`);
  for (let i = 0, zz = STANZA.inizio; zz < Z; zz += 1.1, i++) if (zz >= Zi) for (let x = -M + (i % 2) * 0.08; x < M; x += 0.32) giunti.push(`M${pr(c, x, 0, zz).map(r1).join(' ')}L${pr(c, x + 0.16, 0, zz).map(r1).join(' ')}`);
  parti.push(<Path key="giunti" d={giunti.join('')} stroke="#000000" strokeOpacity={0.28} strokeWidth={Math.max(0.4, 0.008 * scala(c, 5))} fill="none" />);
  // Il tappeto: bordo blu notte, filetti d'oro, campo bordeaux, un medaglione appena accennato.
  const tx = 2.35;
  const tz0 = 2.55;
  const tz1 = 6.75;
  const t = (a: number, col: string, key: string, op = 1) => <Path key={key} d={orizzontale(c, 0.004, -tx + a, tx - a, tz0 + a, tz1 - a)} fill={col} opacity={op} />;
  parti.push(t(0, illumina(MAT.tappetoBordo, [0, 0, 5], N.su, luci, 0.6), 'tb'));
  parti.push(t(0.1, illumina(MAT.tappetoOro, [0, 0, 5], N.su, luci, 0.6), 'to'));
  parti.push(t(0.13, illumina(MAT.tappetoBordo, [0, 0, 5], N.su, luci, 0.6), 'tb2'));
  parti.push(t(0.34, illumina(MAT.tappetoOro, [0, 0, 5], N.su, luci, 0.6), 'to2'));
  parti.push(t(0.37, illumina(MAT.tappeto, [0, 0, 5], N.su, luci, 0.6), 'tc'));
  // Motivo del bordo: rombi in fila.
  const rombi: string[] = [];
  const rombo = (x: number, z: number, r: number) => poli(c, [[x, 0.005, z - r], [x + r, 0.005, z], [x, 0.005, z + r], [x - r, 0.005, z]]);
  for (let x = -tx + 0.35; x <= tx - 0.3; x += 0.32) rombi.push(rombo(x, tz0 + 0.235, 0.06), rombo(x, tz1 - 0.235, 0.06));
  for (let z = tz0 + 0.5; z <= tz1 - 0.4; z += 0.32) rombi.push(rombo(-tx + 0.235, z, 0.06), rombo(tx - 0.235, z, 0.06));
  parti.push(<Path key="rombi" d={rombi.join('')} fill={illumina(MAT.tappetoOro, [0, 0, 5], N.su, luci, 0.6)} opacity={0.7} />);
  parti.push(<Path key="med" d={rombo(0, (tz0 + tz1) / 2, 1.1)} fill="none" stroke={illumina(MAT.tappetoOro, [0, 0, 5], N.su, luci, 0.6)} strokeOpacity={0.45} strokeWidth={Math.max(0.6, 0.03 * scala(c, 5))} />);
  // La luce della luna sul pavimento: la sagoma della finestra proiettata lungo i raggi (fredda).
  const proietta = (x: number, y: number): V3 => [x - 0.26 * (y / 0.85), 0.006, Z - y / 0.85];
  const contorno: V3[] = [];
  const r = F.w / 2;
  contorno.push(proietta(-r, F.davanzale), proietta(r, F.davanzale), proietta(r, F.imposta));
  for (let i = 1; i < 12; i++) {
    const a = (i / 12) * Math.PI;
    contorno.push(proietta(Math.cos(a) * r, F.imposta + Math.sin(a) * r));
  }
  contorno.push(proietta(-r, F.imposta));
  const pts = contorno.map(p => pr(c, p[0], p[1], p[2]));
  const ys = pts.map(p => p[1]);
  parti.push(
    <Defs key="dl">
      <LinearGradient id={k.u('lunaPav')} x1="0" y1={Math.min(...ys)} x2="0" y2={Math.max(...ys)} gradientUnits="userSpaceOnUse">
        <Stop offset={0} stopColor="#CFE2FF" stopOpacity={spenta(k) ? 0.2 : 0.16} />
        <Stop offset={1} stopColor="#CFE2FF" stopOpacity={0.03} />
      </LinearGradient>
    </Defs>,
  );
  parti.push(<Path key="lunapav" d={poli2(pts)} fill={url(k, 'lunaPav')} />);
  // La croce del telaio, in ombra dentro la luce.
  const crocePts = [proietta(0, F.davanzale), proietta(0, F.imposta + r)].map(p => pr(c, p[0], p[1], p[2]));
  parti.push(<Path key="lunacroce" d={`M${crocePts[0].map(r1).join(' ')}L${crocePts[1].map(r1).join(' ')}`} stroke="#000000" strokeOpacity={0.12} strokeWidth={Math.max(0.6, 0.035 * scala(c, 6.5))} />);
  if (!spenta(k)) {
    // La pozza della lampada: un cerchio sul pavimento, visto in prospettiva (ellisse nel suo riquadro).
    const R = 2.1;
    const [ax] = pr(c, -R, 0, T.z);
    const [bx] = pr(c, R, 0, T.z);
    const [, ay] = pr(c, 0, 0, T.z + R);
    const [, by] = pr(c, 0, 0, T.z - R * 0.85);
    parti.push(
      <Defs key="dp">
        <RadialGradient id={k.u('pozza')} cx="50%" cy="52%" r="50%">
          <Stop offset={0} stopColor="#FFD9A0" stopOpacity={0.42} />
          <Stop offset={0.45} stopColor="#FFC27A" stopOpacity={0.16} />
          <Stop offset={1} stopColor="#FFC27A" stopOpacity={0} />
        </RadialGradient>
      </Defs>,
    );
    parti.push(<Ellipse key="pozza" cx={(ax + bx) / 2} cy={(ay + by) / 2} rx={(bx - ax) / 2} ry={(by - ay) / 2} fill={url(k, 'pozza')} />);
  }
  return <G>{parti}</G>;
}

/* ------------------------------------------------------------------ P2 · gli arredi a metà sala */

/** La poltrona Chesterfield in coordinate locali (fronte verso −z, centro della seduta sull'origine). */
function poltrona(): Faccia[] {
  const m = MAT.cuoio;
  const s = MAT.cuoioScuro;
  const f: Faccia[] = [];
  // Piedini, base, seduta (cuscino), schienale, braccioli a rotolo.
  for (const [x, z] of [[-0.4, -0.38], [0.4, -0.38], [-0.4, 0.38], [0.4, 0.38]]) f.push(...scatola(x - 0.03, x + 0.03, 0, 0.1, z - 0.03, z + 0.03, MAT.noceScuro));
  f.push(...scatola(-0.47, 0.47, 0.1, 0.4, -0.44, 0.44, s));
  f.push(...scatola(-0.32, 0.32, 0.4, 0.5, -0.42, 0.26, m));
  f.push(...scatola(-0.47, 0.47, 0.4, 0.92, 0.26, 0.44, m));
  f.push(...cilindro('x', 0.92, 0.35, 0.09, -0.47, 0.47, m, { da: -90, a: 180, facce: 6 }));
  for (const v of [-1, 1]) {
    const x0 = v < 0 ? -0.47 : 0.32;
    const x1 = v < 0 ? -0.32 : 0.47;
    f.push(...scatola(x0, x1, 0.4, 0.66, -0.44, 0.26, m));
    f.push(...cilindro('z', 0.66, v * 0.395, 0.085, -0.44, 0.26, m, { da: -90, a: 90, facce: 5, segno: v as 1 | -1, tappi: true }));
  }
  return f;
}

/** Il tavolino accanto alla poltrona: (x, z) del centro. */
const TAVOLINO: V3 = [1.42, 0, 5.35];
const POLTRONE: { x: number; z: number; yaw: number }[] = [
  { x: -1.95, z: 4.75, yaw: -64 },
  { x: 1.95, z: 4.75, yaw: 64 },
];

export function Mezzo({ k }: { k: Ctx }) {
  const { cam: c, luci } = k;
  const facce: Faccia[] = [];
  // Il busto di marmo sulla colonnina (a sinistra, davanti alla libreria) e il globo a destra.
  facce.push(...posaFacce(scatola(-0.17, 0.17, 0, 1.05, -0.17, 0.17, MAT.marmo), 0, [-1.15, 0, 7.6]));
  facce.push(...posaFacce(scatola(-0.21, 0.21, 1.05, 1.12, -0.21, 0.21, MAT.marmo), 0, [-1.15, 0, 7.6]));
  facce.push(...posaFacce(scatola(-0.12, 0.12, 0, 0.66, -0.12, 0.12, MAT.noce), 0, [2.55, 0, 6.85]));
  for (const p of POLTRONE) facce.push(...posaFacce(poltrona(), p.yaw, [p.x, 0, p.z]));
  // Il tavolino: piano tondo (prisma a otto facce), gamba, piede.
  const piano: Faccia[] = [];
  const n8 = 10;
  const r = 0.27;
  for (let i = 0; i < n8; i++) {
    const a0 = (i / n8) * Math.PI * 2;
    const a1 = ((i + 1) / n8) * Math.PI * 2;
    const p0: V3 = [Math.cos(a0) * r, 0, Math.sin(a0) * r];
    const p1: V3 = [Math.cos(a1) * r, 0, Math.sin(a1) * r];
    const am = (a0 + a1) / 2;
    piano.push({ p: [[p0[0], 0.52, p0[2]], [p1[0], 0.52, p1[2]], [p1[0], 0.56, p1[2]], [p0[0], 0.56, p0[2]]], n: [Math.cos(am), 0, Math.sin(am)], m: MAT.noce });
  }
  piano.push({ p: Array.from({ length: n8 }, (_, i) => [Math.cos((i / n8) * Math.PI * 2) * r, 0.56, Math.sin((i / n8) * Math.PI * 2) * r] as V3), n: [0, 1, 0], m: MAT.noce });
  piano.push(...scatola(-0.025, 0.025, 0.08, 0.52, -0.025, 0.025, MAT.noceScuro));
  piano.push(...scatola(-0.16, 0.16, 0, 0.06, -0.16, 0.16, MAT.noceScuro));
  facce.push(...posaFacce(piano, 0, TAVOLINO));
  const dis = disegna(c, facce, luci);
  // Sopra le facce, i dettagli che non sono solidi: la testa del busto, il globo, i bottoni del capitonné.
  const [bx, by] = pr(c, -1.15, 1.12, 7.6);
  const sb = scala(c, 7.6);
  const marmoL = illumina(MAT.marmo, [-1.15, 1.4, 7.5], [0.3, 0.3, -1], luci);
  const marmoO = illumina(MAT.marmo, [-1.15, 1.4, 7.5], [-0.6, 0, -1], luci, 0.4);
  const [gx, gy] = pr(c, 2.55, 0.92, 6.85);
  const sg = scala(c, 6.85);
  const mare = illumina('#2E5A7A', [2.55, 0.9, 6.7], [-0.4, 0.2, -1], luci);
  const terra = illumina('#B8A070', [2.55, 0.9, 6.7], [-0.4, 0.2, -1], luci);
  const bottoni: string[] = [];
  for (const p of POLTRONE) {
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++) {
        const lx = -0.33 + i * 0.22 + (j ? 0.11 : 0);
        if (lx > 0.36) continue;
        const pp = posaPunto([lx, 0.62 + j * 0.13, 0.259], p.yaw, [p.x, 0, p.z]);
        const [ux, uy] = pr(c, pp[0], pp[1], pp[2]);
        const rr = Math.max(0.35, 0.012 * scala(c, pp[2]));
        bottoni.push(`M${r1(ux - rr)} ${r1(uy)}a${r1(rr)} ${r1(rr)} 0 1 0 ${r1(2 * rr)} 0a${r1(rr)} ${r1(rr)} 0 1 0 ${r1(-2 * rr)} 0z`);
      }
  }
  return (
    <G>
      {/* ombre di contatto degli arredi */}
      {[...POLTRONE.map(p => [p.x, p.z, 0.62] as const), [TAVOLINO[0], TAVOLINO[2], 0.3] as const, [2.55, 6.85, 0.24] as const, [-1.15, 7.6, 0.28] as const].map(([x, z, r2], i) => {
        const [ax] = pr(c, x - r2, 0, z);
        const [bx2] = pr(c, x + r2, 0, z);
        const [, ay] = pr(c, x, 0, z + r2 * 0.8);
        const [, by2] = pr(c, x, 0, z - r2 * 0.8);
        return <Ellipse key={'om' + i} cx={(ax + bx2) / 2} cy={(ay + by2) / 2} rx={(bx2 - ax) / 2} ry={Math.max(0.5, (by2 - ay) / 2)} fill="#080304" opacity={0.55} />;
      })}
      {dis.map((d, i) => (
        <Path key={i} d={d.d} fill={d.fill} />
      ))}
      <Path d={bottoni.join('')} fill="#1A0804" opacity={0.6} />
      {/* il busto: spalle e testa */}
      <Path d={`M${r1(bx - 0.17 * sb)} ${r1(by)}C${r1(bx - 0.17 * sb)} ${r1(by - 0.16 * sb)} ${r1(bx - 0.06 * sb)} ${r1(by - 0.2 * sb)} ${r1(bx - 0.05 * sb)} ${r1(by - 0.24 * sb)}H${r1(bx + 0.05 * sb)}C${r1(bx + 0.06 * sb)} ${r1(by - 0.2 * sb)} ${r1(bx + 0.17 * sb)} ${r1(by - 0.16 * sb)} ${r1(bx + 0.17 * sb)} ${r1(by)}Z`} fill={marmoO} />
      <Ellipse cx={bx} cy={by - 0.33 * sb} rx={0.075 * sb} ry={0.1 * sb} fill={marmoO} />
      <Ellipse cx={bx + 0.02 * sb} cy={by - 0.34 * sb} rx={0.05 * sb} ry={0.085 * sb} fill={marmoL} />
      <Path d={`M${r1(bx)} ${r1(by - 0.22 * sb)}C${r1(bx + 0.08 * sb)} ${r1(by - 0.18 * sb)} ${r1(bx + 0.14 * sb)} ${r1(by - 0.1 * sb)} ${r1(bx + 0.15 * sb)} ${r1(by - 0.02 * sb)}`} stroke={marmoL} strokeWidth={Math.max(0.6, 0.03 * sb)} fill="none" />
      {/* il globo sul suo sostegno, con il meridiano d'ottone */}
      <Circle cx={gx} cy={gy - 0.2 * sg} r={0.22 * sg} fill={mare} />
      <Path d={`M${r1(gx - 0.12 * sg)} ${r1(gy - 0.33 * sg)}c${r1(0.05 * sg)} ${r1(0.04 * sg)} ${r1(0.1 * sg)} ${r1(0.02 * sg)} ${r1(0.13 * sg)} ${r1(0.08 * sg)}s${r1(-0.02 * sg)} ${r1(0.1 * sg)} ${r1(0.04 * sg)} ${r1(0.14 * sg)}c${r1(-0.06 * sg)} ${r1(0.02 * sg)} ${r1(-0.14 * sg)} ${r1(-0.05 * sg)} ${r1(-0.17 * sg)} ${r1(-0.1 * sg)}z`} fill={terra} opacity={0.85} />
      <Circle cx={gx} cy={gy - 0.2 * sg} r={0.245 * sg} fill="none" stroke={illumina(MAT.ottone, [2.55, 0.9, 6.7], [-0.4, 0.2, -1], luci)} strokeWidth={Math.max(0.6, 0.02 * sg)} />
      <Path d={`M${r1(gx - 0.08 * sg)} ${r1(gy - 0.36 * sg)}a${r1(0.07 * sg)} ${r1(0.05 * sg)} 0 0 1 ${r1(0.1 * sg)} ${r1(0.03 * sg)}`} stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={Math.max(0.5, 0.015 * sg)} fill="none" />
      <Oggetti k={k} />
    </G>
  );
}

const posaPunto = (p: V3, yaw: number, t: V3): V3 => {
  const a = (yaw * Math.PI) / 180;
  return [t[0] + p[0] * Math.cos(a) + p[2] * Math.sin(a), t[1] + p[1], t[2] - p[0] * Math.sin(a) + p[2] * Math.cos(a)];
};

/** Sul tavolino: il posacenere col sigaro e il bicchiere di whisky che prende la lampada. */
function Oggetti({ k }: { k: Ctx }) {
  const { cam: c, luci } = k;
  const s = scala(c, TAVOLINO[2]);
  const [ax, ay] = pr(c, TAVOLINO[0] - 0.08, 0.565, TAVOLINO[2] - 0.05);
  const [wx, wy] = pr(c, TAVOLINO[0] + 0.1, 0.565, TAVOLINO[2] + 0.02);
  const vetroCol = illumina('#C8D0D8', [TAVOLINO[0], 0.62, TAVOLINO[2]], [-0.6, 0.2, -1], luci);
  const ambra = spenta(k) ? '#3A2410' : mescola('#C87A2A', '#FFD9A0', Math.min(0.5, luceLampada([TAVOLINO[0], 0.6, TAVOLINO[2]], [-1, 0.3, -0.4]) * 2));
  return (
    <G>
      <Ellipse cx={ax} cy={ay} rx={0.07 * s} ry={0.02 * s} fill={illumina('#2A2A30', [TAVOLINO[0], 0.56, TAVOLINO[2]], N.su, luci)} />
      <Path d={`M${r1(ax - 0.01 * s)} ${r1(ay - 0.012 * s)}l${r1(-0.1 * s)} ${r1(-0.006 * s)}v${r1(0.016 * s)}l${r1(0.1 * s)} ${r1(0.005 * s)}z`} fill="#4A2A16" />
      <Circle cx={ax - 0.11 * s} cy={ay - 0.005 * s} r={Math.max(0.5, 0.008 * s)} fill={spenta(k) ? '#3A1A10' : '#FF8A3A'} />
      {/* il bicchiere: vetro, whisky ambrato, il lucido della lampada */}
      <Path d={`M${r1(wx - 0.035 * s)} ${r1(wy - 0.09 * s)}h${r1(0.07 * s)}l${r1(-0.004 * s)} ${r1(0.088 * s)}h${r1(-0.062 * s)}z`} fill={vetroCol} opacity={0.35} />
      <Path d={`M${r1(wx - 0.033 * s)} ${r1(wy - 0.045 * s)}h${r1(0.066 * s)}l${r1(-0.003 * s)} ${r1(0.043 * s)}h${r1(-0.06 * s)}z`} fill={ambra} opacity={0.9} />
      <Path d={`M${r1(wx - 0.025 * s)} ${r1(wy - 0.085 * s)}v${r1(0.075 * s)}`} stroke="#FFF3D8" strokeOpacity={spenta(k) ? 0.15 : 0.6} strokeWidth={Math.max(0.5, 0.008 * s)} />
    </G>
  );
}

/** Il fumo del sigaro, intorno a (0, 0): due volute sottili. La vita lo fa salire e respirare. */
export function Fumo({ s }: { s: number }) {
  return (
    <G>
      <Path d={`M0 0C${r1(-0.04 * s)} ${r1(-0.08 * s)} ${r1(0.05 * s)} ${r1(-0.14 * s)} ${r1(0.01 * s)} ${r1(-0.22 * s)}S${r1(-0.05 * s)} ${r1(-0.34 * s)} ${r1(0.02 * s)} ${r1(-0.42 * s)}`} stroke="#E8E2D8" strokeOpacity={0.22} strokeWidth={Math.max(0.6, 0.014 * s)} fill="none" strokeLinecap="round" />
      <Path d={`M${r1(0.01 * s)} ${r1(-0.1 * s)}C${r1(0.06 * s)} ${r1(-0.17 * s)} ${r1(-0.02 * s)} ${r1(-0.25 * s)} ${r1(0.04 * s)} ${r1(-0.33 * s)}`} stroke="#E8E2D8" strokeOpacity={0.12} strokeWidth={Math.max(0.6, 0.028 * s)} fill="none" strokeLinecap="round" />
    </G>
  );
}

export function fumoScala(c: Camera) {
  return scala(c, TAVOLINO[2]);
}

/* ------------------------------------------------------------------ P3 · il tavolo e la lampada */

/** Il colore del legno del tavolo: quello della sponda equipaggiata, o il noce del club. */
export interface LegnoTavolo {
  luce: string;
  medio: string;
  scuro: string;
}

/** Ombra di contatto, gambe e fascia del tavolo (tutto ciò che sta sotto il piano). */
export function TavoloSotto({ k, legno }: { k: Ctx; legno: LegnoTavolo }) {
  const { cam: c, luci } = k;
  const f: Faccia[] = [];
  const zv = T.z - T.d / 2;
  const zf = T.z + T.d / 2;
  const hw = T.w / 2;
  // Fascia sotto il piano (rientrata), quattro gambe tornite (prismi) con il piede.
  f.push(...scatola(-hw + 0.08, hw - 0.08, T.y - 0.16, T.y - T.spessore, zv + 0.08, zf - 0.08, legno.medio));
  for (const [x, z] of [[-hw + 0.14, zv + 0.14], [hw - 0.14, zv + 0.14], [-hw + 0.14, zf - 0.14], [hw - 0.14, zf - 0.14]]) {
    f.push(...scatola(x - 0.04, x + 0.04, T.y - 0.3, T.y - 0.16, z - 0.04, z + 0.04, legno.medio));
    f.push(...scatola(x - 0.03, x + 0.03, 0.05, T.y - 0.3, z - 0.03, z + 0.03, legno.medio));
    f.push(...scatola(x - 0.05, x + 0.05, T.y - 0.34, T.y - 0.3, z - 0.05, z + 0.05, legno.luce));
    f.push(...scatola(x - 0.038, x + 0.038, 0, 0.05, z - 0.038, z + 0.038, MAT.ottoneScuro));
  }
  const dis = disegna(c, f, luci);
  // L'ombra di contatto: il tavolo copre la luce della lampada, sotto è quasi nero; i bordi sfumano.
  const [ax] = pr(c, -hw - 0.15, 0, T.z);
  const [bx] = pr(c, hw + 0.15, 0, T.z);
  const [, ay] = pr(c, 0, 0, zf + 0.2);
  const [, by] = pr(c, 0, 0, zv - 0.15);
  return (
    <G>
      <Defs>
        <RadialGradient id={k.u('contatto')} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor="#080304" stopOpacity={0.88} />
          <Stop offset={0.62} stopColor="#080304" stopOpacity={0.7} />
          <Stop offset={1} stopColor="#080304" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={(ax + bx) / 2} cy={(ay + by) / 2} rx={((bx - ax) / 2) * 1.08} ry={((by - ay) / 2) * 1.25} fill={url(k, 'contatto')} />
      {dis.map((d, i) => (
        <Path key={i} d={d.d} fill={d.fill} />
      ))}
    </G>
  );
}

/** Lo spessore del piano (bordo verso di noi e fianchi), sotto il panno. */
export function TavoloBordo({ k, legno }: { k: Ctx; legno: LegnoTavolo }) {
  const { cam: c, luci } = k;
  const zv = T.z - T.d / 2;
  const zf = T.z + T.d / 2;
  const hw = T.w / 2;
  const f = scatola(-hw, hw, T.y - T.spessore, T.y, zv, zf, legno.luce).filter(x => x.n[1] === 0);
  const dis = disegna(c, f, luci);
  // Il filo di luce sullo spigolo alto del bordo davanti.
  const [x0, y0] = pr(c, -hw, T.y, zv);
  const [x1] = pr(c, hw, T.y, zv);
  return (
    <G>
      {dis.map((d, i) => (
        <Path key={i} d={d.d} fill={d.fill} />
      ))}
      {spenta(k) ? null : <Path d={`M${r1(x0)} ${r1(y0 + 0.6)}H${r1(x1)}`} stroke="#FFE0B0" strokeOpacity={0.35} strokeWidth={Math.max(0.6, 0.008 * scala(c, zv))} />}
    </G>
  );
}

/** Il piano del tavolo disegnato (quando non c'è il tavolino equipaggiato): sponda di noce e panno verde. */
export function PianoVettoriale({ k, legno, panno = '#1E6A4A' }: { k: Ctx; legno: LegnoTavolo; panno?: string }) {
  const { cam: c, luci } = k;
  const zv = T.z - T.d / 2;
  const zf = T.z + T.d / 2;
  const hw = T.w / 2;
  const sp = 0.1;
  const sponda = illumina(legno.medio, [0, T.y, T.z], N.su, luci, 0.8);
  const panC = illumina(panno, [0, T.y, T.z], N.su, luci, 0.7);
  const panF = illumina(panno, [0, T.y, zf], N.su, luci, 0.55);
  const [, yf] = pr(c, 0, T.y, zf);
  const [, yv] = pr(c, 0, T.y, zv);
  return (
    <G>
      <Defs>
        <LinearGradient id={k.u('pianoPanno')} x1="0" y1={yf} x2="0" y2={yv} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={panF} />
          <Stop offset={0.55} stopColor={panC} />
          <Stop offset={1} stopColor={panF} />
        </LinearGradient>
      </Defs>
      <Path d={orizzontale(c, T.y, -hw, hw, zv, zf)} fill={sponda} />
      <Path d={orizzontale(c, T.y + 0.001, -hw + sp, hw - sp, zv + sp, zf - sp)} fill={url(k, 'pianoPanno')} />
      <Path d={orizzontale(c, T.y + 0.002, -hw + sp - 0.012, hw - sp + 0.012, zv + sp - 0.012, zf - sp + 0.012)} fill="none" stroke={illumina(MAT.ottone, [0, T.y, T.z], N.su, luci, 0.6)} strokeWidth={Math.max(0.5, 0.01 * scala(c, T.z))} />
      {/* il mazzetto coperto: dorsi rossi col bordo avorio */}
      {[0, 1, 2].map(i => (
        <Path key={i} d={orizzontale(c, T.y + 0.004 + i * 0.006, -0.06 + i * 0.004, 0.06 + i * 0.004, T.z - 0.08 - i * 0.003, T.z + 0.09 - i * 0.003)} fill={i === 2 ? '#F2E8D4' : '#C8BCA4'} />
      ))}
      <Path d={orizzontale(c, T.y + 0.017, -0.045 + 0.008, 0.045 + 0.008, T.z - 0.065 - 0.006, T.z + 0.075 - 0.006)} fill="#8E1A26" />
    </G>
  );
}

/** La luce della lampada sul piano: in coordinate dello schermo, sul trapezio del tavolo. */
export function LuceSulPiano({ k }: { k: Ctx }) {
  if (spenta(k)) return null;
  const { cam: c } = k;
  const zv = T.z - T.d / 2;
  const zf = T.z + T.d / 2;
  const [ax] = pr(c, -T.w / 2 - 0.1, T.y, T.z);
  const [bx] = pr(c, T.w / 2 + 0.1, T.y, T.z);
  const [, ay] = pr(c, 0, T.y, zf + 0.1);
  const [, by] = pr(c, 0, T.y, zv - 0.1);
  return (
    <G>
      <Defs>
        <RadialGradient id={k.u('luceTavolo')} cx="50%" cy="46%" r="50%">
          <Stop offset={0} stopColor="#FFE6B8" stopOpacity={0.3} />
          <Stop offset={0.55} stopColor="#FFD9A0" stopOpacity={0.12} />
          <Stop offset={1} stopColor="#FFD9A0" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={(ax + bx) / 2} cy={(ay + by) / 2} rx={(bx - ax) / 2} ry={(by - ay) / 2} fill={url(k, 'luceTavolo')} />
    </G>
  );
}

/** La lampada verde da biliardo: due aste al soffitto, paralume lungo di vetro verde, il cono di luce. */
export function Lampada({ k, cono = true }: { k: Ctx; cono?: boolean }) {
  const { cam: c, luci } = k;
  const L = STANZA.lampada;
  const y0 = L.y;
  const y1 = L.y + L.alto;
  const hx = L.lungo / 2;
  const hz = L.raggio;
  const z = T.z;
  const accesa = !spenta(k);
  const s = scala(c, z);
  // Il paralume a campana: il profilo (larghezza e profondità) va da 1 alla bocca a 0,5 in cima, con la spalla curva.
  const prof = (t: number) => 0.5 + 0.5 * Math.cos((t * Math.PI) / 2) ** 0.7;
  const PASSI = 7;
  const fronte: V3[] = [];
  for (let i = 0; i <= PASSI; i++) {
    const t = i / PASSI;
    fronte.push([-hx * prof(t), y0 + L.alto * t, z - hz * prof(t)]);
  }
  for (let i = PASSI; i >= 0; i--) {
    const t = i / PASSI;
    fronte.push([hx * prof(t), y0 + L.alto * t, z - hz * prof(t)]);
  }
  const lati = ([-1, 1] as const).map(v => [[v * hx * 0.5, y1, z - hz * 0.5], [v * hx * 0.5, y1, z + hz * 0.5], [v * hx, y0, z + hz], [v * hx, y0, z - hz]] as V3[]);
  const sopra: V3[] = [[-hx * 0.5, y1, z - hz * 0.5], [hx * 0.5, y1, z - hz * 0.5], [hx * 0.5, y1, z + hz * 0.5], [-hx * 0.5, y1, z + hz * 0.5]];
  const [, fy1] = pr(c, 0, y1, z - hz * 0.5);
  const [cx1] = pr(c, 0, y1, z);
  const [, fy0] = pr(c, 0, y0, z - hz);
  const [bx0, by0] = pr(c, -hx, y0, z - hz);
  const [bx1] = pr(c, hx, y0, z - hz);
  const [, by1] = pr(c, 0, y0, z + hz);
  const [, ty] = pr(c, 0, T.y, T.z - T.d / 2);
  const [tx0] = pr(c, -T.w / 2, T.y, T.z - T.d / 2);
  const [tx1] = pr(c, T.w / 2, T.y, T.z - T.d / 2);
  const [, soffY] = pr(c, 0, STANZA.alto, z);
  const vedoSopra = c.ye > y1;
  const vedoSotto = c.ye < y0;
  const ott = illumina(MAT.ottone, [0, y1, z], [-0.3, 0.3, -1], luci);
  const ottScuro = mescola(ott, '#000000', 0.45);
  const asta = Math.max(0.6, 0.008 * s);
  const aste = [cx1];
  const lw = tx1 - tx0;
  return (
    <G>
      <Defs>
        <LinearGradient id={k.u('vetroL')} x1="0" y1={fy1} x2="0" y2={fy0} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={accesa ? '#0C2E1E' : '#08180F'} />
          <Stop offset={0.55} stopColor={accesa ? '#17583A' : '#0C2418'} />
          <Stop offset={0.9} stopColor={accesa ? '#2A8A56' : '#0F2C1E'} />
          <Stop offset={1} stopColor={accesa ? '#58C88A' : '#123826'} />
        </LinearGradient>
        {accesa ? (
          <>
            <LinearGradient id={k.u('cono')} x1="0" y1={by0} x2="0" y2={ty} gradientUnits="userSpaceOnUse">
              <Stop offset={0} stopColor="#FFE2B0" stopOpacity={0.1} />
              <Stop offset={0.5} stopColor="#FFD9A0" stopOpacity={0.035} />
              <Stop offset={1} stopColor="#FFD9A0" stopOpacity={0} />
            </LinearGradient>
            <RadialGradient id={k.u('bocca')} cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor="#FFE6B8" stopOpacity={0.45} />
              <Stop offset={1} stopColor="#FFE6B8" stopOpacity={0} />
            </RadialGradient>
          </>
        ) : null}
      </Defs>
      {accesa && cono ? (
        <>
          <Path d={poli2([[bx0, by0], [bx1, by0], [tx1 + lw * 0.05, ty], [tx0 - lw * 0.05, ty]])} fill={url(k, 'cono')} />
          <Path d={poli2([[bx0 + (bx1 - bx0) * 0.15, by0], [bx1 - (bx1 - bx0) * 0.15, by0], [tx1 - lw * 0.12, ty], [tx0 + lw * 0.12, ty]])} fill={url(k, 'cono')} />
        </>
      ) : null}
      {/* due aste d'ottone fino al soffitto */}
      <Path d={aste.map(x => `M${r1(x - asta / 2)} ${r1(soffY)}V${r1(fy1)}h${r1(asta)}V${r1(soffY)}z`).join('')} fill={ottScuro} />
      {vedoSotto && accesa ? <Path d={poli2([[bx0, by0], [bx1, by0], [bx1 - (bx1 - bx0) * 0.03, by1], [bx0 + (bx1 - bx0) * 0.03, by1]])} fill="#FFF0D0" /> : null}
      {vedoSopra ? <Path d={poli(c, sopra)} fill={accesa ? '#0B2A1C' : '#08180F'} /> : null}
      {lati.map((l, i) => (
        <Path key={i} d={poli(c, l)} fill={accesa ? '#0E3622' : '#0A1E14'} />
      ))}
      <Path d={poli(c, fronte)} fill={url(k, 'vetroL')} />
      {/* il lucido sul vetro in alto a sinistra (la luce della sala) */}
      <Path d={poli(c, [[-hx * prof(0.62) * 0.92, y0 + L.alto * 0.62, z - hz * prof(0.62) - 0.002], [-hx * 0.12, y0 + L.alto * 0.62, z - hz * prof(0.62) - 0.002], [-hx * 0.12, y0 + L.alto * 0.72, z - hz * prof(0.72) - 0.002], [-hx * prof(0.72) * 0.92, y0 + L.alto * 0.72, z - hz * prof(0.72) - 0.002]])} fill="#E8FFF0" opacity={accesa ? 0.16 : 0.06} />
      {/* bordi d'ottone: in alto e in basso */}
      <Path d={poli(c, [[-hx * 0.52, y1 - 0.005, z - hz * 0.52], [hx * 0.52, y1 - 0.005, z - hz * 0.52], [hx * 0.3, y1 + 0.04, z - hz * 0.3], [-hx * 0.3, y1 + 0.04, z - hz * 0.3]])} fill={ott} />
      <Path d={poli(c, [[-hx - 0.01, y0 - 0.022, z - hz - 0.01], [hx + 0.01, y0 - 0.022, z - hz - 0.01], [hx + 0.01, y0 + 0.008, z - hz - 0.01], [-hx - 0.01, y0 + 0.008, z - hz - 0.01]])} fill={ott} />
      {accesa ? (
        <>
          <Ellipse cx={(bx0 + bx1) / 2} cy={by0 + (by1 - by0) / 2 + 1} rx={(bx1 - bx0) * 0.55} ry={Math.max(3, 0.08 * s)} fill={url(k, 'bocca')} />
          <Path d={`M${r1(bx0 + 1)} ${r1(by0 + 0.4)}H${r1(bx1 - 1)}`} stroke="#FFF3C8" strokeOpacity={0.85} strokeWidth={Math.max(0.6, 0.008 * s)} />
        </>
      ) : null}
    </G>
  );
}

/* ------------------------------------------------------------------ P4 · il primo piano */

/** In primo piano, scuri e fuori fuoco: l'ala di una poltrona a sinistra e il fusto di un posacenere a destra. */
export function PrimoPiano({ k }: { k: Ctx }) {
  const { cam: c } = k;
  const W = c.w;
  const Hc = c.h;
  const m = c.m;
  const u = Math.min(W - 2 * m, Hc - 2 * m);
  // L'ala: una curva morbida che entra dal basso a sinistra; il bordo prende un filo della lampada.
  const ala = `M${r1(-2)} ${r1(Hc + 2)}V${r1(Hc - m - u * 0.3)}C${r1(m + u * 0.05)} ${r1(Hc - m - u * 0.34)} ${r1(m + u * 0.13)} ${r1(Hc - m - u * 0.29)} ${r1(m + u * 0.15)} ${r1(Hc - m - u * 0.15)}C${r1(m + u * 0.16)} ${r1(Hc - m - u * 0.07)} ${r1(m + u * 0.16)} ${r1(Hc - m)} ${r1(m + u * 0.19)} ${r1(Hc + 2)}Z`;
  const bordo = `M${r1(m - 2)} ${r1(Hc - m - u * 0.3)}C${r1(m + u * 0.05)} ${r1(Hc - m - u * 0.34)} ${r1(m + u * 0.13)} ${r1(Hc - m - u * 0.29)} ${r1(m + u * 0.15)} ${r1(Hc - m - u * 0.15)}`;
  const fx = W - m - u * 0.1;
  const fusto = `M${r1(fx - u * 0.022)} ${r1(Hc + 2)}V${r1(Hc - m - u * 0.3)}h${r1(u * 0.044)}V${r1(Hc + 2)}Z`;
  const coppa = `M${r1(fx - u * 0.11)} ${r1(Hc - m - u * 0.3)}Q${r1(fx)} ${r1(Hc - m - u * 0.25)} ${r1(fx + u * 0.11)} ${r1(Hc - m - u * 0.3)}L${r1(fx + u * 0.1)} ${r1(Hc - m - u * 0.33)}H${r1(fx - u * 0.1)}Z`;
  const spessi = [10, 6, 3].map(x => (x * u) / 400);
  return (
    <G>
      {/* sfocatura finta: lo stesso contorno con tratti larghi e trasparenti, poi il pieno */}
      {spessi.map((sw, i) => (
        <Path key={'a' + i} d={ala} fill="none" stroke="#0B0605" strokeOpacity={0.18} strokeWidth={sw} strokeLinejoin="round" />
      ))}
      <Path d={ala} fill="#0E0706" />
      <Path d={bordo} stroke={spenta(k) ? '#3A4A6A' : '#8A4A2A'} strokeOpacity={0.3} strokeWidth={(2.4 * u) / 400} fill="none" strokeLinecap="round" />
      {spessi.map((sw, i) => (
        <Path key={'f' + i} d={fusto + coppa} fill="none" stroke="#0B0605" strokeOpacity={0.16} strokeWidth={sw} strokeLinejoin="round" />
      ))}
      <Path d={fusto + coppa} fill="#120A06" />
      <Path d={`M${r1(fx - u * 0.016)} ${r1(Hc - m - u * 0.29)}V${r1(Hc)}`} stroke={spenta(k) ? '#3A4A6A' : '#C9A15A'} strokeOpacity={0.35} strokeWidth={(2.2 * u) / 400} />
    </G>
  );
}

/** La vignetta della scena: angoli nell'ombra calda, un filo freddo in basso a destra. Fissa sullo schermo. */
export function Vignetta({ k, w, h }: { k: Ctx; w: number; h: number }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={k.u('vign')} cx="50%" cy="45%" r="75%">
          <Stop offset={0.5} stopColor="#080304" stopOpacity={0} />
          <Stop offset={1} stopColor="#080304" stopOpacity={0.72} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={url(k, 'vign')} />
    </G>
  );
}

/** La lampada verde: l'ancora dei passi della sequenza di sblocco (la lampada si accende per ultima). */
export const LAMPADA_PUNTO = LAMPADA;
