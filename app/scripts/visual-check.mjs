// Visual check of every mode on three screens, from the web export.
// Usage: npm run export:web && node scripts/visual-check.mjs [outDir] [filter]
// Serves dist/ under /tressette/ (as on GitHub Pages), lets the computer play your cards (?auto)
// and saves screenshots: after the deal, mid-hand and at the end of the hand. It also checks that
// the felt and the name tags never move during a hand.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = process.argv[2] || join(root, '.visual');
const filter = process.argv[3] || '';
mkdirSync(out, { recursive: true });

const MODES = [
  { id: 'tressette-2', game: 'tressette', mode: 'In due' },
  { id: 'tressette-4', game: 'tressette', mode: 'In quattro' },
  { id: 'tressette-perdere', game: 'tressette', mode: 'A perdere' },
  { id: 'tressette-perdere-2', game: 'tressette', mode: 'A perdere', players: 'In due' },
  { id: 'briscola-2', game: 'briscola', mode: 'In due' },
  { id: 'briscola-4', game: 'briscola', mode: 'In quattro' },
  { id: 'scopa-2', game: 'scopa', mode: 'In due' },
  { id: 'scopa-4', game: 'scopa', mode: 'In quattro' },
].filter(m => m.id.includes(filter));

const SCREENS = [
  { id: 'telefono', width: 393, height: 852, touch: true },
  { id: 'piccolo', width: 375, height: 667, touch: true },
  { id: 'desktop', width: 1280, height: 800, touch: false },
];

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => {
  let path = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/tressette/, '');
  let file = join(dist, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const port = server.address().port;
const base = `http://localhost:${port}/tressette`;

// The settings the app reads at start: fast game, no sound.
const settings = JSON.stringify({ state: { fast: true, sound: false, haptics: false, level: 'medio' }, version: 0 });

const browser = await chromium.launch();
const problems = [];
for (const sc of SCREENS) {
  for (const md of MODES) {
    const ctx = await browser.newContext({ viewport: { width: sc.width, height: sc.height }, deviceScaleFactor: 2, hasTouch: sc.touch });
    await ctx.addInitScript(s => localStorage.setItem('napoletane.impostazioni.v1', s), settings);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${base}/gioca/${md.game}?auto`);
    await page.getByRole('radio', { name: md.mode }).first().click();
    if (md.players) await page.getByRole('radiogroup', { name: 'Giocatori' }).getByRole('radio', { name: md.players }).click();
    await page.getByRole('button', { name: 'Distribuisci le carte' }).click();
    const name = `${sc.id}-${md.id}`;
    // Where the fixed parts of the table are: they must not move during the hand.
    const fixed = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-testid^="fixed-"]')].map(el => {
          const r = el.getBoundingClientRect();
          return `${el.getAttribute('data-testid')}:${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`;
        }),
      );
    await page.waitForTimeout(3500);
    await page.screenshot({ path: join(out, `${name}-1-inizio.png`) });
    const before = await fixed();
    await page.waitForTimeout(md.game === 'tressette' ? 9000 : 5000);
    await page.screenshot({ path: join(out, `${name}-2-meta.png`) });
    const during = await fixed();
    const summary = page.getByRole('button', { name: /Prossima mano|Rivincita/ });
    await summary.waitFor({ timeout: 120000 }).catch(() => problems.push(`${name}: la mano non finisce`));
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, `${name}-3-fine.png`) });
    if (before.join('|') !== during.join('|')) problems.push(`${name}: qualcosa si è spostato\n  ${before.join(' ')}\n  ${during.join(' ')}`);
    if (!before.length) problems.push(`${name}: nessun elemento fisso trovato`);
    if (errors.length) problems.push(`${name}: errori\n  ${errors.slice(0, 5).join('\n  ')}`);
    console.log('fatto', name);
    await ctx.close();
  }
}
await browser.close();
server.close();
if (problems.length) {
  console.log('\nProblemi:\n' + problems.join('\n'));
  process.exitCode = 1;
} else console.log('\nTutto a posto: nessun movimento e nessun errore.');
