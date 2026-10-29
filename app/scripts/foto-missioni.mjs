// Foto e prove del pacchetto B4 «La bacheca del circolo» (docs/direzione-artistica.md §5.17, §7 B4).
// Dopo `npm run export:web`:  node scripts/foto-missioni.mjs   → foto in .visual/missioni/
//
// Cosa fa:
// - /missioni sui tre schermi con missioni da fare, in corso, da riscuotere e riscosse (più l'evento), in alto e
//   scorsa; la home con la bacheca in miniatura e il vassoio «Da riscuotere».
// - Controlla che i `fisso-` non si spostino tra 0,5 s e 3 s, né dopo aver riscosso.
// - Riscuotere: il volo finisce entro 700 ms; tre buste toccate in 400 ms vengono riscosse tutte e tre;
//   «Riscuoti tutto» con 7 buste finisce entro 1,2 s.
// - La miniatura nella home è alta come la lista di prima (275 sul telefono, 261 sul desktop, ±8).
// - Con riduci movimento: nessuna moneta vola, il contatore si aggiorna lo stesso, la bacheca è ferma.
// - Le missioni cambiano col giorno: il cambio di una missione funziona una volta sola.
import { join } from 'node:path';
import { apri, chiudi, controllaFissi, fotografa, posizioniFisse, profiloProva, SCHERMI, scorri, uguali } from './foto-lib.mjs';
import { activeMissions, newProgress, normalize, touch } from '../src/meta/ledger.ts';
import { ACHIEVEMENTS } from '../src/meta/achievements.ts';

const root = join(import.meta.dirname, '..');
const oggi = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const SEME = 'bacheca-prova';
const giorno = oggi();
const attive = activeMissions(newProgress(SEME), giorno);
const del = attive.filter(m => m.def.period === 'daily');
const sett = attive.filter(m => m.def.period === 'weekly');
const settimana = sett[0].key.split(':')[0];
const claimDi = m => ({ id: `m:${m.key}`, why: m.def.text, coins: m.def.coins, xp: m.def.xp });

/** Il profilo con i quattro stati: [stato del giorno ×3], [stato della settimana ×4]. */
function profiloBacheca(statiG, statiS, { evento = true, extraClaims = [] } = {}) {
  const p = {};
  const done = [];
  const claims = [];
  const claimed = [];
  const metti = (m, st) => {
    if (st === 'incorso') p[m.key] = Math.max(1, Math.floor(m.def.goal * 0.55));
    if (st === 'riscuotere' || st === 'riscossa') {
      p[m.key] = m.def.goal;
      done.push(m.key);
    }
    if (st === 'riscuotere') claims.push(claimDi(m));
    if (st === 'riscossa') claimed.push(`m:${m.key}`);
  };
  del.forEach((m, i) => metti(m, statiG[i]));
  sett.forEach((m, i) => metti(m, statiS[i]));
  // L'evento della settimana del 26 ottobre 2026 (Settimana del Tressette): 7 vittorie, primo traguardo da riscuotere.
  const ev = 'settimana-tressette-2026-10-26';
  const inEvento = giorno >= '2026-10-26' && giorno <= '2026-11-01';
  if (evento && inEvento) claims.push({ id: `evento:${ev}:0`, why: 'Settimana del Tressette: 5 vittorie a Tressette', coins: 300 });
  const meta = {
    seed: SEME,
    missions: { day: giorno, week: settimana, p, seen: {}, done, swaps: {}, online: { [giorno]: false, [settimana]: false } },
    event: inEvento ? { id: ev, base: evento ? 23 : 30, tiers: evento ? [0] : [] } : { id: null, base: 0, tiers: [] },
    claims: [...claims, ...extraClaims],
    claimed,
  };
  // Il profilo di check:hub sblocca 35 achievement all'apertura (con il banner sopra la bacheca): qui si
  // sbloccano prima, con il registro vero, e si segnano come già festeggiati.
  const base = profiloProva({ coins: 5400, meta });
  const dopo = touch(normalize(base.state, SEME), giorno).p;
  const state = { ...base.state, achievements: dopo.achievements, xp: dopo.xp, coins: 11100, meta: { ...dopo.meta, ...meta } };
  state.celebrated = [...ACHIEVEMENTS.map(a => `a:${a.id}`), ...Array.from({ length: 100 }, (_, i) => `l:${i + 1}`)];
  return { state, version: 2 };
}

const QUATTRO = profiloBacheca(['riscuotere', 'riscossa', 'incorso'], ['incorso', 'riscuotere', 'dafare', 'riscuotere']);
const SETTE = profiloBacheca(['riscuotere', 'riscuotere', 'riscuotere'], ['riscuotere', 'riscuotere', 'riscuotere', 'riscuotere'], { evento: false });
const NUOVO = profiloBacheca(['dafare', 'dafare', 'dafare'], ['dafare', 'dafare', 'dafare', 'dafare'], { evento: false });

if (process.env.PROFILO_SOLO) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.env.PROFILO_SOLO, JSON.stringify(QUATTRO));
  process.exit(0);
}

const s = await apri({ cartella: join(root, '.visual/missioni') });
const misure = [];

/** Aspetta la schermata e un po' di quiete (entrate finite). */
async function pronta(page, sel = '[data-testid="fisso-bacheca"]') {
  await page.waitForSelector(sel, { timeout: 20000 });
  await page.waitForTimeout(900);
}

/** Registra nella pagina quando compaiono e spariscono i voli delle monete, e l'ultimo tocco. */
async function spia(page) {
  await page.evaluate(() => {
    const w = window;
    w.__voli = { tocchi: [], fine: 0, ultimo: 0, inizio: 0, massimo: 0 };
    document.addEventListener('pointerdown', () => w.__voli.tocchi.push(performance.now()), true);
    const conta = () => document.querySelectorAll('[data-testid="volo-monete"]').length;
    let prima = 0;
    const giro = () => {
      const n = conta();
      if (n > 0 && prima === 0 && !w.__voli.inizio) w.__voli.inizio = performance.now();
      if (n > 0) w.__voli.ultimo = performance.now();
      if (n === 0 && prima > 0) w.__voli.fine = performance.now();
      w.__voli.massimo = Math.max(w.__voli.massimo, n);
      prima = n;
      requestAnimationFrame(giro);
    };
    requestAnimationFrame(giro);
  });
}
const leggiSpia = page => page.evaluate(() => window.__voli);
const monete = page => page.evaluate(() => JSON.parse(localStorage.getItem('napoletane.profilo.v1')).state.coins);
const claimsSalvati = page => page.evaluate(() => JSON.parse(localStorage.getItem('napoletane.profilo.v1')).state.meta.claims.map(c => c.id));

for (const sc of SCHERMI) {
  // 1. La bacheca con i quattro stati.
  const page = await s.pagina(sc, { profilo: QUATTRO });
  await page.goto(`${s.base}/missioni`);
  await controllaFissi(page, s.problemi, `missioni ${sc.id}`);
  await fotografa(page, 'bacheca', sc);
  await scorri(page, sc.id === 'desktop' ? 600 : 560);
  await fotografa(page, 'bacheca-2', sc);
  await scorri(page, 2000);
  await fotografa(page, 'bacheca-3', sc);
  await page.context().close();

  // 2. La home con la bacheca in miniatura.
  const home = await s.pagina(sc, { profilo: QUATTRO });
  await home.goto(`${s.base}/`);
  await pronta(home, '[data-testid="fisso-bacheca-mini"]');
  const box = await home.getByTestId('fisso-bacheca-mini').boundingBox();
  const atteso = sc.id === 'desktop' ? 261 : 275;
  misure.push(`home ${sc.id}: miniatura alta ${box.height.toFixed(0)} (prima ${atteso})`);
  if (Math.abs(box.height - atteso) > 8) s.problemi.push(`home ${sc.id}: la miniatura è alta ${box.height} invece di ${atteso} ±8`);
  await home.getByRole('button', { name: /^Riscuoti tutto/ }).first().scrollIntoViewIfNeeded();
  await home.waitForTimeout(500);
  await fotografa(home, 'home-riscuoti', sc);
  await home.getByTestId('fisso-bacheca-mini').scrollIntoViewIfNeeded();
  await home.mouse.wheel(0, 2000);
  await home.waitForTimeout(800);
  await fotografa(home, 'home-bacheca', sc);
  // Riscuotere dalla miniatura: le monete volano alla pillola in alto.
  await spia(home);
  const prima = await monete(home);
  const bustaMini = home.locator('[data-testid^="busta-"]', { hasText: 'Riscuoti' }).first();
  if (await bustaMini.count()) {
    await bustaMini.click();
    await home.waitForTimeout(260);
    await fotografa(home, 'home-volo', sc);
    await home.waitForTimeout(800);
    const v = await leggiSpia(home);
    if (!v.massimo) s.problemi.push(`home ${sc.id}: riscuotendo dalla miniatura non vola niente`);
    if ((await monete(home)) <= prima) s.problemi.push(`home ${sc.id}: la busta della miniatura non ha riscosso`);
  }
  // «Riscuoti tutto» della home: tutte le ricompense, monete in volo da ogni riga.
  await home.getByRole('button', { name: /^Riscuoti tutto/ }).first().scrollIntoViewIfNeeded();
  await home.waitForTimeout(400);
  await spia(home);
  await home.getByTestId('riscuoti-tutto-home').click();
  await home.waitForTimeout(300);
  await fotografa(home, 'home-riscuoti-volo', sc);
  await home.waitForTimeout(1200);
  const vh = await leggiSpia(home);
  if (vh.ultimo && vh.tocchi.length) misure.push(`home ${sc.id}: «Riscuoti tutto» ultimo fotogramma con le monete a ${Math.round(vh.ultimo - vh.tocchi.at(-1))} ms`);
  if (vh.ultimo - vh.tocchi.at(-1) > 1200) s.problemi.push(`home ${sc.id}: «Riscuoti tutto» dura ${Math.round(vh.ultimo - vh.tocchi.at(-1))} ms (> 1200)`);
  if ((await claimsSalvati(home)).length) s.problemi.push(`home ${sc.id}: dopo «Riscuoti tutto» restano ricompense`);
  await home.context().close();
}

// 3. Una busta: il volo finisce entro 700 ms; i biglietti non si spostano.
{
  const sc = SCHERMI[0];
  const page = await s.pagina(sc, { profilo: QUATTRO });
  await page.goto(`${s.base}/missioni`);
  await pronta(page);
  await page.waitForTimeout(1200);
  const pos = await posizioniFisse(page);
  await spia(page);
  const prima = await monete(page);
  await page.getByTestId(`busta-${del[0].def.id}`).click();
  await page.waitForTimeout(240);
  await fotografa(page, 'riscuoti-volo', sc);
  await page.waitForTimeout(900);
  const v = await leggiSpia(page);
  // Fine dell'animazione: l'ultimo fotogramma dipinto con le monete (il primo senza può tardare per un task lungo).
  const t = v.ultimo - v.tocchi.at(-1);
  misure.push(`una busta: ultimo fotogramma con le monete a ${Math.round(t)} ms dal tocco (sparite al fotogramma dopo, ${Math.round(v.fine - v.tocchi.at(-1))} ms)`);
  if (!v.fine || t > 700) s.problemi.push(`una busta: il volo dura ${Math.round(t)} ms (> 700)`);
  if ((await monete(page)) !== prima + del[0].def.coins) s.problemi.push('una busta: le monete non tornano');
  const dopo = await posizioniFisse(page);
  for (const k of Object.keys(pos)) if (k.startsWith('fisso-biglietto') && pos[k] !== dopo[k]) s.problemi.push(`una busta: ${k} si è spostato (${pos[k]} → ${dopo[k]})`);
  await page.waitForTimeout(500);
  await fotografa(page, 'riscossa', sc);
  await page.context().close();
}

// 4. Tre buste in 400 ms: tutte e tre riscosse. Poi «Riscuoti tutto» con 7 buste ≤ 1,2 s.
{
  const sc = SCHERMI[0];
  const page = await s.pagina(sc, { profilo: SETTE });
  await page.goto(`${s.base}/missioni`);
  await pronta(page);
  await page.waitForTimeout(1200);
  const prima = await monete(page);
  const tre = del.slice(0, 3);
  const box = [];
  for (const m of tre) box.push(await page.getByTestId(`busta-${m.def.id}`).boundingBox());
  await spia(page);
  for (const b of box) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  // Il tempo tra il primo e l'ultimo tocco, misurato nella pagina (pointerdown).
  const tt = (await leggiSpia(page)).tocchi;
  const durata = Math.round(tt.at(-1) - tt[0]);
  await page.waitForTimeout(1000);
  const preso = (await monete(page)) - prima;
  const atteso = tre.reduce((t, m) => t + m.def.coins, 0);
  misure.push(`tre buste toccate in ${durata} ms: riscosse ${preso} monete su ${atteso}`);
  if (durata > 400) s.problemi.push(`tre buste: i tocchi hanno preso ${durata} ms (> 400)`);
  if (preso !== atteso) s.problemi.push(`tre buste: riscosse ${preso} monete invece di ${atteso}`);
  await page.context().close();

  const p2 = await s.pagina(sc, { profilo: SETTE });
  await p2.goto(`${s.base}/missioni`);
  await pronta(p2);
  await p2.waitForTimeout(1200);
  const n = (await claimsSalvati(p2)).filter(id => id.startsWith('m:')).length;
  await spia(p2);
  const prima2 = await monete(p2);
  await p2.getByTestId('riscuoti-tutto').click();
  await p2.waitForTimeout(500);
  await fotografa(p2, 'riscuoti-tutto-volo', sc);
  await p2.waitForTimeout(1300);
  const v = await leggiSpia(p2);
  const t = v.ultimo - v.tocchi.at(-1);
  misure.push(`«Riscuoti tutto» con ${n} buste: ultimo fotogramma con le monete a ${Math.round(t)} ms (sparite a ${Math.round(v.fine - v.tocchi.at(-1))}), ${v.massimo} voli insieme, +${(await monete(p2)) - prima2} monete`);
  if (n !== 7) s.problemi.push(`riscuoti tutto: le buste erano ${n}, non 7`);
  if (!v.fine || t > 1200) s.problemi.push(`riscuoti tutto: ${Math.round(t)} ms (> 1200)`);
  if ((await claimsSalvati(p2)).length !== 0) s.problemi.push('riscuoti tutto: restano ricompense');
  await fotografa(p2, 'tutto-riscosso', sc);
  await p2.context().close();
}

// 5. Riduci movimento: niente volo, il contatore si aggiorna; la bacheca è ferma.
{
  const sc = SCHERMI[0];
  const page = await s.pagina(sc, { profilo: QUATTRO, riduci: true });
  await page.goto(`${s.base}/missioni`);
  await pronta(page);
  await spia(page);
  const prima = await monete(page);
  await page.getByTestId(`busta-${del[0].def.id}`).click();
  await page.waitForTimeout(600);
  const v = await leggiSpia(page);
  if (v.massimo) s.problemi.push('riduci movimento: le monete volano');
  const mostrato = await page.getByTestId('contatore-monete').innerText();
  if (Number(mostrato.replace(/\./g, '')) !== prima + del[0].def.coins) s.problemi.push(`riduci movimento: il contatore dice ${mostrato}`);
  misure.push(`riduci movimento: nessun volo, contatore ${mostrato}`);
  await fotografa(page, 'riduci-riscosso', sc);
  await page.context().close();
}
for (const sc of SCHERMI) {
  // Come controllaFermo di foto-lib, ma con il profilo della bacheca (quello di base apre il banner degli achievement).
  const page = await s.pagina(sc, { profilo: QUATTRO, riduci: true });
  await page.goto(`${s.base}/missioni`);
  // Da quando la schermata c'è (bundle e caratteri caricati), come controllaFissi.
  await page.waitForSelector('[data-testid="fisso-bacheca"]', { timeout: 20000 });
  await page.waitForTimeout(1000);
  const a = await page.screenshot();
  await page.waitForTimeout(3000);
  const b = await page.screenshot();
  if (!uguali(a, b)) s.problemi.push(`missioni ${sc.id}: con riduci movimento qualcosa si muove (fotogrammi a 1 s e 4 s diversi)`);
  await fotografa(page, 'bacheca-riduci', sc);
  await page.context().close();
}
// E senza riduci movimento la bacheca, a riposo, è ferma (nessuna animazione ambientale).
{
  const page = await s.pagina(SCHERMI[0], { profilo: QUATTRO });
  await page.goto(`${s.base}/missioni`);
  await page.waitForTimeout(2500);
  const a = await page.screenshot();
  await page.waitForTimeout(3000);
  const b = await page.screenshot();
  if (!uguali(a, b)) s.problemi.push('missioni: a riposo qualcosa si muove');
  await page.context().close();
}

// 6. Il cambio di una missione del giorno: una volta sola.
{
  const sc = SCHERMI[1];
  const page = await s.pagina(sc, { profilo: NUOVO });
  await page.goto(`${s.base}/missioni`);
  await pronta(page);
  const cambia = page.getByRole('button', { name: /^Cambia la missione/ });
  const n0 = await cambia.count();
  await cambia.first().click();
  await page.waitForTimeout(700);
  const n1 = await cambia.count();
  misure.push(`cambio: ${n0} pulsanti prima, ${n1} dopo`);
  if (n0 !== 3 || n1 !== 0) s.problemi.push(`cambio di una missione: ${n0} → ${n1} pulsanti (attesi 3 → 0)`);
  await fotografa(page, 'cambiata', sc);
  await page.context().close();
}

console.log(misure.join('\n'));
await chiudi(s);
