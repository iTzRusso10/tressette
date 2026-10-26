// End-to-end check of online play between two tabs, without a server (?local).
// Usage: npm run export:web && node scripts/online-check.mjs [outDir] [game] [mode]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = process.argv[2] || join(root, '.visual');
const game = process.argv[3] || 'scopa';
const mode = process.argv[4] || 'In due';
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/tressette/, '');
  let file = join(dist, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}/tressette`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
await ctx.addInitScript(() => {
  if (!localStorage.getItem('napoletane.impostazioni.v1'))
    localStorage.setItem('napoletane.impostazioni.v1', JSON.stringify({ state: { fast: true, sound: false, haptics: false, name: 'Giuseppe', level: 'facile' }, version: 0 }));
});
const errors = [];
const watch = (p, who) => {
  p.on('pageerror', e => errors.push(`${who}: ${e.message}`));
  p.on('console', m => m.type() === 'error' && errors.push(`${who}: ${m.text()}`));
};
const fail = msg => {
  console.log('PROBLEMA: ' + msg);
  process.exitCode = 1;
};

const host = await ctx.newPage();
watch(host, 'host');
await host.goto(`${base}/online?local&auto`);
await host.getByRole('button', { name: new RegExp('^' + game, 'i') }).click();
await host.getByRole('radio', { name: mode }).first().click();
await host.getByRole('button', { name: /Crea la stanza/ }).click();
const codeEl = host.getByLabel(/^Codice \d/);
await codeEl.waitFor();
const code = (await codeEl.getAttribute('aria-label')).replace(/\D/g, '');
console.log('stanza', code);

const guest = await ctx.newPage();
watch(guest, 'ospite');
await guest.goto(`${base}/online?local&auto`);
await guest.getByLabel('Il tuo nome').fill('Carmine');
await guest.getByLabel('Codice della stanza').fill(code);
await guest.getByRole('button', { name: 'Entra' }).click();
await guest.getByText(/Aspetta che Giuseppe inizi/).waitFor({ timeout: 10000 }).catch(() => fail("l'ospite non vede la sala d'attesa"));
await host.getByText('Carmine').first().waitFor({ timeout: 10000 }).catch(() => fail("l'host non vede l'ospite"));
await host.screenshot({ path: join(out, 'online-1-stanza-host.png') });
await guest.screenshot({ path: join(out, 'online-1-stanza-ospite.png') });

await host.getByRole('button', { name: 'Inizia la partita' }).click();
await guest.waitForURL(/tavolo/, { timeout: 10000 }).catch(() => fail("l'ospite non arriva al tavolo"));
await host.waitForTimeout(6000);
await host.screenshot({ path: join(out, 'online-2-tavolo-host.png') });
await guest.screenshot({ path: join(out, 'online-2-tavolo-ospite.png') });

const next = host.getByRole('button', { name: /Prossima mano|Rivincita/ });
await next.waitFor({ timeout: 180000 }).catch(() => fail('la mano online non finisce'));
await guest.getByText(/Aspetta che Giuseppe/).waitFor({ timeout: 20000 }).catch(() => fail("l'ospite non vede la fine della mano"));
await host.waitForTimeout(800);
await host.screenshot({ path: join(out, 'online-3-fine-host.png') });
await guest.screenshot({ path: join(out, 'online-3-fine-ospite.png') });

// The same score on both screens.
const score = p => p.evaluate(() => [...document.querySelectorAll('[data-testid=fixed-topbar]')].map(e => e.textContent).join(''));
// Everyone sees themselves as "Tu": name the scores before comparing them.
const named = (txt, self) => Object.fromEntries([...txt.matchAll(/([^\d/]+?)(\d+)\/\d+/g)].map(([, n, v]) => [n === 'Tu' ? self : n, v]));
const [a, b] = [named(await score(host), 'Giuseppe'), named(await score(guest), 'Carmine')];
if (JSON.stringify(a, Object.keys(a).sort()) !== JSON.stringify(b, Object.keys(a).sort())) fail(`punteggi diversi: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);

// Next hand, then the friend drops out: after a while the computer plays for them.
if ((await next.textContent()).includes('Prossima')) {
  await next.click();
  await guest.waitForTimeout(4000);
  await guest.close();
  await host
    .getByText(/non è in linea/)
    .waitFor({ timeout: 40000 })
    .catch(() => fail("l'host non si accorge che l'ospite è uscito"));
  await host.screenshot({ path: join(out, 'online-4-ospite-uscito.png') });
}

await browser.close();
server.close();
if (errors.length) fail('errori:\n  ' + errors.slice(0, 8).join('\n  '));
if (!process.exitCode) console.log('Online a posto: stanza, partita, fine mano e uscita di un amico.');
