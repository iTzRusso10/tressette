// La logica del camerino («Il tuo tavolo», src/app/personalizza.tsx), senza React: in che stato è un oggetto per
// il giocatore, in che ordine si mostrano, cosa resta da comprare della combinazione in prova. Nessuna regola
// nuova: legge solo catalogo, negozio e fonti (src/meta) così come sono. Comprare e usare passano da
// `buyItem` ed `equip` (profile.ts) nella schermata.
//
// Export:
// - `Posto`                  'table' | 'felt' | 'back' | 'frame' | 'avatar'
// - `POSTI`, `NOME_POSTO`    i cinque posti in ordine e il loro nome nella barra delle schede
// - `postoDa(s)`             il posto da un parametro di rotta (sconosciuto → null)
// - `Prova`                  la combinazione in prova: un id per posto
// - `StatoOggetto`           'inUso' | 'tuo' | 'compra' | 'vinci' | 'arrivo'
// - `statoOggetto(...)`      lo stato di un oggetto del catalogo per questo giocatore
// - `ordina(items, ...)`     tuoi (quello in uso per primo), poi da comprare per prezzo, poi da vincere, poi in arrivo
// - `fonteBreve(item)`       da dove si ottiene, in due parole («Arena 14», «Livello 30»…), per chi non si compra
// - `daComprare(prova, ...)` gli oggetti della prova che non hai ma si comprano, con il totale
// - `provabile(item)`        si può provare sul palco (gli «in arrivo» no)
import { itemOf, keyOf, type Item, type Slot } from '@/meta/catalog';
import { rarityRank } from '@/meta/rarity';
import { buyable, ownsKey, priceOf } from '@/meta/shop';
import { sourcesOf } from '@/meta/sources';

export type Posto = Slot | 'avatar';
export const POSTI: readonly Posto[] = ['table', 'felt', 'back', 'frame', 'avatar'];
export const NOME_POSTO: Record<Posto, string> = { table: 'Tavolino', felt: 'Panno', back: 'Dorso', frame: 'Cornice', avatar: 'Avatar' };

export function postoDa(s: string | string[] | undefined): Posto | null {
  const v = Array.isArray(s) ? s[0] : s;
  return v && (POSTI as readonly string[]).includes(v) ? (v as Posto) : null;
}

export type Prova = Record<Posto, string>;

export type StatoOggetto = 'inUso' | 'tuo' | 'compra' | 'vinci' | 'arrivo';

export function statoOggetto(item: Item, owned: readonly string[], equipped: Record<Slot, string>): StatoOggetto {
  if (item.status === 'coming') return 'arrivo';
  if (equipped[item.slot] === item.id) return 'inUso';
  if (ownsKey(owned, keyOf(item))) return 'tuo';
  return buyable(item) ? 'compra' : 'vinci';
}

const PESO: Record<StatoOggetto, number> = { inUso: 0, tuo: 1, compra: 2, vinci: 3, arrivo: 4 };

export function ordina(items: readonly Item[], owned: readonly string[], equipped: Record<Slot, string>): Item[] {
  return [...items].sort((a, b) => {
    const sa = statoOggetto(a, owned, equipped);
    const sb = statoOggetto(b, owned, equipped);
    if (sa !== sb) return PESO[sa] - PESO[sb];
    if (sa === 'compra') return a.price - b.price || rarityRank(a.rarity) - rarityRank(b.rarity);
    return rarityRank(a.rarity) - rarityRank(b.rarity) || a.price - b.price;
  });
}

export function fonteBreve(item: Item): string {
  const s = sourcesOf(keyOf(item)).find(x => x.k !== 'shop' && x.k !== 'starter');
  if (!s) return 'Non in vendita';
  switch (s.k) {
    case 'arena':
      return `Arena ${s.n}`;
    case 'achievement':
      return 'Achievement';
    case 'level':
      return `Livello ${s.n}`;
    case 'prestige':
      return `Prestigio ${s.n}`;
    case 'legend':
      return `Leggenda ${s.n}`;
    case 'season':
      return 'Stagione';
    case 'event':
      return 'Evento';
    case 'league':
      return 'Fine stagione';
    case 'weekly':
      return 'Podio settimanale';
    default:
      return 'Non in vendita';
  }
}

export const provabile = (item: Item | undefined) => !!item && item.status === 'ready';

/** Gli oggetti della prova che non hai ma che si comprano, al prezzo di oggi (l'offerta del giorno è scontata). */
export function daComprare(prova: Prova, owned: readonly string[], offer: Item | null): { items: Item[]; totale: number; daVincere: Item[] } {
  const items: Item[] = [];
  const daVincere: Item[] = [];
  let totale = 0;
  for (const slot of ['table', 'felt', 'back', 'frame'] as Slot[]) {
    const it = itemOf(slot, prova[slot]);
    if (!it || ownsKey(owned, keyOf(it))) continue;
    if (buyable(it)) {
      items.push(it);
      totale += priceOf(it, offer) ?? it.price;
    } else daVincere.push(it);
  }
  return { items, totale, daVincere };
}
