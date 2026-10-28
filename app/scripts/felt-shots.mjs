// Foto del tavolo vero a metà mano, in quattro, su un telefono: una per ogni combinazione di tavolino e
// grafica del panno.
//
// Uso: npm run export:web && node scripts/felt-shots.mjs [opzioni] [tavolino:panno …]
//   --out <cartella>    dove salvare le foto (predefinita .felts)
//   --dist <cartella>   l'export web da servire (predefinita dist; anche FELTS_DIST=…)
//   --game <gioco>      tressette, briscola o scopa (predefinito tressette)
//   --table <id>        un tavolino da provare con tutti i panni dati (si può ripetere)
//   --felt <id>         una grafica del panno da provare con tutti i tavolini dati (si può ripetere)
//   tavolino:panno      una combinazione precisa, per esempio corona-del-re:oro-e-nero
// Senza combinazioni né --table/--felt fotografa una selezione di 16 che copre tutti i materiali e una
// ventina di disegni. Con solo --table usa il panno di partenza, con solo --felt la sponda di vetro.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = { out: join(root, '.felts'), dist: process.env.FELTS_DIST ? resolve(process.env.FELTS_DIST) : join(root, 'dist'), game: 'tressette' };
const tables = [];
const felts = [];
const pairs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') opt.out = resolve(args[++i]);
  else if (a === '--dist') opt.dist = resolve(root, args[++i]);
  else if (a === '--game') opt.game = args[++i];
  else if (a === '--table') tables.push(args[++i]);
  else if (a === '--felt') felts.push(args[++i]);
  else if (a.includes(':')) pairs.push(a.split(':'));
  else throw new Error(`Argomento sconosciuto: ${a}`);
}

/** Una selezione che copre tutti i materiali (e le texture) delle sponde e una ventina di disegni. */
const DEFAULT = [
  ['vetro', 'verde-smeraldo'],
  ['legno-di-casa', 'verde-tradizionale'],
  ['ulivo-calabrese', 'limoni-della-costiera'],
  ['tavolo-della-taverna', 'ceramica-siciliana'],
  ['marmo-di-carrara', 'tricolore-italiano'],
  ['granito-nero', 'onice-nero'],
  ['tavolo-veneziano', 'damascato-rosso'],
  ['scacchiera-imperiale', 'mosaico-romano'],
  ['cristallo-blu', 'cristallo-blu'],
  ['notte-stellata', 'costellazioni'],
  ['galassia', 'nebulosa-viola'],
  ['tempesta-d-argento', 'ghiaccio-eterno'],
  ['corona-del-re', 'oro-e-nero'],
  ['crono', 'crono'],
  ['il-multiverso', 'universo-infinito'],
  ['tavolo-degli-immortali', 'il-panno-degli-immortali'],
];

let combos = pairs;
if (!combos.length && (tables.length || felts.length)) {
  const ts = tables.length ? tables : ['vetro'];
  const fs = felts.length ? felts : ['verde-smeraldo'];
  combos = ts.flatMap(t => fs.map(f => [t, f]));
}
if (!combos.length) combos = DEFAULT;

if (!existsSync(join(opt.dist, 'index.html'))) throw new Error(`Manca l'export web in ${opt.dist}: npx expo export -p web --output-dir ${opt.dist}`);
mkdirSync(opt.out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/tressette/, '');
  let file = join(opt.dist, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(opt.dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}/tressette`;
const settings = JSON.stringify({ state: { fast: true, sound: false, haptics: false, level: 'facile' }, version: 0 });
const browser = await chromium.launch();
for (const [table, felt] of combos) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
  // Gli oggetti in uso devono essere anche posseduti, altrimenti il profilo li scarta.
  const owned = [`table:${table}`, `felt:${felt}`, 'back:classico'];
  const profile = JSON.stringify({ state: { owned, equipped: { table, felt, back: 'classico' } }, version: 2 });
  await ctx.addInitScript(
    ([s, p]) => {
      localStorage.setItem('napoletane.impostazioni.v1', s);
      localStorage.setItem('napoletane.profilo.v1', p);
    },
    [settings, profile],
  );
  const page = await ctx.newPage();
  await page.goto(`${base}/gioca/${opt.game}?auto`);
  await page.getByRole('radio', { name: 'In quattro' }).first().click();
  await page.getByRole('button', { name: 'Distribuisci le carte' }).click();
  await page.waitForTimeout(6500);
  const name = `${table}__${felt}.png`;
  await page.screenshot({ path: join(opt.out, name) });
  console.log('fatto', name);
  await ctx.close();
}
await browser.close();
server.close();
