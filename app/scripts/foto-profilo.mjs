// Foto del pacchetto B2 «Il profilo come vetrina» (docs/direzione-artistica.md §5.15, §7 B2), dopo
// `npm run export:web`:
//
//   node scripts/foto-profilo.mjs            tutte le foto in .visual/profilo/ e i controlli
//
// Per ognuno dei tre schermi: il profilo in alto (con il controllo dei fisso-avatar, fisso-nome, fisso-vetrina tra
// 0,5 s e 3 s), scorso a metà e in fondo; la scheda Vetrina dell'editor; il profilo pubblico di un altro
// (/dev/sociale?profilo=amico) in alto e scorso. Poi: con riduci movimento stesso fotogramma a 1 s e a 4 s (profilo
// e profilo dell'altro); senza, i fotogrammi devono essere diversi (qualcosa respira). Sul 375×667 controlla che
// avatar (≥ 128 pt), nome, titolo, targa dei trofei e l'inizio della vetrina siano sopra la piega.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apri, chiudi, controllaFermo, controllaFissi, fotografa, profiloProva, SCHERMI, scorri, uguali } from './foto-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const s = await apri({ cartella: join(root, '.visual/profilo') });

// Il profilo di prova con qualcosa in più da esporre: una vetrina scelta (dorso leggendario per primo), una cornice
// epica in uso e qualche achievement.
const prova = () =>
  profiloProva({
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
      'frame:stelle',
      'frame:lega-grana',
    ],
    equipped: { frame: 'stelle' },
    meta: { showcase: ['item:back:corona-reale', 'ach:prima-vittoria', 'item:felt:venezia-al-tramonto'], title: 'frequentatore-del-bar' },
    achievements: { 'prima-vittoria': 1, 'prima-scopa': 2, 'prima-partita': 1, 'dieci-vittorie': 1, tuttofare: 1 },
  });

for (const sc of SCHERMI) {
  const page = await s.pagina(sc, { profilo: prova() });
  await page.goto(`${s.base}/profilo`);
  await controllaFissi(page, s.problemi, `profilo ${sc.id}`);
  await fotografa(page, 'profilo', sc);
  if (sc.id === 'piccolo') {
    // Sopra la piega: avatar ≥ 128, nome, titolo, targa dei trofei e l'inizio della vetrina.
    const r = await page.evaluate(() => {
      const box = id => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { y: b.y, h: b.height, w: b.width, fondo: b.y + b.height };
      };
      return { avatar: box('fisso-avatar'), nome: box('fisso-nome'), vetrina: box('fisso-vetrina'), alto: innerHeight };
    });
    if (!r.avatar || r.avatar.w < 128) s.problemi.push(`piccolo: avatar sotto i 128 pt (${r.avatar?.w})`);
    if (!r.nome || r.nome.fondo > r.alto) s.problemi.push('piccolo: il nome è sotto la piega');
    if (!r.vetrina || r.vetrina.y + 40 > r.alto) s.problemi.push(`piccolo: la vetrina non comincia sopra la piega (y ${r.vetrina?.y})`);
    console.log('piccolo, sopra la piega:', JSON.stringify(r));
  }
  const passi = sc.id === 'desktop' ? [650, 650, 650, 650] : [620, 620, 620, 620, 620];
  let i = 1;
  for (const dy of passi) {
    await scorri(page, dy);
    await fotografa(page, `profilo-${i++}`, sc);
  }
  await scorri(page, 6000);
  await fotografa(page, 'profilo-fondo', sc);
  // La scheda Vetrina dell'editor (dal pulsante «Cambia vetrina»).
  await scorri(page, -8000);
  await page.getByRole('button', { name: /^Cambia la vetrina/ }).click();
  await page.waitForTimeout(900);
  await fotografa(page, 'editor-vetrina', sc);
  await page.getByRole('radio', { name: 'Avatar', exact: true }).first().click();
  await page.waitForTimeout(500);
  await fotografa(page, 'editor-avatar', sc);
  await page.getByRole('radio', { name: 'Cornice', exact: true }).first().click();
  await page.waitForTimeout(500);
  await fotografa(page, 'editor-cornice', sc);
  await page.context().close();

  // Il profilo pubblico di un altro giocatore (dati di prova, solo PublicProfile).
  const altro = await s.pagina(sc, { profilo: prova() });
  await altro.goto(`${s.base}/dev/sociale?profilo=amico`);
  await controllaFissi(altro, s.problemi, `altro ${sc.id}`);
  await fotografa(altro, 'altro', sc);
  let j = 1;
  for (const dy of sc.id === 'desktop' ? [650, 650, 650, 650] : [620, 620, 620, 620, 620]) {
    await scorri(altro, dy);
    await fotografa(altro, `altro-${j++}`, sc);
  }
  await altro.context().close();
}

// Riduci movimento: niente parte. Il conto parte da quando l'avatar c'è (con la macchina carica il caricamento
// della pagina può superare il secondo).
for (const sc of [SCHERMI[0], SCHERMI[1]]) {
  await controllaFermo(s, '/profilo', sc, 'profilo-fermo', { vedi: 'fisso-avatar' });
  await controllaFermo(s, '/dev/sociale?profilo=amico', sc, 'altro-fermo', { vedi: 'fisso-avatar' });
}
// Vivo: qualcosa respira (la scena, la lampada).
const vivo = await s.pagina(SCHERMI[0], { profilo: prova() });
await vivo.goto(`${s.base}/profilo`);
await vivo.waitForTimeout(1000);
const a = await vivo.screenshot();
await vivo.waitForTimeout(2500);
const b = await vivo.screenshot();
if (uguali(a, b)) s.problemi.push('profilo: senza riduci movimento non si muove niente (fotogrammi a 1 s e 3,5 s uguali)');
await vivo.context().close();

await chiudi(s);
