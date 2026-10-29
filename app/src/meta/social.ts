// Amici, profili degli altri, richieste, inviti, sfide e rivalità: tutto passa dalle funzioni del server
// (supabase/migrations/…_competizione_social.sql), che mostrano solo dati pubblici a chi ha fatto l'accesso.

import { supabase, supabaseConfigured } from '@/lib/supabase';
import type { GameId } from '@/engine';
import type { PublicProfile } from './ledger';
import { useProfile } from './profile';

const ready = () => supabaseConfigured && !!useProfile.getState().account;

export interface PlayerCard {
  id: string;
  name: string;
  /** Foto dell'account, se c'è. */
  photo: string | null;
  pub: Partial<PublicProfile>;
  cups: number;
}

type Row = { id: string; name: string | null; avatar: string | null; pub?: unknown; public?: unknown; cups?: number | null };
const card = (r: Row): PlayerCard => ({
  id: r.id,
  name: r.name ?? 'Giocatore',
  photo: r.avatar ?? null,
  pub: ((r.pub ?? r.public ?? {}) as Partial<PublicProfile>) || {},
  cups: r.cups ?? 0,
});

/** Online se si è fatto vivo negli ultimi 3 minuti. */
export const isOnline = (lastSeen: string | null | undefined) => !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000;

export function seenText(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Non ancora visto';
  if (isOnline(lastSeen)) return 'Online adesso';
  const min = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000);
  if (min < 60) return `Visto ${min} minuti fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'Visto un’ora fa' : `Visto ${h} ore fa`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Visto ieri' : `Visto ${d} giorni fa`;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export async function searchPlayers(q: string): Promise<(PlayerCard & { friend: boolean })[]> {
  if (!ready() || q.trim().length < 3) return [];
  const rows = await rpc<(Row & { friend: boolean })[]>('search_players', { q });
  return (rows ?? []).map(r => ({ ...card(r), friend: r.friend }));
}

export type RequestResult = 'sent' | 'friends' | 'already' | 'self' | 'notfound' | 'limit' | 'error';
export async function sendFriendRequest(id: string): Promise<RequestResult> {
  if (!ready()) return 'error';
  return rpc<RequestResult>('send_friend_request', { p_to: id }).catch(() => 'error' as const);
}

export async function friendRequests(): Promise<PlayerCard[]> {
  if (!ready()) return [];
  return ((await rpc<Row[]>('my_friend_requests')) ?? []).map(card);
}

export async function answerFriendRequest(id: string, accept: boolean) {
  if (!ready()) return 'error';
  return rpc<string>('respond_friend_request', { p_from: id, p_accept: accept }).catch(() => 'error');
}

export async function removeFriend(id: string) {
  if (!ready()) return;
  await rpc('remove_friend', { p_id: id });
}

export interface PublicView extends PlayerCard {
  xp: number;
  lastSeen: string | null;
  friend: boolean;
  /** Le sfide tra te e questa persona (confermate da entrambi). */
  myWins: number;
  theirWins: number;
}

export async function publicProfile(id: string): Promise<PublicView | null> {
  if (!ready()) return null;
  const rows = await rpc<(Row & { xp: number; last_seen: string | null; friend: boolean; my_wins: number; their_wins: number })[]>('public_profile', { p_id: id });
  const r = rows?.[0];
  if (!r) return null;
  return { ...card(r), xp: r.xp ?? 0, lastSeen: r.last_seen, friend: r.friend, myWins: r.my_wins ?? 0, theirWins: r.their_wins ?? 0 };
}

export interface Invite {
  id: string;
  from: PlayerCard;
  code: string;
  game: GameId;
  mode: string;
  at: string;
}

export async function myInvites(): Promise<Invite[]> {
  if (!ready()) return [];
  const rows = await rpc<(Row & { from_id: string; code: string; game: GameId; mode: string; created_at: string })[]>('my_invites');
  return (rows ?? []).map(r => ({ id: r.id, from: card({ ...r, id: r.from_id }), code: r.code, game: r.game, mode: r.mode, at: r.created_at }));
}

export async function sendInvite(to: string, code: string, game: GameId, mode: string) {
  if (!ready()) return 'error';
  return rpc<string>('send_invite', { p_to: to, p_code: code, p_game: game, p_mode: mode }).catch(() => 'error');
}

/** Risponde a un invito: se accetti, ritorna il codice della stanza (o 'expired'). */
export async function answerInvite(id: string, accept: boolean): Promise<string> {
  if (!ready()) return 'expired';
  return rpc<string>('respond_invite', { p_id: id, p_accept: accept }).catch(() => 'expired');
}

export interface Rival extends PlayerCard {
  games: number;
  myWins: number;
  theirWins: number;
  lastAt: string;
}

export async function myRivals(): Promise<Rival[]> {
  if (!ready()) return [];
  const rows = await rpc<(Row & { games: number; my_wins: number; their_wins: number; last_at: string })[]>('my_rivals');
  return (rows ?? []).map(r => ({ ...card(r), games: r.games, myWins: r.my_wins, theirWins: r.their_wins, lastAt: r.last_at }));
}

export async function duelsWith(id: string): Promise<{ game: GameId; won: boolean; lost: boolean; at: string }[]> {
  if (!ready()) return [];
  const rows = await rpc<{ game: GameId; won: boolean; lost: boolean; created_at: string }[]>('duels_with', { p_id: id });
  return (rows ?? []).map(r => ({ game: r.game, won: r.won, lost: r.lost, at: r.created_at }));
}

/** A fine partita online tra persone con l'account: chi ha vinto. Conta quando la maggioranza è d'accordo. */
export async function reportDuel(matchId: string, game: GameId, players: string[], winners: string[]) {
  if (!ready() || players.length < 2) return;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!players.every(p => uuid.test(p))) return;
  await supabase()
    .rpc('report_duel', { p_match: matchId, p_game: game, p_players: players, p_winners: winners })
    .then(
      () => {},
      () => {},
    );
}

/** «Sono qui»: per lo stato online degli amici. */
export async function ping() {
  if (!ready()) return;
  await supabase()
    .rpc('ping')
    .then(
      () => {},
      () => {},
    );
}
