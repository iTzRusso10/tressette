import type { GameId, Level, Mode } from '../engine/types.ts';
import { CPU_WIN_COINS, XP } from './economy.ts';

export interface Stats {
  played: number;
  won: number;
  byGame: Record<GameId, { played: number; won: number }>;
  hands: number;
  scope: number;
  settebelli: number;
  napoletane: number;
  cappotti: number;
  expertWins: number;
  onlineWins: number;
  perdereWins: number;
  /** Wins in a row now, and the best ever. */
  streak: number;
  bestStreak: number;
  /** Best daily-bonus streak. */
  bonusStreak: number;
}

export const emptyStats = (): Stats => ({
  played: 0,
  won: 0,
  byGame: { tressette: { played: 0, won: 0 }, briscola: { played: 0, won: 0 }, scopa: { played: 0, won: 0 } },
  hands: 0,
  scope: 0,
  settebelli: 0,
  napoletane: 0,
  cappotti: 0,
  expertWins: 0,
  onlineWins: 0,
  perdereWins: 0,
  streak: 0,
  bestStreak: 0,
  bonusStreak: 0,
});

/** What happened to you in a hand. */
export interface HandRecord {
  scope: number;
  settebello: boolean;
  napoletana: boolean;
  cappotto: boolean;
}

/** How a match ended for you. */
export interface MatchRecord {
  game: GameId;
  mode: Mode;
  level: Level;
  online: boolean;
  won: boolean;
}

export type Glyph = 'cup' | 'star' | 'flame' | 'crown' | 'broom' | 'seven' | 'sun' | 'cards' | 'friends' | 'medal';

export interface Trophy {
  id: string;
  title: string;
  desc: string;
  glyph: Glyph;
  /** Coins and experience when unlocked. */
  coins: number;
  xp: number;
  /** Progress towards the goal: [now, goal]. */
  progress: (s: Stats) => [number, number];
}

const count =
  (key: keyof Omit<Stats, 'byGame'>, goal: number) =>
  (s: Stats): [number, number] => [Math.min(goal, s[key] as number), goal];

export const TROPHIES: Trophy[] = [
  { id: 'prima-vittoria', title: 'Prima vittoria', desc: 'Vinci una partita.', glyph: 'medal', coins: 100, xp: 50, progress: count('won', 1) },
  { id: 'prima-scopa', title: 'Prima scopa', desc: 'Spazza il tavolo a Scopa.', glyph: 'broom', coins: 50, xp: 30, progress: count('scope', 1) },
  {
    id: 'napoletana',
    title: 'Napoletana',
    desc: 'Accusa Asso, Due e Tre dello stesso seme.',
    glyph: 'cards',
    coins: 150,
    xp: 60,
    progress: count('napoletane', 1),
  },
  { id: 'tris-vittorie', title: 'Tris di vittorie', desc: 'Vinci tre partite di fila.', glyph: 'flame', coins: 200, xp: 80, progress: count('bestStreak', 3) },
  { id: 'dieci-vittorie', title: 'Dieci vittorie', desc: 'Vinci dieci partite.', glyph: 'star', coins: 300, xp: 120, progress: count('won', 10) },
  {
    id: 'settebello',
    title: 'Collezionista',
    desc: 'Prendi il Settebello dieci volte.',
    glyph: 'seven',
    coins: 200,
    xp: 80,
    progress: count('settebelli', 10),
  },
  { id: 'meno-peggio', title: 'Il meno peggio', desc: 'Vinci una partita a perdere.', glyph: 'sun', coins: 150, xp: 60, progress: count('perdereWins', 1) },
  { id: 'esperto', title: 'Batti l’Esperto', desc: 'Vinci contro il computer Esperto.', glyph: 'crown', coins: 300, xp: 120, progress: count('expertWins', 1) },
  { id: 'amici', title: 'Al tavolo con gli amici', desc: 'Vinci una partita online.', glyph: 'friends', coins: 200, xp: 80, progress: count('onlineWins', 1) },
  {
    id: 'tuttofare',
    title: 'Tuttofare',
    desc: 'Vinci a Tressette, a Briscola e a Scopa.',
    glyph: 'cards',
    coins: 300,
    xp: 120,
    progress: s => [(['tressette', 'briscola', 'scopa'] as GameId[]).filter(g => s.byGame[g].won > 0).length, 3],
  },
  {
    id: 'cappotto',
    title: 'Cappotto!',
    desc: 'Prendi tutti i punti di una mano a perdere.',
    glyph: 'crown',
    coins: 500,
    xp: 150,
    progress: count('cappotti', 1),
  },
  { id: 'spazzino', title: 'Spazzino', desc: 'Fai cinquanta scope.', glyph: 'broom', coins: 500, xp: 150, progress: count('scope', 50) },
  { id: 'di-casa', title: 'Di casa', desc: 'Ritira il bonus sette giorni di fila.', glyph: 'sun', coins: 500, xp: 150, progress: count('bonusStreak', 7) },
  { id: 'imbattibile', title: 'Imbattibile', desc: 'Vinci dieci partite di fila.', glyph: 'flame', coins: 1000, xp: 300, progress: count('bestStreak', 10) },
  { id: 'cento-vittorie', title: 'Leggenda', desc: 'Vinci cento partite.', glyph: 'cup', coins: 2000, xp: 500, progress: count('won', 100) },
];

export const isUnlocked = (t: Trophy, s: Stats) => {
  const [a, b] = t.progress(s);
  return a >= b;
};

/** Trophies reached with these stats that weren't unlocked yet. */
export const newlyUnlocked = (s: Stats, have: Record<string, number>) => TROPHIES.filter(t => !have[t.id] && isUnlocked(t, s));

export function addHand(s: Stats, h: HandRecord): Stats {
  return {
    ...s,
    hands: s.hands + 1,
    scope: s.scope + h.scope,
    settebelli: s.settebelli + (h.settebello ? 1 : 0),
    napoletane: s.napoletane + (h.napoletana ? 1 : 0),
    cappotti: s.cappotti + (h.cappotto ? 1 : 0),
  };
}

export function addMatch(s: Stats, r: MatchRecord): Stats {
  const streak = r.won ? s.streak + 1 : 0;
  const g = s.byGame[r.game];
  return {
    ...s,
    played: s.played + 1,
    won: s.won + (r.won ? 1 : 0),
    byGame: { ...s.byGame, [r.game]: { played: g.played + 1, won: g.won + (r.won ? 1 : 0) } },
    expertWins: s.expertWins + (r.won && !r.online && r.level === 'difficile' ? 1 : 0),
    onlineWins: s.onlineWins + (r.won && r.online ? 1 : 0),
    perdereWins: s.perdereWins + (r.won && r.mode === 'perdere' ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
  };
}

/** Coins and experience for the end of a match (trophies come on top). */
export function matchReward(r: MatchRecord): { coins: number; xp: number } {
  return {
    coins: r.won && !r.online ? CPU_WIN_COINS[r.level] : 0,
    xp: r.won ? XP.win : XP.loss,
  };
}
