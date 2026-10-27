// Photos of the five sections (Negozio, Amici, Gioca, Classifica, Trofei) on three screens, from the web export.
// Usage: npm run export:web && node scripts/hub-check.mjs [outDir] [screen filter]
// The profile is set to a player in the middle of the road (arena 3, a few things bought), so every
// part of the sections shows. It also opens the game chooser and an item of the shop.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = process.argv[2] || join(root, '.visual');
const screenFilter = process.argv[3] || '';
mkdirSync(out, { recursive: true });

const SCREENS = [
  { id: 'telefono', width: 393, height: 852, touch: true },
  { id: 'piccolo', width: 375, height: 667, touch: true },
  { id: 'desktop', width: 1280, height: 800, touch: false },
].filter(s => s.id.includes(screenFilter));

const TABS = ['gioca', 'negozio', 'amici', 'classifica', 'trofei'];

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/tressette/, '');
  let file = join(dist, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}/tressette`;

const settings = JSON.stringify({ state: { fast: true, sound: false, haptics: false, level: 'medio', name: 'Giuseppe' }, version: 0 });
const today = new Date();
const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const profile = JSON.stringify({
  state: {
    coins: 5400,
    xp: 820,
    cups: 21,
    bestCups: 21,
    owned: ['smeraldo', 'nessuno', 'classico', 'mercato', 'mergellina', 'rosone', 'limoni'],
    equipped: { felt: 'mergellina', pattern: 'rosone', back: 'limoni' },
    // The daily bonus already taken, so it doesn't cover the photos.
    bonus: { lastDay: day, streak: 3 },
    trophies: { 'prima-vittoria': 1, 'prima-scopa': 2 },
  },
  version: 0,
});

const browser = await chromium.launch();
const problems = [];
for (const sc of SCREENS) {
  const ctx = await browser.newContext({ viewport: { width: sc.width, height: sc.height }, deviceScaleFactor: 2, hasTouch: sc.touch });
  await ctx.addInitScript(
    ([s, p]) => {
      localStorage.setItem('napoletane.impostazioni.v1', s);
      localStorage.setItem('napoletane.profilo.v1', p);
    },
    [settings, profile],
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${base}/`);
  await page.waitForTimeout(2500);
  for (const tab of TABS) {
    await page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(out, `hub-${sc.id}-${tab}.png`) });
    if (tab === 'gioca') {
      await page.getByRole('button', { name: /^Gioca: scegli/ }).click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(out, `hub-${sc.id}-gioca-scelta.png`) });
      await page.getByLabel('Chiudi').first().click({ position: { x: 20, y: 24 } });
      await page.waitForTimeout(500);
    }
    if (tab === 'negozio') {
      await page.getByRole('button', { name: /Offerta del giorno/ }).click().catch(() => problems.push(`${sc.id}: nessuna offerta del giorno`));
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(out, `hub-${sc.id}-negozio-oggetto.png`) });
      await page.getByLabel('Chiudi').first().click({ position: { x: 20, y: 24 } }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  if (errors.length) problems.push(`${sc.id}: errori\n  ${errors.slice(0, 6).join('\n  ')}`);
  console.log('fatto', sc.id);
  await ctx.close();
}
await browser.close();
server.close();
if (problems.length) {
  console.log('\nProblemi:\n' + problems.join('\n'));
  process.exitCode = 1;
} else console.log('\nTutto a posto: nessun errore.');
