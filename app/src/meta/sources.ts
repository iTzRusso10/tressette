// Da dove si ottiene ogni oggetto: si ricava dalle ricompense (arene, achievement, livelli, stagioni,
// eventi) e dal negozio, così il catalogo non può dire una cosa e le ricompense un'altra.

import { ACHIEVEMENTS } from './achievements.ts';
import { ARENAS } from './arenas.ts';
import { ITEMS, keyOf, STARTER_KEYS } from './catalog.ts';
import { EVENTS, LEGEND_GIFTS, LEVEL_GIFTS, PRESTIGE_GIFTS } from './rewards.ts';
import { SEASONS } from './seasons.ts';
import { EVENT_TEMPLATES } from './events.ts';
import { LEAGUES } from './rating.ts';

export type Source =
  | { k: 'starter' }
  | { k: 'shop' }
  | { k: 'arena'; n: number; name: string }
  | { k: 'achievement'; id: string; name: string }
  | { k: 'level'; n: number }
  | { k: 'prestige'; n: number }
  | { k: 'legend'; n: number }
  | { k: 'season'; id: string; name: string }
  | { k: 'event'; id: string; name: string }
  | { k: 'league'; name: string }
  | { k: 'weekly' };

const map = new Map<string, Source[]>();
const add = (key: string, s: Source) => map.set(key, [...(map.get(key) ?? []), s]);

for (const k of STARTER_KEYS) add(k, { k: 'starter' });
for (const i of ITEMS) if (i.shop) add(keyOf(i), { k: 'shop' });
for (const a of ARENAS) for (const k of a.reward.items ?? []) add(k, { k: 'arena', n: a.n, name: a.name });
for (const a of ACHIEVEMENTS) for (const k of a.items ?? []) add(k, { k: 'achievement', id: a.id, name: a.name });
for (const [n, k] of Object.entries(LEVEL_GIFTS)) add(k, { k: 'level', n: Number(n) });
for (const [n, k] of Object.entries(PRESTIGE_GIFTS)) add(k, { k: 'prestige', n: Number(n) });
for (const [n, k] of Object.entries(LEGEND_GIFTS)) add(k, { k: 'legend', n: Number(n) });
for (const s of SEASONS) add(s.special, { k: 'season', id: s.id, name: s.name });
for (const e of EVENTS) for (const k of e.items) add(k, { k: 'event', id: e.id, name: e.name });
for (const t of EVENT_TEMPLATES) for (const r of t.rewards) for (const k of r.items ?? []) add(k, { k: 'event', id: t.id, name: t.name });
for (const l of LEAGUES) add(`frame:${l.frame}`, { k: 'league', name: l.name });
add('frame:podio-settimana', { k: 'weekly' });

export const sourcesOf = (key: string): Source[] => map.get(key) ?? [];

/** Come si ottiene, in una riga. */
export function sourceText(s: Source): string {
  switch (s.k) {
    case 'starter':
      return 'Ce l’hai dall’inizio';
    case 'shop':
      return 'Nel negozio';
    case 'arena':
      return `Arena ${s.n}: ${s.name}`;
    case 'achievement':
      return `Achievement «${s.name}»`;
    case 'level':
      return `Livello ${s.n}`;
    case 'prestige':
      return `Prestigio ${s.n}`;
    case 'legend':
      return `Leggenda, grado ${s.n}`;
    case 'season':
      return `Stagione «${s.name}»`;
    case 'event':
      return EVENT_TEMPLATES.some(t => t.id === s.id) ? `Evento «${s.name}»` : 'Con un evento (in arrivo)';
    case 'league':
      return `Chiudendo una stagione nella ${s.name} (o più su)`;
    case 'weekly':
      return 'Sul podio di una classifica settimanale';
  }
}
