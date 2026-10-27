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
