// Prestazioni della bacheca (B4): CPU 4× più lenta, telefono 393×852. Dopo `npm run export:web`:
//   node scripts/misura-missioni.mjs [ripetizioni=3]
// Misura frame p95 e task lunghi in 3 s di bacheca ferma, e in 3 s mentre si scorre e si riscuote una busta.
// Budget (docs/tecnologie-grafica.md): p95 ≤ 20 ms. Il profilo è quello di scripts/foto-missioni.mjs.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apri, chiudi, SCHERMI } from './foto-lib.mjs';

const root = join(import.meta.dirname, '..');
const prof = join(root, '.visual', 'missioni', 'profilo-quattro.json');
execFileSync(process.execPath, [join(root, 'scripts', 'foto-missioni.mjs')], { env: { ...process.env, PROFILO_SOLO: prof }, stdio: 'ignore' });
const profilo = JSON.parse(readFileSync(prof, 'utf8'));
const volte = Number(process.argv[2] ?? 3);

const s = await apri({ cartella: join(root, '.visual', 'missioni') });
const frames = () =>
  new Promise(r => {
    const lt = [];
    new PerformanceObserver(l => l.getEntries().forEach(e => lt.push(e.duration))).observe({ type: 'longtask' });
    const f = [];
    let last = performance.now();
    let run = true;
    const tick = t => {
      f.push(t - last);
      last = t;
      if (run) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => {
      run = false;
      const x = f.slice(1).sort((a, b) => a - b);
      r({ n: x.length, p50: Math.round(x[x.length >> 1]), p95: Math.round(x[Math.floor(x.length * 0.95)]), max: Math.round(x[x.length - 1]), lunghi: lt.map(Math.round) });
    }, 3000);
  });
const righe = [];
for (let i = 0; i < volte; i++) {
  const page = await s.pagina(SCHERMI[0], { profilo });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(`${s.base}/missioni`);
  await page.waitForSelector('[data-testid="fisso-bacheca"]', { timeout: 60000 });
  await page.waitForTimeout(2500);
  const ferma = await page.evaluate(frames);
  const mossa = page.evaluate(frames);
  await page.waitForTimeout(200);
  await page.locator('[data-testid^="busta-"]', { hasText: 'Riscuoti' }).first().click();
  await page.waitForTimeout(900);
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 500);
  const m = await mossa;
  righe.push(`prova ${i + 1}: ferma p95 ${ferma.p95} ms (p50 ${ferma.p50}, max ${ferma.max}, task lunghi ${ferma.lunghi.length ? ferma.lunghi.join('/') : 'nessuno'}) · riscuoti+scorri p95 ${m.p95} ms (p50 ${m.p50}, max ${m.max}, task lunghi ${m.lunghi.length ? m.lunghi.join('/') : 'nessuno'})`);
  await page.context().close();
}
console.log(righe.join('\n'));
await chiudi(s);
