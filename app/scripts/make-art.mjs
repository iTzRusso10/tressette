// Draws the card back, the app icon and the splash image from code, in the Tramonto palette.
// Run with: node scripts/make-art.mjs
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = {
  orange: '#FF8A3D',
  pink: '#F0457A',
  violet: '#7A2E9C',
  night: '#3B1E6B',
  ink: '#2E1257',
  peach: '#FFE9DD',
  sun: '#FFE066',
};

function render(svg, width) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render().asPng();
}
function save(png, out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log('scritto', out.replace(root + '/', ''));
}

// The sunset emblem: a sun with stripes across its lower half, inside a thin ring, with rays behind.
const emblem = (cx, cy, r) => {
  const stripes = [0.18, 0.36, 0.52, 0.66, 0.78]
    .map((k, i) => `<rect x="${cx - r}" y="${cy + r * k}" width="${2 * r}" height="${r * (0.05 + i * 0.018)}" fill="url(#bgV)"/>`)
    .join('');
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const a2 = a + Math.PI / 48;
    const R = r * 6;
    return `<path d="M${cx} ${cy}L${cx + R * Math.cos(a)} ${cy + R * Math.sin(a)}L${cx + R * Math.cos(a2)} ${cy + R * Math.sin(a2)}Z"/>`;
  }).join('');
  return `
    <g fill="${C.peach}" fill-opacity=".07">${rays}</g>
    <circle cx="${cx}" cy="${cy}" r="${r * 1.32}" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="${r * 0.04}"/>
    <clipPath id="sunClip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <g clip-path="url(#sunClip)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sunG)"/>
      ${stripes}
    </g>`;
};

const defs = `
  <linearGradient id="bgV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.ink}"/>
  </linearGradient>
  <linearGradient id="sunG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.sun}"/><stop offset=".5" stop-color="${C.orange}"/><stop offset="1" stop-color="${C.pink}"/>
  </linearGradient>
  <linearGradient id="sky" x1=".2" y1="0" x2=".8" y2="1">
    <stop offset="0" stop-color="${C.orange}"/><stop offset=".42" stop-color="${C.pink}"/><stop offset=".78" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.night}"/>
  </linearGradient>`;

// Card back, same proportions and corner as the fronts (360x575).
const W = 360;
const H = 575;
const back = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs}
    <clipPath id="inner"><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="12"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="#FFFFFF"/>
  <g clip-path="url(#inner)">
    <rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="url(#bgV)"/>
    ${emblem(W / 2, H / 2, 74)}
  </g>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="6" fill="none" stroke="#FFFFFF" stroke-opacity=".35" stroke-width="2"/>
</svg>`;
const backPng = render(back, 720);
save(backPng, join(root, 'assets/cards/back.png'));
const backUri = 'data:image/png;base64,' + backPng.toString('base64');

// Icon: three backs fanned on the sunset sky.
const fan = (k, cy) =>
  `<g transform="translate(512 ${cy}) scale(${k})">
    ${[-15, 15, 0]
      .map(
        a => `<g transform="rotate(${a}) translate(0 -40)">
      <rect x="-206" y="-326" width="412" height="652" rx="30" fill="#2E1257" fill-opacity=".25"/>
      <image href="${backUri}" x="-200" y="-320" width="400" height="640"/>
    </g>`,
      )
      .join('')}
  </g>`;
const icon = (bg, k, cy) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${defs}
    <radialGradient id="glow" cx="22%" cy="12%" r="70%"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".6"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
  </defs>
  ${bg ? '<rect width="1024" height="1024" fill="url(#sky)"/><rect width="1024" height="1024" fill="url(#glow)"/>' : ''}
  ${fan(k, cy)}
</svg>`;

save(render(icon(true, 1.18, 566), 1024), join(root, 'assets/images/icon.png'));
save(render(icon(false, 0.9, 548), 1024), join(root, 'assets/images/adaptive-foreground.png'));
save(
  render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs>${defs}</defs><rect width="1024" height="1024" fill="url(#sky)"/></svg>`, 1024),
  join(root, 'assets/images/adaptive-background.png'),
);
save(render(icon(false, 0.9, 548), 1024), join(root, 'assets/images/splash.png'));
save(render(icon(true, 1.18, 566), 1024), join(root, 'assets/images/favicon.png'));

/* ------------------------------------------------------------------ dorsi delle carte */
// Un PNG per ogni dorso pronto di src/meta/catalog.ts (BACKS e NAPOLI_BACKS), alla misura di back.png
// (360x575 disegnato a 2x: più nitido delle scansioni). Come nei mazzi veri: un bordino bianco, una
// cornice, un disegno che si ripete o è simmetrico rispetto al centro (la carta capovolta è identica) e
// un medaglione nel mezzo, grande abbastanza da leggersi su una carta larga 50 punti. 'classico' è
// back.png. I dorsi «in arrivo» aspettano un illustratore: niente immagine.
const { BACKS: CATALOG_BACKS, NAPOLI_BACKS, STARTER_BACK } = await import('../src/meta/catalog.ts');

const CX = W / 2;
const CY = H / 2;
const f = n => +n.toFixed(2);
/** The same drawing turned upside down around the center: what the card looks like the other way round. */
const twice = g => `${g}<g transform="rotate(180 ${CX} ${CY})">${g}</g>`;
/** A small deterministic random, for the stars. */
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

const star = (x, y, r, k = 0.45, n = 5, rot = -90) =>
  `M${Array.from({ length: n * 2 }, (_, i) => {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const rr = i % 2 ? r * k : r;
    return `${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a))}`;
  }).join('L')}Z`;

/** A pattern tile centered on the card, so the repeat is symmetric. */
const tile = (id, w, h, body) =>
  `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}" x="${f(CX - w / 2)}" y="${f(CY - h / 2)}">${body}</pattern>`;

/** Frame: a main line and a fine one inside it, with a small diamond at each corner. */
function frame(c, hi, { inset = 22, op = 0.9 } = {}) {
  const i2 = inset + 5;
  const corners = [
    [inset, inset],
    [W - inset, inset],
    [inset, H - inset],
    [W - inset, H - inset],
  ]
    .map(([x, y]) => `<path d="M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z" fill="${hi}"/>`)
    .join('');
  return `
    <rect x="${inset}" y="${inset}" width="${W - 2 * inset}" height="${H - 2 * inset}" rx="7" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="2.2"/>
    <rect x="${i2}" y="${i2}" width="${W - 2 * i2}" height="${H - 2 * i2}" rx="4" fill="none" stroke="${c}" stroke-opacity="${op * 0.55}" stroke-width="1"/>
    ${corners}`;
}

/** Rings around a medallion. */
const rings = (r, c, hi, ground) => `
  <circle cx="${CX}" cy="${CY}" r="${r + 9}" fill="${ground}"/>
  <circle cx="${CX}" cy="${CY}" r="${r + 9}" fill="none" stroke="${c}" stroke-width="1.2" stroke-opacity=".8"/>
  <circle cx="${CX}" cy="${CY}" r="${r + 4}" fill="none" stroke="${c}" stroke-width="3"/>
  <circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${hi}" stroke-width="1" stroke-opacity=".9"/>`;

const rosette = (r, n, fill, op = 1) =>
  Array.from(
    { length: n },
    (_, i) => `<ellipse cx="${CX}" cy="${f(CY - r * 0.55)}" rx="${f(r * 0.17)}" ry="${f(r * 0.45)}" transform="rotate(${(i * 360) / n} ${CX} ${CY})" fill="${fill}" fill-opacity="${op}"/>`,
  ).join('');

const lemon = (x, y, s, rot, yellow, green) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M-2 -9C-9 -16 -17 -14 -19 -9C-14 -10 -8 -9 -2 -9Z" fill="${green}"/>
    <path d="M2 -9C8 -17 17 -15 19 -10C13 -11 8 -10 2 -9Z" fill="${green}" fill-opacity=".85"/>
    <path d="M-13 0C-13 -7 -7 -10 0 -10C7 -10 13 -7 13 0C13 7 7 10 0 10C-7 10 -13 7 -13 0Z" fill="${yellow}"/>
    <path d="M-15 0L-12.5 -1.6L-12.5 1.6Z M15 0L12.5 -1.6L12.5 1.6Z" fill="${yellow}"/>
    <ellipse cx="-4" cy="-4" rx="4.5" ry="2.2" fill="#FFFFFF" fill-opacity=".45"/>
  </g>`;

const crown = (cx, cy, s, gold, hi) => `
  <g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M-30 14L-34 -12L-17 2L0 -20L17 2L34 -12L30 14Z" fill="${gold}"/>
    <rect x="-31" y="13" width="62" height="9" rx="2" fill="${gold}"/>
    <rect x="-31" y="13" width="62" height="9" rx="2" fill="none" stroke="${hi}" stroke-width="1"/>
    <circle cx="-34" cy="-14" r="4" fill="${hi}"/><circle cx="34" cy="-14" r="4" fill="${hi}"/><circle cx="0" cy="-23" r="4.6" fill="${hi}"/>
    <circle cx="-15" cy="17.5" r="2" fill="#0B0A0E"/><circle cx="0" cy="17.5" r="2.4" fill="#0B0A0E"/><circle cx="15" cy="17.5" r="2" fill="#0B0A0E"/>
    <path d="M0 -6L4 2L0 10L-4 2Z" fill="${hi}" fill-opacity=".9"/>
  </g>`;

const motifs = {
  maiolica: ([g0, g1, c, hi]) => ({
    defs: tile(
      'p',
      46,
      46,
      `<path d="M23 3L43 23L23 43L3 23Z" fill="none" stroke="${c}" stroke-opacity=".32" stroke-width="1.2"/>
       <circle cx="23" cy="23" r="5" fill="${c}" fill-opacity=".38"/>
       ${[0, 90, 180, 270].map(a => `<ellipse cx="23" cy="13" rx="3" ry="6" transform="rotate(${a} 23 23)" fill="${c}" fill-opacity=".22"/>`).join('')}
       ${[0, 46].flatMap(x => [0, 46].map(y => `<circle cx="${x}" cy="${y}" r="3.4" fill="${hi}" fill-opacity=".3"/>`)).join('')}`,
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `${rings(62, c, hi, g1)}
      ${rosette(60, 8, c, 0.95)}
      ${rosette(34, 8, hi, 0.9).replace(/rotate\((\d+(\.\d+)?)/g, (_, a) => `rotate(${+a + 22.5}`)}
      <circle cx="${CX}" cy="${CY}" r="10" fill="${g0}" stroke="${hi}" stroke-width="2"/>
      <circle cx="${CX}" cy="${CY}" r="4" fill="${c}"/>`,
  }),

  righe: ([g0, g1, c, hi]) => ({
    defs: tile('p', 9, 9, `<path d="M-2 11L11 -2M-2 2L2 -2M7 11L11 7" stroke="${c}" stroke-opacity=".26" stroke-width="1.3"/>`),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `
      <ellipse cx="${CX}" cy="${CY}" rx="70" ry="100" fill="${g1}"/>
      <ellipse cx="${CX}" cy="${CY}" rx="70" ry="100" fill="none" stroke="${c}" stroke-width="3"/>
      <ellipse cx="${CX}" cy="${CY}" rx="63" ry="93" fill="none" stroke="${hi}" stroke-width="1" stroke-opacity=".8"/>
      <ellipse cx="${CX}" cy="${CY}" rx="63" ry="93" fill="none" stroke="${c}" stroke-width="2.4" stroke-dasharray="0.1 7" stroke-linecap="round"/>
      ${twice(`<path d="M${CX} ${CY - 70}C${CX + 22} ${CY - 46} ${CX + 22} ${CY - 26} ${CX} ${CY - 12}C${CX - 22} ${CY - 26} ${CX - 22} ${CY - 46} ${CX} ${CY - 70}Z" fill="${c}"/>`)}
      ${twice(`<path d="M${CX - 46} ${CY}C${CX - 32} ${CY - 18} ${CX - 20} ${CY - 14} ${CX - 12} ${CY}C${CX - 20} ${CY + 14} ${CX - 32} ${CY + 18} ${CX - 46} ${CY}Z" fill="${c}" fill-opacity=".85"/>`)}
      <circle cx="${CX}" cy="${CY}" r="8" fill="${g0}" stroke="${c}" stroke-width="2.4"/>`,
  }),

  onde: ([g0, g1, c, hi]) => ({
    defs: tile(
      'p',
      36,
      18,
      `<path d="M0 9Q9 1 18 9T36 9" fill="none" stroke="${c}" stroke-opacity=".34" stroke-width="1.4"/>
       <path d="M0 14Q9 6 18 14T36 14" fill="none" stroke="${c}" stroke-opacity=".14" stroke-width="1"/>`,
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `${rings(60, c, hi, g1)}
      <clipPath id="mc"><circle cx="${CX}" cy="${CY}" r="56"/></clipPath>
      <g clip-path="url(#mc)" fill="none" stroke-linecap="round">
        ${[-36, -18, 0, 18, 36]
          .map(
            (dy, i) =>
              `<path d="M${CX - 72} ${CY + dy}Q${CX - 54} ${CY + dy - 13} ${CX - 36} ${CY + dy}T${CX} ${CY + dy}T${CX + 36} ${CY + dy}T${CX + 72} ${CY + dy}" stroke="${i === 2 ? hi : c}" stroke-width="${i === 2 ? 4 : 2.6}" stroke-opacity="${i === 2 ? 1 : 0.8}"/>`,
          )
          .join('')}
      </g>
      ${[0, 90, 180, 270].map(a => `<path d="M${CX} ${CY - 74}L${CX + 5} ${CY - 69}L${CX} ${CY - 64}L${CX - 5} ${CY - 69}Z" transform="rotate(${a} ${CX} ${CY})" fill="${hi}"/>`).join('')}`,
  }),

  limoni: ([g0, g1, yellow, green]) => ({
    defs: tile(
      'p',
      64,
      64,
      `<path d="M32 0L64 32L32 64L0 32Z" fill="none" stroke="${g1}" stroke-width="1.6"/>
       ${lemon(32, 32, 0.62, -35, yellow, green)}
       ${[0, 64].flatMap(x => [0, 64].map(y => `<circle cx="${x}" cy="${y}" r="3.2" fill="${green}" fill-opacity=".55"/>`)).join('')}`,
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `
      <circle cx="${CX}" cy="${CY}" r="72" fill="${g0}"/>
      <circle cx="${CX}" cy="${CY}" r="72" fill="none" stroke="${green}" stroke-width="3"/>
      <circle cx="${CX}" cy="${CY}" r="66" fill="none" stroke="${yellow}" stroke-width="1.6"/>
      ${Array.from({ length: 16 }, (_, i) => `<path d="M${CX} ${CY - 60}C${CX + 6} ${CY - 54} ${CX + 6} ${CY - 46} ${CX} ${CY - 41}C${CX - 6} ${CY - 46} ${CX - 6} ${CY - 54} ${CX} ${CY - 60}Z" transform="rotate(${i * 22.5} ${CX} ${CY})" fill="${green}" fill-opacity="${i % 2 ? 0.75 : 1}"/>`).join('')}
      ${twice(lemon(CX - 1, CY - 16, 1.12, -18, yellow, green))}`,
  }),

  stelle: ([g0, g1, c, hi]) => {
    const r = rng(7);
    const stars = [];
    while (stars.length < 46) {
      const x = 14 + r() * (W - 28);
      const y = 14 + r() * (CY - 14);
      if (Math.hypot(x - CX, y - CY) < 92) continue;
      const s = 1.6 + r() * r() * 4.6;
      stars.push(s > 3.2 ? `<path d="${star(x, y, s)}" fill="${c}" fill-opacity=".9"/>` : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.45)}" fill="${hi}" fill-opacity=".75"/>`);
    }
    return {
      defs: '',
      body: twice(stars.join('')),
      medal: `${rings(60, c, hi, g1)}
        <path d="${star(CX, CY, 54, 0.22, 8, -90)}" fill="${c}" fill-opacity=".5"/>
        <path d="${star(CX, CY, 50, 0.2, 4, -90)}" fill="${c}"/>
        <path d="${star(CX, CY, 34, 0.24, 4, -45)}" fill="${hi}"/>
        <circle cx="${CX}" cy="${CY}" r="6" fill="${g1}" stroke="${hi}" stroke-width="1.6"/>`,
    };
  },

  sole: ([g0, g1, orange, blue]) => ({
    defs: '',
    body: Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2;
      const b = a + Math.PI / 36;
      const R = 400;
      return i % 2 ? '' : `<path d="M${CX} ${CY}L${f(CX + R * Math.cos(a))} ${f(CY + R * Math.sin(a))}L${f(CX + R * Math.cos(b))} ${f(CY + R * Math.sin(b))}Z" fill="${g1}" fill-opacity=".7"/>`;
    }).join(''),
    medal: `
      <circle cx="${CX}" cy="${CY}" r="82" fill="${g0}"/>
      <circle cx="${CX}" cy="${CY}" r="82" fill="none" stroke="${blue}" stroke-width="3"/>
      <circle cx="${CX}" cy="${CY}" r="77" fill="none" stroke="${blue}" stroke-width="1" stroke-dasharray="0.1 6" stroke-linecap="round"/>
      ${Array.from({ length: 16 }, (_, i) => {
        const long = i % 2 === 0;
        return `<path d="M${CX - 7} ${CY - 44}Q${CX - 3} ${CY - (long ? 60 : 54)} ${CX} ${CY - (long ? 72 : 62)}Q${CX + 3} ${CY - (long ? 60 : 54)} ${CX + 7} ${CY - 44}Z" transform="rotate(${i * 22.5} ${CX} ${CY})" fill="${long ? orange : blue}"/>`;
      }).join('')}
      <circle cx="${CX}" cy="${CY}" r="46" fill="${orange}"/>
      <circle cx="${CX}" cy="${CY}" r="46" fill="none" stroke="${blue}" stroke-width="2.2"/>
      <circle cx="${CX}" cy="${CY}" r="36" fill="none" stroke="${g0}" stroke-width="1.4" stroke-opacity=".8"/>
      ${rosette(30, 8, g0, 0.9)}
      <circle cx="${CX}" cy="${CY}" r="7" fill="${blue}"/>`,
  }),

  vesuvio: ([g0, g1, orange, peach]) => {
    const r = rng(11);
    const dots = Array.from({ length: 30 }, () => {
      const x = 16 + r() * (W - 32);
      const y = 16 + r() * (CY - 125);
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.7 + r() * 1.3)}" fill="${peach}" fill-opacity="${f(0.35 + r() * 0.4)}"/>`;
    }).join('');
    // Half of the medallion: the sun setting behind the volcano, its plume and the sea; drawn twice.
    const B = CY - 14;
    const half = `
      <circle cx="${CX + 28}" cy="${B - 36}" r="22" fill="url(#sunB)"/>
      <path d="M${CX - 80} ${B}L${CX - 30} ${B - 44}Q${CX - 23} ${B - 50} ${CX - 15} ${B - 48}L${CX - 6} ${B - 44}Q${CX + 2} ${B - 48} ${CX + 8} ${B - 42}L${CX + 74} ${B}Z" fill="${g1}"/>
      <path d="M${CX - 21} ${B - 48}L${CX - 28} ${B - 40}L${CX - 21} ${B - 42}L${CX - 13} ${B - 37}L${CX - 6} ${B - 44}Z" fill="${orange}" fill-opacity=".85"/>
      <path d="M${CX - 13} ${B - 52}C${CX - 21} ${B - 64} ${CX - 3} ${B - 68} ${CX - 11} ${B - 80}C${CX - 17} ${B - 90} ${CX + 3} ${B - 96} ${CX + 13} ${B - 90}" fill="none" stroke="${peach}" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
      <rect x="${CX - 80}" y="${B}" width="160" height="14" fill="${g1}" fill-opacity=".55"/>
      <path d="M${CX - 44} ${B + 5}L${CX - 18} ${B + 5}M${CX + 6} ${B + 5}L${CX + 40} ${B + 5}M${CX - 28} ${B + 10}L${CX + 20} ${B + 10}" stroke="${peach}" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>`;
    return {
      defs: `<linearGradient id="sunB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${peach}"/><stop offset="1" stop-color="${orange}"/></linearGradient>
        <linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g0}"/><stop offset=".5" stop-color="${orange}" stop-opacity=".9"/><stop offset="1" stop-color="${g0}"/></linearGradient>`,
      body: twice(dots),
      medal: `
        <ellipse cx="${CX}" cy="${CY}" rx="82" ry="114" fill="${g1}"/>
        <ellipse cx="${CX}" cy="${CY}" rx="82" ry="114" fill="none" stroke="${orange}" stroke-width="1.2" stroke-opacity=".8"/>
        <clipPath id="mc"><ellipse cx="${CX}" cy="${CY}" rx="74" ry="106"/></clipPath>
        <g clip-path="url(#mc)">
          <rect x="${CX - 80}" y="${CY - 110}" width="160" height="220" fill="url(#skyB)"/>
          ${twice(half)}
          <rect x="${CX - 80}" y="${CY - 1.2}" width="160" height="2.4" fill="${peach}"/>
        </g>
        <ellipse cx="${CX}" cy="${CY}" rx="77" ry="109" fill="none" stroke="${orange}" stroke-width="3"/>
        ${[0, 180].map(a => `<path d="M${CX} ${CY - 124}L${CX + 6} ${CY - 117}L${CX} ${CY - 110}L${CX - 6} ${CY - 117}Z" transform="rotate(${a} ${CX} ${CY})" fill="${peach}"/>`).join('')}`,
    };
  },

  corona: ([g0, g1, gold, hi]) => ({
    defs: tile(
      'p',
      26,
      26,
      `<path d="M13 0L26 13L13 26L0 13Z" fill="none" stroke="${gold}" stroke-opacity=".22" stroke-width="1"/>
       <circle cx="13" cy="13" r="1.6" fill="${gold}" fill-opacity=".55"/>
       ${[0, 26].flatMap(x => [0, 26].map(y => `<circle cx="${x}" cy="${y}" r="1.2" fill="${hi}" fill-opacity=".4"/>`)).join('')}`,
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `${rings(66, gold, hi, g1)}
      <circle cx="${CX}" cy="${CY}" r="58" fill="none" stroke="${gold}" stroke-width="2" stroke-dasharray="0.1 6.2" stroke-linecap="round"/>
      ${twice(crown(CX, CY - 31, 0.8, gold, hi))}
      <path d="M${CX - 50} ${CY}L${CX - 9} ${CY}M${CX + 9} ${CY}L${CX + 50} ${CY}" stroke="${gold}" stroke-width="1.4"/>
      <path d="M${CX} ${CY - 5}L${CX + 5} ${CY}L${CX} ${CY + 5}L${CX - 5} ${CY}Z" fill="${hi}"/>`,
  }),

  tarocco: ([g0, g1, gold, hi]) => {
    // A fleuron in each corner, inside the frame.
    const fleuron = `<g transform="translate(36 36)">
      <path d="M0 0C14 2 26 10 30 22C20 16 10 14 0 14Z" fill="${gold}"/>
      <path d="M0 0C2 14 10 26 22 30C16 20 14 10 14 0Z" fill="${gold}"/>
      <circle cx="4" cy="4" r="4" fill="${hi}"/>
      <path d="M8 8C16 10 20 14 22 22C14 20 10 16 8 8Z" fill="${hi}" fill-opacity=".7"/>
    </g>`;
    const corners = twice(fleuron + `<g transform="translate(${W} 0) scale(-1 1)">${fleuron}</g>`);
    const scroll = `<path d="M${CX} ${CY - 90}C${CX + 12} ${CY - 74} ${CX + 30} ${CY - 66} ${CX + 26} ${CY - 50}C${CX + 22} ${CY - 38} ${CX + 8} ${CY - 44} ${CX + 12} ${CY - 54}" fill="none" stroke="${gold}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M${CX} ${CY - 90}C${CX - 12} ${CY - 74} ${CX - 30} ${CY - 66} ${CX - 26} ${CY - 50}C${CX - 22} ${CY - 38} ${CX - 8} ${CY - 44} ${CX - 12} ${CY - 54}" fill="none" stroke="${gold}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M${CX} ${CY - 74}C${CX + 7} ${CY - 60} ${CX + 7} ${CY - 46} ${CX} ${CY - 34}C${CX - 7} ${CY - 46} ${CX - 7} ${CY - 60} ${CX} ${CY - 74}Z" fill="${hi}"/>`;
    return {
      defs: tile(
        'p',
        30,
        30,
        `${[0, 90, 180, 270].map(a => `<ellipse cx="15" cy="10.5" rx="2" ry="4" transform="rotate(${a} 15 15)" fill="${gold}" fill-opacity=".28"/>`).join('')}
         <circle cx="15" cy="15" r="1.6" fill="${hi}" fill-opacity=".5"/>
         ${[0, 30].flatMap(x => [0, 30].map(y => `<circle cx="${x}" cy="${y}" r="1" fill="${gold}" fill-opacity=".35"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>
        <rect x="32" y="32" width="${W - 64}" height="${H - 64}" rx="3" fill="none" stroke="${gold}" stroke-width="2.2" stroke-dasharray="0.1 6" stroke-linecap="round"/>
        ${corners}`,
      medal: `
        <path d="M${CX} ${CY - 118}L${CX + 86} ${CY}L${CX} ${CY + 118}L${CX - 86} ${CY}Z" fill="${g1}"/>
        <path d="M${CX} ${CY - 118}L${CX + 86} ${CY}L${CX} ${CY + 118}L${CX - 86} ${CY}Z" fill="none" stroke="${gold}" stroke-width="3"/>
        <path d="M${CX} ${CY - 106}L${CX + 77} ${CY}L${CX} ${CY + 106}L${CX - 77} ${CY}Z" fill="none" stroke="${hi}" stroke-width="1" stroke-opacity=".8"/>
        ${twice(scroll)}
        ${twice(`<path d="M${CX - 66} ${CY}C${CX - 52} ${CY - 8} ${CX - 40} ${CY - 8} ${CX - 30} ${CY}C${CX - 40} ${CY + 8} ${CX - 52} ${CY + 8} ${CX - 66} ${CY}Z" fill="${gold}"/>`)}
        <circle cx="${CX}" cy="${CY}" r="20" fill="${g0}" stroke="${gold}" stroke-width="2.4"/>
        <path d="${star(CX, CY, 14, 0.4, 8, -90)}" fill="${hi}"/>`,
    };
  },
};

/* ------------------------------------------------------------------ motivi del catalogo nuovo */

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/** Un colore a metà strada tra a e b (k = 0 → a, k = 1 → b). */
const mix = (a, b, k) =>
  '#' +
  hexRgb(a)
    .map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * k).toString(16).padStart(2, '0'))
    .join('');
const luma = h => {
  const [r, g, b] = hexRgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
/** Un punto a distanza r dal centro; gli angoli in gradi partono dall'alto e girano in senso orario. */
const polar = (r, deg, cx = CX, cy = CY) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = pts => `M${pts.map(pt).join('L')}Z`;
const line = pts => `M${pts.map(pt).join('L')}`;
/** n copie ruotate intorno al centro della carta. */
const around = (n, g, start = 0) => Array.from({ length: n }, (_, i) => `<g transform="rotate(${f(start + (i * 360) / n)} ${CX} ${CY})">${g}</g>`).join('');
const blur = (id, sd) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="-60" y="-60" width="${W + 120}" height="${H + 120}"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const halo = (id, color, op = 1, mid = 0.35) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="${mid}" stop-color="${color}" stop-opacity="${op * 0.45}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
/** Una stella a quattro punte, come un luccichio. */
const sparkle = (x, y, r, fill, op = 1) => `<path d="${star(x, y, r, 0.24, 4, -90)}" fill="${fill}" fill-opacity="${op}"/>`;

/** Stelle sparse sulla metà alta, lontano dal medaglione, e la stessa metà capovolta. */
function starField(seed, n, { keep = 96, c, hi, big = 0.22, size = 1 } = {}) {
  const r = rng(seed);
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const x = 16 + r() * (W - 32);
    const y = 16 + r() * (CY - 16);
    if (Math.hypot(x - CX, y - CY) < keep) continue;
    const s = (1.2 + r() * r() * 4) * size;
    out.push(r() < big ? sparkle(x, y, s * 1.5, c, 0.9) : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.42)}" fill="${hi}" fill-opacity="${f(0.45 + r() * 0.45)}"/>`);
  }
  return twice(out.join(''));
}

/** Una spirale (curva che si avvolge) intorno a (cx, cy); l'estremo esterno guarda verso la direzione `end` (radianti). */
function curl(cx, cy, r0, turns, end, steps = 48) {
  const rot = end - turns * 2 * Math.PI;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const a = rot + t * turns * 2 * Math.PI;
    return [cx + r0 * t * Math.cos(a), cy + r0 * t * Math.sin(a)];
  });
}

/** Un'ellisse verticale come medaglione (per i motivi che si leggono in due metà, come le figure delle carte). */
const oval = (rx, ry, c, hi, ground) => `
  <ellipse cx="${CX}" cy="${CY}" rx="${rx + 8}" ry="${ry + 8}" fill="${ground}"/>
  <ellipse cx="${CX}" cy="${CY}" rx="${rx + 8}" ry="${ry + 8}" fill="none" stroke="${c}" stroke-width="1.2" stroke-opacity=".8"/>
  <ellipse cx="${CX}" cy="${CY}" rx="${rx + 3.5}" ry="${ry + 3.5}" fill="none" stroke="${c}" stroke-width="3"/>
  <ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" fill="none" stroke="${hi}" stroke-width="1" stroke-opacity=".9"/>`;
/** La linea che divide le due metà, con un rombo nel mezzo. */
const divider = (c, hi, half = 50) => `
  <path d="M${CX - half} ${CY}L${CX - 9} ${CY}M${CX + 9} ${CY}L${CX + half} ${CY}" stroke="${c}" stroke-width="1.4"/>
  <path d="M${CX} ${CY - 6}L${CX + 6} ${CY}L${CX} ${CY + 6}L${CX - 6} ${CY}Z" fill="${hi}"/>`;

/** Un rombo a gradini fatto di quadretti, come nei tessuti: `color(d)` dà il colore per la distanza d dal centro. */
function steps(cx, cy, n, s, color) {
  let out = '';
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++) {
      const d = Math.abs(i) + Math.abs(j);
      if (d > n) continue;
      const col = color(d);
      if (col) out += `<rect x="${f(cx + i * s - s / 2)}" y="${f(cy + j * s - s / 2)}" width="${f(s + 0.3)}" height="${f(s + 0.3)}" fill="${col}"/>`;
    }
  return out;
}

/** La greca: una linea continua che va e torna, lunga `len` a partire da (x, y), alta 2u. */
function meander(x, y, len, u) {
  const n = Math.max(1, Math.round(len / (4 * u)));
  u = len / (4 * n);
  const pts = [[x, y + 2 * u]];
  for (let k = 0; k < n; k++) {
    const x0 = x + k * 4 * u;
    pts.push([x0, y], [x0 + 3 * u, y], [x0 + 3 * u, y + u], [x0 + u, y + u], [x0 + u, y + 2 * u], [x0 + 4 * u, y + 2 * u]);
  }
  pts.push([x + len, y]);
  return line(pts);
}

/** Lo scudo: bordo dritto in alto e punta in basso, centrato in (cx, cy). */
const shieldPath = (cx, cy, w, h) => {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const ym = cy + h * 0.02;
  const y1 = cy + h / 2;
  return `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y0)}L${f(x1)} ${f(ym)}C${f(x1)} ${f(ym + h * 0.26)} ${f(cx + w * 0.26)} ${f(y1 - h * 0.08)} ${f(cx)} ${f(y1)}C${f(cx - w * 0.26)} ${f(y1 - h * 0.08)} ${f(x0)} ${f(ym + h * 0.26)} ${f(x0)} ${f(ym)}Z`;
};

/** La falce di luna: il cerchio (ox, oy, R) senza il cerchio spostato di d verso destra (r). */
function crescent(ox, oy, R, d, r) {
  const xi = (d * d + R * R - r * r) / (2 * d);
  const yi = Math.sqrt(R * R - xi * xi);
  const large = xi > d ? 1 : 0;
  return `M${f(ox + xi)} ${f(oy - yi)}A${R} ${R} 0 1 0 ${f(ox + xi)} ${f(oy + yi)}A${r} ${r} 0 ${large} 1 ${f(ox + xi)} ${f(oy - yi)}Z`;
}

/** Il bordo dell'unione di cerchi (centri relativi al centro della carta, stesso raggio), visto dal centro. */
function lobes(centers, R, n = 240) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    let best = 0;
    for (const [cx, cy] of centers) {
      const b = ux * cx + uy * cy;
      const disc = b * b - (cx * cx + cy * cy) + R * R;
      if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc));
    }
    pts.push([CX + ux * best, CY + uy * best]);
  }
  return poly(pts);
}

/** Una foglia appuntita lunga `len`, che parte da (0,0) e punta verso l'alto. */
const leaf = (len, w) => `M0 0C${f(w)} ${f(-len * 0.3)} ${f(w * 0.7)} ${f(-len * 0.75)} 0 ${f(-len)}C${f(-w * 0.7)} ${f(-len * 0.75)} ${f(-w)} ${f(-len * 0.3)} 0 0Z`;

/** Il giglio di Firenze, dritto, con la base in (0,0) e la punta in alto. */
const lily = (c, hi, ground) => {
  const side = `<path d="M5 -20C9 -42 24 -62 41 -59C54 -56 57 -40 49 -31C44 -26 37 -28 37 -35C38 -41 33 -45 27 -41C20 -36 14 -28 12 -20Z" fill="${c}"/>
    <path d="M5 -27C10 -44 14 -58 19 -71" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="20" cy="-75" r="5" fill="${c}"/>
    <path d="M4 -13C12 -13 21 -10 26 -3C21 -5 15 -6 10 -5C6 -5 4 -8 4 -13Z" fill="${c}"/>`;
  return `${side}<g transform="scale(-1 1)">${side}</g>
    <path d="M0 -86C10 -72 14 -52 6 -30L0 -20L-6 -30C-14 -52 -10 -72 0 -86Z" fill="${c}"/>
    <path d="M0 -74C4 -64 5 -50 1.6 -36L0 -32L-1.6 -36C-5 -50 -4 -64 0 -74Z" fill="${hi}" fill-opacity=".55"/>
    <rect x="-19" y="-21" width="38" height="8" rx="2.5" fill="${c}"/>
    <rect x="-19" y="-21" width="38" height="8" rx="2.5" fill="none" stroke="${ground}" stroke-width="1.2" stroke-opacity=".6"/>
    <path d="M-5 -13L5 -13L0 -5Z" fill="${c}"/>`;
};

/** Una chiave dritta: anello in basso in (0,0), mappa in alto. */
const keyShape = (c, ground) => `
  <circle cx="0" cy="-11" r="10" fill="none" stroke="${c}" stroke-width="6"/>
  <circle cx="0" cy="-11" r="2.6" fill="${c}"/>
  <rect x="-3.5" y="-71" width="7" height="52" fill="${c}"/>
  <rect x="-7.5" y="-27" width="15" height="5" rx="1.5" fill="${c}"/>
  <path d="M3 -71L17 -71L17 -65L12 -65L12 -62L17 -62L17 -55L3 -55Z" fill="${c}"/>
`;

/** La rosa araldica: cinque petali grandi, cinque piccoli e il bottone, centrata in (0,0). */
const rose = (c, hi, ground) => {
  const dark = mix(c, ground, 0.45);
  const sep = Array.from({ length: 5 }, (_, i) => `<path d="M0 -24L5 -34L0 -40L-5 -34Z" transform="rotate(${36 + i * 72})" fill="${hi}" fill-opacity=".9"/>`).join('');
  const outer = Array.from({ length: 5 }, (_, i) => `<circle cx="0" cy="-17" r="15" transform="rotate(${i * 72})" fill="${c}" stroke="${dark}" stroke-width="1.4"/>`).join('');
  const inner = Array.from({ length: 5 }, (_, i) => `<circle cx="0" cy="-8.5" r="8.5" transform="rotate(${36 + i * 72})" fill="${mix(c, hi, 0.35)}" stroke="${dark}" stroke-width="1"/>`).join('');
  return `${sep}${outer}${inner}<circle r="7" fill="${hi}"/>${Array.from({ length: 8 }, (_, i) => `<circle cx="0" cy="-4" r="1.2" transform="rotate(${i * 45})" fill="${dark}"/>`).join('')}`;
};

const glyphs = [
  'M0 -8V8M0 -8L6 -3M0 -2L6 3',
  'M-4 -8V8M4 -8V8M-4 -3L4 3',
  'M0 -8V8M-5 -4L0 1L5 -4',
  'M-5 -8L5 8M5 -8L-5 8',
  'M-4 8V-8L4 -3L-4 2L4 8',
  'M0 -8L5 0L0 8L-5 0Z',
  'M-4 -8V8M-4 -6L4 -1L-4 4',
  'M0 -8V8M-5 -4L5 4',
];

const newMotifs = {
  rombi: ([g0, g1, c, hi]) => ({
    defs: tile(
      'p',
      24,
      36,
      `<path d="M12 0L24 18L12 36L0 18Z" fill="none" stroke="${c}" stroke-opacity=".2" stroke-width="1"/>
       <path d="M12 13L15.5 18L12 23L8.5 18Z" fill="${c}" fill-opacity=".3"/>`,
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `${rings(60, c, hi, g1)}
      <path d="M${CX} ${CY - 54}L${CX + 32} ${CY}L${CX} ${CY + 54}L${CX - 32} ${CY}Z" fill="${c}"/>
      <path d="M${CX} ${CY - 39}L${CX + 23} ${CY}L${CX} ${CY + 39}L${CX - 23} ${CY}Z" fill="${g1}"/>
      <path d="M${CX} ${CY - 26}L${CX + 15} ${CY}L${CX} ${CY + 26}L${CX - 15} ${CY}Z" fill="${hi}"/>
      <path d="M${CX} ${CY - 11}L${CX + 6.5} ${CY}L${CX} ${CY + 11}L${CX - 6.5} ${CY}Z" fill="${g1}"/>
      ${[-1, 1].map(s => `<path d="M${CX + s * 42} ${CY - 15}L${CX + s * 51} ${CY}L${CX + s * 42} ${CY + 15}L${CX + s * 33} ${CY}Z" fill="${c}"/>`).join('')}
      ${twice(`<path d="M${CX - 26} ${CY - 40}L${CX - 22} ${CY - 34}L${CX - 26} ${CY - 28}L${CX - 30} ${CY - 34}Z M${CX + 26} ${CY - 40}L${CX + 30} ${CY - 34}L${CX + 26} ${CY - 28}L${CX + 22} ${CY - 34}Z" fill="${hi}" fill-opacity=".8"/>`)}`,
  }),

  rosone: ([g0, g1, c, hi]) => ({
    defs: tile(
      'p',
      34,
      34,
      `<circle cx="17" cy="17" r="9" fill="none" stroke="${c}" stroke-opacity=".2" stroke-width="1"/>
       <circle cx="17" cy="17" r="2.2" fill="${c}" fill-opacity=".35"/>
       ${[0, 34].flatMap(x => [0, 34].map(y => `<circle cx="${x}" cy="${y}" r="1.6" fill="${hi}" fill-opacity=".25"/>`)).join('')}`,
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `${rings(62, c, hi, g1)}
      ${around(12, `<path d="M${pt(polar(18, 15))}Q${pt(polar(36, 1))} ${pt(polar(54, 15))}Q${pt(polar(36, 29))} ${pt(polar(18, 15))}Z" fill="${hi}" fill-opacity=".92"/>`)}
      ${around(12, `<path d="M${pt(polar(16, 0))}L${pt(polar(58, 0))}" stroke="${c}" stroke-width="2.6"/>`)}
      ${around(12, `<path d="M${pt(polar(58, 0))}Q${pt(polar(49, 15))} ${pt(polar(58, 30))}" fill="none" stroke="${c}" stroke-width="2.2"/>`)}
      ${around(12, `<circle cx="${CX}" cy="${CY - 58}" r="2.6" fill="${hi}"/>`, 15)}
      <circle cx="${CX}" cy="${CY}" r="58" fill="none" stroke="${c}" stroke-width="2.6"/>
      <circle cx="${CX}" cy="${CY}" r="17" fill="${c}"/>
      <path d="${star(CX, CY, 12, 0.42, 8, -90)}" fill="${g1}"/>
      <circle cx="${CX}" cy="${CY}" r="3.4" fill="${hi}"/>`,
  }),

  tricolore: ([g0, g1, green, red]) => {
    const white = '#FFFFFF';
    const band = `<rect x="22" y="40" width="${f((W - 44) / 3)}" height="9" fill="${green}"/>
      <rect x="${f(22 + (W - 44) / 3)}" y="40" width="${f((W - 44) / 3)}" height="9" fill="${white}"/>
      <rect x="${f(22 + (2 * (W - 44)) / 3)}" y="40" width="${f((W - 44) / 3)}" height="9" fill="${red}"/>
      <rect x="22" y="40" width="${W - 44}" height="9" fill="none" stroke="${mix(g1, '#000000', 0.2)}" stroke-opacity=".35" stroke-width=".8"/>`;
    const scallop = (R, depth, n) =>
      poly(
        Array.from({ length: 360 }, (_, i) => {
          const a = (i * Math.PI) / 180;
          const r = R - depth + depth * Math.abs(Math.cos((a * n) / 2));
          return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
        }),
      );
    const pleats = (r0, r1, n, color, op) => around(n, `<path d="M${CX} ${CY - r0}L${CX} ${CY - r1}" stroke="${color}" stroke-opacity="${op}" stroke-width="1.2"/>`);
    return {
      defs: tile(
        'p',
        28,
        28,
        `${[0, 28].flatMap(x => [0, 28].map(y => `<circle cx="${x}" cy="${y}" r="1.8" fill="${green}" fill-opacity=".4"/>`)).join('')}
         <circle cx="14" cy="14" r="1.8" fill="${red}" fill-opacity=".4"/>`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>${twice(band)}`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="72" fill="${g1}" fill-opacity=".55"/>
        <path d="${scallop(68, 4, 28)}" fill="${red}"/>
        ${pleats(50, 66, 28, mix(red, '#000000', 0.35), 0.5)}
        <circle cx="${CX}" cy="${CY}" r="50" fill="${white}"/>
        ${pleats(32, 48, 28, g1, 0.9)}
        <circle cx="${CX}" cy="${CY}" r="32" fill="${green}"/>
        ${pleats(10, 30, 20, mix(green, '#000000', 0.35), 0.45)}
        <circle cx="${CX}" cy="${CY}" r="50" fill="none" stroke="${mix(red, '#000000', 0.2)}" stroke-width="1"/>
        <circle cx="${CX}" cy="${CY}" r="10" fill="${mix(green, '#000000', 0.2)}"/>
        <circle cx="${CX}" cy="${CY}" r="4" fill="${white}"/>`,
    };
  },

  ceramica: ([g0, g1, blue, yellow]) => ({
    defs: tile(
      'p',
      44,
      44,
      `${[0, 44].flatMap(x => [0, 44].map(y => `<circle cx="${x}" cy="${y}" r="12" fill="${yellow}" fill-opacity=".32" stroke="${blue}" stroke-opacity=".3" stroke-width="1.1"/><circle cx="${x}" cy="${y}" r="3.2" fill="${blue}" fill-opacity=".4"/>`)).join('')}
       ${[45, 135, 225, 315].map(a => `<path d="${leaf(11, 3.2)}" transform="translate(22 22) rotate(${a})" fill="${blue}" fill-opacity=".3"/>`).join('')}
       <circle cx="22" cy="22" r="2.2" fill="${blue}" fill-opacity=".6"/>`,
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
    medal: `
      <circle cx="${CX}" cy="${CY}" r="76" fill="${g0}"/>
      ${around(32, `<circle cx="${CX}" cy="${CY - 72}" r="2.6" fill="${blue}"/>`)}
      <circle cx="${CX}" cy="${CY}" r="66" fill="${yellow}"/>
      <circle cx="${CX}" cy="${CY}" r="66" fill="none" stroke="${blue}" stroke-width="3.2"/>
      <circle cx="${CX}" cy="${CY}" r="60" fill="none" stroke="${blue}" stroke-width="1.2"/>
      ${around(8, `<path d="${leaf(38, 9)}" transform="translate(${CX} ${CY - 18})" fill="${blue}"/>`)}
      ${around(8, `<path d="${leaf(20, 5)}" transform="translate(${CX} ${CY - 32})" fill="${g0}" stroke="${blue}" stroke-width="1.2"/>`, 22.5)}
      ${around(8, `<circle cx="${CX}" cy="${CY - 55}" r="3" fill="${g0}" stroke="${blue}" stroke-width="1.2"/>`, 22.5)}
      <circle cx="${CX}" cy="${CY}" r="20" fill="${blue}"/>
      <circle cx="${CX}" cy="${CY}" r="12" fill="${yellow}"/>
      <circle cx="${CX}" cy="${CY}" r="4.5" fill="${blue}"/>`,
  }),

  spirale: ([g0, g1, gold, white]) => {
    // Una S fatta di due riccioli, simmetrica rispetto al centro della piastrella.
    const s = (cx, cy, r0) => {
      const a = curl(cx - r0 * 0.55, cy - r0 * 0.2, r0, 1.15, 0.35);
      const b = a.map(([x, y]) => [2 * cx - x, 2 * cy - y]);
      return line([...a, ...b.reverse()]);
    };
    const hooks = around(
      8,
      (() => {
        const [px, py] = polar(45, 0);
        const toCenter = Math.atan2(CY - py, CX - px);
        const c = curl(px + 3, py, 12, 1.05, toCenter);
        return `<path d="${line([polar(27, 0), ...c.reverse()])}" fill="none" stroke="${gold}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      })(),
    );
    return {
      defs: tile('p', 40, 40, `<path d="${s(20, 20, 9)}" fill="none" stroke="${gold}" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round"/>`),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${rings(62, gold, white, g1)}
        ${around(8, `<path d="M${CX - 4} ${CY - 50}L${CX} ${CY - 60}L${CX + 4} ${CY - 50}Z" fill="${white}" fill-opacity=".85"/>`, 22.5)}
        ${hooks}
        <circle cx="${CX}" cy="${CY}" r="26" fill="${gold}"/>
        <circle cx="${CX}" cy="${CY}" r="20" fill="none" stroke="${g1}" stroke-width="1.6"/>
        <path d="${line(curl(CX, CY, 15, 1.6, -Math.PI / 2))}" fill="none" stroke="${g1}" stroke-width="2.6" stroke-linecap="round"/>`,
    };
  },

  alloro: ([g0, g1, gold, hi]) => {
    const R = 50;
    let branch = `<path d="M${pt(polar(R, 192))}A${R} ${R} 0 0 1 ${pt(polar(R, 352))}" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>`;
    for (let k = 0; k < 9; k++) {
      const a = 198 + k * 18;
      const [ox, oy] = polar(R + 1, a);
      branch += `<path d="${leaf(17, 5.6)}" transform="translate(${f(ox)} ${f(oy)}) rotate(${f(a + 90 - 38)})" fill="${gold}"/>`;
      branch += `<path d="${leaf(15, 5)}" transform="translate(${f(ox)} ${f(oy)}) rotate(${f(a + 90 + 38)})" fill="${gold}" fill-opacity=".82"/>`;
    }
    const [tx, ty] = polar(R, 352);
    branch += `<path d="${leaf(16, 5.4)}" transform="translate(${f(tx)} ${f(ty)}) rotate(${352 + 90})" fill="${hi}"/>`;
    return {
      defs: tile(
        'p',
        30,
        30,
        `<path d="${leaf(12, 3.6)}" transform="translate(9 21) rotate(45) translate(0 6)" fill="${gold}" fill-opacity=".22"/>
         ${[0, 30].flatMap(x => [0, 30].map(y => `<circle cx="${x}" cy="${y}" r="1.4" fill="${gold}" fill-opacity=".35"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${rings(66, gold, hi, g1)}
        ${twice(branch)}
        <circle cx="${CX}" cy="${CY}" r="27" fill="${gold}"/>
        <circle cx="${CX}" cy="${CY}" r="22" fill="none" stroke="${g1}" stroke-width="1.4"/>
        <path d="${star(CX, CY, 18, 0.4, 8, -90)}" fill="${g1}"/>
        <circle cx="${CX}" cy="${CY}" r="4" fill="${hi}"/>`,
    };
  },

  giglio: ([g0, g1, c, hi]) => {
    const light = luma(g0) > 0.6;
    const ground = g1;
    return {
      defs: tile(
        'p',
        26,
        26,
        `<path d="M13 9L17 13L13 17L9 13Z" fill="${c}" fill-opacity="${light ? 0.22 : 0.26}"/>
         ${[0, 26].flatMap(x => [0, 26].map(y => `<circle cx="${x}" cy="${y}" r="1.4" fill="${c}" fill-opacity=".3"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${oval(70, 104, c, hi, ground)}
        ${twice(`<g transform="translate(${CX} ${CY - 5})">${lily(c, hi, ground)}</g>`)}
        <path d="M${CX} ${CY - 5}L${CX + 5} ${CY}L${CX} ${CY + 5}L${CX - 5} ${CY}Z" fill="${hi}"/>`,
    };
  },

  tessuto: ([g0, g1, red, dark]) => {
    const band = `<path d="M30 38L${W - 30} 38M30 62L${W - 30} 62" stroke="${dark}" stroke-opacity=".7" stroke-width="1.6"/>
      ${Array.from({ length: 12 }, (_, i) => steps(42 + i * 25.1, 50, 2, 3.6, d => (d === 2 ? red : d === 0 ? dark : null))).join('')}`;
    return {
      defs: tile('p', 36, 36, steps(18, 18, 2, 4, d => (d === 2 ? `${red}55` : d === 0 ? `${dark}40` : null))),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>${twice(band)}`,
      medal: steps(CX, CY, 8, 9.4, d => [red, red, g0, dark, g0, red, red, g0, dark][d]),
    };
  },

  greca: ([g0, g1, red, dark]) => {
    const S = 66;
    const u = 6;
    const side = `<path d="${meander(CX - 48, CY - S + 4, 96, u)}" fill="none" stroke="${g0}" stroke-width="2.2" stroke-linecap="square"/>
      <rect x="${CX - S + 5}" y="${CY - S + 5}" width="10" height="10" fill="none" stroke="${g0}" stroke-width="2"/>`;
    const band = `<path d="${meander(36, 40, W - 72, 6.2)}" fill="none" stroke="${red}" stroke-width="2.2" stroke-opacity=".85"/>
      <path d="M30 34L${W - 30} 34M30 58L${W - 30} 58" stroke="${dark}" stroke-opacity=".5" stroke-width="1.2"/>`;
    return {
      defs: tile('p', 12, 12, `<path d="M0 0L12 0M0 0L0 12" stroke="${dark}" stroke-opacity=".08" stroke-width="1"/>`),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>${twice(band)}`,
      medal: `
        <rect x="${CX - S - 6}" y="${CY - S - 6}" width="${2 * S + 12}" height="${2 * S + 12}" fill="${g0}"/>
        <rect x="${CX - S - 6}" y="${CY - S - 6}" width="${2 * S + 12}" height="${2 * S + 12}" fill="none" stroke="${dark}" stroke-width="1.2" stroke-opacity=".6"/>
        <rect x="${CX - S}" y="${CY - S}" width="${2 * S}" height="${2 * S}" fill="${red}"/>
        ${around(4, side)}
        <rect x="${CX - 46}" y="${CY - 46}" width="92" height="92" fill="${g1}"/>
        <path d="M${CX} ${CY - 44}L${CX + 44} ${CY}L${CX} ${CY + 44}L${CX - 44} ${CY}Z" fill="${dark}"/>
        <circle cx="${CX}" cy="${CY}" r="27" fill="${g0}"/>
        ${rosette(26, 8, red, 1)}
        <circle cx="${CX}" cy="${CY}" r="5" fill="${dark}"/>`,
    };
  },

  scudo: ([g0, g1, gold, hi], variant) => {
    const shield = (() => {
      const cx = CX;
      const cy = CY - 40;
      const charge =
        variant === 'stella'
          ? `<path d="${star(cx, cy + 1, 15, 0.42, 5, -90)}" fill="${g1}"/>`
          : `<path d="M${cx - 21} ${cy + 12}L${cx} ${cy - 8}L${cx + 21} ${cy + 12}L${cx + 21} ${cy + 21}L${cx} ${cy + 1}L${cx - 21} ${cy + 21}Z" fill="${g1}"/>`;
      return `<path d="${shieldPath(cx, cy, 58, 66)}" fill="${gold}"/>
        <path d="${shieldPath(cx, cy, 48, 56)}" fill="none" stroke="${g1}" stroke-width="2"/>
        <clipPath id="sh"><path d="${shieldPath(cx, cy, 48, 56)}"/></clipPath>
        <g clip-path="url(#sh)">${charge}</g>
        <path d="${shieldPath(cx, cy, 58, 66)}" fill="none" stroke="${hi}" stroke-width="1.2"/>`;
    })();
    return {
      defs: tile(
        'p',
        24,
        24,
        `<path d="M12 7V17M7 12H17" stroke="${gold}" stroke-opacity=".22" stroke-width="1.6"/>
         ${[0, 24].flatMap(x => [0, 24].map(y => `<circle cx="${x}" cy="${y}" r="1.3" fill="${hi}" fill-opacity=".3"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${oval(68, 100, gold, hi, g1)}
        ${twice(shield)}
        ${divider(gold, hi, 52)}`,
    };
  },

  fregio: ([g0, g1, gold, hi]) => {
    const scroll = `<path d="M30 52${Array.from({ length: 12 }, (_, i) => `Q${f(30 + i * 25 + 6.25)} ${i % 2 ? 60 : 44} ${f(30 + i * 25 + 12.5)} 52T${f(30 + (i + 1) * 25)} 52`).join('')}" fill="none" stroke="${gold}" stroke-width="1.6" stroke-opacity=".85"/>
      ${Array.from({ length: 24 }, (_, i) => `<circle cx="${f(30 + i * 12.5 + 6.25)}" cy="${i % 2 ? 46 : 58}" r="2.2" fill="${hi}" fill-opacity=".8"/>`).join('')}
      <path d="M30 38L${W - 30} 38M30 66L${W - 30} 66" stroke="${gold}" stroke-width="1.2" stroke-opacity=".7"/>`;
    const petal = (() => {
      const [px, py] = polar(40, 0);
      const l = curl(px - 12, py + 6, 8, 1.1, Math.PI * 0.25);
      const r = l.map(([x, y]) => [2 * CX - x, y]);
      return `<path d="${leaf(34, 8)}" transform="translate(${CX} ${CY - 18})" fill="${hi}"/>
        <path d="${line(l)}" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="${line(r)}" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>`;
    })();
    const L = [
      [0, -34],
      [34, 0],
      [0, 34],
      [-34, 0],
    ];
    return {
      defs: tile(
        'p',
        40,
        56,
        `<path d="M20 0C20 14 40 14 40 28C40 42 20 42 20 56M20 0C20 14 0 14 0 28C0 42 20 42 20 56" fill="none" stroke="${gold}" stroke-opacity=".24" stroke-width="1.2"/>
         <circle cx="20" cy="28" r="2" fill="${hi}" fill-opacity=".3"/>`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>${twice(scroll)}`,
      medal: `
        <path d="${lobes(L, 42)}" fill="${g1}"/>
        <path d="${lobes(L, 42)}" fill="none" stroke="${gold}" stroke-width="3"/>
        <path d="${lobes(L, 36)}" fill="none" stroke="${hi}" stroke-width="1" stroke-opacity=".8"/>
        ${around(4, `<path d="M${CX} ${CY - 74}L${CX + 5} ${CY - 69}L${CX} ${CY - 64}L${CX - 5} ${CY - 69}Z" fill="${hi}"/>`, 45)}
        ${around(4, petal)}
        <circle cx="${CX}" cy="${CY}" r="14" fill="${gold}"/>
        <circle cx="${CX}" cy="${CY}" r="8.5" fill="${g0}" stroke="${hi}" stroke-width="1.6"/>`,
    };
  },

  chiave: ([g0, g1, gold, hi]) => {
    const pair = [
      [-32, gold],
      [32, hi],
    ]
      .map(([a, col]) => `<g transform="translate(${CX} ${CY - 54}) rotate(${a}) translate(0 50) scale(1.25)">${keyShape(col, g1)}</g>`)
      .join('');
    return {
      defs: tile(
        'p',
        24,
        24,
        `<circle cx="12" cy="12" r="2.4" fill="none" stroke="${gold}" stroke-opacity=".28" stroke-width="1"/>
         ${[0, 24].flatMap(x => [0, 24].map(y => `<path d="M${x} ${y - 2.4}L${x + 2.4} ${y}L${x} ${y + 2.4}L${x - 2.4} ${y}Z" fill="${gold}" fill-opacity=".22"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${oval(70, 104, gold, hi, g1)}
        ${twice(pair)}
        ${divider(gold, hi, 54)}`,
    };
  },

  rosa: ([g0, g1, c, hi]) => {
    const half = `<path d="M${CX} ${CY - 22}L${CX} ${CY - 2}" stroke="${hi}" stroke-opacity=".7" stroke-width="2"/>
      <g transform="translate(${CX} ${CY - 52})">${rose(c, hi, g1)}</g>
      <path d="${leaf(30, 8)}" transform="translate(${CX - 6} ${CY - 2}) rotate(-62)" fill="${hi}" fill-opacity=".55"/>`;
    return {
      defs: tile(
        'p',
        30,
        30,
        `${[0, 72, 144, 216, 288].map(a => `<circle cx="15" cy="12.5" r="2.4" transform="rotate(${a} 15 15)" fill="${c}" fill-opacity=".18"/>`).join('')}
         ${[0, 30].flatMap(x => [0, 30].map(y => `<circle cx="${x}" cy="${y}" r="1.3" fill="${hi}" fill-opacity=".25"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${oval(68, 104, c, hi, g1)}
        ${twice(half)}
        <circle cx="${CX}" cy="${CY}" r="5" fill="${hi}"/>`,
    };
  },

  sigillo: ([g0, g1, gold, hi]) => {
    const wax = mix(g0, '#E0283C', 0.62);
    const waxDark = mix(wax, '#000000', 0.35);
    const blob = poly(
      Array.from({ length: 300 }, (_, i) => {
        const a = (i / 300) * Math.PI * 2;
        const r = 62 + 3.6 * Math.cos(2 * a + 0.3) + 2.6 * Math.cos(6 * a + 1) + 1.8 * Math.cos(10 * a + 2) + 1.4 * Math.cos(16 * a + 0.5);
        return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
      }),
    );
    const ribbon = `<g transform="translate(${CX} ${CY}) rotate(-58)">
        <path d="M0 -10L128 -10L114 0L128 10L0 10Z" fill="${gold}"/>
        <path d="M0 -10L128 -10M0 10L128 10" stroke="${hi}" stroke-opacity=".6" stroke-width="1"/>
      </g>`;
    return {
      defs: `<radialGradient id="wax" cx="45%" cy="40%" r="62%"><stop offset="0" stop-color="${mix(wax, '#FFFFFF', 0.12)}"/><stop offset=".7" stop-color="${wax}"/><stop offset="1" stop-color="${waxDark}"/></radialGradient>
        ${tile('p', 30, 30, `<circle cx="15" cy="15" r="4" fill="none" stroke="${gold}" stroke-opacity=".16" stroke-width="1"/>`)}`,
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${twice(ribbon)}
        <path d="${blob}" fill="${waxDark}" transform="translate(1.5 2.5)"/>
        <path d="${blob}" fill="url(#wax)"/>
        <circle cx="${CX}" cy="${CY}" r="47" fill="${waxDark}" fill-opacity=".55"/>
        <circle cx="${CX}" cy="${CY}" r="44" fill="${wax}"/>
        <circle cx="${CX}" cy="${CY}" r="40" fill="none" stroke="${gold}" stroke-width="2.6"/>
        ${around(24, `<circle cx="${CX}" cy="${CY - 34}" r="1.5" fill="${gold}"/>`)}
        <path d="${star(CX, CY, 27, 0.42, 8, -90)}" fill="${gold}"/>
        <circle cx="${CX}" cy="${CY}" r="8" fill="${wax}" stroke="${hi}" stroke-width="1.6"/>`,
    };
  },

  stemmi: ([g0, g1, gold, hi]) => {
    const one = (charge, start) =>
      around(
        2,
        `<path d="${shieldPath(CX, CY - 44, 36, 42)}" fill="${gold}"/>
         <clipPath id="st${start}"><path d="${shieldPath(CX, CY - 44, 36, 42)}"/></clipPath>
         <g clip-path="url(#st${start})">${charge}</g>
         <path d="${shieldPath(CX, CY - 44, 36, 42)}" fill="none" stroke="${hi}" stroke-width="1.2"/>`,
        start,
      );
    return {
      defs: tile(
        'p',
        28,
        28,
        `<path d="M14 10V18M10 14H18" stroke="${gold}" stroke-opacity=".2" stroke-width="1.4"/>
         ${[0, 28].flatMap(x => [0, 28].map(y => `<circle cx="${x}" cy="${y}" r="1.6" fill="none" stroke="${gold}" stroke-opacity=".25" stroke-width="1"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>`,
      medal: `${rings(66, gold, hi, g1)}
        ${one(`<rect x="${CX - 20}" y="${CY - 51}" width="40" height="10" fill="${g1}"/>`, 0)}
        ${one(`<path d="M${CX - 4} ${CY - 66}L${CX + 4} ${CY - 66}L${CX + 4} ${CY - 22}L${CX - 4} ${CY - 22}Z M${CX - 20} ${CY - 50}L${CX + 20} ${CY - 50}L${CX + 20} ${CY - 42}L${CX - 20} ${CY - 42}Z" fill="${g1}"/>`, 90)}
        ${around(4, `<path d="M${CX} ${CY - 58}L${CX + 4} ${CY - 54}L${CX} ${CY - 50}L${CX - 4} ${CY - 54}Z" fill="${hi}"/>`, 45)}
        <circle cx="${CX}" cy="${CY}" r="13" fill="${gold}"/>
        <path d="${star(CX, CY, 9, 0.3, 4, -90)}" fill="${g1}"/>`,
    };
  },

  cristallo: ([g0, g1, c, hi]) => {
    const O = [
      [0, -96],
      [44, -42],
      [44, 42],
      [0, 96],
      [-44, 42],
      [-44, -42],
    ].map(([x, y]) => [CX + x, CY + y]);
    const I = [
      [0, -56],
      [24, -22],
      [24, 22],
      [0, 56],
      [-24, 22],
      [-24, -22],
    ].map(([x, y]) => [CX + x, CY + y]);
    const outerShade = [
      [hi, 0.95],
      [c, 0.75],
      [g0, 0.9],
    ];
    const innerShade = [
      [hi, 0.7],
      [c, 0.95],
      [hi, 0.4],
    ];
    const quads = O.map((p, i) => {
      const [col, op] = outerShade[i % 3];
      return `<path d="${poly([p, O[(i + 1) % 6], I[(i + 1) % 6], I[i]])}" fill="${col}" fill-opacity="${op}"/>`;
    }).join('');
    const tris = I.map((p, i) => {
      const [col, op] = innerShade[i % 3];
      return `<path d="${poly([p, I[(i + 1) % 6], [CX, CY]])}" fill="${col}" fill-opacity="${op}"/>`;
    }).join('');
    return {
      defs: `${halo('glow', c, 0.55)}
        ${tile('p', 30, 52, `<path d="M15 0L30 26L15 52L0 26Z" fill="none" stroke="${c}" stroke-opacity=".16" stroke-width="1"/><circle cx="15" cy="26" r="1.2" fill="${hi}" fill-opacity=".35"/>`)}`,
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>
        <ellipse cx="${CX}" cy="${CY}" rx="150" ry="190" fill="url(#glow)"/>
        ${twice(`${sparkle(CX + 70, CY - 92, 9, hi)}${sparkle(CX - 82, CY - 30, 6, hi, 0.85)}${sparkle(CX + 98, CY - 168, 5, c)}`)}`,
      medal: `
        <path d="${poly(O)}" fill="${g1}"/>
        ${quads}${tris}
        <path d="${poly(O)}" fill="none" stroke="${hi}" stroke-width="2"/>
        <path d="${poly(I)}" fill="none" stroke="${hi}" stroke-width="1" stroke-opacity=".7"/>
        ${I.map((p, i) => `<path d="M${pt(p)}L${pt(O[i])}" stroke="${hi}" stroke-width="1" stroke-opacity=".7"/>`).join('')}
        ${sparkle(CX - 14, CY - 46, 7, '#FFFFFF')}${sparkle(CX + 14, CY + 46, 7, '#FFFFFF')}`,
    };
  },

  rune: ([g0, g1, gold, hi]) => {
    const ring = Array.from({ length: 16 }, (_, i) => {
      const a = i * 22.5;
      return `<path d="${glyphs[i % 8]}" transform="rotate(${a} ${CX} ${CY}) translate(${CX} ${CY - 52})" fill="none" stroke="${g1}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join('');
    const tri = rot => poly([0, 120, 240].map(a => polar(29, a + rot)));
    return {
      defs: tile(
        'p',
        32,
        32,
        `<path d="M16 12V20M13 16L19 16" stroke="${gold}" stroke-opacity=".14" stroke-width="1.2"/>
         ${[0, 32].flatMap(x => [0, 32].map(y => `<circle cx="${x}" cy="${y}" r="1.2" fill="${gold}" fill-opacity=".25"/>`)).join('')}`,
      ),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>
        <circle cx="${CX}" cy="${CY}" r="112" fill="none" stroke="${gold}" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 5"/>
        <circle cx="${CX}" cy="${CY}" r="128" fill="none" stroke="${gold}" stroke-opacity=".2" stroke-width="1"/>`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="70" fill="${g1}"/>
        <circle cx="${CX}" cy="${CY}" r="70" fill="none" stroke="${gold}" stroke-width="1.2" stroke-opacity=".8"/>
        <circle cx="${CX}" cy="${CY}" r="52.5" fill="none" stroke="${gold}" stroke-width="25"/>
        <circle cx="${CX}" cy="${CY}" r="65" fill="none" stroke="${hi}" stroke-width="1.4"/>
        <circle cx="${CX}" cy="${CY}" r="40" fill="none" stroke="${hi}" stroke-width="1.4"/>
        ${ring}
        <path d="${tri(0)}" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="${tri(180)}" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="${CX}" cy="${CY}" r="11" fill="${g0}" stroke="${hi}" stroke-width="1.8"/>
        <circle cx="${CX}" cy="${CY}" r="3.6" fill="${hi}"/>`,
    };
  },

  galassia: ([g0, g1, c, hi]) => {
    const r = rng(23);
    const arm = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * 3.3;
      const rr = 14 + 112 * t;
      arm.push([CX + rr * Math.cos(a), CY + rr * Math.sin(a)]);
    }
    let dots = '';
    for (let i = 0; i < 110; i++) {
      const t = r();
      const a = t * 3.3 + (r() - 0.5) * 0.35;
      const rr = 12 + 98 * t + (r() - 0.5) * 14;
      const s = 0.5 + r() * r() * 2.2;
      dots += `<circle cx="${f(CX + rr * Math.cos(a))}" cy="${f(CY + rr * Math.sin(a))}" r="${f(s)}" fill="${r() < 0.3 ? c : '#FFFFFF'}" fill-opacity="${f(0.5 + r() * 0.5)}"/>`;
    }
    const armPath = line(arm);
    return {
      defs: `${blur('b8', 8)}${blur('b2', 2)}${halo('core', '#FFFFFF', 1, 0.25)}${halo('disc', c, 0.5, 0.4)}`,
      body: `${starField(31, 46, { keep: 70, c: hi, hi, big: 0.12 })}`,
      medal: `
        <g transform="translate(${CX} ${CY}) rotate(-28) scale(1 .64) translate(${-CX} ${-CY})">
          <circle cx="${CX}" cy="${CY}" r="112" fill="url(#disc)"/>
          ${twice(`<path d="${armPath}" fill="none" stroke="${c}" stroke-width="34" stroke-opacity=".6" stroke-linecap="round" filter="url(#b8)"/>`)}
          ${twice(`<path d="${armPath}" fill="none" stroke="${hi}" stroke-width="8" stroke-opacity=".85" stroke-linecap="round" filter="url(#b2)"/>`)}
          ${twice(dots)}
          <circle cx="${CX}" cy="${CY}" r="58" fill="url(#core)"/>
        </g>
        <circle cx="${CX}" cy="${CY}" r="11" fill="#FFFFFF"/>`,
    };
  },

  nebulosa: ([g0, g1, pink, blue]) => {
    const r = rng(41);
    let clouds = '';
    for (let i = 0; i < 9; i++) {
      const x = CX + (r() - 0.5) * 220;
      const y = CY - 30 - r() * 170;
      const rx = 40 + r() * 60;
      const ry = 26 + r() * 40;
      clouds += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(-30 + r() * 60)} ${f(x)} ${f(y)})" fill="${i % 3 === 0 ? blue : pink}" fill-opacity="${f(0.28 + r() * 0.25)}"/>`;
    }
    return {
      defs: `${blur('b22', 22)}${halo('core', '#FFFFFF', 1, 0.2)}${halo('pinkG', pink, 0.7, 0.4)}`,
      body: `<g filter="url(#b22)">${twice(clouds)}<ellipse cx="${CX}" cy="${CY}" rx="120" ry="80" transform="rotate(-35 ${CX} ${CY})" fill="${pink}" fill-opacity=".45"/></g>
        ${starField(43, 60, { keep: 40, c: '#FFFFFF', hi: '#FFFFFF', big: 0.1 })}`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="90" fill="url(#pinkG)"/>
        <circle cx="${CX}" cy="${CY}" r="50" fill="url(#core)"/>
        ${sparkle(CX, CY, 58, '#FFFFFF')}
        <path d="${star(CX, CY, 26, 0.2, 4, -45)}" fill="${blue}"/>
        <circle cx="${CX}" cy="${CY}" r="7" fill="#FFFFFF"/>`,
    };
  },

  'sole-nero': ([g0, g1, orange, yellow]) => {
    const flame = (L, w, color, op) =>
      around(
        24,
        `<path d="M${pt(polar(44, -w))}Q${pt(polar(L * 0.82, -w - 2))} ${pt(polar(L, w * 0.6))}Q${pt(polar(L * 0.78, w + 3))} ${pt(polar(44, w))}Z" fill="${color}" fill-opacity="${op}"/>`,
      );
    return {
      defs: `${blur('b6', 6)}${halo('fire', orange, 0.6, 0.45)}`,
      body: around(36, `<path d="M${CX} ${CY - 120}L${CX} ${CY - 380}" stroke="${orange}" stroke-opacity=".1" stroke-width="2.2"/>`),
      medal: `
        <circle cx="${CX}" cy="${CY}" r="104" fill="url(#fire)"/>
        <g filter="url(#b6)">${flame(84, 7, orange, 0.9)}</g>
        ${flame(80, 6, orange, 1)}
        <g transform="rotate(7.5 ${CX} ${CY})">${flame(64, 5, yellow, 1)}</g>
        <circle cx="${CX}" cy="${CY}" r="48" fill="${g1}"/>
        <circle cx="${CX}" cy="${CY}" r="48" fill="none" stroke="${yellow}" stroke-width="2.4"/>
        <circle cx="${CX}" cy="${CY}" r="38" fill="none" stroke="${orange}" stroke-width="1" stroke-opacity=".45"/>
        <circle cx="${CX}" cy="${CY}" r="28" fill="none" stroke="${orange}" stroke-width="1" stroke-opacity=".25"/>`,
    };
  },

  eclissi: ([g0, g1, gold, white]) => {
    const corona = (R, amp, seed) => {
      const r = rng(seed);
      const ph = Array.from({ length: 6 }, () => r() * 6.28);
      return poly(
        Array.from({ length: 360 }, (_, i) => {
          const a = (i * Math.PI) / 180;
          const rr = R + amp * (0.6 * Math.cos(2 * a + ph[0]) + 0.35 * Math.cos(4 * a + ph[1]) + 0.25 * Math.cos(6 * a + ph[2]) + 0.18 * Math.cos(10 * a + ph[3]) + 0.5 * Math.max(0, Math.cos(2 * a + ph[4])) ** 6);
          return [CX + rr * Math.sin(a), CY - rr * Math.cos(a)];
        }),
      );
    };
    const rs = rng(57);
    const streamers = twice(
      Array.from({ length: 14 }, () => {
        const a = rs() * 180;
        const L = 64 + rs() * 34;
        const w = 4 + rs() * 6;
        return `<path d="M${pt(polar(44, a - w))}L${pt(polar(L, a))}L${pt(polar(44, a + w))}Z" fill="${rs() < 0.5 ? white : gold}" fill-opacity="${f(0.55 + rs() * 0.35)}"/>`;
      }).join(''),
    );
    return {
      defs: `${blur('b10', 10)}${blur('b4', 4)}${blur('b1', 1.4)}${halo('cor', gold, 0.8, 0.5)}`,
      body: starField(53, 34, { keep: 120, c: gold, hi: white, big: 0.15 }),
      medal: `
        <circle cx="${CX}" cy="${CY}" r="96" fill="url(#cor)"/>
        <g filter="url(#b4)">${streamers}</g>
        <path d="${corona(60, 7, 9)}" fill="${white}" fill-opacity=".8" filter="url(#b4)"/>
        <circle cx="${CX}" cy="${CY}" r="49" fill="none" stroke="${white}" stroke-width="6" filter="url(#b4)"/>
        <circle cx="${CX}" cy="${CY}" r="47" fill="none" stroke="${white}" stroke-width="2.2"/>
        <circle cx="${CX}" cy="${CY}" r="46" fill="${g1}"/>
        ${twice(`<circle cx="${f(polar(47, -42)[0])}" cy="${f(polar(47, -42)[1])}" r="4" fill="${white}" filter="url(#b1)"/>`)}`,
    };
  },

  costellazioni: ([g0, g1, white, pale]) => {
    const group = (pts, links, sizes) =>
      links.map(([a, b]) => `<path d="M${pt(pts[a])}L${pt(pts[b])}" stroke="${pale}" stroke-opacity=".55" stroke-width="1"/>`).join('') +
      pts.map((p, i) => sparkle(p[0], p[1], sizes[i] ?? 3.2, white)).join('');
    const dipper = [
      [44, 88],
      [72, 80],
      [96, 92],
      [118, 108],
      [150, 104],
      [158, 132],
      [124, 138],
    ];
    const cassio = [
      [226, 52],
      [246, 74],
      [268, 60],
      [288, 84],
      [312, 66],
    ];
    const chart = [
      [-40, -14],
      [-22, -34],
      [2, -26],
      [22, -44],
      [42, -24],
      [16, -8],
    ].map(([x, y]) => [CX + x, CY + y]);
    return {
      defs: '',
      body: `${twice(group(dipper, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]], [3, 3.6, 3, 4, 3.4, 3.6, 3]) + group(cassio, [[0, 1], [1, 2], [2, 3], [3, 4]], [3.4, 3, 4, 3, 3.4]))}
        ${starField(61, 40, { keep: 96, c: white, hi: pale, big: 0, size: 0.7 })}`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="72" fill="${g1}"/>
        <circle cx="${CX}" cy="${CY}" r="72" fill="none" stroke="${pale}" stroke-width="1.2" stroke-opacity=".8"/>
        <circle cx="${CX}" cy="${CY}" r="66" fill="none" stroke="${white}" stroke-width="2.6"/>
        ${around(72, `<path d="M${CX} ${CY - 66}L${CX} ${CY - 62}" stroke="${pale}" stroke-width="1" stroke-opacity=".7"/>`)}
        ${around(12, `<path d="M${CX} ${CY - 66}L${CX} ${CY - 58}" stroke="${white}" stroke-width="1.6"/>`)}
        <ellipse cx="${CX}" cy="${CY}" rx="58" ry="20" fill="none" stroke="${pale}" stroke-opacity=".25" stroke-width=".9"/>
        <ellipse cx="${CX}" cy="${CY}" rx="22" ry="58" fill="none" stroke="${pale}" stroke-opacity=".25" stroke-width=".9"/>
        ${twice(group(chart, [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]], [4.5, 4, 5.5, 4.5, 4, 3.6]))}
        ${sparkle(CX, CY, 9, white)}`,
    };
  },

  luna: ([g0, g1, silver, white]) => ({
    defs: `<linearGradient id="moon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${white}"/><stop offset="1" stop-color="${silver}"/></linearGradient>`,
    body: starField(71, 44, { keep: 96, c: silver, hi: white, big: 0.2 }),
    medal: `${rings(66, silver, white, g1)}
      ${twice(`<path d="${crescent(CX - 24, CY, 38, 17, 33)}" fill="${silver}"/><path d="${crescent(CX - 24, CY, 38, 17, 33)}" fill="none" stroke="${white}" stroke-width="1.2"/>`)}
      ${sparkle(CX, CY, 13, white)}
      ${twice(`<circle cx="${CX + 3}" cy="${CY - 44}" r="1.8" fill="${white}"/>`)}`,
  }),

  universo: ([g0, g1, cyan, pink]) => {
    const a = 84;
    const lem = Array.from({ length: 241 }, (_, i) => {
      const t = (i / 240) * Math.PI * 2;
      const d = 1 + Math.sin(t) ** 2;
      return [CX + (a * Math.cos(t)) / d, CY + (a * Math.sin(t) * Math.cos(t)) / d];
    });
    const r = rng(83);
    let clouds = '';
    for (let i = 0; i < 7; i++) {
      const x = 40 + r() * (W - 80);
      const y = 40 + r() * (CY - 120);
      clouds += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(40 + r() * 50)}" ry="${f(22 + r() * 30)}" fill="${i % 2 ? pink : cyan}" fill-opacity="${f(0.22 + r() * 0.2)}"/>`;
    }
    const galaxy = (x, y, s, col) =>
      `<g transform="translate(${x} ${y}) rotate(-30) scale(${s} ${s * 0.6})"><circle r="14" fill="${col}" fill-opacity=".35" filter="url(#b3)"/><path d="M0 0C6 -8 14 -4 14 4M0 0C-6 8 -14 4 -14 -4" fill="none" stroke="#FFFFFF" stroke-opacity=".8" stroke-width="2"/><circle r="3" fill="#FFFFFF"/></g>`;
    return {
      defs: `${blur('b22', 22)}${blur('b6', 6)}${blur('b3', 3)}
        <linearGradient id="inf" gradientUnits="userSpaceOnUse" x1="${CX - a}" y1="0" x2="${CX + a}" y2="0"><stop offset="0" stop-color="${cyan}"/><stop offset=".5" stop-color="${pink}"/><stop offset="1" stop-color="${cyan}"/></linearGradient>`,
      body: `<g filter="url(#b22)">${twice(clouds)}</g>
        ${starField(87, 70, { keep: 60, c: '#FFFFFF', hi: '#FFFFFF', big: 0.12, size: 0.85 })}
        ${twice(galaxy(76, 120, 1, cyan) + galaxy(282, 62, 0.7, pink))}`,
      medal: `
        <path d="${poly(lem)}" fill="none" stroke="url(#inf)" stroke-width="20" stroke-opacity=".55" filter="url(#b6)"/>
        <path d="${poly(lem)}" fill="none" stroke="url(#inf)" stroke-width="7" stroke-linejoin="round"/>
        <path d="${poly(lem)}" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-opacity=".85"/>
        ${twice(`<circle cx="${CX - 50}" cy="${CY}" r="10" fill="#FFFFFF" fill-opacity=".5" filter="url(#b3)"/><circle cx="${CX - 50}" cy="${CY}" r="2.6" fill="#FFFFFF"/>`)}
        ${sparkle(CX, CY, 16, '#FFFFFF')}`,
    };
  },

  supernova: ([g0, g1, orange, white]) => {
    const r = rng(97);
    let rays = '';
    for (let i = 0; i < 26; i++) {
      const a = r() * 180;
      const L = 60 + r() * r() * 150;
      const w = 1.2 + r() * 2.4;
      rays += `<path d="M${pt(polar(18, a - w))}L${pt(polar(L, a))}L${pt(polar(18, a + w))}Z" fill="${r() < 0.35 ? white : orange}" fill-opacity="${f(0.45 + r() * 0.5)}"/>`;
    }
    let debris = '';
    for (let i = 0; i < 40; i++) {
      const a = r() * 180;
      const d = 70 + r() * 90;
      const [x, y] = polar(d, a);
      debris += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + r() * 1.8)}" fill="${r() < 0.5 ? orange : white}" fill-opacity="${f(0.4 + r() * 0.5)}"/>`;
    }
    return {
      defs: `${blur('b5', 5)}${halo('core', white, 1, 0.22)}${halo('fire', orange, 0.75, 0.4)}`,
      body: `${starField(101, 40, { keep: 150, c: orange, hi: white, big: 0.1 })}`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="120" fill="url(#fire)"/>
        <g filter="url(#b5)">${twice(rays)}</g>
        ${twice(rays)}
        ${twice(debris)}
        <circle cx="${CX}" cy="${CY}" r="56" fill="none" stroke="${orange}" stroke-width="8" stroke-opacity=".7" filter="url(#b5)"/>
        <circle cx="${CX}" cy="${CY}" r="56" fill="none" stroke="${white}" stroke-width="2" stroke-opacity=".9"/>
        <circle cx="${CX}" cy="${CY}" r="46" fill="url(#core)"/>
        ${sparkle(CX, CY, 30, white)}`,
    };
  },

  portale: ([g0, g1, violet, pale]) => {
    let squares = '';
    let s = 62;
    for (let i = 0; i < 10; i++) {
      squares += `<rect x="${f(CX - s)}" y="${f(CY - s)}" width="${f(2 * s)}" height="${f(2 * s)}" rx="${f(s * 0.12)}" transform="rotate(${i * 11} ${CX} ${CY})" fill="none" stroke="${i % 2 ? pale : violet}" stroke-width="${f(2.6 - i * 0.12)}" stroke-opacity="${f(0.55 + i * 0.045)}"/>`;
      s *= 0.78;
    }
    return {
      defs: `${blur('b8', 8)}${halo('void', violet, 0.9, 0.3)}${halo('core', '#FFFFFF', 1, 0.2)}
        ${tile('p', 22, 22, `<circle cx="11" cy="11" r="1.1" fill="${violet}" fill-opacity=".45"/>`)}`,
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>
        ${around(16, `<path d="M${CX} ${CY - 112}L${CX} ${CY - 360}" stroke="${violet}" stroke-opacity=".16" stroke-width="1.4"/>`)}`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="112" fill="url(#void)"/>
        <circle cx="${CX}" cy="${CY}" r="90" fill="${g1}"/>
        <circle cx="${CX}" cy="${CY}" r="90" fill="none" stroke="${violet}" stroke-width="10" stroke-opacity=".7" filter="url(#b8)"/>
        <circle cx="${CX}" cy="${CY}" r="90" fill="none" stroke="${pale}" stroke-width="2.2"/>
        <circle cx="${CX}" cy="${CY}" r="84" fill="none" stroke="${violet}" stroke-width="1" stroke-opacity=".8"/>
        <clipPath id="pc"><circle cx="${CX}" cy="${CY}" r="83"/></clipPath>
        <g clip-path="url(#pc)">${squares}</g>
        <circle cx="${CX}" cy="${CY}" r="20" fill="url(#core)"/>`,
    };
  },

  guilloche: ([g0, g1, gold, cyan]) => {
    const rose = (R, A, n, m, color, op, w) =>
      Array.from({ length: m }, (_, j) => {
        const ph = (j / m) * ((2 * Math.PI) / n);
        return `<path d="${poly(
          Array.from({ length: 480 }, (_, i) => {
            const a = (i / 480) * Math.PI * 2;
            const rr = R + A * Math.sin(n * (a + ph));
            return [CX + rr * Math.sin(a), CY - rr * Math.cos(a)];
          }),
        )}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${w}"/>`;
      }).join('');
    const waves = Array.from({ length: 5 }, (_, j) => {
      const ph = (j / 5) * Math.PI * 2;
      return `<path d="${line(Array.from({ length: 121 }, (_, i) => [24 + (i / 120) * (W - 48), 50 + 9 * Math.sin((i / 120) * Math.PI * 2 * 9 + ph)]))}" fill="none" stroke="${j % 2 ? cyan : gold}" stroke-opacity=".5" stroke-width=".9"/>`;
    }).join('');
    return {
      defs: '',
      body: twice(waves) + `<rect x="34" y="70" width="${W - 68}" height="${H - 140}" rx="4" fill="none" stroke="${gold}" stroke-opacity=".25" stroke-width="1"/>`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="76" fill="${g1}"/>
        ${rose(66, 5, 36, 3, gold, 0.85, 1)}
        ${rose(48, 13, 18, 6, gold, 0.75, 0.9)}
        ${rose(30, 9, 12, 5, cyan, 0.8, 0.9)}
        <circle cx="${CX}" cy="${CY}" r="74" fill="none" stroke="${gold}" stroke-width="2"/>
        <circle cx="${CX}" cy="${CY}" r="14" fill="${g0}" stroke="${gold}" stroke-width="1.8"/>
        <circle cx="${CX}" cy="${CY}" r="5" fill="${cyan}"/>`,
    };
  },

  filigrana: ([g0, g1, gold, hi]) => {
    const corner = (() => {
      const a = curl(56, 36, 10, 1.1, Math.PI);
      const b = curl(36, 56, 10, 1.1, -Math.PI / 2);
      return `<path d="M32 32L${pt(a[a.length - 1])}" stroke="${gold}" stroke-width="1.6" fill="none"/>
        <path d="${line([...a].reverse())}" fill="none" stroke="${gold}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="${line([...b].reverse())}" fill="none" stroke="${gold}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M32 32L${pt(b[b.length - 1])}" stroke="${gold}" stroke-width="1.6" fill="none"/>
        <circle cx="32" cy="32" r="3.4" fill="${hi}"/>`;
    })();
    const loop = (() => {
      const [px, py] = polar(64, 0);
      const c1 = curl(px - 7, py + 2, 6, 1.2, Math.PI * 0.75);
      const c2 = c1.map(([x, y]) => [2 * CX - x, y]);
      return `<path d="${line(c1)}" fill="none" stroke="${gold}" stroke-width="1.5" stroke-linecap="round"/><path d="${line(c2)}" fill="none" stroke="${gold}" stroke-width="1.5" stroke-linecap="round"/>`;
    })();
    return {
      defs: tile('p', 26, 26, `<circle cx="13" cy="13" r="1.1" fill="${gold}" fill-opacity=".3"/>`),
      body: `<rect width="${W}" height="${H}" fill="url(#p)"/>
        ${twice(corner + `<g transform="translate(${W} 0) scale(-1 1)">${corner}</g>`)}
        <rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="3" fill="none" stroke="${gold}" stroke-opacity=".4" stroke-width="1"/>`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="76" fill="${g1}"/>
        <circle cx="${CX}" cy="${CY}" r="76" fill="none" stroke="${gold}" stroke-width="1.2" stroke-opacity=".7"/>
        ${around(12, `<path d="M${CX} ${CY - 20}C${CX + 13} ${CY - 34} ${CX + 11} ${CY - 50} ${CX} ${CY - 60}C${CX - 11} ${CY - 50} ${CX - 13} ${CY - 34} ${CX} ${CY - 20}Z" fill="none" stroke="${gold}" stroke-width="1.8"/>`)}
        ${around(12, `<path d="M${CX} ${CY - 30}C${CX + 6} ${CY - 38} ${CX + 5} ${CY - 46} ${CX} ${CY - 50}C${CX - 5} ${CY - 46} ${CX - 6} ${CY - 38} ${CX} ${CY - 30}Z" fill="${hi}" fill-opacity=".85"/>`, 15)}
        ${around(12, loop, 15)}
        ${around(24, `<circle cx="${CX}" cy="${CY - 71}" r="1.6" fill="${hi}"/>`)}
        <circle cx="${CX}" cy="${CY}" r="20" fill="none" stroke="${gold}" stroke-width="2.2"/>
        <circle cx="${CX}" cy="${CY}" r="13" fill="none" stroke="${hi}" stroke-width="1"/>
        <circle cx="${CX}" cy="${CY}" r="7" fill="${gold}"/>`,
    };
  },

  raggi: ([g0, g1, gold, white]) => {
    const pts = [];
    for (let i = 0; i < 32; i++) {
      const a = i * 11.25;
      pts.push(polar(i % 4 === 0 ? 76 : i % 2 === 0 ? 62 : 44, a));
    }
    return {
      defs: `${halo('glow', gold, 0.5, 0.3)}`,
      body: `<circle cx="${CX}" cy="${CY}" r="260" fill="url(#glow)"/>
        ${around(24, `<path d="M${pt(polar(80, -3.2))}L${pt(polar(420, -1.2))}L${pt(polar(420, 1.2))}L${pt(polar(80, 3.2))}Z" fill="${gold}" fill-opacity=".14"/>`)}
        ${around(24, `<path d="M${CX} ${CY - 90}L${CX} ${CY - 420}" stroke="${gold}" stroke-opacity=".38" stroke-width="1.3"/>`, 7.5)}`,
      medal: `
        <path d="${poly(pts)}" fill="${gold}"/>
        <path d="${poly(pts)}" fill="none" stroke="${white}" stroke-width="1" stroke-opacity=".6"/>
        <circle cx="${CX}" cy="${CY}" r="36" fill="${g1}"/>
        <circle cx="${CX}" cy="${CY}" r="36" fill="none" stroke="${white}" stroke-width="2"/>
        <circle cx="${CX}" cy="${CY}" r="30" fill="none" stroke="${gold}" stroke-width="1.2"/>
        <path d="${star(CX, CY, 25, 0.42, 8, -90)}" fill="${white}"/>
        <circle cx="${CX}" cy="${CY}" r="6" fill="${gold}"/>`,
    };
  },

  origine: ([g0, g1, gold, white]) => {
    const radii = [16, 26, 40, 60, 88, 128, 184, 260];
    return {
      defs: `${blur('b6', 6)}${halo('glow', gold, 0.55, 0.25)}${halo('core', white, 1, 0.3)}`,
      body: `<circle cx="${CX}" cy="${CY}" r="240" fill="url(#glow)"/>
        ${radii.map((r, i) => `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${gold}" stroke-opacity="${f(0.85 - i * 0.1)}" stroke-width="${f(1.8 - i * 0.12)}"/>`).join('')}
        ${starField(113, 30, { keep: 130, c: gold, hi: white, big: 0, size: 0.7 })}`,
      medal: `
        <circle cx="${CX}" cy="${CY}" r="40" fill="url(#core)"/>
        <path d="${star(CX, CY, 92, 0.05, 4, -90)}" fill="${white}" fill-opacity=".9"/>
        <path d="${star(CX, CY, 40, 0.1, 4, -45)}" fill="${gold}" fill-opacity=".9"/>
        <circle cx="${CX}" cy="${CY}" r="11" fill="${white}" filter="url(#b6)"/>
        <circle cx="${CX}" cy="${CY}" r="6" fill="${white}"/>`,
    };
  },
};
Object.assign(motifs, newMotifs);

/* Varianti: due dorsi con lo stesso motivo e colori vicini devono restare distinguibili. */
const baseRighe = motifs.righe;
motifs.righe = (colors, variant) => {
  const m = baseRighe(colors);
  if (variant !== 'larghe') return m;
  const [, , c] = colors;
  return { ...m, defs: tile('p', 28, 28, `<rect x="0" y="0" width="14" height="28" fill="${c}" fill-opacity=".16"/><rect x="6.5" y="0" width="1" height="28" fill="${c}" fill-opacity=".22"/>`) };
};
const baseStelle = motifs.stelle;
motifs.stelle = (colors, variant) => {
  if (variant !== 'polvere') return baseStelle(colors);
  const [, g1, c, hi] = colors;
  const r = rng(19);
  let dust = '';
  for (let i = 0; i < 260; i++) {
    const x = 14 + r() * (W - 28);
    const y = 14 + r() * (CY - 14);
    // Più fitta lungo una fascia diagonale.
    const band = Math.abs(y - (60 + x * 0.55));
    if (band > 60 && r() < 0.7) continue;
    if (Math.hypot(x - CX, y - CY) < 88) continue;
    dust += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + r() * r() * 1.8)}" fill="${c}" fill-opacity="${f(0.35 + r() * 0.6)}"/>`;
  }
  const r2 = rng(29);
  const ring = Array.from({ length: 70 }, () => {
    const a = r2() * 360;
    const [x, y] = polar(50 + (r2() - 0.5) * 8, a);
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + r2() * 1.4)}" fill="${c}" fill-opacity="${f(0.5 + r2() * 0.5)}"/>`;
  }).join('');
  return {
    defs: halo('dustG', c, 0.35, 0.4),
    body: `${twice(dust)}${twice(sparkle(70, 120, 6, c) + sparkle(290, 70, 5, hi) + sparkle(250, 190, 4, c))}`,
    medal: `${rings(58, c, hi, g1)}
      <circle cx="${CX}" cy="${CY}" r="56" fill="url(#dustG)"/>
      ${twice(ring)}
      ${sparkle(CX, CY, 46, c)}
      ${sparkle(CX, CY, 22, hi)}
      ${[45, 135, 225, 315].map(a => sparkle(...polar(30, a), 6, hi, 0.9)).join('')}`,
  };
};
const baseCorona = motifs.corona;
motifs.corona = (colors, variant) => {
  const m = baseCorona(colors);
  if (variant !== 'immortali') return m;
  const [, , gold, violet] = colors;
  return {
    defs: `${m.defs}${halo('aura', violet, 0.75, 0.35)}`,
    body: `${m.body}<circle cx="${CX}" cy="${CY}" r="150" fill="url(#aura)"/>
      ${around(24, `<path d="M${CX} ${CY - 100}L${CX} ${CY - 400}" stroke="${violet}" stroke-opacity=".22" stroke-width="1.4"/>`)}
      ${starField(131, 26, { keep: 120, c: violet, hi: gold, big: 0.4 })}`,
    medal: m.medal,
  };
};

/** Il motivo, quando due dorsi lo condividono con colori vicini. */
const VARIANT = { napoli: 'larghe', 'polvere-stellare': 'polvere', 'corona-degli-immortali': 'immortali', 'scudo-leggendario': 'stella' };

/** Quanto si ingrandisce il medaglione: sul tavolo una carta è larga 50-70 punti, il medaglione deve leggersi. */
const MEDAL = {
  tarocco: 1.04,
  vesuvio: 1.06,
  righe: 1.12,
  sole: 1.1,
  giglio: 1.06,
  scudo: 1.08,
  chiave: 1.06,
  rosa: 1.06,
  tessuto: 1,
  greca: 1.22,
  fregio: 1.12,
  cristallo: 1,
  galassia: 1,
  nebulosa: 1,
  'sole-nero': 1.08,
  eclissi: 1.1,
  universo: 1,
  supernova: 1,
  portale: 1,
  guilloche: 1.26,
  filigrana: 1.08,
  raggi: 1.08,
  origine: 1,
  sigillo: 1.08,
};

/** Un dorso dal suo aspetto: colori [fondo, fondo scuro, ornamento, luce dell'ornamento]. */
function cardBack({ colors, motif }, variant) {
  const [g0, g1, c, hi] = colors;
  const m = motifs[motif](colors, variant);
  // Sui fondi chiari la cornice si disegna nel colore forte (per i limoni il verde).
  const light = luma(g0) > 0.6;
  const fc = motif === 'limoni' ? hi : c;
  const fh = motif === 'limoni' ? c : hi;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="inner"><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="12"/></clipPath>
    <radialGradient id="ground" cx="50%" cy="50%" r="62%"><stop offset="0" stop-color="${g0}"/><stop offset=".72" stop-color="${g0}"/><stop offset="1" stop-color="${g1}"/></radialGradient>
    ${m.defs}
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="#FFFFFF"/>
  <g clip-path="url(#inner)">
    <rect width="${W}" height="${H}" fill="url(#ground)"/>
    ${m.body}
    ${frame(fc, fh, { op: light ? 0.85 : 0.9 })}
    <g transform="translate(${CX} ${CY}) scale(${MEDAL[motif] ?? 1.18}) translate(${-CX} ${-CY})">${m.medal}</g>
  </g>
  <rect x="12.5" y="12.5" width="${W - 25}" height="${H - 25}" rx="11.5" fill="none" stroke="#000000" stroke-opacity="${light ? 0.12 : 0.18}" stroke-width="1"/>
</svg>`;
}

/* ------------------------------------------------------------------ generazione */

const READY = [...CATALOG_BACKS, ...NAPOLI_BACKS].filter(b => b.status === 'ready');
const missing = READY.filter(b => !motifs[b.look.motif]);
if (missing.length) throw new Error(`Motivi mancanti: ${missing.map(b => `${b.id} (${b.look.motif})`).join(', ')}`);

const backsDir = join(root, 'assets/backs');
mkdirSync(backsDir, { recursive: true });
const pngs = {};
for (const item of READY) {
  pngs[item.id] = render(cardBack(item.look, VARIANT[item.id]), 720);
  save(pngs[item.id], join(backsDir, `${item.id}.png`));
}
// Via i PNG che non corrispondono più a un dorso pronto.
const keep = new Set(READY.map(b => `${b.id}.png`));
for (const file of readdirSync(backsDir)) {
  if (file.endsWith('.png') && !keep.has(file)) {
    unlinkSync(join(backsDir, file));
    console.log('tolto', `assets/backs/${file}`);
  }
}

// Il registro per l'app: require() vuole percorsi statici.
const registry = `// Generato da scripts/make-art.mjs: non modificare a mano.
// I dorsi pronti di src/meta/catalog.ts (BACKS e NAPOLI_BACKS); 'classico' è in cardImages.ts.
export const BACK_IMAGES: Record<string, number> = {
${READY.map(b => `  '${b.id}': require('../../assets/backs/${b.id}.png'),`).join('\n')}
};
`;
writeFileSync(join(root, 'src/game/backImages.ts'), registry);
console.log('scritto src/game/backImages.ts');

/* ------------------------------------------------------------------ fogli di prova */
// .backs/foglio.png: tutti i dorsi alla misura del tavolo (50 punti a 2x, cioè 100 px) con il nome sotto.
// .backs/foglio-grande.png: otto dorsi grandi. Si guardano per controllare che siano belli e distinguibili.
const font = join(root, 'node_modules/@expo-google-fonts/sora/600SemiBold/Sora_600SemiBold.ttf');
const sheetRender = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false, fontFiles: [font], defaultFontFamily: 'Sora' } }).render().asPng();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const nameLines = s => {
  if (s.length <= 15) return [s];
  const words = s.split(' ');
  let best = [s];
  let bestD = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const d = Math.abs(a.length - b.length);
    if (d < bestD) [best, bestD] = [[a, b], d];
  }
  return best;
};
const uri = png => 'data:image/png;base64,' + png.toString('base64');
const classicPng = render(back, 720);
const all = [{ id: STARTER_BACK.id, name: STARTER_BACK.name, png: classicPng }, ...READY.map(b => ({ id: b.id, name: b.name, png: pngs[b.id] }))];

function sheet(items, cw, cols, fontSize) {
  const ch = Math.round((cw * H) / W);
  const cellW = cw + 52;
  const cellH = ch + fontSize * 3 + 14;
  const rows = Math.ceil(items.length / cols);
  const SW = cols * cellW + 40;
  const SH = rows * cellH + 40;
  const cells = items
    .map((it, i) => {
      const x = 20 + (i % cols) * cellW + (cellW - cw) / 2;
      const y = 20 + Math.floor(i / cols) * cellH;
      const lines = nameLines(it.name)
        .map((l, k) => `<text x="${x + cw / 2}" y="${y + ch + 8 + fontSize * (k + 1)}" font-size="${fontSize}" font-family="Sora" font-weight="600" fill="#FFFFFF" text-anchor="middle">${esc(l)}</text>`)
        .join('');
      return `<rect x="${x}" y="${y + 2}" width="${cw}" height="${ch}" rx="${f(cw * 0.056)}" fill="#000000" fill-opacity=".28"/>
        <image href="${uri(it.png)}" x="${x}" y="${y}" width="${cw}" height="${ch}"/>${lines}`;
    })
    .join('');
  return sheetRender(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">
      <defs><radialGradient id="felt" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#14806A"/><stop offset="1" stop-color="#06352E"/></radialGradient></defs>
      <rect width="${SW}" height="${SH}" fill="url(#felt)"/>${cells}</svg>`,
    SW,
  );
}
const sheets = join(root, '.backs');
mkdirSync(sheets, { recursive: true });
save(sheet(all, 100, 9, 15), join(sheets, 'foglio.png'));
const BIG = ['oro-classico', 'tricolore', 'giglio-fiorentino', 'sardegna', 'galassia', 'eclissi', 'universo-infinito', 'il-destino'];
save(sheet(BIG.map(id => all.find(b => b.id === id)), 280, 4, 26), join(sheets, 'foglio-grande.png'));
