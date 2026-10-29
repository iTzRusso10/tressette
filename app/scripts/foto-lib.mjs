// Aiuto comune per le foto dei pacchetti di «Lampara» (docs/direzione-artistica.md §6, §7 B0).
//
// Si importa dagli script dei pacchetti (scripts/foto-arena.mjs, foto-profilo.mjs, foto-camerino.mjs,
// foto-missioni.mjs), dopo `npm run export:web`:
//
//   import { apri, SCHERMI, profiloProva, fotografa, controllaFissi, controllaFermo, chiudi } from './foto-lib.mjs';
//   const sessione = await apri();                       // server di dist/ + Chromium
//   for (const sc of SCHERMI) {
//     const pagina = await sessione.pagina(sc, { profilo: profiloProva() });
//     await pagina.goto(sessione.base + '/missioni');
//     await fotografa(pagina, 'missioni', sc);           // .visual/<cartella>/missioni-telefono.png
//     await controllaFissi(pagina, sessione.problemi, sc.id);   // [data-testid^="fisso-"] fermi tra 0,5 s e 3 s
//   }
//   await controllaFermo(sessione, '/missioni', SCHERMI[0]); // riduci movimento: stesso fotogramma a 1 s e 4 s
//   await chiudi(sessione);                              // esce con 1 se ci sono problemi
//
// Export:
// - `SCHERMI`               i tre schermi: telefono 393×852, piccolo 375×667, desktop 1280×800 (DPR 2)
// - `apri({ cartella? })`   avvia il server di dist/ e Chromium; restituisce { base, cartella, browser, problemi,
//                           pagina(schermo, { profilo?, riduci?, impostazioni? }) }. La pagina raccoglie gli errori
//                           della console in `problemi`.
// - `profiloProva(extra?)`  il profilo di prova di check:hub (arena 12, 1260 trofei, cose comprate, ricompense da
//                           riscuotere), con `extra` fuso dentro `state` (es. { meta: { claims: [...] } })
// - `impostazioniProva`     impostazioni senza suoni e con il nome «Giuseppe»
// - `fotografa(pagina, nome, schermo, { pieno? })`  salva <cartella>/<nome>-<schermo>.png
// - `scorri(pagina, dy)`    scorre la pagina (rotella) e aspetta che si fermi
// - `posizioniFisse(pagina)`  { testid: "x,y,wxh" } di tutti i [data-testid^="fisso-"]
// - `controllaFissi(pagina, problemi, etichetta)`  confronta le posizioni a 0,5 s e a 3 s dall'apertura
// - `controllaFermo(sessione, url, schermo, nome?, { vedi? })`  apre `url` con reducedMotion 'reduce' (porta in
//                           vista l'elemento con testID `vedi`), foto a 1 s e a 4 s, confronta i pixel: devono essere
//                           identici (le animazioni ambientali non partono)
// - `uguali(pngA, pngB)`    confronto byte per byte di due PNG (Buffer)
// - `chiudi(sessione)`      chiude tutto, stampa i problemi, imposta il codice d'uscita
//
// Usato da solo fa due cose:
//   node scripts/foto-lib.mjs arte    foto di /dev/arte sui tre schermi (in alto e scorsa) + controllo con riduci
//                                     movimento, in .visual/arte/
//   node scripts/foto-lib.mjs audit   le foto dell'audit della Fase A (svelamento, dev/arene, dev/panni,
//                                     dev/sociale) in .visual/audit/
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

export const SCHERMI = [
  { id: 'telefono', width: 393, height: 852, touch: true },
  { id: 'piccolo', width: 375, height: 667, touch: true },
  { id: 'desktop', width: 1280, height: 800, touch: false },
];

const TIPI = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const oggi = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const impostazioniProva = { state: { fast: true, sound: false, haptics: false, level: 'medio', name: 'Giuseppe' }, version: 0 };

/** Il profilo di check:hub: un giocatore a metà strada, niente feste all'apertura. */
export function profiloProva(extra = {}) {
  const base = {
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
    bonus: { lastDay: oggi(), streak: 3 },
    achievements: { 'prima-vittoria': 1, 'prima-scopa': 2 },
  };
  const fondi = (a, b) => {
    const o = { ...a };
    for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? fondi(a[k], v) : v;
    return o;
  };
  return { state: fondi(base, extra), version: 2 };
}

export async function apri({ cartella = join(root, '.visual') } = {}) {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('manca dist/: prima npm run export:web');
  mkdirSync(cartella, { recursive: true });
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/tressette/, '');
    let file = join(dist, path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    res.writeHead(200, { 'content-type': TIPI[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/tressette`;
  const browser = await chromium.launch();
  const problemi = [];
  const contesti = [];
  const sessione = {
    base,
    cartella,
    browser,
    problemi,
    server,
    async pagina(sc, { profilo = null, riduci = false, impostazioni = impostazioniProva } = {}) {
      const ctx = await browser.newContext({ viewport: { width: sc.width, height: sc.height }, deviceScaleFactor: 2, hasTouch: sc.touch, reducedMotion: riduci ? 'reduce' : 'no-preference' });
      contesti.push(ctx);
      await ctx.addInitScript(
        ([s, p]) => {
          localStorage.setItem('napoletane.impostazioni.v1', s);
          if (p) localStorage.setItem('napoletane.profilo.v1', p);
        },
        [JSON.stringify(impostazioni), profilo ? JSON.stringify(profilo) : null],
      );
      const page = await ctx.newPage();
      cartelle.set(page, cartella);
      page.on('pageerror', e => problemi.push(`${sc.id}: ${e.message}`));
      page.on('console', m => m.type() === 'error' && problemi.push(`${sc.id}: ${m.text()}`));
      return page;
    },
    async chiudiContesti() {
      for (const c of contesti.splice(0)) await c.close().catch(() => {});
    },
  };
  return sessione;
}

// La cartella delle foto di ogni pagina aperta con sessione.pagina().
const cartelle = new WeakMap();

export async function fotografa(page, nome, sc, { pieno = false, cartella } = {}) {
  const file = join(cartella ?? cartelle.get(page) ?? join(root, '.visual'), `${nome}-${sc.id}.png`);
  await page.screenshot({ path: file, fullPage: pieno });
  return file;
}

export async function scorri(page, dy) {
  const v = page.viewportSize();
  await page.mouse.move(v.width / 2, v.height / 2);
  await page.mouse.wheel(0, dy);
  await page.waitForTimeout(700);
}

export async function posizioniFisse(page) {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-testid^="fisso-"]')].map(el => {
        const r = el.getBoundingClientRect();
        return [el.getAttribute('data-testid'), `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`];
      }),
    ),
  );
}

/** Le posizioni dei `fisso-` a 0,5 s e a 3 s dall'apertura (la pagina deve essere appena caricata). */
export async function controllaFissi(page, problemi, etichetta) {
  // L'apertura vera è quando la schermata c'è (font e bundle caricati): da lì 0,5 s e 3 s.
  await page.waitForSelector('[data-testid^="fisso-"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  const a = await posizioniFisse(page);
  await page.waitForTimeout(2500);
  const b = await posizioniFisse(page);
  if (!Object.keys(a).length) problemi.push(`${etichetta}: nessun elemento fisso- trovato`);
  for (const k of Object.keys(b)) if (a[k] !== b[k]) problemi.push(`${etichetta}: ${k} si è spostato (${a[k]} → ${b[k]})`);
  return b;
}

export function uguali(a, b) {
  return a.length === b.length && a.equals(b);
}

/** Con riduci movimento le animazioni ambientali non partono: lo stesso fotogramma a 1 s e a 4 s. */
export async function controllaFermo(sessione, url, sc, nome = 'fermo', { vedi } = {}) {
  const page = await sessione.pagina(sc, { profilo: profiloProva(), riduci: true });
  await page.goto(sessione.base + url);
  // `vedi`: il testID di un elemento da portare in vista prima delle foto (dove stanno le animazioni).
  if (vedi) await page.getByTestId(vedi).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const a = await page.screenshot();
  await page.waitForTimeout(3000);
  const b = await page.screenshot();
  const ok = uguali(a, b);
  if (!ok) sessione.problemi.push(`${nome} ${sc.id}: con riduci movimento qualcosa si muove (fotogrammi a 1 s e 4 s diversi)`);
  await page.screenshot({ path: join(sessione.cartella, `${nome}-${sc.id}-riduci.png`) });
  await page.context().close();
  return ok;
}

export async function chiudi(sessione) {
  await sessione.chiudiContesti();
  await sessione.browser.close();
  sessione.server.close();
  if (sessione.problemi.length) {
    console.log('PROBLEMI:\n' + sessione.problemi.map(p => '- ' + p).join('\n'));
    process.exitCode = 1;
  } else console.log('ok');
}

/* ------------------------------------------------------------------ uso diretto */

async function fotoArte() {
  const s = await apri({ cartella: join(root, '.visual/arte') });
  for (const sc of SCHERMI) {
    const page = await s.pagina(sc, { profilo: profiloProva() });
    await page.goto(`${s.base}/dev/arte?movimento=0`);
    await controllaFissi(page, s.problemi, `dev/arte ${sc.id}`);
    await fotografa(page, 'arte', sc);
    const passi = sc.id === 'desktop' ? [700, 700, 700, 700] : [760, 760, 760, 760, 760, 760, 760];
    let i = 1;
    for (const dy of passi) {
      await scorri(page, dy);
      await fotografa(page, `arte-${i++}`, sc);
    }
    // La teca, aperta e arrivata in fondo alla sua entrata.
    await page.getByRole('button', { name: /Apri la teca/ }).click();
    await page.waitForTimeout(2200);
    await fotografa(page, 'arte-teca', sc);
  }
  // Vivo: la stessa pagina con le animazioni, a 1 s e a 4 s (devono essere diverse: qualcosa respira).
  const vivo = await s.pagina(SCHERMI[0], { profilo: profiloProva() });
  await vivo.goto(`${s.base}/dev/arte`);
  await vivo.getByTestId('fisso-contatore').scrollIntoViewIfNeeded();
  await vivo.waitForTimeout(1000);
  const a = await vivo.screenshot();
  await vivo.waitForTimeout(3000);
  const b = await vivo.screenshot();
  if (uguali(a, b)) s.problemi.push('dev/arte: senza riduci movimento non si muove niente (riflessi e respiro fermi?)');
  // Con riduci movimento: niente parte.
  for (const sc of SCHERMI) await controllaFermo(s, '/dev/arte', sc, 'arte', { vedi: 'fisso-contatore' });
  await chiudi(s);
}

async function fotoAudit() {
  // Le foto guardate per l'audit della Fase A (prima /tmp/…/audit-shots.mjs).
  const s = await apri({ cartella: join(root, '.visual/audit') });
  const prof = (cups, arena, paid) =>
    profiloProva({ coins: 5400, cups, bestCups: cups, owned: ['frame:semplice', 'frame:alloro'], meta: { arena, paid: { level: 100, prestige: 0, legend: 0, arena: paid }, claims: [] }, achievements: {} });
  const scatto = async (nome, url, sc, profilo, attesa = 2500, scorrimenti = []) => {
    const page = await s.pagina(sc, { profilo });
    await page.goto(s.base + url);
    await page.waitForTimeout(attesa);
    await page.screenshot({ path: join(s.cartella, nome + '.png') });
    let i = 1;
    for (const dy of scorrimenti) {
      await scorri(page, dy);
      await page.screenshot({ path: join(s.cartella, `${nome}-${i++}.png`) });
    }
    await page.context().close();
  };
  const [tel, , desk] = SCHERMI;
  await scatto('svelamento-telefono', '/', tel, prof(1300, 12, 12), 1600);
  await scatto('svelamento-telefono-fine', '/', tel, prof(1300, 12, 12), 3500);
  await scatto('svelamento-cap5-telefono', '/', tel, prof(2500, 24, 24), 3500);
  await scatto('svelamento-desktop', '/', desk, prof(1300, 12, 12), 3500);
  for (const c of [1, 2, 3, 4, 5]) await scatto(`dev-arene-cap${c}`, `/dev/arene?capitolo=${c}`, desk, null, 2500, [700, 700]);
  await scatto('dev-panni', '/dev/panni', desk, null, 2500, [800, 800, 800]);
  await scatto('dev-sociale', '/dev/sociale', tel, null, 2500, [800, 800]);
  await chiudi(s);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cmd = process.argv[2];
  if (cmd === 'arte') await fotoArte();
  else if (cmd === 'audit') await fotoAudit();
  else {
    console.log('uso: node scripts/foto-lib.mjs arte | audit   (dopo npm run export:web)');
    process.exitCode = 1;
  }
}
