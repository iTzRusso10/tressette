// Gli eventi a tempo: un calendario che si ripete ogni cinque settimane, senza valute nuove. Ogni evento
// misura qualcosa che c'è già nelle statistiche (vittorie in un gioco, scope, partite, vittorie contro
// l'Esperto) da quando comincia, e ha tre traguardi: monete, monete, e la sua cornice esclusiva (chi
// ce l'ha già riceve monete al suo posto). Le ricompense finiscono tra quelle da riscuotere.

import type { Reward } from './arenas.ts';
import type { Stats } from './progress.ts';

export interface EventTemplate {
  id: string;
  name: string;
  desc: string;
  /** Cosa si conta, in parole («vittorie a Scopa»). */
  unit: string;
  metric: (s: Stats) => number;
  /** Traguardi in ordine. */
  tiers: number[];
  rewards: Reward[];
  /** Solo il fine settimana (venerdì–domenica) o tutta la settimana. */
  weekend: boolean;
  /** Colori dell'evento: fondo, accento. */
  colors: [string, string];
  /** Il gioco protagonista (per la scheda in Gioca), se c'è. */
  game?: 'tressette' | 'briscola' | 'scopa';
}

const three = (frame: string, a: number, b: number): Reward[] => [{ coins: a }, { coins: b }, { items: [`frame:${frame}`], coins: 300 }];

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'settimana-tressette',
    name: 'Settimana del Tressette',
    desc: 'Sette giorni per i maestri del Tressette, accusi e ultime comprese.',
    unit: 'vittorie a Tressette',
    metric: s => s.byGame.tressette.won,
    tiers: [5, 10, 15],
    rewards: three('evento-tressette', 300, 600),
    weekend: false,
    colors: ['#5A2A08', '#FFA94D'],
    game: 'tressette',
  },
  {
    id: 'weekend-scopa',
    name: 'Weekend della Scopa',
    desc: 'Tre giorni per spazzare il tavolo: conta ogni scopa.',
    unit: 'scope',
    metric: s => s.scope,
    tiers: [10, 25, 40],
    rewards: three('evento-scopa', 300, 600),
    weekend: true,
    colors: ['#2A0E52', '#9B6BFF'],
    game: 'scopa',
  },
  {
    id: 'coppa-briscola',
    name: 'Coppa di Briscola',
    desc: 'Una settimana di Briscola: ogni vittoria avvicina la coppa.',
    unit: 'vittorie a Briscola',
    metric: s => s.byGame.briscola.won,
    tiers: [5, 10, 15],
    rewards: three('evento-briscola', 300, 600),
    weekend: false,
    colors: ['#52102E', '#FF6B9A'],
    game: 'briscola',
  },
  {
    id: 'festa-carte',
    name: 'Festa delle Carte',
    desc: 'Un fine settimana di festa: ogni partita finita conta, a qualunque gioco.',
    unit: 'partite finite',
    metric: s => s.played,
    tiers: [8, 16, 24],
    rewards: three('evento-festa', 300, 500),
    weekend: true,
    colors: ['#0E3A2E', '#7CF2D2'],
  },
  {
    id: 'evento-maestri',
    name: 'Evento dei Maestri',
    desc: 'Una settimana contro il computer Esperto: solo per chi non ha paura.',
    unit: 'vittorie contro l’Esperto',
    metric: s => s.expertWins,
    tiers: [3, 7, 12],
    rewards: three('evento-maestri', 400, 800),
    weekend: false,
    colors: ['#1A1030', '#E8BE4F'],
  },
];

/** Lunedì da cui parte il calendario: la Settimana del Tressette del 26 ottobre 2026. */
export const EVENTS_FROM = '2026-10-26';

const DAY = 86400000;
const toUtc = (d: string) => {
  const [y, m, g] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, g);
};
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);

export interface EventWindow {
  /** Unico per ogni edizione: «weekend-scopa-2026-11-06». */
  id: string;
  template: EventTemplate;
  start: string;
  /** Ultimo giorno compreso. */
  end: string;
}

function windowOfWeek(k: number): EventWindow {
  const t = EVENT_TEMPLATES[((k % EVENT_TEMPLATES.length) + EVENT_TEMPLATES.length) % EVENT_TEMPLATES.length];
  const monday = toUtc(EVENTS_FROM) + k * 7 * DAY;
  const start = fromUtc(monday + (t.weekend ? 4 : 0) * DAY);
  const end = fromUtc(monday + 6 * DAY);
  return { id: `${t.id}-${start}`, template: t, start, end };
}

const weekIndex = (day: string) => Math.floor((toUtc(day) - toUtc(EVENTS_FROM)) / (7 * DAY));

/** L'evento in corso in un giorno, o null (tra un fine settimana e l'altro non c'è niente). */
export function eventAt(day: string): EventWindow | null {
  const k = weekIndex(day);
  if (k < 0) return null;
  const w = windowOfWeek(k);
  return day >= w.start && day <= w.end ? w : null;
}

/** Il prossimo evento dopo un giorno. */
export function nextEvent(day: string): EventWindow {
  let k = Math.max(0, weekIndex(day));
  for (;;) {
    const w = windowOfWeek(k);
    if (w.start > day) return w;
    k++;
  }
}

export const daysLeftIn = (w: { end: string }, day: string) => Math.max(0, Math.round((toUtc(w.end) - toUtc(day)) / DAY) + 1);
export const daysUntil = (w: { start: string }, day: string) => Math.max(0, Math.round((toUtc(w.start) - toUtc(day)) / DAY));

export const templateById = (id: string) => EVENT_TEMPLATES.find(t => id.startsWith(`${t.id}-`) || t.id === id);
