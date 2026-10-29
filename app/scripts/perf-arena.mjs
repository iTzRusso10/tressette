// Prestazioni dell'arena aperta (docs/tecnologie-grafica.md, budget: frame p95 ≤ 20 ms, nessun task lungo > 50 ms
// in 3 s di vetrina). Web, 393×852, DPR 2, CPU rallentata 4×. Dopo `npm run export:web`:
//   node scripts/perf-arena.mjs [prove = 3] [url = /arena/club-dei-signori]
// Ogni prova apre la pagina, aspetta 2,5 s (entrata finita) e misura 3 s di frame con requestAnimationFrame.
import { apri, profiloProva, SCHERMI } from './foto-lib.mjs';

const prove = Number(process.argv[2] ?? 3);
const url = process.argv[3] ?? '/arena/club-dei-signori';
const s = await apri();
const ris = [];
for (let i = 0; i < prove; i++) {
  const page = await s.pagina(SCHERMI[0], { profilo: profiloProva(), riduci: process.env.RIDUCI === '1' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(s.base + url);
  await page.waitForSelector('[data-testid^="fisso-"]', { timeout: 60000 });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    const lt = [];
    new PerformanceObserver(l => l.getEntries().forEach(e => lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: false });
    const f = [];
    let last = performance.now();
    let run = true;
    const tick = t => {
      f.push(t - last);
      last = t;
      if (run) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await new Promise(r => setTimeout(r, 3000));
    run = false;
    const x = f.slice(1).sort((a, b) => a - b);
    return { n: x.length, p50: +x[x.length >> 1].toFixed(1), p95: +x[Math.floor(x.length * 0.95)].toFixed(1), max: +x[x.length - 1].toFixed(1), lungo: lt };
  });
  ris.push(r);
  console.log(`prova ${i + 1}: ${JSON.stringify(r)}`);
  await page.context().close();
}
const p95 = ris.map(r => r.p95).sort((a, b) => a - b)[ris.length >> 1];
console.log(`p95 mediano ${p95} ms (budget 20)`);
if (p95 > 20) s.problemi.push(`p95 ${p95} ms > 20`);
await s.chiudi?.();
await s.chiudiContesti();
await s.browser.close();
s.server.close();
if (s.problemi.length) {
  console.log(s.problemi.join('\n'));
  process.exitCode = 1;
}
