// Scrive docs/asset-mancanti.md: l'elenco preciso delle illustrazioni da creare, preso dal catalogo
// (tutti gli oggetti «in arrivo», con tema, palette, stile e uso). Da rilanciare quando cambia il catalogo.
// Uso: node scripts/asset-mancanti.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ITEMS, CATEGORY_NAMES, SLOT_NAME } = await import('../src/meta/catalog.ts');
const { RARITY_NAMES } = await import('../src/meta/rarity.ts');
const { sourcesOf, sourceText } = await import('../src/meta/sources.ts');
const { SETS, setParts } = await import('../src/meta/sets.ts');

const coming = ITEMS.filter(i => i.status === 'coming');
const key = i => `${i.slot}:${i.id}`;

const SPEC = {
  table: [
    'Formato: SVG vettoriale (preferito) o PNG 2048×1280 con trasparenza, solo la sponda: l’interno (il panno) deve restare vuoto/trasparente.',
    'La sponda sul tavolo è spessa 9 punti su un panno di circa 350×410 punti: i dettagli devono leggersi a quella misura e a 60 px di larghezza nelle anteprime.',
    'Si consegnano anche i quattro angoli separati (fregi) se il soggetto è sugli angoli, per poterli scalare senza deformarli.',
  ],
  felt: [
    'Formato: SVG vettoriale (preferito) o PNG 2048×2400 senza sponda, angoli arrotondati applicati dal gioco.',
    'Le carte bianche si posano al centro e devono restare leggibili: soggetto tono su tono, contrasto basso nella zona centrale (circa 60% della larghezza), dettagli forti solo verso i bordi.',
    'Il gioco aggiunge sopra trama del tessuto, luce della lampada e velluto: l’illustrazione non deve averli già dipinti.',
  ],
  back: [
    'Formato: PNG 720×1150 (proporzioni delle carte, 360×575), con la cornice bianca di 12 px uguale agli altri dorsi; consegna anche il sorgente vettoriale.',
    'Simmetrico per rotazione di 180° (le carte si vedono anche capovolte).',
    'Deve leggersi su una carta larga 50 punti sul tavolo: medaglione centrale grande, niente dettagli che diventano rumore, niente testo.',
  ],
};

const lines = [];
lines.push('# Asset grafici da creare');
lines.push('');
lines.push('Generato da `app/scripts/asset-mancanti.mjs` a partire da `app/src/meta/catalog.ts`. Non modificarlo a mano: cambia il catalogo e rilancia lo script.');
lines.push('');
lines.push(`Sono **${coming.length} oggetti** in catalogo con lo stato «in arrivo»: si vedono nel negozio e nell’inventario con un’anteprima onesta («In arrivo»), non si comprano e non si mettono sul tavolo finché non c’è l’illustrazione. Chi li vince (arene, achievement, eventi) li possiede già e li potrà usare appena pronti.`);
lines.push('');
lines.push('## Stile comune');
lines.push('');
lines.push('- Direzione «Tramonto» del gioco: colori pieni e caldi, forme pulite, luce dall’alto, nessun effetto fotografico. Stessa mano per tutti gli oggetti (un solo illustratore o uno stile guida unico).');
lines.push('- Illustrazioni originali: niente immagini prese dal web, niente figure copiate da mazzi esistenti, niente marchi.');
lines.push('- La rarità si deve sentire: comune/non comune semplici; epico ricco; leggendario con oro e luce; mitico il più prezioso, ma sempre leggibile.');
lines.push('- Nessun oggetto dà vantaggi in partita: niente che copra o confonda valori e semi delle carte.');
lines.push('');
lines.push('## Come aggiungerli');
lines.push('');
lines.push('1. Tavolini e panni: un disegno nuovo in `app/src/game/Felt.tsx` (sponde: materiali ed `emblem`; panni: `designOf`), oppure un’immagine registrata come i dorsi.');
lines.push('2. Dorsi: il PNG in `app/assets/backs/<id>.png` e la voce in `app/src/game/backImages.ts` (lo rigenera `node scripts/make-art.mjs`).');
lines.push('3. Nel catalogo togli `coming` dall’oggetto: diventa «pronto», si compra (se è in vendita) e si usa. Il resto (negozio, inventario, set, achievement) non cambia.');
lines.push('');

for (const slot of ['table', 'felt', 'back']) {
  const list = coming.filter(i => i.slot === slot);
  if (!list.length) continue;
  lines.push(`## ${slot === 'table' ? 'Tavolini' : slot === 'felt' ? 'Grafiche del panno' : 'Dorsi delle carte'} (${list.length})`);
  lines.push('');
  for (const s of SPEC[slot]) lines.push(`- ${s}`);
  lines.push('');
  lines.push('| N. | Id | Nome | Categoria | Rarità | Tema | Palette | Si ottiene | Set |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const i of list) {
    const sets = SETS.filter(s => setParts(s).includes(key(i))).map(s => s.name).join(', ') || '—';
    const src = sourcesOf(key(i)).map(sourceText).join('; ');
    lines.push(`| ${i.n ?? '—'} | \`${i.id}\` | ${i.name} | ${CATEGORY_NAMES[i.category]} | ${RARITY_NAMES[i.rarity]} | ${i.art.theme} | ${i.art.palette.map(c => `\`${c}\``).join(' ')} | ${src} | ${sets} |`);
  }
  lines.push('');
  lines.push('Note per ciascuno:');
  lines.push('');
  for (const i of list) lines.push(`- **${i.name}** (${SLOT_NAME[i.slot]}, \`${i.id}\`): ${i.art.notes}`);
  lines.push('');
}

const out = join(root, '..', 'docs', 'asset-mancanti.md');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n'));
console.log(`scritto ${out}: ${coming.length} oggetti in arrivo`);
