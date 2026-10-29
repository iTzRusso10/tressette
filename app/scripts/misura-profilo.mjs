// Misura del profilo (pacchetto B2): frame p95 e task lunghi in 3 s di vetrina, e mentre si scorre, con la CPU 4×
// più lenta. Dopo `npm run export:web`: node scripts/misura-profilo.mjs [url, default /profilo]
import { apri, chiudi, profiloProva, SCHERMI } from './foto-lib.mjs';

const url = process.argv[2] || '/profilo';
const s = await apri();
const page = await s.pagina(SCHERMI[0], { riduci: process.env.RIDUCI === '1', profilo: profiloProva({ equipped: { frame: process.env.CORNICE || 'stelle' }, owned: ['frame:stelle'], meta: { showcase: [process.env.PRIMO || 'item:back:corona-reale', 'ach:prima-vittoria', 'item:felt:venezia-al-tramonto'] } }) });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.goto(s.base + url);
await page.waitForSelector('[data-testid="fisso-vetrina"]', { timeout: 60000 });
await page.waitForTimeout(2500);
const misura = (scorri) =>
  page.evaluate(async scorri => {
    const lt = [];
    new PerformanceObserver(l => l.getEntries().forEach(e => lt.push(e.duration))).observe({ type: 'longtask', buffered: false });
    const f = [];
    let last = performance.now();
    let run = true;
    const tick = t => { f.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    if (scorri) {
      const el = [...document.querySelectorAll('div')].find(d => d.scrollHeight > d.clientHeight + 200 && getComputedStyle(d).overflowY !== 'visible');
      for (let i = 0; i < 30; i++) { el && el.scrollBy(0, 40); await new Promise(r => setTimeout(r, 100)); }
    } else await new Promise(r => setTimeout(r, 3000));
    run = false;
    const x = f.slice(1).sort((a, b) => a - b);
    return { n: x.length, p50: +x[x.length >> 1].toFixed(1), p95: +x[Math.floor(x.length * 0.95)].toFixed(1), max: +x[x.length - 1].toFixed(1), taskLunghi: lt.length, taskMax: lt.length ? +Math.max(...lt).toFixed(0) : 0 };
  }, scorri);
const fermo = await misura(false);
const scorrendo = await misura(true);
console.log(JSON.stringify({ url, fermo, scorrendo }));
if (fermo.p95 > 20) s.problemi.push(`p95 da fermo ${fermo.p95} ms > 20`);
await chiudi(s);
