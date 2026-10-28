// Il negozio: cosa si compra, a che prezzo, l'offerta del giorno. Il catalogo è in catalog.ts.

import { itemByKey, itemOf, keyOf, STARTER_KEYS, type Item, type Slot } from './catalog.ts';

export * from './catalog.ts';
export { RARITY_NAMES, RARITIES, type Rarity } from './rarity.ts';

/** Si può comprare adesso: in vendita e pronto (gli oggetti «in arrivo» no). */
export const buyable = (i: Item) => i.shop && i.status === 'ready' && i.price > 0;

/** Un oggetto al giorno scontato, lo stesso per tutti nello stesso giorno. */
export const OFFER_DISCOUNT = 0.3;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** L'offerta di oggi (`day` AAAA-MM-GG): un oggetto in vendita che non hai ancora. */
export function offerOf(day: string, owned: readonly string[], items: readonly Item[]): Item | null {
  const pool = items.filter(i => buyable(i) && !owned.includes(keyOf(i)));
  if (!pool.length) return null;
  return pool[hash(day) % pool.length];
}

export function priceOf(item: Item, day: string, owned: readonly string[], items: readonly Item[]): number | null {
  if (!buyable(item)) return null;
  const offer = offerOf(day, owned, items);
  return offer && keyOf(offer) === keyOf(item) ? Math.round((item.price * (1 - OFFER_DISCOUNT)) / 10) * 10 : item.price;
}

/** Si può mettere sul tavolo: posseduto (o di partenza) e pronto. */
export function canEquip(slot: Slot, id: string, owned: readonly string[]): boolean {
  const item = itemOf(slot, id);
  const key = `${slot}:${id}`;
  return !!item && item.status === 'ready' && (owned.includes(key) || STARTER_KEYS.includes(key));
}

export const ownsKey = (owned: readonly string[], key: string) => owned.includes(key) || STARTER_KEYS.includes(key);

export { itemByKey };
