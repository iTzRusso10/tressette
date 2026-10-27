// Draws the card back, the app icon and the splash image from code, in the Tramonto palette.
// Run with: node scripts/make-art.mjs
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
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

/* ------------------------------------------------------------------ card backs of the shop */
// One PNG per back in src/meta/shop.ts, at the size of back.png (360x575 drawn at 2x: sharper than the scans).
// Like real playing cards: a thin white edge, a frame, a pattern that repeats or is symmetric about the center
// (a card looks the same upside down) and a medallion in the middle. 'classico' is back.png itself.
const { ITEMS } = await import('../src/meta/shop.ts');

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

/** How much the medallion is enlarged: on the table a card is 50-70 points wide, the medallion must read. */
const MEDAL = { tarocco: 1.04, vesuvio: 1.06, righe: 1.12, sole: 1.1 };

/** One back from its look: colors [ground, darker ground, ornament, ornament highlight]. */
function cardBack({ colors, motif }) {
  const [g0, g1, c, hi] = colors;
  const m = motifs[motif](colors);
  // The limoni and sole grounds are light: their frame is drawn in the strong color.
  const light = motif === 'limoni' || motif === 'sole';
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

for (const item of ITEMS) {
  if (item.slot !== 'back' || item.id === 'classico') continue;
  save(render(cardBack(item.look), 720), join(root, `assets/backs/${item.id}.png`));
}
