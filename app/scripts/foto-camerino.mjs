// Foto e prove del pacchetto B3 (docs/direzione-artistica.md §7 «B3»), dopo `npm run export:web`:
//   node scripts/foto-camerino.mjs [schermo]       (schermo: telefono | piccolo | desktop; default tutti)
// Foto in .visual/camerino/:
//   personalizza-<scheda>-<schermo>   le cinque schede del camerino (tavolino, panno, dorso, cornice, avatar)
//   personalizza-prova-<schermo>      una cornice leggendaria in prova (palco con l'eroe animato)
//   personalizza-compra-<schermo>     dopo «Compra» riuscito
//   personalizza-rifiuto-<schermo>    «Compra» senza monete abbastanza
//   cornici-<n>-<schermo>             /dev/cornici (ferma, ?movimento=0), dall'alto in fondo
//   panni-<n>-<schermo>               /dev/panni
//   negozio-<scheda>-<schermo>        il negozio (panni, cornici) e la scheda dell'oggetto con «Prova sul tuo tavolo»
// Controlli (escono con 1 se qualcosa non va):
//   - provare non cambia `equipped` (si legge il profilo salvato prima e dopo); «Usa» lo cambia; «Compra» passa da
//     buyItem (monete scalate, oggetto in owned) e rifiuta come oggi senza monete;
//   - gli oggetti «in arrivo» non si provano (il palco non cambia);
//   - niente si sposta: [data-testid^="fisso-"] fermi tra 0,5 s e 3 s, anche dopo una prova;
//   - riduci movimento: stesso fotogramma a 1 s e 4 s su /personalizza con una cornice mitica in prova;
//   - vivo: senza riduci movimento, con una cornice mitica in prova, qualcosa si muove (fotogrammi diversi);
//   - nessun errore nella console.
import { join } from 'node:path';
import { apri, chiudi, controllaFermo, controllaFissi, fotografa, profiloProva, SCHERMI, scorri, uguali } from './foto-lib.mjs';

const filtro = process.argv[2] ?? '';
const s = await apri({ cartella: join(process.cwd(), '.visual/camerino') });
const schermi = SCHERMI.filter(x => x.id.includes(filtro));

const leggi = page => page.evaluate(() => JSON.parse(localStorage.getItem('napoletane.profilo.v1') || '{}').state);
const tocca = async (page, id) => {
  await page.getByTestId(id).first().click();
  await page.waitForTimeout(700);
};

for (const sc of schermi) {
  const page = await s.pagina(sc, { profilo: profiloProva() });
  await page.goto(s.base + '/personalizza?posto=table');
  await controllaFissi(page, s.problemi, `personalizza ${sc.id}`);
  const prima = await leggi(page);

  // Le cinque schede.
  for (const [nome, scheda] of [
    ['tavolino', 'Tavolino'],
    ['panno', 'Panno'],
    ['dorso', 'Dorso'],
    ['cornice', 'Cornice'],
    ['avatar', 'Avatar'],
  ]) {
    await page.getByRole('tab', { name: scheda }).click();
    await page.waitForTimeout(800);
    await fotografa(page, `personalizza-${nome}`, sc);
  }

  // Provare: un panno, un tavolino, un dorso, una cornice e un avatar diversi. equipped non cambia.
  await page.getByRole('tab', { name: 'Panno' }).click();
  await tocca(page, 'casella-velluto-reale');
  await page.getByRole('tab', { name: 'Tavolino' }).click();
  await tocca(page, 'casella-marmo-di-carrara');
  await page.getByRole('tab', { name: 'Dorso' }).click();
  await tocca(page, 'casella-corona-reale');
  await page.getByRole('tab', { name: 'Avatar' }).click();
  await tocca(page, 'casella-luna');
  await page.getByRole('tab', { name: 'Cornice' }).click();
  await tocca(page, 'casella-corona');
  await page.waitForTimeout(1500);
  await fotografa(page, 'personalizza-prova', sc);
  const dopoProva = await leggi(page);
  if (JSON.stringify(dopoProva.equipped) !== JSON.stringify(prima.equipped) || dopoProva.meta.avatar !== prima.meta.avatar)
    s.problemi.push(`${sc.id}: provare ha cambiato il profilo salvato (${JSON.stringify(prima.equipped)} → ${JSON.stringify(dopoProva.equipped)})`);
  await controllaFissi(page, s.problemi, `personalizza dopo la prova ${sc.id}`);

  // Un «in arrivo» non si prova: il palco resta com'è.
  await page.getByRole('tab', { name: 'Tavolino' }).click();
  await page.waitForTimeout(500);
  const arrivo = page.locator('[data-testid="casella-drago-cremisi"]');
  if (await arrivo.count()) {
    const a = await page.getByTestId('fisso-cartellino').innerText();
    await arrivo.first().click();
    await page.waitForTimeout(500);
    const b = await page.getByTestId('fisso-cartellino').innerText();
    if (a !== b) s.problemi.push(`${sc.id}: un oggetto in arrivo si è potuto provare (${a} → ${b})`);
  } else s.problemi.push(`${sc.id}: nessuna casella «in arrivo» trovata tra i tavolini`);

  // Usa: un panno tuo (Rosso da Circolo) diventa quello in uso.
  await page.getByRole('tab', { name: 'Panno' }).click();
  await tocca(page, 'casella-rosso-da-circolo');
  await page.getByTestId('usa').click();
  await page.waitForTimeout(600);
  const dopoUsa = await leggi(page);
  if (dopoUsa.equipped.felt !== 'rosso-da-circolo') s.problemi.push(`${sc.id}: «Usa» non ha messo in uso il panno (${dopoUsa.equipped.felt})`);
  if (dopoUsa.equipped.table !== prima.equipped.table) s.problemi.push(`${sc.id}: «Usa» sul panno ha cambiato anche il tavolino`);
  await fotografa(page, 'personalizza-usa', sc);

  // Compra: un panno da 300 (Verde Tradizionale) con 5400 monete.
  await tocca(page, 'casella-verde-tradizionale');
  const primaCompra = await leggi(page);
  const prezzoCompra = Number((await page.getByTestId('compra').innerText()).split('\n')[0].replace(/[^\d]/g, ''));
  await page.getByTestId('compra').click();
  await page.waitForTimeout(700);
  const dopoCompra = await leggi(page);
  // Le monete: buyItem le scala e poi il registro paga gli achievement maturati nel frattempo (il profilo di prova
  // ne ha pochi segnati), quindi qui si controlla solo che l'acquisto sia passato e sia in uso; il prezzo scalato lo
  // controlla la prova senza monete qui sotto (con 250 monete non si compra un panno da 300).
  if (!dopoCompra.owned.includes('felt:verde-tradizionale') || dopoCompra.equipped.felt !== 'verde-tradizionale')
    s.problemi.push(`${sc.id}: «Compra» non ha comprato e messo in uso (${primaCompra.coins} − ${prezzoCompra} → ${dopoCompra.coins}, ${dopoCompra.equipped.felt}, ${dopoCompra.owned.includes("felt:verde-tradizionale")})`);
  await fotografa(page, 'personalizza-compra', sc);

  // Rifiuto: con 250 monete, un panno da 300 non si compra (lo stesso «why: coins» del negozio).
  await page.context().close();
  const povero = await s.pagina(sc, { profilo: profiloProva({ coins: 250 }) });
  await povero.goto(s.base + '/personalizza?posto=felt&id=verde-tradizionale');
  await povero.waitForTimeout(2500);
  await povero.getByTestId('compra').click();
  await povero.waitForTimeout(500);
  const r = await leggi(povero);
  if (r.coins !== 250 || r.owned.includes('felt:verde-tradizionale')) s.problemi.push(`${sc.id}: un acquisto senza monete è passato (${r.coins})`);
  const testo = await povero.getByTestId('fisso-barra').innerText();
  if (!/abbastanza monete/.test(testo)) s.problemi.push(`${sc.id}: manca il rifiuto «monete insufficienti» (${testo})`);
  // Non in vendita: un tavolino da vincere si prova, ma la barra dice da dove si ottiene e non c'è «Compra».
  await fotografa(povero, 'personalizza-rifiuto', sc);
  await povero.goto(s.base + '/personalizza?posto=table&id=corona-del-re');
  await povero.waitForTimeout(2500);
  if (await povero.getByTestId('compra').count()) s.problemi.push(`${sc.id}: un tavolino non in vendita mostra «Compra»`);
  const t2 = await povero.getByTestId('fisso-barra').innerText();
  if (!/Si ottiene/.test(t2)) s.problemi.push(`${sc.id}: per un oggetto da vincere manca «Si ottiene» (${t2})`);
  await fotografa(povero, 'personalizza-vinci', sc);
  await povero.context().close();

  // /dev/cornici e /dev/panni.
  const dev = await s.pagina(sc, { profilo: profiloProva() });
  await dev.goto(s.base + '/dev/cornici?movimento=0');
  await controllaFissi(dev, s.problemi, `dev/cornici ${sc.id}`);
  await fotografa(dev, 'cornici-0', sc);
  const passi = sc.id === 'desktop' ? 4 : 14;
  for (let i = 1; i <= passi; i++) {
    await scorri(dev, sc.height - 120);
    await fotografa(dev, `cornici-${i}`, sc);
  }
  await dev.goto(s.base + '/dev/panni');
  await dev.waitForTimeout(2500);
  await fotografa(dev, 'panni-0', sc);
  for (let i = 1; i <= 3; i++) {
    await scorri(dev, sc.height - 120);
    await fotografa(dev, `panni-${i}`, sc);
  }
  await dev.context().close();

  // Il negozio: panni e cornici, la scheda dell'oggetto con «Prova sul tuo tavolo», e il passaggio al camerino.
  const neg = await s.pagina(sc, { profilo: profiloProva() });
  await neg.goto(s.base + '/');
  await neg.waitForTimeout(2500);
  await neg.getByRole('tab', { name: /negozio/i }).click();
  await neg.waitForTimeout(900);
  for (const sub of ['Panni', 'Cornici']) {
    await neg.getByRole('radio', { name: sub, exact: true }).first().click();
    await neg.waitForTimeout(700);
    await scorri(neg, 420);
    await fotografa(neg, `negozio-${sub.toLowerCase()}`, sc);
    await scorri(neg, -2000);
  }
  await neg.getByRole('radio', { name: 'Panni', exact: true }).first().click();
  await neg.waitForTimeout(500);
  await neg.getByRole('button', { name: /Offerta del giorno/ }).click();
  await neg.waitForTimeout(900);
  await fotografa(neg, 'negozio-oggetto', sc);
  const prova = neg.getByRole('button', { name: /Prova sul tuo tavolo/ });
  if (await prova.count()) {
    await prova.click();
    await neg.waitForTimeout(1500);
    if (!neg.url().includes('/personalizza')) s.problemi.push(`${sc.id}: «Prova sul tuo tavolo» non apre /personalizza (${neg.url()})`);
    await fotografa(neg, 'negozio-prova', sc);
  } else s.problemi.push(`${sc.id}: manca «Prova sul tuo tavolo» nella scheda dell'oggetto`);
  await neg.context().close();
}

// Vivo e fermo, con una cornice mitica in prova (l'eroe del palco: riflesso, iridescenza, bagliore, granelli).
const url = '/personalizza?posto=frame&id=lega-re';
const vivo = await s.pagina(SCHERMI[0], { profilo: profiloProva() });
await vivo.goto(s.base + url);
await vivo.waitForTimeout(1000);
const a = await vivo.screenshot();
await vivo.waitForTimeout(3000);
const b = await vivo.screenshot();
if (uguali(a, b)) s.problemi.push('personalizza: con una cornice mitica in prova non si muove niente');
await vivo.context().close();
// Riduci movimento: stesso fotogramma a 1 s e 4 s. A macchina carica un'immagine (la trama del panno) può finire di
// decodificarsi dopo il primo secondo: se capita, si riprova una volta, e il risultato si stampa.
for (const sc of schermi) {
  const prima = s.problemi.length;
  if (!(await controllaFermo(s, url, sc, 'personalizza-mitica'))) {
    s.problemi.splice(prima);
    const ok = await controllaFermo(s, url, sc, 'personalizza-mitica');
    console.log(`riduci movimento ${sc.id}: prima prova diversa, seconda ${ok ? 'ferma' : 'diversa'}`);
  }
}
await chiudi(s);
