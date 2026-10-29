// Il matchmaking: trova avversari per la partita veloce (trofei) e per la classificata (punteggio di
// bravura). La coda vera sta sul server (supabase/migrations/…_matchmaking.sql): si entra con mm_join e
// si chiede come va con mm_poll ogni secondo e mezzo. Per le prove sul web, con `?local`, le schede dello
// stesso browser si trovano tra loro senza server (LocalMatchmaker).

import { playersFor, type GameId, type Level, type Mode } from '@/engine';
import { BALANCE } from '@/meta/balance';

export type MmKind = 'quick' | 'ranked';

export interface MmRequest {
  kind: MmKind;
  game: GameId;
  mode: Mode;
  perdN: 2 | 4;
}

export interface MmPlayer {
  id: string;
  name: string;
  seat: number;
  /** Trofei nella partita veloce, punteggio del gioco nella classificata. */
  score: number;
}

export interface MmMatch {
  id: string;
  /** La stanza dove ci si incontra. */
  code: string;
  kind: MmKind;
  game: GameId;
  mode: Mode;
  seats: 2 | 4;
  /** Qualche posto lo prende un computer (solo la partita veloce, dopo l'attesa). */
  cpu: boolean;
  level: Level;
  /** Chi apre la stanza e tiene il tavolo: chi aspettava da più tempo. */
  host: string;
  players: MmPlayer[];
}

export type MmState = { status: 'none' } | { status: 'locked' } | { status: 'waiting'; waited: number } | { status: 'found'; match: MmMatch };

export interface Matchmaker {
  join(r: MmRequest, me: string, name: string): Promise<MmState>;
  poll(): Promise<MmState>;
  cancel(): Promise<void>;
}

/** Ogni quanto si chiede come va la ricerca. */
export const POLL_MS = 1500;

export const seatsOf = (r: Pick<MmRequest, 'mode' | 'perdN'>) => playersFor(r.mode, r.perdN) as 2 | 4;

/**
 * Le regole delle partite del matchmaking: uguali per tutti, così si gioca subito. La partita veloce è
 * corta (Briscola a una mano); la classificata a Briscola si gioca a due mani vinte, per pesare meno la fortuna.
 */
export function mmRules(kind: MmKind, game: GameId, mode: Mode): { target: number; accusi: boolean; cappotto: boolean } {
  const target = game === 'tressette' ? (mode === 'perdere' ? 31 : 21) : game === 'briscola' ? (kind === 'ranked' ? 2 : 1) : 11;
  return { target, accusi: true, cappotto: true };
}

/** Come si dicono le regole fisse, sotto la scelta della modalità. */
export function rulesText(kind: MmKind, game: GameId, mode: Mode): string {
  const r = mmRules(kind, game, mode);
  if (game === 'tressette') return mode === 'perdere' ? 'Si perde a 31, con il cappotto' : 'Si vince a 21, con gli accusi';
  if (game === 'briscola') return r.target === 1 ? 'Una mano, vince chi passa 60' : 'Vince chi arriva a due mani';
  return 'Si vince a 11';
}

/** Lo stato come lo manda il server (mm_join, mm_poll). */
export function parse(v: unknown): MmState {
  const o = (v ?? {}) as Record<string, unknown>;
  if (o.status === 'locked') return { status: 'locked' };
  if (o.status === 'waiting') return { status: 'waiting', waited: Math.max(0, Number(o.waited) || 0) };
  if (o.status === 'found' && o.match && typeof o.match === 'object') {
    const m = o.match as Record<string, unknown>;
    const players = (Array.isArray(m.players) ? m.players : []).map(p => {
      const x = p as Record<string, unknown>;
      return { id: String(x.id), name: String(x.name ?? 'Giocatore'), seat: Number(x.seat) || 0, score: Number(x.score) || 0 };
    });
    return {
      status: 'found',
      match: {
        id: String(m.id),
        code: String(m.code),
        kind: m.kind === 'ranked' ? 'ranked' : 'quick',
        game: m.game as GameId,
        mode: m.mode as Mode,
        seats: Number(m.seats) === 4 ? 4 : 2,
        cpu: !!m.cpu,
        level: (['facile', 'medio', 'difficile'] as const).includes(m.level as Level) ? (m.level as Level) : 'medio',
        host: String(m.host),
        players,
      },
    };
  }
  return { status: 'none' };
}

/* ================================================================== prove tra schede (?local) */

interface Ticket {
  id: string;
  name: string;
  kind: MmKind;
  game: GameId;
  mode: Mode;
  seats: 2 | 4;
  at: number;
  seen: number;
}

type LocalMsg = { t: 'ticket'; ticket: Omit<Ticket, 'seen'> } | { t: 'cancel'; id: string } | { t: 'match'; match: MmMatch };

/**
 * Le schede dello stesso browser si trovano tra loro, senza server. Decide chi aspetta da più tempo: quando
 * ci sono abbastanza biglietti uguali (o, nella partita veloce, dopo l'attesa) crea la partita e la annuncia.
 * Con `?local&mmcpu=3` il computer arriva dopo 3 secondi invece di 20.
 */
/** Letto all'avvio: la navigazione dentro l'app toglie i parametri dall'indirizzo. */
const LOCAL_CPU_AFTER = (() => {
  const q = typeof location !== 'undefined' ? /[?&]mmcpu=(\d+)/.exec(location.search ?? '') : null;
  return q ? Number(q[1]) : null;
})();

export class LocalMatchmaker implements Matchmaker {
  private ch = new BroadcastChannel('napoletane-mm');
  private tickets = new Map<string, Ticket>();
  private mine: Omit<Ticket, 'seen'> | null = null;
  private found: MmMatch | null = null;
  private cpuAfter: number;

  constructor() {
    this.cpuAfter = LOCAL_CPU_AFTER ?? BALANCE.matchmaking.cpuAfterSeconds;
    this.ch.onmessage = (e: MessageEvent<LocalMsg>) => {
      const m = e.data;
      if (m.t === 'ticket') this.tickets.set(m.ticket.id, { ...m.ticket, seen: Date.now() });
      else if (m.t === 'cancel') this.tickets.delete(m.id);
      else if (m.t === 'match') {
        for (const p of m.match.players) this.tickets.delete(p.id);
        if (this.mine && m.match.players.some(p => p.id === this.mine!.id)) this.found = m.match;
      }
    };
  }

  async join(r: MmRequest, me: string, name: string) {
    this.found = null;
    this.mine = { id: me, name, kind: r.kind, game: r.game, mode: r.mode, seats: seatsOf(r), at: Date.now() };
    return this.poll();
  }

  async poll(): Promise<MmState> {
    const t = this.mine;
    if (this.found) return { status: 'found', match: this.found };
    if (!t) return { status: 'none' };
    this.ch.postMessage({ t: 'ticket', ticket: t } satisfies LocalMsg);
    const now = Date.now();
    for (const [id, x] of this.tickets) if (now - x.seen > 4000) this.tickets.delete(id);
    const same = [
      t,
      ...[...this.tickets.values()].filter(x => x.id !== t.id && x.kind === t.kind && x.game === t.game && x.mode === t.mode && x.seats === t.seats),
    ].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
    const waited = (now - t.at) / 1000;
    // Decide solo il primo della fila.
    if (same[0].id === t.id && (same.length >= t.seats || (t.kind === 'quick' && waited >= this.cpuAfter))) {
      const group = same.slice(0, t.seats);
      const match: MmMatch = {
        id: crypto.randomUUID?.() ?? `${now}-${Math.random()}`,
        code: 'mm' + Math.random().toString(36).slice(2, 10),
        kind: t.kind,
        game: t.game,
        mode: t.mode,
        seats: t.seats,
        cpu: group.length < t.seats,
        level: 'medio',
        host: group[0].id,
        players: group.map((x, i) => ({ id: x.id, name: x.name, seat: i, score: 1000 })),
      };
      this.ch.postMessage({ t: 'match', match } satisfies LocalMsg);
      for (const p of group) this.tickets.delete(p.id);
      this.found = match;
      return { status: 'found', match };
    }
    return { status: 'waiting', waited: Math.floor(waited) };
  }

  async cancel() {
    if (this.mine) this.ch.postMessage({ t: 'cancel', id: this.mine.id } satisfies LocalMsg);
    this.mine = null;
    this.found = null;
  }
}
