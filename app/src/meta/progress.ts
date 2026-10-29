// Le statistiche del giocatore: tutto quello che serve per verificare achievement, titoli, missioni e
// requisiti delle arene. Funzioni pure, condivise con il server.

import type { GameId, Level, Mode } from '../engine/types.ts';

export const GAME_IDS: GameId[] = ['tressette', 'briscola', 'scopa'];

export interface GameStats {
  played: number;
  won: number;
  /** Vittorie contro il computer Esperto. */
  expert: number;
  /** Vittorie di fila in questo gioco, adesso e il massimo. */
  streak: number;
  best: number;
}

export interface Stats {
  played: number;
  won: number;
  byGame: Record<GameId, GameStats>;
  /** Partite in quattro (a coppie) giocate e vinte. */
  played4: number;
  won4: number;
  perdereWins: number;
  perderePlayed: number;
  expertWins: number;
  /** Vittorie di fila (tutte le partite) e contro l'Esperto, adesso e il massimo. */
  streak: number;
  bestStreak: number;
  expertStreak: number;
  bestExpertStreak: number;
  onlinePlayed: number;
  onlineWins: number;
  /** Vittorie online a coppie (in quattro). */
  onlinePairWins: number;

  hands: number;
  // Scopa
  scope: number;
  /** Il massimo di scope in una sola mano. */
  maxScopeHand: number;
  settebelli: number;
  /** Mani in cui la tua squadra ha preso tutti e dieci i denari. */
  allDenari: number;
  /** Mani con carte, denari, settebello e primiera presi tutti dalla tua squadra. */
  perfectScopa: number;
  // Briscola
  /** Il massimo di punti in una mano di Briscola, e le mani da almeno 100 e da 120. */
  briscolaBest: number;
  briscola100: number;
  briscola120: number;
  briscolaHandsWon: number;
  // Tressette
  napoletane: number;
  accusi: number;
  ultime: number;
  cappotti: number;

  /** Giorni diversi in cui hai finito almeno una partita, e l'ultimo. */
  days: number;
  lastDay: string | null;
  bonusStreak: number;
  coinsEarned: number;
  coinsSpent: number;
  /** Trofei vinti in totale (solo i guadagni). */
  trophiesWon: number;
  missionsDone: number;
  weeklyDone: number;
  seasonsPlayed: number;

  /** Mani vinte (la tua squadra ha fatto più punti, o meno a perdere). */
  handsWon: number;
  /** Partite vinte dopo essere stati molto sotto, e vinte senza che l'avversario facesse un punto. */
  comebacks: number;
  shutouts: number;
  /** Giorni in cui hai finito una partita in tutti e tre i giochi. */
  allGamesDays: number;
  /** La serie più lunga di vittorie in un gioco solo. */
  bestGameStreak: number;
  /** Livelli del computer battuti in ogni gioco: un bit per coppia gioco-livello (9 in tutto). */
  levelsMask: number;
  /** Vittorie con tavolino, panno e dorso di partenza dopo l'arena 10. */
  humbleWins: number;
  /** Il massimo di vittorie online contro una stessa persona. */
  maxRivalWins: number;
  eventsDone: number;
}

const game = (): GameStats => ({ played: 0, won: 0, expert: 0, streak: 0, best: 0 });

export const emptyStats = (): Stats => ({
  played: 0,
  won: 0,
  byGame: { tressette: game(), briscola: game(), scopa: game() },
  played4: 0,
  won4: 0,
  perdereWins: 0,
  perderePlayed: 0,
  expertWins: 0,
  streak: 0,
  bestStreak: 0,
  expertStreak: 0,
  bestExpertStreak: 0,
  onlinePlayed: 0,
  onlineWins: 0,
  onlinePairWins: 0,
  hands: 0,
  scope: 0,
  maxScopeHand: 0,
  settebelli: 0,
  allDenari: 0,
  perfectScopa: 0,
  briscolaBest: 0,
  briscola100: 0,
  briscola120: 0,
  briscolaHandsWon: 0,
  napoletane: 0,
  accusi: 0,
  ultime: 0,
  cappotti: 0,
  days: 0,
  lastDay: null,
  bonusStreak: 0,
  coinsEarned: 0,
  coinsSpent: 0,
  trophiesWon: 0,
  missionsDone: 0,
  weeklyDone: 0,
  seasonsPlayed: 0,
  handsWon: 0,
  comebacks: 0,
  shutouts: 0,
  allGamesDays: 0,
  bestGameStreak: 0,
  levelsMask: 0,
  humbleWins: 0,
  maxRivalWins: 0,
  eventsDone: 0,
});

/** Statistiche salvate prima di questo file (o mandate dal server): i campi che mancano valgono 0. */
export function normalizeStats(s: unknown): Stats {
  const base = emptyStats();
  if (!s || typeof s !== 'object') return base;
  const o = s as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base) as (keyof Stats)[]) {
    if (k === 'byGame' || k === 'lastDay') continue;
    const v = Number(o[k]);
    out[k] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }
  out.lastDay = typeof o.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.lastDay) ? o.lastDay : null;
  const bg = (o.byGame ?? {}) as Record<string, Partial<GameStats>>;
  out.byGame = Object.fromEntries(
    (['tressette', 'briscola', 'scopa'] as GameId[]).map(g => [
      g,
      {
        played: Math.max(0, Math.floor(Number(bg[g]?.played) || 0)),
        won: Math.max(0, Math.floor(Number(bg[g]?.won) || 0)),
        expert: Math.max(0, Math.floor(Number(bg[g]?.expert) || 0)),
        streak: Math.max(0, Math.floor(Number(bg[g]?.streak) || 0)),
        best: Math.max(0, Math.floor(Number(bg[g]?.best) || 0)),
      },
    ]),
  );
  return out as unknown as Stats;
}

/** Cosa è successo a te (alla tua squadra) in una mano. */
export interface HandRecord {
  game: GameId;
  scope: number;
  settebello: boolean;
  napoletana: boolean;
  /** Cappotto a Tressette a perdere (l'unico che vale, per le regole della casa). */
  cappotto: boolean;
  /** Accusi dichiarati da te. */
  accusi: number;
  /** La tua squadra ha preso l'ultima (Tressette). */
  ultima: boolean;
  /** Briscola: punti della tua squadra nella mano (0…120); −1 negli altri giochi. */
  briscolaPts: number;
  /** Scopa: denari presi dalla tua squadra (0…10). */
  denari: number;
  /** Scopa: carte, denari, settebello e primiera tutti alla tua squadra. */
  perfect: boolean;
  /** La tua squadra ha vinto la mano. */
  handWon?: boolean;
}

/** I dati di una mano ripuliti: valori impossibili tornano nei limiti (il server non si fida). */
export function cleanHand(h: Partial<HandRecord> | undefined): HandRecord {
  const g = (['tressette', 'briscola', 'scopa'] as const).includes(h?.game as GameId) ? (h!.game as GameId) : 'tressette';
  const clamp = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
  return {
    game: g,
    scope: g === 'scopa' ? clamp(h?.scope, 0, 20) : 0,
    settebello: g === 'scopa' && !!h?.settebello,
    napoletana: g === 'tressette' && !!h?.napoletana,
    cappotto: g === 'tressette' && !!h?.cappotto,
    accusi: g === 'tressette' ? clamp(h?.accusi, 0, 6) : 0,
    ultima: g === 'tressette' && !!h?.ultima,
    briscolaPts: g === 'briscola' ? clamp(h?.briscolaPts, 0, 120) : -1,
    denari: g === 'scopa' ? clamp(h?.denari, 0, 10) : 0,
    perfect: g === 'scopa' && !!h?.perfect && !!h?.settebello && clamp(h?.denari, 0, 10) >= 6,
    handWon: !!h?.handWon,
  };
}

/** Come è finita una partita per te. `id` la identifica: la stessa partita non conta due volte. */
export interface MatchRecord {
  id: string;
  game: GameId;
  mode: Mode;
  level: Level;
  online: boolean;
  won: boolean;
  /** Vinta dopo essere stati molto sotto nel punteggio; vinta senza che l'avversario segnasse. */
  comeback?: boolean;
  shutout?: boolean;
  /** Online: gli id delle persone avversarie (non i compagni, non il computer). */
  opp?: string[];
}

export function addHand(s: Stats, h: HandRecord): Stats {
  return {
    ...s,
    hands: s.hands + 1,
    scope: s.scope + h.scope,
    maxScopeHand: Math.max(s.maxScopeHand, h.scope),
    settebelli: s.settebelli + (h.settebello ? 1 : 0),
    allDenari: s.allDenari + (h.denari === 10 ? 1 : 0),
    perfectScopa: s.perfectScopa + (h.perfect ? 1 : 0),
    briscolaBest: Math.max(s.briscolaBest, h.briscolaPts),
    briscola100: s.briscola100 + (h.briscolaPts >= 100 ? 1 : 0),
    briscola120: s.briscola120 + (h.briscolaPts === 120 ? 1 : 0),
    briscolaHandsWon: s.briscolaHandsWon + (h.briscolaPts > 60 ? 1 : 0),
    napoletane: s.napoletane + (h.napoletana ? 1 : 0),
    accusi: s.accusi + h.accusi,
    ultime: s.ultime + (h.ultima ? 1 : 0),
    cappotti: s.cappotti + (h.cappotto ? 1 : 0),
    handsWon: s.handsWon + (h.handWon ? 1 : 0),
  };
}

export function addMatch(s: Stats, r: MatchRecord, day: string): Stats {
  const streak = r.won ? s.streak + 1 : 0;
  const expert = !r.online && r.level === 'difficile';
  const expertStreak = expert ? (r.won ? s.expertStreak + 1 : 0) : s.expertStreak;
  const g = s.byGame[r.game];
  const gStreak = r.won ? g.streak + 1 : 0;
  const four = r.mode === '4';
  const levelBit = r.won && !r.online ? 1 << (GAME_IDS.indexOf(r.game) * 3 + ['facile', 'medio', 'difficile'].indexOf(r.level)) : 0;
  return {
    ...s,
    played: s.played + 1,
    won: s.won + (r.won ? 1 : 0),
    byGame: {
      ...s.byGame,
      [r.game]: { played: g.played + 1, won: g.won + (r.won ? 1 : 0), expert: g.expert + (r.won && expert ? 1 : 0), streak: gStreak, best: Math.max(g.best, gStreak) },
    },
    bestGameStreak: Math.max(s.bestGameStreak, gStreak),
    levelsMask: s.levelsMask | levelBit,
    comebacks: s.comebacks + (r.won && r.comeback ? 1 : 0),
    shutouts: s.shutouts + (r.won && r.shutout ? 1 : 0),
    played4: s.played4 + (four ? 1 : 0),
    won4: s.won4 + (four && r.won ? 1 : 0),
    perderePlayed: s.perderePlayed + (r.mode === 'perdere' ? 1 : 0),
    perdereWins: s.perdereWins + (r.won && r.mode === 'perdere' ? 1 : 0),
    expertWins: s.expertWins + (r.won && expert ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    expertStreak,
    bestExpertStreak: Math.max(s.bestExpertStreak, expertStreak),
    onlinePlayed: s.onlinePlayed + (r.online ? 1 : 0),
    onlineWins: s.onlineWins + (r.won && r.online ? 1 : 0),
    onlinePairWins: s.onlinePairWins + (r.won && r.online && four ? 1 : 0),
    days: s.lastDay === day ? s.days : s.days + 1,
    lastDay: s.lastDay && s.lastDay > day ? s.lastDay : day,
  };
}
