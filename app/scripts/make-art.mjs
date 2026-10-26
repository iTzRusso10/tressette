// Draws the card back, the app icon and the splash image from code, in the app's palette.
// Run with: node scripts/make-art.mjs
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(root, 'node_modules/@expo-google-fonts/bodoni-moda');
const fontFiles = [join(fontDir, '700Bold/BodoniModa_700Bold.ttf'), join(fontDir, '600SemiBold_Italic/BodoniModa_600SemiBold_Italic.ttf')];

const C = {
  velluto: '#10291F',
  pannoDeep: '#123D2E',
  panno: '#1D5440',
  ottone: '#C8A15A',
  ottoneChiaro: '#E3C687',
  ottoneScuro: '#8C6A2E',
  marmo: '#F2ECE0',
  pompei: '#B23A2E',
};

function render(svg, width, out) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Bodoni Moda' },
  })
    .render()
    .asPng();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log('scritto', out.replace(root + '/', ''));
}

// A maiolica tile: a quatrefoil in brass with a marble eye, small brass dots at the corners.
const tile = (s) => {
  const h = s / 2;
  const p = s * 0.36;
  return `
  <pattern id="majo" width="${s}" height="${s}" patternUnits="userSpaceOnUse">
    <rect width="${s}" height="${s}" fill="${C.pannoDeep}"/>
    <path d="M${h} ${h - p}Q${h + p * 0.55} ${h - p * 0.55} ${h} ${h}Q${h - p * 0.55} ${h - p * 0.55} ${h} ${h - p}Z
             M${h} ${h + p}Q${h + p * 0.55} ${h + p * 0.55} ${h} ${h}Q${h - p * 0.55} ${h + p * 0.55} ${h} ${h + p}Z
             M${h - p} ${h}Q${h - p * 0.55} ${h - p * 0.55} ${h} ${h}Q${h - p * 0.55} ${h + p * 0.55} ${h - p} ${h}Z
             M${h + p} ${h}Q${h + p * 0.55} ${h - p * 0.55} ${h} ${h}Q${h + p * 0.55} ${h + p * 0.55} ${h + p} ${h}Z"
          fill="${C.ottone}" fill-opacity=".85"/>
    <circle cx="${h}" cy="${h}" r="${s * 0.05}" fill="${C.marmo}"/>
    <circle cx="0" cy="0" r="${s * 0.06}" fill="${C.ottone}" fill-opacity=".55"/>
    <circle cx="${s}" cy="0" r="${s * 0.06}" fill="${C.ottone}" fill-opacity=".55"/>
    <circle cx="0" cy="${s}" r="${s * 0.06}" fill="${C.ottone}" fill-opacity=".55"/>
    <circle cx="${s}" cy="${s}" r="${s * 0.06}" fill="${C.ottone}" fill-opacity=".55"/>
  </pattern>`;
};

// Card back, same proportions and corner as the card fronts (360x575).
const W = 360;
const H = 575;
const R = 20;
const back = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${tile(40)}
    <radialGradient id="light" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#fff" stop-opacity=".10"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </radialGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.ottoneChiaro}"/>
      <stop offset=".5" stop-color="${C.ottone}"/>
      <stop offset="1" stop-color="${C.ottoneScuro}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="${R}" fill="${C.marmo}"/>
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="${R - 8}" fill="url(#majo)"/>
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="${R - 8}" fill="url(#light)"/>
  <rect x="21" y="21" width="${W - 42}" height="${H - 42}" rx="${R - 12}" fill="none" stroke="url(#brass)" stroke-width="3"/>
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="${R - 14}" fill="none" stroke="${C.ottone}" stroke-opacity=".5" stroke-width="1.2"/>
  <g transform="translate(${W / 2} ${H / 2})">
    <ellipse rx="86" ry="112" fill="${C.velluto}"/>
    <ellipse rx="86" ry="112" fill="none" stroke="url(#brass)" stroke-width="4"/>
    <ellipse rx="76" ry="102" fill="none" stroke="${C.ottone}" stroke-opacity=".55" stroke-width="1.2"/>
    <text y="34" text-anchor="middle" font-family="Bodoni Moda" font-style="italic" font-weight="600" font-size="118" fill="url(#brass)">N</text>
  </g>
</svg>`;

// App icon: a fan of three card backs on velvet, no text but the monogram.
const icon = (size, padded) => {
  const k = padded ? 0.92 : 1.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#24664D"/>
      <stop offset=".6" stop-color="${C.panno}"/>
      <stop offset="1" stop-color="${C.velluto}"/>
    </radialGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.ottoneChiaro}"/>
      <stop offset=".5" stop-color="${C.ottone}"/>
      <stop offset="1" stop-color="${C.ottoneScuro}"/>
    </linearGradient>
  </defs>
  ${padded ? '' : `<rect width="1024" height="1024" fill="url(#bg)"/>`}
  <g transform="translate(512 ${padded ? 548 : 566}) scale(${k})">
    ${[-15, 15, 0]
      .map(
        (a, i) => `<g transform="rotate(${a}) translate(0 -40)">
      <rect x="-200" y="-320" width="400" height="640" rx="26" fill="${C.marmo}" stroke="${C.ottoneScuro}" stroke-opacity=".35" stroke-width="3"/>
      <rect x="-184" y="-304" width="368" height="608" rx="18" fill="${i === 2 ? C.velluto : C.pannoDeep}"/>
      <rect x="-172" y="-292" width="344" height="584" rx="14" fill="none" stroke="url(#brass)" stroke-width="5"/>
    </g>`,
      )
      .join('')}
    <g transform="translate(0 -40)">
      <ellipse rx="120" ry="160" fill="none" stroke="url(#brass)" stroke-width="7"/>
      <text y="58" text-anchor="middle" font-family="Bodoni Moda" font-style="italic" font-weight="600" font-size="200" fill="url(#brass)">N</text>
    </g>
  </g>
</svg>`;
};

render(back, 720, join(root, 'assets/cards/back.png'));
render(icon(1024, false), 1024, join(root, 'assets/images/icon.png'));
render(icon(1024, true), 1024, join(root, 'assets/images/adaptive-foreground.png'));
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${C.panno}"/></svg>`,
  1024,
  join(root, 'assets/images/adaptive-background.png'),
);
render(icon(1024, true), 400, join(root, 'assets/images/splash.png'));
render(icon(1024, false), 48, join(root, 'assets/images/favicon.png'));
