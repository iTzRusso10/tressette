import { play, type Level, type Match, type MatchConfig, type Mode, type GameId, type Move, type Seat, type Step } from '@/engine';
import type { Peer, Transport } from './transport';

export interface RoomConfig {
  game: GameId;
  mode: Mode;
  perdN: 2 | 4;
  target: number;
  level: Level;
  accusi: boolean;
  cappotto: boolean;
  /** Coins each person puts in the pot; 0 for a friendly game. */
  stake: number;
}

export interface LobbySeat {
  name: string;
  /** 'remote' is a friend at this seat; 'cpu' plays when the seat is free. */
  type: 'human' | 'cpu' | 'remote';
  peer?: string;
}

export interface Lobby {
  code: string;
  host: Peer;
  cfg: RoomConfig;
  seats: LobbySeat[];
  started: boolean;
  /** Changes at every match (a rematch is a new match, with a new stake). */
  matchId: string;
}

/** Messages in a room. */
type Msg =
  | { e: 'hello'; peer: Peer }
  | { e: 'lobby'; lobby: Lobby }
  | { e: 'deal'; ver: number; steps: Step[] }
  | { e: 'play'; ver: number; p: number; mv: Move; hash: number }
  | { e: 'sync'; ver: number; match: Match; to?: string }
  | { e: 'resync'; peer: string }
  | { e: 'move'; peer: string; seat: number; mv: Move }
  | { e: 'closed' };

/** A cheap fingerprint of a match, to notice when someone fell out of step. */
export function hashMatch(m: Match): number {
  const h = m.h;
  const s = JSON.stringify([m.match, m.handNo, h?.hands, h?.table, h?.trick, h?.turn, h?.deck.length]);
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0;
  return x >>> 0;
}

export const seatCount = (cfg: Pick<RoomConfig, 'mode' | 'perdN'>) => (cfg.mode === '2' || (cfg.mode === 'perdere' && cfg.perdN === 2) ? 2 : 4);

/** Friends fill the seats in this order: in four a coppie the first friend is your partner. */
export const seatOrder = (cfg: Pick<RoomConfig, 'mode' | 'perdN'>) => (seatCount(cfg) === 2 ? [1] : cfg.mode === '4' ? [2, 1, 3] : [1, 2, 3]);

export const genCode = () => String(1000 + Math.floor(Math.random() * 9000));

const CPU = ['Gennaro', 'Carmela', 'Salvatore'];

/* ===================================================================== host */

export class HostRoom {
  lobby: Lobby;
  private ver = 0;
  private match: Match | null = null;
  private peers: Peer[] = [];
  private offs: (() => void)[] = [];
  onLobby: (l: Lobby) => void = () => {};
  onMove: (seat: number, mv: Move) => void = () => {};
  onPeers: (online: Set<string>) => void = () => {};

  constructor(
    private t: Transport,
    private me: Peer,
    cfg: RoomConfig,
  ) {
    const n = seatCount(cfg);
    const seats: LobbySeat[] = [{ name: me.name, type: 'human', peer: me.id }];
    for (let i = 1; i < n; i++) seats.push({ name: CPU[i - 1], type: 'cpu' });
    this.lobby = { code: '', host: me, cfg, seats, started: false, matchId: '' };
  }

  /** Finds a free code and opens the room. */
  async open(code?: string): Promise<string> {
    let c = code ?? genCode();
    for (let i = 0; !code && i < 8; i++) {
      const there = await this.t.peek(c);
      if (!there.some(p => p.host)) break;
      c = genCode();
    }
    this.lobby.code = c;
    this.offs.push(
      this.t.on('hello', (m: Extract<Msg, { e: 'hello' }>) => this.hello(m.peer)),
      this.t.on('move', (m: Extract<Msg, { e: 'move' }>) => this.move(m)),
      this.t.on('resync', (m: Extract<Msg, { e: 'resync' }>) => this.resync(m.peer)),
      this.t.onPeers(peers => {
        this.peers = peers;
        this.onPeers(new Set(peers.map(p => p.id)));
        // Someone (re)connected: tell them where we are.
        this.sendLobby();
        if (this.match) this.t.send('sync', { ver: this.ver, match: this.match } satisfies Omit<Extract<Msg, { e: 'sync' }>, 'e'>);
      }),
    );
    await this.t.connect(c, this.me);
    this.sendLobby();
    return c;
  }

  private sendLobby() {
    this.t.send('lobby', { lobby: this.lobby });
    this.onLobby({ ...this.lobby, seats: this.lobby.seats.slice() });
  }

  private hello(peer: Peer) {
    const seats = this.lobby.seats;
    const had = seats.findIndex(s => s.peer === peer.id);
    if (had >= 0) {
      seats[had] = { ...seats[had], name: peer.name };
    } else if (!this.lobby.started) {
      const free = seatOrder(this.lobby.cfg).find(i => seats[i].type === 'cpu');
      if (free !== undefined) seats[free] = { name: peer.name, type: 'remote', peer: peer.id };
    }
    this.sendLobby();
    if (this.match) this.resync(peer.id);
  }

  /** Before the start: free a seat (a friend left) or change the settings. */
  removeSeat(i: number) {
    if (i === 0 || this.lobby.started) return;
    this.lobby.seats[i] = { name: CPU[i - 1], type: 'cpu' };
    this.sendLobby();
  }

  isOnline(seat: number) {
    const s = this.lobby.seats[seat];
    return !!s?.peer && this.peers.some(p => p.id === s.peer);
  }

  /** The match config for the engine: friends' seats are 'remote'. */
  matchConfig(): MatchConfig {
    const { cfg, seats } = this.lobby;
    return {
      game: cfg.game,
      mode: cfg.mode,
      perdN: cfg.perdN,
      seats: seats.map(s => ({ name: s.name, type: s.type }) as Seat),
      level: cfg.level,
      target: cfg.target,
      accusi: cfg.accusi,
      cappotto: cfg.cappotto,
    };
  }

  start() {
    this.lobby.started = true;
    this.lobby.matchId = `${this.lobby.code}-${Date.now().toString(36)}`;
    this.sendLobby();
  }

  /** A new hand was dealt here: send the dealt steps (the deal is random, so it can't be replayed). */
  dealt(steps: Step[]) {
    this.match = steps.at(-1)!.state;
    this.t.send('deal', { ver: ++this.ver, steps });
  }

  /** A move was played here: send only the move, everyone replays it with the engine. */
  played(p: number, mv: Move, after: Match) {
    this.match = after;
    this.t.send('play', { ver: ++this.ver, p, mv, hash: hashMatch(after) });
  }

  private move(m: Extract<Msg, { e: 'move' }>) {
    const s = this.lobby.seats[m.seat];
    if (!s || s.peer !== m.peer) return;
    this.onMove(m.seat, m.mv);
  }

  private resync(peer: string) {
    if (this.match) this.t.send('sync', { ver: this.ver, match: this.match, to: peer });
  }

  async close() {
    this.t.send('closed', {});
    this.offs.forEach(f => f());
    await this.t.disconnect();
  }
}

/* ===================================================================== guest */

export type JoinResult = 'ok' | 'nohost';

export class GuestRoom {
  lobby: Lobby | null = null;
  seat = -1;
  private ver = 0;
  private match: Match | null = null;
  private offs: (() => void)[] = [];
  hostOnline = false;
  onLobby: (l: Lobby) => void = () => {};
  /** Steps to show, in order. */
  onSteps: (steps: Step[]) => void = () => {};
  /** Jumped to a state (joined late, or fell out of step). */
  onSync: (m: Match) => void = () => {};
  onHost: (online: boolean) => void = () => {};
  onClosed: () => void = () => {};

  constructor(
    private t: Transport,
    private me: Peer,
  ) {}

  async join(code: string): Promise<JoinResult> {
    const there = await this.t.peek(code);
    if (!there.some(p => p.host)) return 'nohost';
    this.offs.push(
      this.t.on('lobby', (m: Extract<Msg, { e: 'lobby' }>) => {
        this.lobby = m.lobby;
        this.seat = m.lobby.seats.findIndex(s => s.peer === this.me.id);
        this.onLobby(m.lobby);
      }),
      this.t.on('deal', (m: Extract<Msg, { e: 'deal' }>) => {
        if (m.ver !== this.ver + 1 && this.match) return this.askSync();
        this.ver = m.ver;
        this.match = m.steps.at(-1)!.state;
        this.onSteps(m.steps);
      }),
      this.t.on('play', (m: Extract<Msg, { e: 'play' }>) => {
        if (!this.match || m.ver !== this.ver + 1) return this.askSync();
        let steps: Step[];
        try {
          steps = play(this.match, m.p, m.mv);
        } catch {
          return this.askSync();
        }
        const after = steps.at(-1)!.state;
        if (hashMatch(after) !== m.hash) return this.askSync();
        this.ver = m.ver;
        this.match = after;
        this.onSteps(steps);
      }),
      this.t.on('sync', (m: Extract<Msg, { e: 'sync' }>) => {
        if (m.to && m.to !== this.me.id) return;
        if (!m.to && this.match && m.ver === this.ver) return;
        this.ver = m.ver;
        this.match = m.match;
        this.onSync(m.match);
      }),
      this.t.on('closed', () => this.onClosed()),
      this.t.onPeers(peers => {
        const on = peers.some(p => p.host);
        if (on !== this.hostOnline) {
          this.hostOnline = on;
          this.onHost(on);
        }
      }),
    );
    await this.t.connect(code, this.me);
    this.t.send('hello', { peer: this.me });
    return 'ok';
  }

  private askSync() {
    this.t.send('resync', { peer: this.me.id });
  }

  sendMove(mv: Move) {
    this.t.send('move', { peer: this.me.id, seat: this.seat, mv });
  }

  async leave() {
    this.offs.forEach(f => f());
    await this.t.disconnect();
  }
}
