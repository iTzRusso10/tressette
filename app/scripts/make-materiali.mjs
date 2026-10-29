// Cuoce le trame dei materiali di «Lampara» (docs/direzione-artistica.md §5.6, docs/tecnologie-grafica.md).
//
// Uso (da app/): node scripts/make-materiali.mjs
//
// Ogni trama è uno strato NEUTRO: luce bianca e ombra nera con alfa. Si posa con la normale composizione
// alfa su qualsiasi colore di base (niente blend mode), identica su iOS, Android e web.
//
// Come si fa una trama ripetibile senza cuciture: resvg non applica `stitchTiles` (provato: il bordo non
// combacia), quindi il rumore non viene da feTurbulence. Ogni trama è disegnata con primitive SVG seminate
// (fibre, venature, pori, granuli, ciottoli) e ogni primitiva che tocca un bordo è ripetuta dall'altra
// parte. Il disegno è un `<pattern>` che riempie una tela 3×3 volte la tessera: i filtri locali (sfocatura,
// luce diffusa) lavorano su un'immagine periodica e la tessera centrale, ritagliata, si ripete perfetta.
// La luce dei rilievi (cuoio, sughero) viene da in alto a sinistra, come la lampada (§5.3).
//
// Poi Python + Pillow (già usato da clean-cards.py): ritaglio, codifica neutra (scarto dalla media → bianco
// o nero con alfa), WebP senza perdite (a perdita solo se una trama sfora il suo tetto). Scrive:
//   assets/arte/trame/<nome>.webp       le trame (budget: ≤ 60 KB ciascuna, ≤ 400 KB in tutto)
//   src/ui/arte/trame.ts                il registro per l'app (require statici)
//   .visual/arte/foglio.png             foglio di controllo (non nel repository): ogni trama 2×2 sul suo
//                                       materiale, per vedere che non ci siano cuciture
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets/arte/trame');
const sheetDir = join(root, '.visual/arte');
mkdirSync(outDir, { recursive: true });
mkdirSync(sheetDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'materiali-'));

/* ------------------------------------------------------------------ utilità */

// Stesso generatore di src/engine/rng.ts (mulberry32): stessa trama a ogni cottura.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = n => Math.round(n * 100) / 100;
const TAU = Math.PI * 2;
// Grigio con alfa: v > 0 schiarisce, v < 0 scurisce (sul fondo grigio medio della tela).
const tono = v => (v >= 0 ? `fill="#FFF" fill-opacity="${f(v)}"` : `fill="#000" fill-opacity="${f(-v)}"`);
/** Macchia morbida: ellisse riempita con un gradiente radiale (bianco o nero) che svanisce al bordo. */
const macchia = (cx, cy, rx, ry, v, rot = 0) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${v >= 0 ? 'mL' : 'mD'})" fill-opacity="${f(Math.min(1, Math.abs(v)))}"${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ''}/>`;
const MACCHIE_DEFS = `<radialGradient id="mL"><stop offset="0" stop-color="#FFF"/><stop offset=".45" stop-color="#FFF" stop-opacity=".55"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></radialGradient><radialGradient id="mD"><stop offset="0" stop-color="#000"/><stop offset=".45" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
const tonoS = v => (v >= 0 ? `stroke="#FFF" stroke-opacity="${f(v)}"` : `stroke="#000" stroke-opacity="${f(-v)}"`);

/**
 * Ripete un elemento ai bordi: `draw(dx, dy)` disegna la primitiva spostata. Si ripete solo dove il suo
 * ingombro (cx, cy ± r) esce dalla tessera, così le trame fitte restano leggere da cuocere.
 */
function wrap(S, cx, cy, r, draw) {
  let s = '';
  for (const dx of [-S, 0, S])
    for (const dy of [-S, 0, S]) {
      const x = cx + dx;
      const y = cy + dy;
      if (x + r < 0 || x - r > S || y + r < 0 || y - r > S) continue;
      s += draw(dx, dy);
    }
  return s;
}

/** Percorso liscio (Catmull-Rom → Bézier) da una lista di punti. */
function smooth(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

/**
 * La tela: la tessera S×S come pattern su una tela 3S×3S, con `filtro` (corpo di un <filter>) applicato
 * a tutta la tela. Fondo grigio medio: le primitive lo schiariscono o lo scuriscono.
 */
function tela(S, contenuto, filtro = '', fondo = '#808080') {
  const T = 3 * S;
  const fil = filtro
    ? `<filter id="f" x="0" y="0" width="${T}" height="${T}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">${filtro}</filter>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">
<defs>${MACCHIE_DEFS}<pattern id="t" x="0" y="0" width="${S}" height="${S}" patternUnits="userSpaceOnUse"><rect width="${S}" height="${S}" fill="${fondo}"/>${contenuto}</pattern>${fil}</defs>
<rect width="${T}" height="${T}" fill="url(#t)"${filtro ? ' filter="url(#f)"' : ''}/></svg>`;
}

/* ------------------------------------------------------------------ le trame */

// Ogni ricetta restituisce { S, svg, guadagno, chiaro }: `guadagno` porta la deviazione standard dello
// scarto a ~40/255 di alfa; `chiaro` (0…1) attenua la parte che schiarisce (venature e pori: solo ombra).

/** Noce: venatura dritta che ondeggia piano, bande di legno primaverile/tardivo, pori allungati. */
function legno() {
  const S = 512;
  const rnd = seeded(11);
  // Campo di flusso periodico: tutte le fibre seguono la stessa onda, che cambia piano con la quota.
  const waves = [1, 2, 3].map(k => ({ k, a: (3.2 / k) * (0.6 + rnd() * 0.6), p: rnd() * TAU, q: rnd() * TAU }));
  const flow = (x, y0) =>
    waves.reduce((s, w) => s + w.a * (0.75 + 0.35 * Math.sin((TAU * y0) / S + w.q)) * Math.sin((TAU * w.k * x) / S + w.p), 0);
  const line = (y0, wob) => {
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const x = (i / 32) * S;
      pts.push([x, y0 + flow(x, y0) + wob * Math.sin((TAU * 3 * x) / S + y0)]);
    }
    return pts;
  };
  let bande = '';
  // Bande morbide: legno tardivo più scuro, primaverile più chiaro.
  for (let i = 0; i < 26; i++) {
    const y0 = rnd() * S;
    const w = 5 + rnd() * 16;
    const v = rnd() < 0.62 ? -(0.14 + rnd() * 0.22) : 0.08 + rnd() * 0.12;
    const pts = line(y0, 1.5);
    bande += wrap(S, S / 2, y0, S, (dx, dy) => (dx ? '' : `<path d="${smooth(shift(pts, 0, dy))}" fill="none" stroke-width="${f(w)}" ${tonoS(v)}/>`));
  }
  let fibre = '';
  for (let i = 0; i < 120; i++) {
    const y0 = rnd() * S;
    const v = rnd() < 0.8 ? -(0.22 + rnd() * 0.45) : 0.12 + rnd() * 0.2;
    const pts = line(y0, 0.6 + rnd());
    fibre += wrap(S, S / 2, y0, S, (dx, dy) => (dx ? '' : `<path d="${smooth(shift(pts, 0, dy))}" fill="none" stroke-width="${f(0.5 + rnd() * 1.1)}" ${tonoS(v)}/>`));
  }
  // Pori: trattini scuri lungo il flusso (il noce li ha ben visibili).
  let pori = '';
  for (let i = 0; i < 520; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const l = 3 + rnd() * 7;
    const yy = y + flow(x, y) - flow(0, y);
    pori += wrap(S, x, yy, l, (dx, dy) => `<path d="M${f(x + dx)} ${f(yy + dy)}h${f(l)}" stroke-width="${f(0.7 + rnd() * 0.7)}" stroke-linecap="round" ${tonoS(-(0.25 + rnd() * 0.4))}/>`);
  }
  // Variazione lenta di tono: il pannello non è mai uniforme.
  let macchie = '';
  for (let i = 0; i < 18; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const rx = 60 + rnd() * 120;
    const ry = 14 + rnd() * 30;
    const v = (rnd() - 0.5) * 0.3;
    macchie += wrap(S, x, y, rx * 1.6, (dx, dy) => macchia(x + dx, y + dy, rx * 1.6, ry * 2, v * 1.2));
  }
  const svg = tela(
    S,
    `${macchie}<g>${bande}</g>${fibre}${pori}`,
    // La sfocatura allunga lungo la fibra: le linee restano continue, le bande si ammorbidiscono.
    `<feGaussianBlur stdDeviation="1.4 0.45"/>`,
  );
  return { S, svg, guadagno: 1, chiaro: 0.8 };
}

/** Ottone spazzolato: righe orizzontali fittissime, lunghe e corte, chiare e scure. */
function spazzolato() {
  const S = 256;
  const rnd = seeded(23);
  let s = '';
  for (let i = 0; i < 1100; i++) {
    const y = rnd() * S;
    const x = rnd() * S;
    const l = 20 + rnd() * rnd() * 300;
    const v = (rnd() < 0.5 ? -1 : 1) * (0.08 + rnd() * 0.3);
    const w = 0.35 + rnd() * 0.75;
    s += wrap(S, x + l / 2, y, l / 2 + 1, (dx, dy) => `<path d="M${f(x + dx)} ${f(y + dy)}h${f(l)}" stroke-width="${f(w)}" ${tonoS(v)}/>`);
  }
  // Qualche graffio più lungo e più chiaro: il metallo vero non è perfetto.
  for (let i = 0; i < 14; i++) {
    const y = rnd() * S;
    const x = rnd() * S;
    const l = 120 + rnd() * 200;
    s += wrap(S, x + l / 2, y, l / 2 + 1, (dx, dy) => `<path d="M${f(x + dx)} ${f(y + dy)}h${f(l)}" stroke-width=".6" ${tonoS(0.45)}/>`);
  }
  return { S, svg: tela(S, s, `<feGaussianBlur stdDeviation="2.2 0.25"/>`), guadagno: 1, chiaro: 1 };
}

/** Carta avorio: grana fine, fibre corte in ogni direzione, macchie lente di stampa a mano. */
function carta() {
  const S = 256;
  const rnd = seeded(37);
  let s = '';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 6 + rnd() * 16;
    const v = (rnd() - 0.4) * 0.035;
    s += wrap(S, x, y, r * 2, (dx, dy) => macchia(x + dx, y + dy, r * 2, r * 2, v));
  }
  for (let i = 0; i < 4200; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.3 + rnd() * 0.5;
    s += wrap(S, x, y, r, (dx, dy) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r)}" ${tono((rnd() < 0.5 ? -1 : 1) * (0.03 + rnd() * 0.07))}/>`);
  }
  // Qualche inclusione più scura (la carta fatta a mano ne ha), rara.
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.35 + rnd() * 0.45;
    s += wrap(S, x, y, r, (dx, dy) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r)}" ${tono(-(0.25 + rnd() * 0.25))}/>`);
  }
  for (let i = 0; i < 120; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const l = 4 + rnd() * 12;
    const a = rnd() * TAU;
    const b = (rnd() - 0.5) * 8;
    const x2 = x + Math.cos(a) * l;
    const y2 = y + Math.sin(a) * l;
    const mx = (x + x2) / 2 - Math.sin(a) * b;
    const my = (y + y2) / 2 + Math.cos(a) * b;
    const v = (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.1);
    s += wrap(S, x, y, l + 4, (dx, dy) => `<path d="M${f(x + dx)} ${f(y + dy)}Q${f(mx + dx)} ${f(my + dy)} ${f(x2 + dx)} ${f(y2 + dy)}" fill="none" stroke-width="${f(0.35 + rnd() * 0.5)}" ${tonoS(v)}/>`);
  }
  const svg = tela(S, s, `<feGaussianBlur stdDeviation=".35"/>`);
  // Guadagno basso: la carta è quasi liscia, la grana si sente più che vedersi.
  return { S, svg, guadagno: 0.7, chiaro: 0.9 };
}

/** Velluto: pelo fittissimo e «schiacciato» a chiazze allungate (il segno del velluto vero). */
function velluto() {
  const S = 256;
  const rnd = seeded(41);
  let chiazze = '';
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const rx = 7 + rnd() * 18;
    const ry = 2.5 + rnd() * 6;
    const a = -25 + rnd() * 50;
    const v = (rnd() < 0.6 ? -1 : 1) * (0.03 + rnd() * 0.04);
    chiazze += wrap(S, x, y, rx * 1.8, (dx, dy) => macchia(x + dx, y + dy, rx * 1.8, ry * 2.2, v * 1.6, a));
  }
  let pelo = '';
  for (let i = 0; i < 7000; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.35 + rnd() * 0.55;
    pelo += wrap(S, x, y, r, (dx, dy) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r)}" ${tono((rnd() < 0.6 ? -1 : 1) * (0.06 + rnd() * 0.12))}/>`);
  }
  const svg = tela(S, `${chiazze}${pelo}`, `<feGaussianBlur stdDeviation=".45"/>`);
  return { S, svg, guadagno: 0.85, chiaro: 0.5 };
}

/**
 * Cuoio: grana a ciottoli. I ciottoli sono l'alfa (l'altezza) di una mappa che feDiffuseLighting
 * illumina da in alto a sinistra (azimut 250°, la lampada); tra i ciottoli restano solchi e qualche piega.
 */
function cuoio() {
  const S = 256;
  const rnd = seeded(53);
  let s = '';
  const n = 22;
  const cell = S / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = (i + 0.5 + (rnd() - 0.5) * 0.85) * cell;
      const y = (j + 0.5 + (rnd() - 0.5) * 0.85) * cell;
      const r = cell * (0.38 + rnd() * 0.2);
      const a = rnd() * 180;
      const e = 0.75 + rnd() * 0.4;
      s += wrap(S, x, y, r * 1.4, (dx, dy) => `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="${f(r)}" ry="${f(r * e)}" transform="rotate(${f(a)} ${f(x + dx)} ${f(y + dy)})" fill="#000"/>`);
    }
  // Pieghe: poche, lunghe, sottili; tagliano i ciottoli (alfa tolto).
  let pieghe = '';
  for (let i = 0; i < 7; i++) {
    const pts = [];
    let x = rnd() * S;
    let y = rnd() * S;
    const a0 = rnd() * TAU;
    for (let k = 0; k < 8; k++) {
      pts.push([x, y]);
      const a = a0 + (rnd() - 0.5) * 0.9;
      x += Math.cos(a) * 12;
      y += Math.sin(a) * 12;
    }
    pieghe += wrap(S, pts[0][0], pts[0][1], 110, (dx, dy) => `<path d="${smooth(shift(pts, dx, dy))}" fill="none" stroke="#000" stroke-width="${f(0.8 + rnd())}"/>`);
  }
  const svg = tela(
    S,
    `<g>${s}</g><g style="mix-blend-mode:normal">${pieghe.replace(/stroke="#000"/g, 'stroke="#fff"')}</g>`,
    `<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 0 0 0 1" result="h"/>
     <feGaussianBlur in="h" stdDeviation="1.1" result="hb"/>
     <feDiffuseLighting in="hb" surfaceScale="2.6" diffuseConstant="1" lighting-color="#fff"><feDistantLight azimuth="250" elevation="42"/></feDiffuseLighting>`,
    '#ffffff',
  );
  return { S, svg, guadagno: 1, chiaro: 0.85 };
}

/** Marmo: nubi lente, due o tre vene principali in diagonale con i loro capelli, tutte periodiche. */
function marmo() {
  const S = 512;
  const rnd = seeded(67);
  let nubi = '';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 40 + rnd() * 90;
    const v = (rnd() - 0.55) * 0.22;
    nubi += wrap(S, x, y, r * 2.2, (dx, dy) => macchia(x + dx, y + dy, r * 2.2, r * 1, v, -32));
  }
  // Una vena va da (x0, y0) a (x0 + S, y0 + S·k): così rientra dall'altra parte e si ripete.
  const vena = (x0, y0, k, amp, seed) => {
    const r2 = seeded(seed);
    const wv = [1, 2, 3, 5, 8].map(j => ({ j, a: (amp / j) * (0.5 + r2()), p: r2() * TAU }));
    const pts = [];
    const L = Math.hypot(S, S * k);
    const nx = (-S * k) / L;
    const ny = S / L;
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const w = wv.reduce((s, q) => s + q.a * Math.sin(TAU * q.j * t + q.p), 0);
      pts.push([x0 + t * S + nx * w, y0 + t * S * k + ny * w]);
    }
    return pts;
  };
  let vene = '';
  const draw = (pts, w, v, blur) => {
    let s = '';
    for (const dx of [-S, 0, S]) for (const dy of [-2 * S, -S, 0, S]) s += `<path d="${smooth(shift(pts, dx, dy))}" fill="none" stroke-width="${f(w)}" stroke-linecap="round" ${tonoS(v)}${blur ? ` filter="url(#${blur})"` : ''}/>`;
    return s;
  };
  for (let i = 0; i < 3; i++) {
    const pts = vena(rnd() * S, rnd() * S, 1, 26 + rnd() * 20, 100 + i);
    const peso = i === 0 ? 1 : 0.6;
    vene += draw(pts, 9 + rnd() * 8, -0.1 * peso, 'b2');
    vene += draw(pts, 2.2 + rnd() * 1.5, -0.22 * peso, 'b1');
    vene += draw(pts, 0.7 + rnd() * 0.6, -0.42 * peso, '');
    vene += draw(shift(pts, 1.6, -1.2), 0.6, 0.35 * peso, '');
    // I capelli: rami corti che partono dalla vena e se ne allontanano piano.
    for (let k = 0; k < 9; k++) {
      const p = pts[Math.floor(rnd() * pts.length)];
      const br = [];
      let x = p[0];
      let y = p[1];
      const a0 = rnd() * TAU;
      const n = 6 + Math.floor(rnd() * 10);
      for (let q = 0; q < n; q++) {
        br.push([x, y]);
        const a = a0 + (rnd() - 0.5) * 1.1;
        x += Math.cos(a) * 10;
        y += Math.sin(a) * 10;
      }
      vene += draw(br, 0.4 + rnd() * 0.6, -(0.12 + rnd() * 0.2), '');
    }
  }
  const svg = tela(S, `${nubi}${vene}`, `<feGaussianBlur stdDeviation=".45"/>`).replace(
    '<defs>',
    `<defs><filter id="b2" filterUnits="userSpaceOnUse" x="-${S}" y="-${S}" width="${3 * S}" height="${3 * S}"><feGaussianBlur stdDeviation="4"/></filter><filter id="b1" filterUnits="userSpaceOnUse" x="-${S}" y="-${S}" width="${3 * S}" height="${3 * S}"><feGaussianBlur stdDeviation="1"/></filter>`,
  );
  return { S, svg, guadagno: 1, chiaro: 0.6 };
}

/** Sughero: granuli fitti chiari e scuri, piccoli buchi, qualche lenticella allungata. */
function sughero() {
  const S = 256;
  const rnd = seeded(71);
  let s = '';
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.8 + rnd() * 2.2;
    const v = (rnd() < 0.5 ? -1 : 1) * (0.12 + rnd() * 0.32);
    // Granuli irregolari: poligoni a 5 lati.
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * TAU + rnd() * 0.8;
      const rr = r * (0.6 + rnd() * 0.6);
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    });
    s += wrap(S, x, y, r * 1.3, (dx, dy) => `<path d="M${pts.map(([a, b]) => `${f(a + dx)} ${f(b + dy)}`).join('L')}Z" ${tono(v)}/>`);
  }
  for (let i = 0; i < 150; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.7 + rnd() * 1.6;
    s += wrap(S, x, y, r * 2, (dx, dy) => `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="${f(r * 1.3)}" ry="${f(r)}" ${tono(-(0.55 + rnd() * 0.35))}/>`);
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const l = 3 + rnd() * 6;
    s += wrap(S, x, y, l, (dx, dy) => `<path d="M${f(x + dx)} ${f(y + dy)}h${f(l)}" stroke-width="${f(1 + rnd())}" stroke-linecap="round" ${tonoS(-0.6)}/>`);
  }
  return { S, svg: tela(S, s, `<feGaussianBlur stdDeviation=".3"/>`), guadagno: 1, chiaro: 0.9 };
}

/** Craquelure della maiolica: una rete di crepe sottili (ogni punto unito ai vicini), filo scuro e chiaro. */
function crepe() {
  const S = 256;
  const rnd = seeded(83);
  const pts = Array.from({ length: 34 }, () => [rnd() * S, rnd() * S]);
  const d2 = (a, b) => {
    let dx = Math.abs(a[0] - b[0]);
    let dy = Math.abs(a[1] - b[1]);
    dx = Math.min(dx, S - dx);
    dy = Math.min(dy, S - dy);
    return dx * dx + dy * dy;
  };
  let s = '';
  const done = new Set();
  pts.forEach((p, i) => {
    const near = pts
      .map((q, j) => [j, d2(p, q)])
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);
    for (const [j] of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (done.has(key)) continue;
      done.add(key);
      // Il vicino «vero» può stare oltre il bordo: si prende la copia più vicina.
      let q = pts[j];
      let best = null;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const c = [q[0] + ox, q[1] + oy];
        const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2;
        if (!best || d < best[1]) best = [c, d];
      }
      q = best[0];
      const seg = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const j2 = k === 0 || k === 6 ? 0 : (rnd() - 0.5) * 6;
        seg.push([p[0] + (q[0] - p[0]) * t + j2, p[1] + (q[1] - p[1]) * t + j2]);
      }
      const d = seg.map(([x, y], k) => `${k ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
      s += wrap(S, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Math.sqrt(best[1]) / 2 + 4, (dx, dy) => {
        const t = `translate(${dx} ${dy})`;
        return `<path d="${d}" transform="${t}" fill="none" stroke-width=".9" ${tonoS(-0.7)}/><path d="${d}" transform="${t} translate(.7 .7)" fill="none" stroke-width=".6" ${tonoS(0.5)}/>`;
      });
    }
  });
  return { S, svg: tela(S, s, `<feGaussianBlur stdDeviation=".25"/>`), guadagno: 1, chiaro: 1 };
}

/** Panno: feltro, fibre corte e fittissime in tutte le direzioni, appena macchiato. */
function panno() {
  const S = 256;
  const rnd = seeded(97);
  let s = '';
  for (let i = 0; i < 60; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 5 + rnd() * 12;
    const v = (rnd() - 0.5) * 0.14;
    s += wrap(S, x, y, r * 2, (dx, dy) => macchia(x + dx, y + dy, r * 2, r * 2, v));
  }
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const l = 1.5 + rnd() * 4.5;
    const a = rnd() * TAU;
    const x2 = x + Math.cos(a) * l;
    const y2 = y + Math.sin(a) * l;
    const v = (rnd() < 0.5 ? -1 : 1) * (0.1 + rnd() * 0.25);
    s += wrap(S, x, y, l + 1, (dx, dy) => `<path d="M${f(x + dx)} ${f(y + dy)}L${f(x2 + dx)} ${f(y2 + dy)}" stroke-width=".45" ${tonoS(v)}/>`);
  }
  const svg = tela(S, s, `<feGaussianBlur stdDeviation=".35"/>`);
  return { S, svg, guadagno: 1, chiaro: 1 };
}

/* ------------------------------------------------------------------ cottura */

// densita: pixel della trama per punto dello schermo (2 = nitida sui telefoni 2× e buona sui 3×).
// opacita: quella consigliata sul materiale (i componenti in src/ui/arte la usano già).
const TRAME = [
// maxKb: il tetto di ciascuna (la somma sta sotto i 400 KB del budget): la qualità scende finché ci sta.
  { nome: 'legno', fn: legno, opacita: 0.6, maxKb: 58, uso: 'noce lucidato' },
  { nome: 'spazzolato', fn: spazzolato, opacita: 0.45, maxKb: 30, uso: 'ottone, oro, peltro, argento' },
  { nome: 'carta', fn: carta, opacita: 0.6, maxKb: 44, uso: 'carta avorio, cartigli, biglietti' },
  { nome: 'velluto', fn: velluto, opacita: 0.5, maxKb: 44, uso: 'velluto (nicchie, teca, sipario)' },
  { nome: 'cuoio', fn: cuoio, opacita: 0.7, maxKb: 48, uso: 'cuoio (pannelli, targhette dei nomi)' },
  { nome: 'marmo', fn: marmo, opacita: 0.85, maxKb: 50, uso: 'marmo (piedistalli, scene del Capitolo III)' },
  { nome: 'sughero', fn: sughero, opacita: 0.9, maxKb: 44, uso: 'sughero (bacheca delle missioni)' },
  { nome: 'crepe', fn: crepe, opacita: 0.22, maxKb: 20, uso: 'craquelure della maiolica e della foglia d’oro' },
  { nome: 'panno', fn: panno, opacita: 0.4, maxKb: 44, uso: 'panno in vetrina (anteprime)' },
];

const py = `
import sys, json
from PIL import Image, ImageStat, ImageChops
src, S, gain_target, chiaro, out, q = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5], int(sys.argv[6])
im = Image.open(src).convert('L')
tile = im.crop((S, S, 2 * S, 2 * S))
st = ImageStat.Stat(tile)
m, sd = st.mean[0], max(st.stddev[0], 1e-3)
g = gain_target / sd
clamp = lambda v: 0 if v < 0 else (255 if v > 255 else int(round(v)))
light = tile.point(lambda v: clamp((v - m) * g * chiaro) if v > m else 0)
dark = tile.point(lambda v: clamp((m - v) * g) if v < m else 0)
a = ImageChops.add(light, dark)
# Colore: bianco dove la trama schiarisce, nero dove scurisce, con un passaggio morbido vicino alla media
# (lì l'alfa è quasi zero e il grigio non si vede). Così il WebP non spreca byte su salti 0/255 invisibili.
c = tile.point(lambda v: clamp(128 + (v - m) * g))
rgba = Image.merge('RGBA', (c, c, c, a))
# Senza perdite: grigio + alfa si comprime meglio così che con la codifica a perdita (provato: −40%), e
# le sfumature lente (nubi del marmo, chiazze del velluto) non fanno gradini. q > 100 = a perdita.
if q >= 100:
    rgba.save(out, 'WEBP', lossless=True, quality=100, method=6)
else:
    rgba.save(out, 'WEBP', quality=q, alpha_quality=min(100, q + 10), method=6)
print(json.dumps({'media': round(m, 1), 'dev': round(sd, 1)}))
`;

const report = [];
for (const t of TRAME) {
  const { S, svg, chiaro, guadagno } = t.fn();
  const t0 = Date.now();
  const png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
  const raw = join(tmp, `${t.nome}.png`);
  writeFileSync(raw, png);
  const out = join(outDir, `${t.nome}.webp`);
  // Qualità: si scende finché la trama sta nel budget di 60 KB.
  let info = null;
  for (const q of [100, 86, 80, 74, 68, 62, 56, 50, 44]) {
    const r = spawnSync('python3', ['-c', py, raw, String(S), String(44 * guadagno), String(chiaro), out, String(q)], { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(r.stderr);
      process.exit(1);
    }
    info = { ...JSON.parse(r.stdout), q };
    if (statSync(out).size <= t.maxKb * 1024) break;
  }
  const kb = statSync(out).size / 1024;
  report.push({ ...t, S, kb, ms: Date.now() - t0, ...info });
  console.log(`${t.nome.padEnd(11)} ${S}px  ${kb.toFixed(1).padStart(5)} KB  ${info.q >= 100 ? 'senza perdite' : 'q' + info.q}  (${Date.now() - t0} ms)`);
}
const total = report.reduce((s, r) => s + r.kb, 0);
console.log(`totale ${total.toFixed(1)} KB (budget 400 KB, 60 KB ciascuna)`);
if (total > 400 || report.some(r => r.kb > 60)) {
  console.error('fuori budget: alleggerire le trame');
  process.exitCode = 1;
}

/* ------------------------------------------------------------------ registro */

const registry = `// Generato da scripts/make-materiali.mjs: non modificare a mano.
//
// Le trame neutre dei materiali (luce bianca e ombra nera con alfa), ripetibili senza cuciture.
// - src: il require dell'immagine WebP (assets/arte/trame).
// - px: lato della tessera in pixel. Si posa a px / DENSITA_TRAME punti (2 pixel per punto).
// - opacita: l'opacità consigliata sul suo materiale.
// - kb: peso del file (budget: ≤ 60 KB ciascuna, ≤ 400 KB in tutto; oggi ${total.toFixed(0)} KB).
export type NomeTrama = ${report.map(r => `'${r.nome}'`).join(' | ')};

export interface InfoTrama {
  src: number;
  px: number;
  opacita: number;
  kb: number;
}

export const DENSITA_TRAME = 2;

export const TRAME: Record<NomeTrama, InfoTrama> = {
${report.map(r => `  // ${r.uso}\n  ${r.nome}: { src: require('../../../assets/arte/trame/${r.nome}.webp'), px: ${r.S}, opacita: ${r.opacita}, kb: ${r.kb.toFixed(1)} },`).join('\n')}
};
`;
writeFileSync(join(root, 'src/ui/arte/trame.ts'), registry);
console.log('scritto src/ui/arte/trame.ts');

/* ------------------------------------------------------------------ foglio di controllo */

// Ogni trama 2×2 (per vedere le cuciture: le linee tratteggiate segnano i bordi della tessera) sul colore
// del suo materiale, all'opacità consigliata, a 1:1 in pixel (come su un telefono 2×). resvg non decodifica
// il WebP, quindi il foglio lo compone Pillow.
const BASE = { legno: '#5A3A26', spazzolato: '#C9A15A', carta: '#F3E9D2', velluto: '#4A1420', cuoio: '#6A3A22', marmo: '#E4DCCD', sughero: '#B98A5A', crepe: '#F4F1EA', panno: '#0B4D42' };
const font = join(root, 'node_modules/@expo-google-fonts/sora/600SemiBold/Sora_600SemiBold.ttf');
const sheetPy = `
import sys, json
from PIL import Image, ImageDraw, ImageFont
items, out, font = json.loads(sys.argv[1]), sys.argv[2], sys.argv[3]
C, cols, pad = 512, 3, 20
rows = (len(items) + cols - 1) // cols
W, H = pad + cols * (C + pad), pad + rows * (C + 56)
sheet = Image.new('RGB', (W, H), '#140C0E')
d = ImageDraw.Draw(sheet)
fnt = ImageFont.truetype(font, 22)
for i, it in enumerate(items):
    x, y = pad + (i % cols) * (C + pad), pad + (i // cols) * (C + 56)
    cell = Image.new('RGBA', (C, C), it['base'])
    t = Image.open(it['file']).convert('RGBA')
    a = t.getchannel('A').point(lambda v: int(v * it['op']))
    t.putalpha(a)
    T = t.size[0]
    for ox in range(0, C, T):
        for oy in range(0, C, T):
            cell.alpha_composite(t, (ox, oy))
    cd = ImageDraw.Draw(cell)
    for k in range(T, C, T):
        for z in range(0, C, 12):
            cd.line([(k, z), (k, z + 5)], fill=(255, 0, 68, 110))
            cd.line([(z, k), (z + 5, k)], fill=(255, 0, 68, 110))
    sheet.paste(cell.convert('RGB'), (x, y))
    d.text((x, y + C + 12), it['label'], font=fnt, fill='#F6EBD9')
sheet.save(out)
`;
const items = report.map(r => ({ file: join(outDir, `${r.nome}.webp`), base: BASE[r.nome], op: r.opacita, label: `${r.nome} · ${r.S}px · ${r.kb.toFixed(1)} KB · opacità ${r.opacita}` }));
const sr = spawnSync('python3', ['-c', sheetPy, JSON.stringify(items), join(sheetDir, 'foglio.png'), font], { encoding: 'utf8' });
if (sr.status !== 0) {
  console.error(sr.stderr);
  process.exit(1);
}
console.log('scritto .visual/arte/foglio.png');
if (!process.env.TIENI) rmSync(tmp, { recursive: true, force: true });
else console.log('grezzi in', tmp);
