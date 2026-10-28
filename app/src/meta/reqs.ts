// Requisiti verificabili: lo stesso piccolo linguaggio per achievement, titoli, requisiti delle arene e
// missioni stagionali. Ognuno dice a che punto sei ([adesso, obiettivo]) e come si legge in italiano.

import type { GameId } from '../engine/types.ts';
import { BALANCE } from './balance.ts';
import { itemByKey, type Slot } from './catalog.ts';
import { levelInfo } from './levels.ts';
import type { Stats } from './progress.ts';

/** I contatori numerici delle statistiche. */
export type StatKey = Exclude<{ [K in keyof Stats]: Stats[K] extends number ? K : never }[keyof Stats], undefined>;

export type Req =
  | { k: 'start' }
  | { k: 'stat'; key: StatKey; n: number }
  | { k: 'game'; game: GameId; what: 'played' | 'won' | 'expert'; n: number }
  /** In tutti e tre i giochi. */
  | { k: 'allGames'; what: 'played' | 'won' | 'expert'; n: number }
  /** Arena raggiunta (1…30). */
  | { k: 'arena'; n: number }
  /** Record di trofei. */
  | { k: 'best'; n: number }
  | { k: 'level'; n: number }
  | { k: 'prestige'; n: number }
  | { k: 'legend'; n: number }
  | { k: 'achievements'; n: number }
  | { k: 'owned'; slot?: Slot; n: number }
  | { k: 'sets'; n: number }
  /** Chiudere una stagione entro questa posizione (1 = primo). */
  | { k: 'seasonRank'; n: number }
  | { k: 'seasonItems'; n: number }
  /** Arriva con gli eventi (tornei): oggi non si può ancora ottenere. */
  | { k: 'event'; id: string; what: string };

/** Quello che serve per verificare un requisito: lo stato del giocatore (vedi ledger.ts). */
export interface ReqView {
  xp: number;
  stats: Stats;
  achievements: Record<string, number>;
  bestCups: number;
  owned: readonly string[];
  meta: {
    arena: number;
    sets: readonly string[];
    seasonHistory: readonly { id: string; points: number; rank?: number }[];
    seasonItems: readonly string[];
  };
}

const ownedOf = (v: ReqView, slot?: Slot) =>
  v.owned.filter(k => {
    const i = itemByKey(k);
    // Si contano gli oggetti veri del catalogo, non quelli di partenza.
    return !!i && i.price > 0 && (!slot || i.slot === slot);
  }).length;

export const legendOf = (best: number) => (best >= 2900 ? Math.floor((best - 2900) / BALANCE.trophies.legendStep) : 0);

/** A che punto sei: [adesso, obiettivo]. */
export function reqProgress(r: Req, v: ReqView): [number, number] {
  const cap = (x: number, n: number): [number, number] => [Math.min(x, n), n];
  switch (r.k) {
    case 'start':
      return [1, 1];
    case 'stat':
      return cap(v.stats[r.key] as number, r.n);
    case 'game':
      return cap(v.stats.byGame[r.game][r.what], r.n);
    case 'allGames': {
      const lo = Math.min(...(['tressette', 'briscola', 'scopa'] as GameId[]).map(g => v.stats.byGame[g][r.what]));
      return cap(lo, r.n);
    }
    case 'arena':
      return cap(v.meta.arena + 1, r.n);
    case 'best':
      return cap(v.bestCups, r.n);
    case 'level':
      return cap(levelInfo(v.xp).level, r.n);
    case 'prestige':
      return cap(levelInfo(v.xp).prestige, r.n);
    case 'legend':
      return cap(legendOf(v.bestCups), r.n);
    case 'achievements':
      return cap(Object.keys(v.achievements).length, r.n);
    case 'owned':
      return cap(ownedOf(v, r.slot), r.n);
    case 'sets':
      return cap(v.meta.sets.length, r.n);
    case 'seasonRank': {
      const ok = v.meta.seasonHistory.some(s => s.rank !== undefined && s.rank <= r.n);
      return [ok ? 1 : 0, 1];
    }
    case 'seasonItems':
      return cap(v.meta.seasonItems.length, r.n);
    case 'event':
      return [0, 1];
  }
}

export const reqMet = (r: Req, v: ReqView) => {
  const [a, b] = reqProgress(r, v);
  return a >= b;
};

const GAME_NAME: Record<GameId, string> = { tressette: 'Tressette', briscola: 'Briscola', scopa: 'Scopa' };
const n = (x: number) => x.toLocaleString('it-IT');
const plural = (x: number, one: string, many: string) => (x === 1 ? one : many);

const STAT_TEXT: Partial<Record<StatKey, (x: number) => string>> = {
  played: x => `Gioca ${n(x)} ${plural(x, 'partita', 'partite')} fino in fondo.`,
  won: x => `Vinci ${n(x)} ${plural(x, 'partita', 'partite')}.`,
  played4: x => `Gioca ${n(x)} ${plural(x, 'partita', 'partite')} in quattro a coppie.`,
  won4: x => `Vinci ${n(x)} ${plural(x, 'partita', 'partite')} in quattro a coppie.`,
  perderePlayed: x => `Gioca ${n(x)} ${plural(x, 'partita', 'partite')} a Tressette a perdere.`,
  perdereWins: x => `Vinci ${n(x)} ${plural(x, 'partita', 'partite')} a Tressette a perdere.`,
  expertWins: x => `Vinci ${n(x)} ${plural(x, 'partita', 'partite')} contro il computer Esperto.`,
  bestStreak: x => `Vinci ${n(x)} partite di fila.`,
  bestExpertStreak: x => `Vinci ${n(x)} partite di fila contro l’Esperto.`,
  onlinePlayed: x => `Gioca ${n(x)} ${plural(x, 'partita', 'partite')} online.`,
  onlineWins: x => `Vinci ${n(x)} ${plural(x, 'partita', 'partite')} online.`,
  onlinePairWins: x => `Vinci ${n(x)} ${plural(x, 'partita', 'partite')} online a coppie.`,
  hands: x => `Gioca ${n(x)} mani.`,
  scope: x => (x === 1 ? 'Fai una scopa.' : `Fai ${n(x)} scope.`),
  maxScopeHand: x => `Fai ${n(x)} scope in una sola mano.`,
  settebelli: x => (x === 1 ? 'Prendi il Settebello.' : `Prendi il Settebello ${n(x)} volte.`),
  allDenari: x => (x === 1 ? 'Prendi tutti e dieci i denari in una mano.' : `Prendi tutti e dieci i denari in ${n(x)} mani.`),
  perfectScopa: x => (x === 1 ? 'In una sola mano di Scopa prendi carte, denari, settebello e primiera.' : `Fai la mano perfetta a Scopa ${n(x)} volte.`),
  briscolaBest: x => `Fai almeno ${n(x)} punti in una mano di Briscola.`,
  briscola100: x => (x === 1 ? 'Fai almeno 100 punti in una mano di Briscola.' : `Fai almeno 100 punti in ${n(x)} mani di Briscola.`),
  briscola120: x => (x === 1 ? 'Fai tutti i 120 punti in una mano di Briscola.' : `Fai 120 punti in ${n(x)} mani di Briscola.`),
  briscolaHandsWon: x => `Vinci ${n(x)} mani di Briscola.`,
  napoletane: x => (x === 1 ? 'Accusa una Napoletana.' : `Accusa ${n(x)} Napoletane.`),
  accusi: x => `Dichiara ${n(x)} accusi a Tressette.`,
  ultime: x => `Prendi l’ultima ${n(x)} volte a Tressette.`,
  cappotti: x => (x === 1 ? 'Fai cappotto a Tressette a perdere.' : `Fai cappotto ${n(x)} volte a Tressette a perdere.`),
  days: x => `Gioca in ${n(x)} giorni diversi.`,
  bonusStreak: x => `Ritira il bonus giornaliero ${n(x)} giorni di fila.`,
  coinsEarned: x => `Guadagna ${n(x)} monete in totale.`,
  coinsSpent: x => `Spendi ${n(x)} monete nel negozio.`,
  trophiesWon: x => `Vinci ${n(x)} trofei in totale.`,
  missionsDone: x => (x === 1 ? 'Completa una missione.' : `Completa ${n(x)} missioni.`),
  weeklyDone: x => (x === 1 ? 'Completa una missione settimanale.' : `Completa ${n(x)} missioni settimanali.`),
  seasonsPlayed: x => (x === 1 ? 'Partecipa a una stagione.' : `Partecipa a ${n(x)} stagioni.`),
};

const WHAT = { played: 'Gioca', won: 'Vinci', expert: 'Vinci contro l’Esperto' } as const;

/** Il requisito scritto per il giocatore. */
export function reqText(r: Req, arenaName?: (n: number) => string): string {
  switch (r.k) {
    case 'start':
      return 'Il titolo di chi comincia.';
    case 'stat':
      return STAT_TEXT[r.key]?.(r.n) ?? `${r.key}: ${n(r.n)}`;
    case 'game':
      return `${WHAT[r.what]} ${n(r.n)} ${plural(r.n, 'partita', 'partite')} a ${GAME_NAME[r.game]}.`;
    case 'allGames':
      return `${WHAT[r.what]} ${n(r.n)} ${plural(r.n, 'partita', 'partite')} in ciascuno dei tre giochi.`;
    case 'arena':
      return `Raggiungi l’arena ${r.n}${arenaName ? `, ${arenaName(r.n)}` : ''}.`;
    case 'best':
      return `Arriva a ${n(r.n)} trofei.`;
    case 'level':
      return `Arriva al livello ${r.n}.`;
    case 'prestige':
      return `Arriva al Prestigio ${r.n}.`;
    case 'legend':
      return `Arriva al grado ${r.n} di Leggenda (oltre l’ultima arena).`;
    case 'achievements':
      return `Completa ${n(r.n)} achievement.`;
    case 'owned':
      return r.slot === 'table'
        ? `Possiedi ${n(r.n)} tavolini diversi.`
        : r.slot === 'felt'
          ? `Possiedi ${n(r.n)} grafiche del panno diverse.`
          : r.slot === 'back'
            ? `Possiedi ${n(r.n)} dorsi diversi.`
            : `Possiedi ${n(r.n)} oggetti estetici.`;
    case 'sets':
      return r.n === 1 ? 'Completa un set estetico.' : `Completa ${n(r.n)} set estetici.`;
    case 'seasonRank':
      return r.n === 1 ? 'Chiudi una stagione al primo posto della classifica.' : `Chiudi una stagione tra i primi ${n(r.n)} della classifica.`;
    case 'seasonItems':
      return `Ottieni il cosmetico speciale di ${n(r.n)} stagioni.`;
    case 'event':
      return `${r.what} (arriverà con gli eventi).`;
  }
}
