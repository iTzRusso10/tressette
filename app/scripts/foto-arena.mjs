// Le foto del pacchetto B1 (docs/direzione-artistica.md §7 B1): l'arena del Club dei Signori a tutto schermo,
// lo svelamento di una nuova arena e il confronto pixel per pixel delle altre 29 arene in /dev/arene.
//
// Dopo `npm run export:web`:
//   node scripts/foto-arena.mjs prima   foto di riferimento di ogni arena di /dev/arene (in .visual/arena/prima/)
//   node scripts/foto-arena.mjs scene   solo Esplora, svelamento e trofei (senza il confronto)
//   node scripts/foto-arena.mjs         tutte le foto in .visual/arena/, i controlli e il confronto con «prima»
//                                       (se «prima» manca, il confronto si salta con un avviso)
//
// Controlli (escono con 1 se qualcosa non va):
// - le 29 arene diverse dal Club sono identiche alle foto «prima» (tolleranza per l'antialiasing: un canale può
//   scostarsi di 8 e al massimo lo 0,1% dei pixel di più);
// - /arena/club-dei-signori: gli elementi fisso- non si spostano; con riduci movimento lo stesso fotogramma a 1 s e
//   a 4 s; senza, qualcosa vive (fotogrammi diversi);
// - svelamento (profilo da 1260 a 1300 trofei): «Esplora l'arena» e «Continua» visibili entro 2,5 s; un tocco a
//   0,8 s porta allo stato finale; con riduci movimento lo stato finale arriva entro 300 ms; niente coriandoli.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { apri, chiudi, controllaFissi, fotografa, profiloProva, SCHERMI, scorri, uguali } from './foto-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cartella = join(root, '.visual/arena');
const prima = join(cartella, 'prima');
const dopo = join(cartella, 'dopo');
const CLUB = 'club-dei-signori';

/** Schermi del confronto: telefono (una colonna) e desktop (due colonne). */
const CONFRONTO = [SCHERMI[0], SCHERMI[2]];

async function fotoArene(s, dove) {
  mkdirSync(dove, { recursive: true });
  for (const sc of CONFRONTO) {
    for (const cap of [1, 2, 3, 4, 5]) {
      const page = await s.pagina(sc, { profilo: profiloProva() });
      await page.goto(`${s.base}/dev/arene?capitolo=${cap}`);
      await page.waitForSelector('[data-testid^="arena-"]', { timeout: 20000 });
      await page.waitForTimeout(1200);
      const celle = await page.$$('[data-testid^="arena-"]');
      for (const c of celle) {
        const id = (await c.getAttribute('data-testid')).replace(/^arena-/, '');
        await c.scrollIntoViewIfNeeded();
        await page.waitForTimeout(80);
        await c.screenshot({ path: join(dove, `${id}-${sc.id}.png`) });
      }
      await page.context().close();
    }
  }
}

function diversi(a, b) {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { misura: `${A.width}×${A.height} → ${B.width}×${B.height}` };
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    if (Math.abs(A.data[i] - B.data[i]) > 8 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 8 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 8) n++;
  }
  return { quota: n / (A.width * A.height) };
}

function confronta(s) {
  // In un checkout pulito .visual/ non c'è (non è nel repo): senza le foto «prima» il confronto si salta con un
  // avviso, il resto dei controlli va avanti. Per averle: su un ramo di riferimento `node scripts/foto-arena.mjs prima`.
  if (!existsSync(prima) || !readdirSync(prima).some(f => f.endsWith('.png'))) {
    console.log(`AVVISO: manca ${prima}: salto il confronto delle arene. Per farlo, dal ramo di riferimento (es. funzioni-social) esporta il sito e lancia «node scripts/foto-arena.mjs prima».`);
    return;
  }
  const file = readdirSync(prima).filter(f => f.endsWith('.png'));
  const righe = [];
  let uguali = 0;
  for (const f of file) {
    const club = f.startsWith(CLUB + '-');
    const b = join(dopo, f);
    if (!existsSync(b)) {
      s.problemi.push(`confronto: manca ${f} dopo`);
      continue;
    }
    const d = diversi(readFileSync(join(prima, f)), readFileSync(b));
    const ok = !d.misura && d.quota <= 0.001;
    righe.push(`${f}: ${d.misura ?? (d.quota * 100).toFixed(3) + '% di pixel diversi'}${club ? ' (Club: deve cambiare)' : ''}`);
    if (club) continue;
    if (ok) uguali++;
    else s.problemi.push(`confronto: ${f} è cambiata (${d.misura ?? (d.quota * 100).toFixed(2) + '%'})`);
  }
  writeFileSync(join(cartella, 'confronto.txt'), righe.join('\n') + '\n');
  console.log(`confronto: ${uguali} foto identiche su ${file.filter(f => !f.startsWith(CLUB)).length} (le altre 29 arene, telefono e desktop)`);
}

/** Il profilo dello svelamento: era all'arena 12 (Club, 1260 trofei), ora ne ha 1300 → Sala di Cristallo. */
const profiloSvelamento = () => profiloProva({ cups: 1300, bestCups: 1300, meta: { claims: [] }, achievements: {} });

/** Il profilo dell'«Esplora» del Club: 1260 trofei, già pagata. */
async function fotoClub(s) {
  for (const sc of SCHERMI) {
    const page = await s.pagina(sc, { profilo: profiloProva() });
    await page.goto(`${s.base}/arena/${CLUB}`);
    await controllaFissi(page, s.problemi, `arena ${sc.id}`);
    await fotografa(page, 'club', sc);
    // Lo stesso fotogramma più tardi: qualcosa vive (polvere, fiamma, tenda, lampara).
    const a = await page.screenshot();
    await page.waitForTimeout(2500);
    const b = await page.screenshot();
    if (uguali(a, b)) s.problemi.push(`arena ${sc.id}: niente vive (fotogrammi uguali)`);
    await fotografa(page, 'club-dopo', sc);
    await page.context().close();
    // Riduci movimento: fermo.
    const r = await s.pagina(sc, { profilo: profiloProva(), riduci: true });
    await r.goto(`${s.base}/arena/${CLUB}`);
    await r.waitForSelector('[data-testid^="fisso-"]', { timeout: 20000 });
    await r.waitForTimeout(1000);
    const r1 = await r.screenshot();
    await r.waitForTimeout(3000);
    const r2 = await r.screenshot();
    if (!uguali(r1, r2)) s.problemi.push(`arena ${sc.id}: con riduci movimento qualcosa si muove`);
    await fotografa(r, 'club-riduci', sc);
    await r.context().close();
  }
}

async function fotoSvelamento(s) {
  for (const sc of SCHERMI) {
    // Senza tocchi: i momenti della sequenza e quando arrivano i pulsanti. Il tempo si misura DENTRO la pagina
    // (dalla comparsa dello svelamento all'opacità piena dei pulsanti): i giri di Playwright sotto carico non contano.
    const page = await s.pagina(sc, { profilo: profiloSvelamento() });
    await page.addInitScript(() => {
      const iv = setInterval(() => {
        if (document.querySelector('[data-testid="svelamento"]') && !window.__t0) window.__t0 = performance.now();
        const b = document.querySelector('[data-testid="svelamento-azioni"]');
        if (window.__t0 && b && Number(getComputedStyle(b).opacity) > 0.95) {
          window.__t1 = performance.now();
          clearInterval(iv);
        }
      }, 10);
    });
    await page.goto(`${s.base}/`);
    await page.waitForSelector('[data-testid="svelamento"]', { timeout: 20000 });
    const t0 = Date.now();
    const continua = page.getByRole('button', { name: 'Continua', exact: true });
    const esplora = page.getByRole('button', { name: /Esplora l/ });
    for (const [ms, nome] of [[400, 'svelamento-0400'], [1100, 'svelamento-1100']]) {
      await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
      await fotografa(page, nome, sc);
    }
    await page.waitForFunction(() => window.__t1, null, { timeout: 6000 });
    const pronto = Math.round(await page.evaluate(() => window.__t1 - window.__t0));
    if (pronto > 2500) s.problemi.push(`svelamento ${sc.id}: pulsanti a ${pronto} ms (> 2500)`);
    if (!(await continua.isVisible()) || !(await esplora.isVisible())) s.problemi.push(`svelamento ${sc.id}: mancano i pulsanti`);
    await page.waitForTimeout(800);
    await fotografa(page, 'svelamento-fine', sc);
    console.log(`svelamento ${sc.id}: pulsanti pronti a ~${pronto} ms`);
    // Coriandoli: la vecchia sequenza li lanciava davanti al nome.
    const coriandoli = await page.evaluate(() => document.querySelectorAll('[data-testid="coriandolo"]').length);
    if (coriandoli) s.problemi.push(`svelamento ${sc.id}: ${coriandoli} coriandoli`);
    // «Esplora l'arena» apre la rotta.
    if (sc.id === 'telefono') {
      await esplora.click();
      await page.waitForTimeout(1500);
      if (!page.url().includes('/arena/sala-di-cristallo')) s.problemi.push(`svelamento: Esplora porta a ${page.url()}`);
      await fotografa(page, 'svelamento-esplora', sc);
    }
    await page.context().close();

    // Un tocco a 0,8 s: stato finale.
    const t = await s.pagina(sc, { profilo: profiloSvelamento() });
    await t.goto(`${s.base}/`);
    await t.waitForSelector('[data-testid="svelamento"]', { timeout: 20000 });
    await t.waitForTimeout(800);
    await t.mouse.click(sc.width / 2, sc.height * 0.25);
    await t.waitForTimeout(320);
    const op = await t.evaluate(() => Number(getComputedStyle(document.querySelector('[data-testid="svelamento-azioni"]')).opacity));
    if (op < 0.95) s.problemi.push(`svelamento ${sc.id}: dopo il tocco a 0,8 s i pulsanti non ci sono (opacità ${op})`);
    await fotografa(t, 'svelamento-tocco', sc);
    await t.context().close();

    // Riduci movimento: stato finale entro 300 ms (misurato in pagina, come sopra).
    const r = await s.pagina(sc, { profilo: profiloSvelamento(), riduci: true });
    await r.addInitScript(() => {
      const iv = setInterval(() => {
        if (document.querySelector('[data-testid="svelamento"]') && !window.__t0) window.__t0 = performance.now();
        const b = document.querySelector('[data-testid="svelamento-azioni"]');
        if (window.__t0 && b && Number(getComputedStyle(b).opacity) > 0.95) {
          window.__t1 = performance.now();
          clearInterval(iv);
        }
      }, 5);
    });
    await r.goto(`${s.base}/`);
    await r.waitForFunction(() => window.__t1, null, { timeout: 6000 }).catch(() => {});
    const rt = Math.round(await r.evaluate(() => (window.__t1 ?? 1e9) - window.__t0));
    if (rt > 300) s.problemi.push(`svelamento ${sc.id}: con riduci movimento lo stato finale arriva a ${rt} ms (> 300)`);
    console.log(`svelamento ${sc.id} riduci: stato finale a ~${rt} ms`);
    await fotografa(r, 'svelamento-riduci', sc);
    await r.context().close();
  }
}

/** Lo svelamento del Club stesso (da arena 12 a 13): i piani che si posano e la lampada che si accende. */
async function fotoSvelamentoClub(s) {
  for (const sc of SCHERMI) {
    const page = await s.pagina(sc, { profilo: profiloProva({ cups: 1260, bestCups: 1260, meta: { arena: 11, paid: { level: 100, prestige: 0, legend: 0, arena: 11 }, claims: [] }, achievements: {} }) });
    await page.goto(`${s.base}/`);
    await page.waitForSelector('[data-testid="svelamento"]', { timeout: 20000 });
    const t0 = Date.now();
    for (const [ms, nome] of [[900, 'svelamento-club-0900'], [1500, 'svelamento-club-1500'], [3200, 'svelamento-club-fine']]) {
      await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
      await fotografa(page, nome, sc);
    }
    await page.context().close();
  }
}

async function fotoTrofei(s) {
  // La strada delle arene: la scheda del Club (raggiunta) apre /arena/club-dei-signori.
  const sc = SCHERMI[0];
  const page = await s.pagina(sc, { profilo: profiloProva() });
  await page.goto(`${s.base}/trofei`);
  await page.waitForTimeout(2500);
  await fotografa(page, 'trofei', sc);
  const scheda = page.getByRole('button', { name: /Il Club dei Signori/ }).first();
  if (await scheda.count()) {
    await scheda.click();
    await page.waitForTimeout(1500);
    if (!page.url().includes(`/arena/${CLUB}`)) s.problemi.push(`trofei: la scheda del Club porta a ${page.url()}`);
  } else s.problemi.push('trofei: nessuna scheda del Club da toccare');
  await page.context().close();
}

const s = await apri({ cartella });
if (process.argv[2] === 'prima') {
  await fotoArene(s, prima);
} else if (process.argv[2] === 'scene') {
  await fotoClub(s);
  await fotoSvelamento(s);
  await fotoSvelamentoClub(s);
  await fotoTrofei(s);
} else {
  await fotoArene(s, dopo);
  confronta(s);
  for (const sc of SCHERMI) {
    const page = await s.pagina(sc, { profilo: profiloProva() });
    await page.goto(`${s.base}/dev/arene?capitolo=3`);
    await page.waitForTimeout(2000);
    await fotografa(page, 'dev-arene-cap3', sc);
    await scorri(page, 700);
    await fotografa(page, 'dev-arene-cap3-sotto', sc);
    await page.context().close();
  }
  await fotoClub(s);
  await fotoSvelamento(s);
  await fotoSvelamentoClub(s);
  await fotoTrofei(s);
}
await chiudi(s);
