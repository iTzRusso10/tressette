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
    xp: 9000,
    cups: 1260,
    bestCups: 1290,
    stats: { played: 140, won: 82, byGame: { tressette: { played: 50, won: 30, expert: 6 }, briscola: { played: 45, won: 26, expert: 4 }, scopa: { played: 45, won: 26, expert: 5 } }, scope: 61, settebelli: 30, bestStreak: 7, expertWins: 15, hands: 520, days: 21 },
    owned: [
      'table:legno-di-casa',
      'table:tavolo-del-circolo',
      'table:marmo-di-carrara',
      'felt:rosso-da-circolo',
      'felt:maiolica-mediterranea',
      'felt:venezia-al-tramonto',
      'back:rosso-tradizionale',
      'back:oro-classico',
      'back:corona-reale',
      'frame:semplice',
      'frame:oro-sottile',
      'frame:alloro',
      'frame:lega-grana',
    ],
    equipped: { table: 'tavolo-del-circolo', felt: 'maiolica-mediterranea', back: 'oro-classico', frame: 'alloro' },
    meta: {
      // Arena e ricompense già pagate, come per un giocatore vero: niente feste all'apertura.
      arena: 12,
      paid: { level: 100, prestige: 0, legend: 0, arena: 12 },
      avatar: 'sole',
      ratings: { tressette: { r: 1182, n: 24, peak: 1210 }, briscola: { r: 1064, n: 12, peak: 1090 }, scopa: { r: 1010, n: 4, peak: 1020 } },
      ratingSeason: null,
      leagueHistory: [{ season: 'preseason', game: 'tressette', r: 980, peak: 1010, league: 'grana', n: 30 }],
      claims: [
        { id: 'm:prova-1', why: 'Vinci 3 partite', coins: 60 },
        { id: 'lega:prova:tressette', why: 'Fine stagione: Lega della Grana a Tressette', coins: 200, items: ['frame:lega-grana'] },
      ],
    },
    // The daily bonus already taken, so it doesn't cover the photos.
    bonus: { lastDay: day, streak: 3 },
    achievements: { 'prima-vittoria': 1, 'prima-scopa': 2 },
  },
  version: 2,
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
    if (tab === 'trofei') {
      for (const sub of ['Achievement', 'Titoli']) {
        await page.getByRole('radio', { name: sub, exact: true }).first().click();
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(out, `hub-${sc.id}-trofei-${sub.toLowerCase()}.png`) });
        if (sub === 'Achievement') {
          await page.getByRole('radio', { name: 'Segreti', exact: true }).first().click();
          await page.waitForTimeout(700);
          await page.screenshot({ path: join(out, `hub-${sc.id}-trofei-segreti.png`) });
        }
      }
      await page.getByRole('radio', { name: 'Arene' }).first().click();
    }
    if (tab === 'classifica') {
      for (const sub of ['Settimana', 'Trofei']) {
        await page.getByRole('radio', { name: sub, exact: true }).first().click();
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(out, `hub-${sc.id}-classifica-${sub.toLowerCase()}.png`) });
      }
      await page.getByRole('radio', { name: 'Stagione', exact: true }).first().click();
      await page.waitForTimeout(600);
      await page.mouse.move(sc.width / 2, sc.height / 2);
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(out, `hub-${sc.id}-classifica-percorso.png`) });
    }
    if (tab === 'gioca') {
      await page.mouse.move(sc.width / 2, sc.height / 2);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(out, `hub-${sc.id}-gioca-sotto.png`) });
      await page.mouse.move(sc.width / 2, sc.height / 2);
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(out, `hub-${sc.id}-gioca-fondo.png`) });
      await page.mouse.move(sc.width / 2, sc.height / 2);
      await page.mouse.wheel(0, -3000);
      await page.waitForTimeout(400);
    }
    if (tab === 'negozio') {
      for (const sub of ['Tavolini', 'Dorsi', 'Cornici', 'Set']) {
        await page.getByRole('radio', { name: sub, exact: true }).first().click();
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(out, `hub-${sc.id}-negozio-${sub.toLowerCase()}.png`) });
      }
      await page.getByRole('radio', { name: 'Panni' }).first().click();
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: /Offerta del giorno/ }).click().catch(() => problems.push(`${sc.id}: nessuna offerta del giorno`));
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(out, `hub-${sc.id}-negozio-oggetto.png`) });
      await page.getByLabel('Chiudi').first().click({ position: { x: 20, y: 24 } }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  // Il profilo e il pannello per personalizzarlo.
  await page.goto(`${base}/profilo`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(out, `hub-${sc.id}-profilo.png`) });
  await page.mouse.move(sc.width / 2, sc.height / 2);
      await page.mouse.wheel(0, 800);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, `hub-${sc.id}-profilo-sotto.png`) });
  await page.mouse.move(sc.width / 2, sc.height / 2);
      await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Cambia avatar e cornice' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(out, `hub-${sc.id}-profilo-avatar.png`) });
  for (const sub of ['Cornice', 'Vetrina']) {
    await page.getByRole('radio', { name: sub, exact: true }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(out, `hub-${sc.id}-profilo-${sub.toLowerCase()}.png`) });
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
