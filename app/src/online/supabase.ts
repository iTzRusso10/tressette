import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import type { Peer, Status, Transport } from './transport';

/** Online needs the project URL and the public (anon) key, in app/.env. */
export const onlineConfigured = supabaseConfigured;

const channelName = (room: string) => `napoletane:${room}`;

function peersOf(ch: RealtimeChannel): Peer[] {
  const state = ch.presenceState<Peer & { at: number }>();
  const byId = new Map<string, Peer & { at: number }>();
  for (const metas of Object.values(state)) for (const p of metas) if (!byId.has(p.id) || byId.get(p.id)!.at < p.at) byId.set(p.id, p);
  return [...byId.values()].map(({ id, name, host }) => ({ id, name, host }));
}

/** A room on Supabase Realtime: broadcast for messages, presence for who is connected. */
export class SupabaseTransport implements Transport {
  private ch: RealtimeChannel | null = null;
  private handlers = new Map<string, Set<(p: any) => void>>();
  private peerCbs = new Set<(p: Peer[]) => void>();
  private statusCbs = new Set<(s: Status) => void>();

  private setStatus(s: Status) {
    this.statusCbs.forEach(cb => cb(s));
  }

  connect(room: string, me: Peer): Promise<void> {
    const ch = supabase().channel(channelName(room), {
      config: { broadcast: { self: false, ack: false }, presence: { key: me.id, enabled: true } },
    });
    this.ch = ch;
    ch.on('broadcast', { event: '*' }, msg => {
      this.handlers.get(msg.event)?.forEach(cb => cb(msg.payload));
    });
    ch.on('presence', { event: 'sync' }, () => {
      const peers = peersOf(ch);
      this.peerCbs.forEach(cb => cb(peers));
    });
    this.setStatus('connecting');
    return new Promise((resolve, reject) => {
      let first = true;
      ch.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ ...me, at: Date.now() });
          this.setStatus('online');
          if (first) {
            first = false;
            resolve();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.setStatus(status === 'CLOSED' ? 'offline' : 'connecting');
          if (first) {
            first = false;
            reject(err ?? new Error(status));
          }
        }
      });
    });
  }

  send(event: string, payload: unknown) {
    this.ch?.send({ type: 'broadcast', event, payload }).catch(() => {});
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

  /** Joins briefly, without being seen, to read who is in the room. */
  async peek(room: string): Promise<Peer[]> {
    const ch = supabase().channel(channelName(room), { config: { presence: { enabled: true } } });
    try {
      return await new Promise<Peer[]>(resolve => {
        const timer = setTimeout(() => resolve(peersOf(ch)), 2500);
        ch.on('presence', { event: 'sync' }, () => {
          clearTimeout(timer);
          resolve(peersOf(ch));
        });
        ch.subscribe(status => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timer);
            resolve([]);
          }
        });
      });
    } finally {
      supabase().removeChannel(ch);
    }
  }

  async disconnect() {
    if (!this.ch) return;
    const ch = this.ch;
    this.ch = null;
    try {
      await ch.untrack();
    } catch {
      // ignore
    }
    await supabase().removeChannel(ch);
    this.setStatus('offline');
  }
}
