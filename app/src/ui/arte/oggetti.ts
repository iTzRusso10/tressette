// «Lampara»: i dati visivi di tavolini, panni e dorsi in vetrina (pacchetto B3, docs/direzione-artistica.md
// §5.6, §5.7; docs/tecnologie-grafica.md «Panni», «Tavolini», «Dorsi»). Il catalogo dice cosa è un oggetto e
// Felt.tsx / make-art.mjs lo disegnano; qui si dice come si presenta in vetrina: quale trama cotta va sulla sponda
// e sul panno, se il metallo o il vetro prendono un riflesso che passa, quanto è lucida la carta del dorso.
// Il tavolo in partita non usa niente di questo file.
//
// Export:
// - `MATERIALE_SPONDA`     per ogni `TableLook.rail`: nome a parole, trama cotta (o null), opacità, riflesso (vetro e
//                          metallo: netto; lacca: largo; legno e cuoio: nessuno)
// - `vetrinaTavolino(id)`  { materiale, trama, opacita, riflesso, anima } per un tavolino: `anima` se il riflesso può
//                          passare (sponda lucida e rarità ≥ epico)
// - `vetrinaPanno(id)`     { trama, opacita, velluto } la grana del tessuto per un panno
// - `vetrinaDorso(id)`     { lucido (0…1), anima } la vernice della carta: dall'epico il riflesso passa
// - `rarityOf(slot, id)`   la rarità di un oggetto (comune se sconosciuto)
//
// Solo dati.
import { itemOf, type Slot, type TableLook } from '@/meta/catalog';
import type { Rarity } from '@/meta/rarity';
import { RARITA } from './rarita';
import type { NomeTrama } from './trame';

export interface MaterialeSponda {
  nome: string;
  trama: NomeTrama | null;
  opacita: number;
  riflesso: 'netto' | 'largo' | null;
}

export const MATERIALE_SPONDA: Record<TableLook['rail'], MaterialeSponda> = {
  glass: { nome: 'vetro', trama: null, opacita: 0, riflesso: 'netto' },
  wood: { nome: 'legno', trama: 'legno', opacita: 0.5, riflesso: null },
  leather: { nome: 'cuoio', trama: 'cuoio', opacita: 0.55, riflesso: null },
  metal: { nome: 'metallo', trama: 'spazzolato', opacita: 0.5, riflesso: 'netto' },
  stone: { nome: 'pietra', trama: 'marmo', opacita: 0.25, riflesso: 'largo' },
  crystal: { nome: 'cristallo', trama: null, opacita: 0, riflesso: 'netto' },
  lacquer: { nome: 'lacca', trama: 'crepe', opacita: 0.25, riflesso: 'largo' },
  cosmic: { nome: 'cielo', trama: null, opacita: 0, riflesso: 'largo' },
};

/** Il materiale a parole quando il catalogo non basta (la radica è legno, il ferro brunito metallo…). */
const NOMI: Record<string, string> = {
  'radica-di-lusso': 'radica di noce',
  'ulivo-calabrese': 'legno d’ulivo',
  'ebano-reale': 'ebano',
  'tavolo-veneziano': 'lacca rossa e oro',
  'notte-stellata': 'lacca blu notte',
  'abisso-nero': 'lacca nera',
  'granito-nero': 'granito',
  'giada-orientale': 'giada',
  'scacchiera-imperiale': 'intarsio di marmo',
  'tempesta-d-argento': 'argento spazzolato',
  'diamante-eterno': 'platino',
  crono: 'bronzo',
  'l-ultimo-re': 'ferro brunito',
};

const ALTE: readonly Rarity[] = ['epico', 'leggendario', 'mitico'];

export function rarityOf(slot: Slot, id: string): Rarity {
  return itemOf(slot, id)?.rarity ?? 'comune';
}

export function vetrinaTavolino(id: string) {
  const it = itemOf('table', id);
  const rail: TableLook['rail'] = it?.slot === 'table' ? it.look.rail : 'glass';
  const m = MATERIALE_SPONDA[rail];
  const r = it?.rarity ?? 'comune';
  return { materiale: NOMI[id] ?? m.nome, trama: m.trama, opacita: m.opacita, riflesso: m.riflesso, rarita: r, anima: !!m.riflesso && ALTE.includes(r) };
}

export function vetrinaPanno(id: string) {
  const it = itemOf('felt', id);
  const velluto = it?.slot === 'felt' ? it.look.velvet : false;
  return { trama: (velluto ? 'velluto' : 'panno') as NomeTrama, opacita: velluto ? 0.2 : 0.22, velluto };
}

export function vetrinaDorso(id: string) {
  const r = rarityOf('back', id);
  return { lucido: RARITA[r].riflesso.opacita, rarita: r, anima: ALTE.includes(r) };
}
