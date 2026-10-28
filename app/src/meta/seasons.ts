// Le stagioni competitive: 60 giorni ciascuna, con classifica, missioni, ricompense e un cosmetico
// speciale. Una stagione non tocca mai i progressi permanenti: trofei, oggetti e titoli restano; si
// azzerano solo i punti stagione.
//
// Per aggiungere una stagione basta aggiungerla in fondo a SEASONS (e al seme della tabella `seasons`
// sul server, vedi la migrazione): le date si calcolano da sole, una dopo l'altra.

import { BALANCE } from './balance.ts';
import type { Reward } from './arenas.ts';
import type { Req } from './reqs.ts';

export interface SeasonMission {
  id: string;
  text: string;
  req: Req;
  /** Il requisito si misura dall'inizio della stagione: conta la differenza dal valore di partenza. */
  coins: number;
  xp: number;
}

export interface Season {
  id: string;
  /** 1, 2, 3… */
  n: number;
  name: string;
  /** Il cosmetico speciale (chiave del catalogo), al traguardo dei punti più alto. */
  special: string;
  /** Traguardi di punti stagione con la loro ricompensa. */
  tiers: { points: number; reward: Reward }[];
  missions: SeasonMission[];
}

const tiers = (special: string) => [
  { points: 100, reward: { coins: 300 } },
  { points: 250, reward: { coins: 600 } },
  { points: 400, reward: { items: [special] } },
  { points: 700, reward: { coins: 1500 } },
];

const S = (n: number, id: string, name: string, special: string, missions: SeasonMission[]): Season => ({ id, n, name, special, tiers: tiers(special), missions });

export const SEASONS: Season[] = [
  S(1, 'stagione-dei-re', 'La Stagione dei Re', 'table:scacchiera-imperiale', [
    { id: 'vittorie', text: 'Vinci 40 partite in questa stagione.', req: { k: 'stat', key: 'won', n: 40 }, coins: 800, xp: 400 },
    { id: 'esperto', text: 'Vinci 10 partite contro l’Esperto.', req: { k: 'stat', key: 'expertWins', n: 10 }, coins: 1000, xp: 500 },
    { id: 'quattro', text: 'Vinci 10 partite in quattro.', req: { k: 'stat', key: 'won4', n: 10 }, coins: 600, xp: 300 },
  ]),
  S(2, 'trionfo-degli-assi', 'Il Trionfo degli Assi', 'felt:sole-cremisi', [
    { id: 'briscola', text: 'Vinci 20 partite a Briscola.', req: { k: 'game', game: 'briscola', what: 'won', n: 20 }, coins: 800, xp: 400 },
    { id: 'serie', text: 'Vinci 5 partite di fila.', req: { k: 'stat', key: 'bestStreak', n: 5 }, coins: 800, xp: 400 },
    { id: 'mani', text: 'Vinci 60 mani di Briscola.', req: { k: 'stat', key: 'briscolaHandsWon', n: 60 }, coins: 600, xp: 300 },
  ]),
  S(3, 'corona-d-oro', 'La Corona d’Oro', 'felt:ricamo-d-oro', [
    { id: 'scopa', text: 'Vinci 20 partite a Scopa.', req: { k: 'game', game: 'scopa', what: 'won', n: 20 }, coins: 800, xp: 400 },
    { id: 'scope', text: 'Fai 60 scope.', req: { k: 'stat', key: 'scope', n: 60 }, coins: 800, xp: 400 },
    { id: 'settebello', text: 'Prendi il Settebello 20 volte.', req: { k: 'stat', key: 'settebelli', n: 20 }, coins: 600, xp: 300 },
  ]),
  S(4, 'regno-dei-maestri', 'Il Regno dei Maestri', 'back:sole-nero', [
    { id: 'tressette', text: 'Vinci 20 partite a Tressette.', req: { k: 'game', game: 'tressette', what: 'won', n: 20 }, coins: 800, xp: 400 },
    { id: 'napoletane', text: 'Accusa 5 Napoletane.', req: { k: 'stat', key: 'napoletane', n: 5 }, coins: 800, xp: 400 },
    { id: 'ultime', text: 'Prendi l’ultima 30 volte.', req: { k: 'stat', key: 'ultime', n: 30 }, coins: 600, xp: 300 },
  ]),
  S(5, 'notte-degli-immortali', 'La Notte degli Immortali', 'back:dimensione-oscura', [
    { id: 'esperto', text: 'Vinci 15 partite contro l’Esperto.', req: { k: 'stat', key: 'expertWins', n: 15 }, coins: 1000, xp: 500 },
    { id: 'perdere', text: 'Vinci 10 partite a Tressette a perdere.', req: { k: 'stat', key: 'perdereWins', n: 10 }, coins: 800, xp: 400 },
    { id: 'giorni', text: 'Gioca in 20 giorni diversi.', req: { k: 'stat', key: 'days', n: 20 }, coins: 600, xp: 300 },
  ]),
  S(6, 'sfida-delle-tre-carte', 'La Sfida delle Tre Carte', 'felt:eclissi-totale', [
    { id: 'tre-giochi', text: 'Vinci 10 partite in ciascuno dei tre giochi.', req: { k: 'allGames', what: 'won', n: 10 }, coins: 1000, xp: 500 },
    { id: 'vittorie', text: 'Vinci 50 partite in questa stagione.', req: { k: 'stat', key: 'won', n: 50 }, coins: 800, xp: 400 },
    { id: 'online', text: 'Gioca 10 partite online.', req: { k: 'stat', key: 'onlinePlayed', n: 10 }, coins: 600, xp: 300 },
  ]),
];

/* ---------------------------------------------------------------- calendario */

const toUtc = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
const DAY = 86400000;

export interface SeasonWindow {
  season: Season;
  /** Primo giorno e ultimo giorno (compreso), AAAA-MM-GG. */
  start: string;
  end: string;
}

export function seasonWindow(s: Season): SeasonWindow {
  const t0 = toUtc(BALANCE.seasons.firstStart) + (s.n - 1) * BALANCE.seasons.days * DAY;
  return { season: s, start: fromUtc(t0), end: fromUtc(t0 + (BALANCE.seasons.days - 1) * DAY) };
}

/** La stagione in corso in un giorno (AAAA-MM-GG), o null prima della prima e dopo l'ultima definita. */
export function seasonAt(day: string): SeasonWindow | null {
  const k = Math.floor((toUtc(day) - toUtc(BALANCE.seasons.firstStart)) / (BALANCE.seasons.days * DAY));
  const s = SEASONS[k];
  return k >= 0 && s ? seasonWindow(s) : null;
}

/** Giorni che restano (compreso oggi). */
export const daysLeft = (w: SeasonWindow, day: string) => Math.max(0, Math.round((toUtc(w.end) - toUtc(day)) / DAY) + 1);

/** La prossima stagione dopo un giorno. */
export function nextSeason(day: string): SeasonWindow | null {
  for (const s of SEASONS) {
    const w = seasonWindow(s);
    if (w.start > day) return w;
  }
  return null;
}

export const seasonById = (id: string) => SEASONS.find(s => s.id === id);
