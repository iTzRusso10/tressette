// Photos of the table with every felt (and a few designs), mid-hand, on a phone.
// Usage: npm run export:web && node scripts/felt-shots.mjs [outDir] [mode] [felts…]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = process.argv[2] || join(root, '.felts');
const game = process.argv[3] || 'tressette';
const only = process.argv.slice(4);
mkdirSync(out, { recursive: true });
const FELTS = [
  ['smeraldo', 'nessuno'],
  ['mercato', 'filetto'],
  ['mergellina', 'onde'],
  ['spaccanapoli', 'rosone'],
  ['galleria', 'maiolica'],
  ['gran-caffe', 'stemma'],
  ['posillipo', 'sole'],
  ['capri', 'vesuvio'],
  ['san-carlo', 'corno'],
  ['reggia', 'stemma'],
  ['oliva', 'nessuno'],
  ['arancia', 'sole'],
  ['lavanda', 'nessuno'],
  ['corallo', 'rosone'],
  ['notte', 'nessuno'],
  ['lava', 'vesuvio'],
].filter(([f]) => !only.length || only.includes(f));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/tressette/, '');
  let file = join(dist, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}/tressette`;
const settings = JSON.stringify({ state: { fast: true, sound: false, haptics: false, level: 'facile' }, version: 0 });
const browser = await chromium.launch();
for (const [felt, pattern] of FELTS) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
  const profile = JSON.stringify({ state: { equipped: { felt, pattern, back: 'classico' } }, version: 0 });
  await ctx.addInitScript(
    ([s, p]) => {
      localStorage.setItem('napoletane.impostazioni.v1', s);
      localStorage.setItem('napoletane.profilo.v1', p);
    },
    [settings, profile],
  );
  const page = await ctx.newPage();
  await page.goto(`${base}/gioca/${game}?auto`);
  await page.getByRole('radio', { name: 'In quattro' }).first().click();
  await page.getByRole('button', { name: 'Distribuisci le carte' }).click();
  await page.waitForTimeout(6500);
  await page.screenshot({ path: join(out, `${felt}.png`) });
  console.log('fatto', felt);
  await ctx.close();
}
await browser.close();
server.close();
