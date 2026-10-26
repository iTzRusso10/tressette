/** Someone connected to a room. `id` stays the same across reconnections. */
export interface Peer {
  id: string;
  name: string;
  host: boolean;
}

export type Status = 'connecting' | 'online' | 'offline';

/**
 * A room channel: broadcast messages to everyone else in the room, and know who is in it.
 * Supabase Realtime in the app, an in-memory hub in the tests.
 */
export interface Transport {
  connect(room: string, me: Peer): Promise<void>;
  send(event: string, payload: unknown): void;
  on(event: string, cb: (payload: any) => void): () => void;
  onPeers(cb: (peers: Peer[]) => void): () => void;
  onStatus(cb: (s: Status) => void): () => void;
  /** Who is in the room right now, without connecting (to check a code is free or taken). */
  peek(room: string): Promise<Peer[]>;
  disconnect(): Promise<void>;
}

/* -------------------------------------------------------------- in memory, for tests */

interface Hub {
  rooms: Map<string, Set<MemoryTransport>>;
}

export function createHub(): Hub {
  return { rooms: new Map() };
}

export class MemoryTransport implements Transport {
  private room: string | null = null;
  me: Peer | null = null;
  private handlers = new Map<string, Set<(p: any) => void>>();
  private peerCbs = new Set<(p: Peer[]) => void>();
  private statusCbs = new Set<(s: Status) => void>();
  /** Messages are delivered asynchronously, like on the network. */
  constructor(private hub: Hub) {}

  private members() {
    return this.room ? (this.hub.rooms.get(this.room) ?? new Set<MemoryTransport>()) : new Set<MemoryTransport>();
  }

  private notifyPeers() {
    const peers = [...this.members()].map(t => t.me!).filter(Boolean);
    for (const t of this.members()) t.peerCbs.forEach(cb => queueMicrotask(() => cb(peers)));
  }

  async connect(room: string, me: Peer) {
    this.room = room;
    this.me = me;
    if (!this.hub.rooms.has(room)) this.hub.rooms.set(room, new Set());
    this.hub.rooms.get(room)!.add(this);
    this.statusCbs.forEach(cb => cb('online'));
    this.notifyPeers();
  }

  send(event: string, payload: unknown) {
    const data = JSON.parse(JSON.stringify(payload ?? null));
    for (const t of this.members()) {
      if (t === this) continue;
      t.handlers.get(event)?.forEach(cb => queueMicrotask(() => cb(data)));
    }
  }

  on(event: string, cb: (payload: any) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb);
    return () => this.handlers.get(event)?.delete(cb);
  }

  onPeers(cb: (p: Peer[]) => void) {
    this.peerCbs.add(cb);
    return () => this.peerCbs.delete(cb);
  }

  onStatus(cb: (s: Status) => void) {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  async peek(room: string) {
    return [...(this.hub.rooms.get(room) ?? [])].map(t => t.me!).filter(Boolean);
  }

  async disconnect() {
    const members = this.members();
    members.delete(this);
    const peers = [...members].map(t => t.me!);
    members.forEach(t => t.peerCbs.forEach(cb => queueMicrotask(() => cb(peers))));
    this.statusCbs.forEach(cb => cb('offline'));
    this.room = null;
  }
}

/* -------------------------------------------------------------- between tabs, for tests on the web */

interface Beat {
  k: 'hb' | 'bye' | 'who' | 'msg';
  peer?: Peer;
  event?: string;
  payload?: unknown;
}

/**
 * A room between browser tabs on the same device (BroadcastChannel), with presence by heartbeat.
 * Only for testing the online flow without a server: open the site with `?local`.
 */
export class TabTransport implements Transport {
  private ch: BroadcastChannel | null = null;
  private me: Peer | null = null;
  private seen = new Map<string, { peer: Peer; at: number }>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private handlers = new Map<string, Set<(p: any) => void>>();
  private peerCbs = new Set<(p: Peer[]) => void>();
  private statusCbs = new Set<(s: Status) => void>();
  private last = '';

  private peers(): Peer[] {
    const now = Date.now();
    const list = [...this.seen.values()].filter(x => now - x.at < 3000).map(x => x.peer);
    if (this.me) list.unshift(this.me);
    return list;
  }

  private emitPeers() {
    const peers = this.peers();
    const key = peers.map(p => p.id).sort().join(',');
    if (key === this.last) return;
    this.last = key;
    this.peerCbs.forEach(cb => cb(peers));
  }

  async connect(room: string, me: Peer) {
    this.me = me;
    const ch = new BroadcastChannel('napoletane:' + room);
    this.ch = ch;
    ch.onmessage = (e: MessageEvent<Beat>) => {
      const b = e.data;
      if (b.k === 'hb' && b.peer) {
        this.seen.set(b.peer.id, { peer: b.peer, at: Date.now() });
        this.emitPeers();
      } else if (b.k === 'bye' && b.peer) {
        this.seen.delete(b.peer.id);
        this.emitPeers();
      } else if (b.k === 'who') ch.postMessage({ k: 'hb', peer: me } satisfies Beat);
      else if (b.k === 'msg' && b.event) this.handlers.get(b.event)?.forEach(cb => cb(b.payload));
    };
    const beat = () => {
      ch.postMessage({ k: 'hb', peer: me } satisfies Beat);
      this.emitPeers();
    };
    beat();
    ch.postMessage({ k: 'who' } satisfies Beat);
    this.timer = setInterval(beat, 1000);
    this.statusCbs.forEach(cb => cb('online'));
    this.emitPeers();
  }

  send(event: string, payload: unknown) {
    this.ch?.postMessage({ k: 'msg', event, payload: JSON.parse(JSON.stringify(payload ?? null)) } satisfies Beat);
  }

  on(event: string, cb: (payload: any) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb);
    return () => this.handlers.get(event)?.delete(cb);
  }

  onPeers(cb: (p: Peer[]) => void) {
    this.peerCbs.add(cb);
    return () => this.peerCbs.delete(cb);
  }

  onStatus(cb: (s: Status) => void) {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  async peek(room: string): Promise<Peer[]> {
    const ch = new BroadcastChannel('napoletane:' + room);
    const found = new Map<string, Peer>();
    ch.onmessage = (e: MessageEvent<Beat>) => {
      if (e.data.k === 'hb' && e.data.peer) found.set(e.data.peer.id, e.data.peer);
    };
    ch.postMessage({ k: 'who' } satisfies Beat);
    await new Promise(r => setTimeout(r, 400));
    ch.close();
    return [...found.values()];
  }

  async disconnect() {
    if (this.timer) clearInterval(this.timer);
    if (this.ch && this.me) this.ch.postMessage({ k: 'bye', peer: this.me } satisfies Beat);
    this.ch?.close();
    this.ch = null;
    this.statusCbs.forEach(cb => cb('offline'));
  }
}
