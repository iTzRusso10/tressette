import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useProfile } from './profile';

/**
 * Classifiche per trofei (supabase/migrations/…_trofei_negozio.sql): il mondo o tu e i tuoi amici.
 * Il server restituisce solo dati pubblici; `isMe` lo aggiunge il telefono.
 */

export interface RankRow {
  id: string;
  name: string;
  avatar: string | null;
  cups: number;
  xp: number;
  rank: number;
  isMe: boolean;
}

export type RankScope = 'mondo' | 'amici';

interface ServerRow {
  id: string;
  name: string | null;
  avatar: string | null;
  cups: number | null;
  xp: number | null;
  rank: number | null;
}

const toRow = (r: ServerRow, me: string): RankRow => ({
  id: r.id,
  name: r.name ?? 'Giocatore',
  avatar: r.avatar ?? null,
  cups: r.cups ?? 0,
  xp: r.xp ?? 0,
  rank: r.rank ?? 0,
  isMe: r.id === me,
});

/**
 * Le prime 100 posizioni e la tua. Nel mondo la tua posizione arriva da `my_rank` (anche oltre i 100);
 * tra gli amici sei sempre nella lista. Senza server o senza account: lista vuota. Senza rete: errore.
 */
export async function loadLeaderboard(scope: RankScope): Promise<{ rows: RankRow[]; me: RankRow | null }> {
  const account = useProfile.getState().account;
  if (!supabaseConfigured || !account) return { rows: [], me: null };
  const sb = supabase();
  const [list, mine] = await Promise.all([sb.rpc('leaderboard', { scope }), scope === 'mondo' ? sb.rpc('my_rank') : null]);
  if (list.error) throw list.error;
  if (mine?.error) throw mine.error;
  const rows = ((list.data ?? []) as ServerRow[]).map(r => toRow(r, account.id));
  const own = (mine?.data as ServerRow[] | null)?.[0];
  const me = own ? toRow(own, account.id) : (rows.find(r => r.isMe) ?? null);
  return { rows, me };
}

interface SeasonServerRow {
  id: string;
  name: string | null;
  avatar: string | null;
  points: number | null;
  matches: number | null;
  rank: number | null;
}

/**
 * La classifica della stagione in corso (punti stagione, non trofei): prime 100 e la tua posizione.
 * `cups` qui sono i punti di stagione; `xp` non c'è e resta 0.
 */
export async function loadSeasonLeaderboard(scope: RankScope): Promise<{ rows: RankRow[]; me: RankRow | null }> {
  const account = useProfile.getState().account;
  if (!supabaseConfigured || !account) return { rows: [], me: null };
  const sb = supabase();
  const [list, mine] = await Promise.all([sb.rpc('leaderboard_season', { scope }), scope === 'mondo' ? sb.rpc('my_season_rank') : null]);
  if (list.error) throw list.error;
  if (mine?.error) throw mine.error;
  const toSeason = (r: SeasonServerRow): RankRow => ({ id: r.id, name: r.name ?? 'Giocatore', avatar: r.avatar, cups: r.points ?? 0, xp: 0, rank: r.rank ?? 0, isMe: r.id === account.id });
  const rows = ((list.data ?? []) as SeasonServerRow[]).map(toSeason);
  const own = (mine?.data as { points: number; matches: number; rank: number }[] | null)?.[0];
  const me = own ? { id: account.id, name: account.name, avatar: account.avatar ?? null, cups: own.points, xp: 0, rank: own.rank, isMe: true } : (rows.find(r => r.isMe) ?? null);
  return { rows, me };
}

/* ------------------------------------------------------------------ classifiche per gioco */

export type GamePeriod = 'stagione' | 'settimana';
export type GameScope = 'mondo' | 'amici' | 'vicini';

export interface GameRankRow {
  id: string;
  name: string;
  photo: string | null;
  pub: Record<string, unknown>;
  score: number;
  games: number;
  rank: number;
  isMe: boolean;
}

/**
 * La classifica di un gioco sul punteggio di bravura: della stagione o della settimana, del mondo, degli
 * amici o dei vicini di posizione. Con la tua posizione (`me`), anche fuori dai primi 100.
 */
export async function loadGameBoard(game: string, period: GamePeriod, scope: GameScope): Promise<{ rows: GameRankRow[]; me: { score: number; games: number; rank: number; total: number } | null }> {
  const account = useProfile.getState().account;
  if (!supabaseConfigured || !account) return { rows: [], me: null };
  const sb = supabase();
  const [list, mine] = await Promise.all([sb.rpc('leaderboard_game', { p_game: game, p_period: period, p_scope: scope }), sb.rpc('my_game_rank', { p_game: game, p_period: period })]);
  if (list.error) throw list.error;
  if (mine.error) throw mine.error;
  type R = { id: string; name: string | null; avatar: string | null; pub: Record<string, unknown> | null; score: number; games: number; rank: number };
  const rows = ((list.data ?? []) as R[]).map(r => ({ id: r.id, name: r.name ?? 'Giocatore', photo: r.avatar, pub: r.pub ?? {}, score: r.score, games: r.games, rank: r.rank, isMe: r.id === account.id }));
  const me = ((mine.data ?? []) as { score: number; games: number; rank: number; total: number }[])[0] ?? null;
  return { rows, me };
}

export interface SeasonResult {
  season: string;
  name: string;
  game: string;
  rank: number;
  rating: number;
  players: number;
}

/** Le tue posizioni finali nelle stagioni passate. */
export async function mySeasonHistory(): Promise<SeasonResult[]> {
  if (!supabaseConfigured || !useProfile.getState().account) return [];
  const { data, error } = await supabase().rpc('my_season_history');
  if (error) throw error;
  return ((data ?? []) as { season_id: string; season_name: string; game: string; rank: number; rating: number; players: number }[]).map(r => ({
    season: r.season_id,
    name: r.season_name,
    game: r.game,
    rank: r.rank,
    rating: r.rating,
    players: r.players,
  }));
}
