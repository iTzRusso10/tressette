// Prova del matchmaking tra schede (?local), senza server: due persone cercano una partita veloce e si
// trovano allo stesso tavolo; una persona da sola, dopo l'attesa, gioca con il computer (?mmcpu=3 accorcia
// i 20 secondi a 3). Foto della ricerca su tre schermi.
// Uso: npm run export:web && node scripts/mm-check.mjs [outDir]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = process.argv[2] || join(root, '.visual');
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/tressette/, '');
  let file = join(dist, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}/tressette`;

const errors = [];
const fail = msg => {
  console.log('PROBLEMA: ' + msg);
  process.exitCode = 1;
};
const browser = await chromium.launch();

async function context(viewport = { width: 393, height: 852 }, name = 'Giuseppe') {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 600 });
  await ctx.addInitScript(n => {
    if (!localStorage.getItem('napoletane.impostazioni.v1'))
      localStorage.setItem('napoletane.impostazioni.v1', JSON.stringify({ state: { fast: true, sound: false, haptics: false, name: n, level: 'facile' }, version: 0 }));
  }, name);
  return ctx;
}
const watch = (p, who) => {
  p.on('pageerror', e => errors.push(`${who}: ${e.message}`));
  p.on('console', m => m.type() === 'error' && errors.push(`${who}: ${m.text()}`));
};
async function search(page, query = '') {
  await page.goto(`${base}/gioca/scopa?queue=quick&local&auto${query}`);
  await page.getByRole('button', { name: /^Cerca avversari/ }).click();
  await page.waitForURL(/cerca/, { timeout: 10000 });
}

// 1. La ricerca, su tre schermi (prima che arrivi qualcuno).
for (const [id, viewport] of [
  ['telefono', { width: 393, height: 852 }],
  ['piccolo', { width: 375, height: 667 }],
  ['desktop', { width: 1280, height: 800 }],
]) {
  const ctx = await context(viewport);
  const p = await ctx.newPage();
  watch(p, id);
  await search(p, '&mmcpu=600');
  await p.getByText('Cerco avversari').waitFor({ timeout: 10000 }).catch(() => fail(`${id}: niente schermata di ricerca`));
  await p.waitForTimeout(2300);
  await p.screenshot({ path: join(out, `mm-${id}-ricerca.png`) });
  await p.getByRole('button', { name: 'Annulla', exact: true }).click();
  await p.waitForTimeout(500);
  if (/cerca/.test(p.url())) fail(`${id}: «Annulla» non esce dalla ricerca`);
  await ctx.close();
}

// 2. Due persone si trovano: una apre il tavolo, l'altra entra, la partita parte da sola.
const ctx = await context();
const a = await ctx.newPage();
watch(a, 'Anna');
const b = await ctx.newPage();
watch(b, 'Bruno');
await search(a, '&mmcpu=600');
await a.waitForTimeout(600);
await search(b, '&mmcpu=600');
await a.getByText('Avversari trovati').waitFor({ timeout: 10000 }).catch(() => fail('Anna non trova Bruno'));
await a.screenshot({ path: join(out, 'mm-trovati.png') });
await a.waitForURL(/tavolo/, { timeout: 30000 }).catch(() => fail('Anna non arriva al tavolo'));
await b.waitForURL(/tavolo/, { timeout: 30000 }).catch(() => fail('Bruno non arriva al tavolo'));
await a.waitForTimeout(5000);
await a.screenshot({ path: join(out, 'mm-tavolo-1.png') });
await b.screenshot({ path: join(out, 'mm-tavolo-2.png') });
// Le due schede vedono lo stesso tavolo (due persone, nessun computer).
const names = p => p.evaluate(() => [...document.querySelectorAll('[data-testid^=fixed-tag-]')].map(e => e.getAttribute('data-testid').slice(10)));
const [na, nb] = [await names(a), await names(b)];
if (na.length !== 2 || nb.length !== 2) fail(`al tavolo: ${JSON.stringify(na)} / ${JSON.stringify(nb)}`);
await ctx.close();

// 3. Da sola, dopo l'attesa: il computer al posto dell'avversario.
const ctx2 = await context();
const c = await ctx2.newPage();
watch(c, 'Carla');
await search(c, '&mmcpu=3');
await c.getByText('Giochi con il computer').waitFor({ timeout: 15000 }).catch(() => fail('dopo l’attesa non arriva il computer'));
await c.screenshot({ path: join(out, 'mm-computer.png') });
await c.waitForURL(/tavolo/, { timeout: 15000 }).catch(() => fail('Carla non arriva al tavolo'));
// La partita finisce da sola (?auto): poi il riepilogo con i trofei e «Nuova partita».
await c.getByRole('button', { name: /Nuova partita|Prossima mano/ }).first().waitFor({ timeout: 240000 }).catch(() => fail('la partita con il computer non arriva a fine mano'));
for (let i = 0; i < 12; i++) {
  const nextHand = c.getByRole('button', { name: /^Prossima mano/ });
  if (await nextHand.count()) {
    await c.waitForTimeout(1200);
    await nextHand.click({ timeout: 5000 }).catch(() => {});
    await c.waitForTimeout(1500);
    await c.getByRole('button', { name: /Nuova partita|Prossima mano/ }).first().waitFor({ timeout: 240000 });
  } else break;
}
await c.waitForTimeout(1200);
await c.screenshot({ path: join(out, 'mm-fine.png') });
if (!(await c.getByText(/trofe/).count())) fail('nel riepilogo non si vedono i trofei');
await ctx2.close();

await browser.close();
server.close();
if (errors.length) fail('errori:\n  ' + errors.slice(0, 8).join('\n  '));
if (!process.exitCode) console.log('Matchmaking a posto: ricerca, due persone allo stesso tavolo, computer dopo l’attesa, trofei a fine partita.');
