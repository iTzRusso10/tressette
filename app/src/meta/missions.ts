// Missioni giornaliere e settimanali. Ogni giorno (e ogni settimana, da lunedì) ne escono alcune dal
// mazzo delle missioni, scelte con un seme del giocatore: le stesse sul telefono e sul server. Si
// completano giocando e la ricompensa arriva da sola, una volta sola per periodo (chiave `periodo:id`).

import type { GameId } from '../engine/types.ts';
import { BALANCE } from './balance.ts';
import type { MatchRecord } from './progress.ts';

export type Period = 'daily' | 'weekly';

/** Quello che serve a una missione per avanzare. */
export interface MissionEvent {
  match?: MatchRecord & { trophyDelta: number; streak: number; equippedKey: string; lastEquippedKey: string | null };
  /** Una missione giornaliera appena completata (per le settimanali che le contano). */
  dailyDone?: boolean;
  /** Un oggetto estetico nuovo ottenuto. */
  newItem?: boolean;
}

export interface MissionDef {
  id: string;
  period: Period;
  text: string;
  goal: number;
  coins: number;
  xp: number;
  /** Di quanto avanza con un evento (o, con `max`, il valore raggiunto). */
  step: (e: MissionEvent, seen: string[]) => number;
  /** Il progresso è il massimo raggiunto, non la somma (vittorie di fila). */
  max?: boolean;
  /** Serve aver già giocato online (per non dare missioni impossibili a chi gioca da solo). */
  online?: boolean;
  /** Tiene una lista di cose viste nel periodo (per «una partita per gioco»). */
  distinct?: (e: MissionEvent) => string | null;
}

const won = (g?: GameId) => (e: MissionEvent) => (e.match && e.match.won && (!g || e.match.game === g) ? 1 : 0);
const played = (g?: GameId) => (e: MissionEvent) => (e.match && (!g || e.match.game === g) ? 1 : 0);

const D = (id: string, text: string, goal: number, coins: number, xp: number, step: MissionDef['step'], extra: Partial<MissionDef> = {}): MissionDef => ({
  id,
  period: 'daily',
  text,
  goal,
  coins,
  xp,
  step,
  ...extra,
});
const W = (id: string, text: string, goal: number, coins: number, xp: number, step: MissionDef['step'], extra: Partial<MissionDef> = {}): MissionDef => ({
  id,
  period: 'weekly',
  text,
  goal,
  coins,
  xp,
  step,
  ...extra,
});

export const MISSIONS: MissionDef[] = [
  // Giornaliere: 30–100 monete.
  D('vinci-scopa-2', 'Vinci 2 partite di Scopa.', 2, 60, 60, won('scopa')),
  D('vinci-briscola-3', 'Vinci 3 partite di Briscola.', 3, 80, 80, won('briscola')),
  D('gioca-tressette-2', 'Completa 2 partite di Tressette.', 2, 50, 50, played('tressette')),
  D('gioca-5', 'Gioca 5 partite fino in fondo.', 5, 70, 70, played()),
  D('vinci-1', 'Vinci una partita, portandola fino in fondo.', 1, 30, 40, won()),
  D('trofei-20', 'Guadagna 20 trofei.', 20, 60, 60, e => Math.max(0, e.match?.trophyDelta ?? 0)),
  D('tre-giochi', 'Completa una partita in ciascuno dei tre giochi.', 3, 100, 100, () => 0, { distinct: e => e.match?.game ?? null }),
  D(
    'cosmetico-nuovo',
    'Completa una partita cambiando tavolino, panno o dorso rispetto alla partita prima.',
    1,
    50,
    50,
    e => (e.match && e.match.lastEquippedKey && e.match.equippedKey !== e.match.lastEquippedKey ? 1 : 0),
  ),
  D('vinci-medio-2', 'Vinci 2 partite contro il Medio o l’Esperto.', 2, 80, 80, e => (e.match && e.match.won && !e.match.online && e.match.level !== 'facile' ? 1 : 0)),
  D('vinci-quattro', 'Vinci una partita in quattro.', 1, 60, 60, e => (e.match && e.match.won && e.match.mode === '4' ? 1 : 0)),
  // Settimanali: 200–500 monete.
  W('vinci-25', 'Vinci 25 partite.', 25, 500, 400, won()),
  W('cinque-per-gioco', 'Vinci almeno 5 partite in ciascuno dei tre giochi.', 15, 450, 400, () => 0, {
    distinct: e => (e.match?.won ? e.match.game : null),
  }),
  W('trofei-100', 'Guadagna 100 trofei.', 100, 300, 300, e => Math.max(0, e.match?.trophyDelta ?? 0)),
  W('quindici-giornaliere', 'Completa 15 missioni giornaliere.', 15, 400, 400, e => (e.dailyDone ? 1 : 0)),
  W('cinque-di-fila', 'Vinci 5 partite di fila.', 5, 350, 300, e => e.match?.streak ?? 0, { max: true }),
  W('online-10', 'Completa 10 partite online.', 10, 400, 300, e => (e.match?.online ? 1 : 0), { online: true }),
  W('nuovo-oggetto', 'Ottieni un nuovo oggetto estetico.', 1, 200, 200, e => (e.newItem ? 1 : 0)),
  W('esperto-5', 'Vinci 5 partite contro l’Esperto.', 5, 400, 400, e => (e.match && e.match.won && !e.match.online && e.match.level === 'difficile' ? 1 : 0)),
  W('gioca-40', 'Gioca 40 partite fino in fondo.', 40, 300, 300, played()),
];

/** Per «5 vittorie in ciascun gioco»: il progresso è la somma dei minimi (al massimo 5 per gioco). */
export function distinctProgress(def: MissionDef, seen: string[]): number {
  if (def.id === 'cinque-per-gioco') {
    const per = (g: string) => Math.min(5, seen.filter(x => x === g).length);
    return per('tressette') + per('briscola') + per('scopa');
  }
  return new Set(seen).size;
}

const byId = new Map(MISSIONS.map(m => [m.id, m]));
export const missionById = (id: string) => byId.get(id);

/* ---------------------------------------------------------------- periodi */

const toUtc = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** La settimana di un giorno, dal lunedì: «2026-W44» (settimana ISO). */
export function weekOf(day: string): string {
  const t = new Date(toUtc(day));
  const dow = (t.getUTCDay() + 6) % 7; // lunedì = 0
  t.setUTCDate(t.getUTCDate() - dow + 3); // il giovedì della settimana
  const y = t.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round((t.getTime() - jan4.getTime()) / 86400000 / 7 - ((jan4.getUTCDay() + 6) % 7) / 7 + 3 / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

/** Giorni che mancano a lunedì (fine della settimana), compreso oggi. */
export function daysToWeekEnd(day: string): number {
  const dow = (new Date(toUtc(day)).getUTCDay() + 6) % 7;
  return 7 - dow;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Le missioni di un periodo: `count` diverse, scelte dal seme del giocatore e dal periodo. */
export function missionsFor(period: Period, key: string, seed: string, canOnline: boolean): MissionDef[] {
  const pool = MISSIONS.filter(m => m.period === period && (!m.online || canOnline));
  const count = period === 'daily' ? BALANCE.missions.daily : BALANCE.missions.weekly;
  const picked: MissionDef[] = [];
  let h = hash(`${seed}|${key}`);
  const left = pool.slice();
  while (picked.length < count && left.length) {
    const i = h % left.length;
    picked.push(left.splice(i, 1)[0]);
    h = hash(`${h}`);
  }
  return picked;
}
