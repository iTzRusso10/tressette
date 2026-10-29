// Prestazioni del camerino (B3): frame e long task in 3 s di vetrina su /personalizza, telefono 393×852, CPU 4× più
// lenta (CDP). Tre casi: il palco con una cornice mitica in prova (l'eroe più animato: riflesso, iridescenza,
// bagliore, 16 granelli), un tavolino leggendario di metallo (due bande di riflesso) e /dev/cornici ferma.
// Uso (dopo npm run export:web): node scripts/perf-camerino.mjs [ripetizioni]. Budget: p95 ≤ 20 ms, nessun task > 50 ms.
import { apri, chiudi, profiloProva, SCHERMI } from './foto-lib.mjs';

const volte = Number(process.argv[2] ?? 3);
const s = await apri();
const casi = [
  ['fermo (cornice comune)', '/personalizza?posto=frame&id=semplice'],
  ['cornice mitica', '/personalizza?posto=frame&id=lega-re'],
  ['tavolino leggendario', '/personalizza?posto=table&id=corona-del-re'],
  ['dorso mitico', '/personalizza?posto=back&id=il-destino'],
  ['cornice leggendaria', '/personalizza?posto=frame&id=corona'],
];
let male = false;
for (const [nome, url] of casi) {
  const righe = [];
  for (let k = 0; k < volte; k++) {
    const page = await s.pagina(SCHERMI[0], { profilo: profiloProva() });
    const cdp = await page.context().newCDPSession(page);
    await page.goto(s.base + url);
    await page.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const r = await page.evaluate(async () => {
      const lt = [];
      new PerformanceObserver(l => l.getEntries().forEach(e => lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: false });
      const frames = [];
      let last = performance.now();
      let run = true;
      const tick = t => {
        frames.push(t - last);
        last = t;
        if (run) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      await new Promise(res => setTimeout(res, 3000));
      run = false;
      const v = frames.slice(1).sort((a, b) => a - b);
      return { p50: +v[v.length >> 1].toFixed(1), p95: +v[Math.floor(v.length * 0.95)].toFixed(1), max: +v[v.length - 1].toFixed(1), lunghi: lt };
    });
    righe.push(r);
    await page.context().close();
  }
  console.log(nome, JSON.stringify(righe));
  const migliore = Math.min(...righe.map(r => r.p95));
  if (migliore > 20) male = true;
}
await chiudi(s);
if (male) process.exitCode = 1;
