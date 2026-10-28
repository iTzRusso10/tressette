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
