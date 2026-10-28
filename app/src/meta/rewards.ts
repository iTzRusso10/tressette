// Ricompense dei percorsi lunghi: livelli, gradi di Prestigio (dopo il livello 100), gradi di Leggenda
// (dopo l'ultima arena) ed eventi.

import type { Reward } from './arenas.ts';
import { BALANCE } from './balance.ts';

/** Ogni livello dà monete; i livelli tondi anche un oggetto del negozio in regalo. */
export const LEVEL_GIFTS: Record<number, string> = {
  10: 'table:pino-mediterraneo',
  20: 'felt:tricolore-italiano',
  30: 'back:tricolore',
  40: 'table:ciliegio-rosso',
  50: 'felt:firenze-rinascimentale',
  60: 'back:roma-imperiale',
  70: 'table:radica-di-lusso',
  80: 'felt:onice-nero',
  90: 'back:galassia',
  100: 'table:abisso-nero',
};

export function levelReward(level: number): Reward {
  const coins = BALANCE.levelCoins.base + BALANCE.levelCoins.per * level;
  const gift = LEVEL_GIFTS[level];
  return { coins, ...(gift ? { items: [gift] } : {}) };
}

/** Gradi di Prestigio con un oggetto in più (il titolo Gloria Eterna arriva al 10 dal suo requisito). */
export const PRESTIGE_GIFTS: Record<number, string> = {
  5: 'table:crono',
};

export function prestigeReward(n: number): Reward {
  const gift = PRESTIGE_GIFTS[n];
  return { coins: BALANCE.prestigeCoins, ...(gift ? { items: [gift] } : {}) };
}

/** Gradi di Leggenda (ogni 200 trofei oltre l'ultima arena). */
export const LEGEND_GIFTS: Record<number, string> = {
  5: 'table:il-tavolo-leggendario',
  10: 'felt:il-panno-degli-immortali',
  15: 'back:corona-degli-immortali',
};

export function legendReward(n: number): Reward {
  const gift = LEGEND_GIFTS[n];
  return { coins: BALANCE.legendCoins, ...(gift ? { items: [gift] } : {}) };
}

/** Eventi previsti: gli oggetti esistono già in catalogo e si otterranno quando l'evento sarà attivo. */
export const EVENTS: { id: string; name: string; items: string[]; active: false }[] = [
  { id: 'primo-evento', name: 'Il primo evento', items: ['felt:tigre-notturna', 'back:serpente-mistico'], active: false },
];
