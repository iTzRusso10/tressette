import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { payIn, payOut } from '@/meta/pot';
import { reportDuel } from '@/meta/social';
import { receiveReaction, resetReactions, trySend } from '@/state/reactions';
import { useProfile } from '@/meta/profile';
import { teamOf as teamOfSeat } from '@/engine';
import { dropNet, setOnRematch, startGuest, startHostMatch, useTable } from '@/state/table';
import { GuestRoom, HostRoom, type Lobby, type RoomConfig } from './room';
import { onlineConfigured as supabaseReady, SupabaseTransport } from './supabase';
import { TabTransport, type Peer, type Status, type Transport } from './transport';

/** Web only, for tests: `?local` plays online between tabs of the same browser, without a server. */
const LOCAL = typeof location !== 'undefined' && typeof BroadcastChannel !== 'undefined' && /[?&]local\b/.test(location.search ?? '');
export const onlineConfigured = supabaseReady || LOCAL;
const transport = (): Transport => (LOCAL ? new TabTransport() : new SupabaseTransport());

interface OnlineState {
  role: 'host' | 'guest' | null;
  lobby: Lobby | null;
  status: Status;
  hostOnline: boolean;
  /** Ids of the people connected now. */
  online: string[];
  closed: boolean;
  me: string;
  /** Chi ha creato la stanza: i nomi di chi chiede la rivincita. Chi è ospite: se l'ha già chiesta. */
  rematchAsks: string[];
  asked: boolean;
  /** Perché non si è potuti entrare (partita già cominciata, nessun posto). */
  refused: string | null;
}

export const useOnline = create<OnlineState>(() => ({ role: null, lobby: null, status: 'offline', hostOnline: true, online: [], closed: false, me: '', rematchAsks: [], asked: false, refused: null }));
const set = useOnline.setState;

let host: HostRoom | null = null;
let guest: GuestRoom | null = null;

/** A stable id for this device, so a reconnection gets the same seat back. */
let tabId = '';
async function clientId(): Promise<string> {
  // Tabs of the same browser share storage: in the local test mode each tab is its own player.
  if (LOCAL) return (tabId ||= 'tab' + Math.random().toString(36).slice(2, 10));
  // Signed in: your account, so the server knows who is in the pot.
  const acc = useProfile.getState().account;
  if (acc) return acc.id;
  const KEY = 'napoletane.id';
  try {
    const have = await AsyncStorage.getItem(KEY);
    if (have) return have;
  } catch {
    // ignore
  }
  const id = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {
    // ignore
  }
  return id;
}

export const roomLink = (code: string) => `https://itzrusso10.github.io/tressette/stanza/${code}`;

export async function createRoom(cfg: RoomConfig, name: string): Promise<string> {
  await leaveRoom();
  const id = await clientId();
  const me: Peer = { id, name, host: true };
  const t = transport();
  t.onStatus(status => set({ status }));
  host = new HostRoom(t, me, cfg);
  host.onLobby = lobby => set({ lobby });
  host.onPeers = online => set({ online: [...online] });
  host.onReact = (seat, r) => receiveReaction(seat, r);
  host.onAsk = seat => {
    const name = host?.lobby.seats[seat]?.name;
    if (name) set(s => ({ rematchAsks: s.rematchAsks.includes(name) ? s.rematchAsks : [...s.rematchAsks, name] }));
  };
  set({ role: 'host', lobby: host.lobby, closed: false, me: id, hostOnline: true, rematchAsks: [], asked: false });
  return host.open();
}

export function hostStart() {
  // Un doppio tocco su «Inizia» non deve far pagare la posta due volte.
  if (!host || host.lobby.started) return;
  resetReactions();
  startHostMatch(host);
  const l = host.lobby;
  payIn(l.matchId, l.cfg.stake);
}

export function freeSeat(i: number) {
  host?.removeSeat(i);
}

export async function joinRoom(code: string, name: string): Promise<'ok' | 'nohost' | 'error'> {
  await leaveRoom();
  const id = await clientId();
  const t = transport();
  t.onStatus(status => set({ status }));
  const g = new GuestRoom(t, { id, name, host: false });
  let lastMatch = '';
  g.onLobby = lobby => {
    // Arrivato a partita cominciata (o con la stanza piena): niente posto, quindi niente tavolo.
    if (g.seat < 0 && lobby.started) {
      dropNet();
      void leaveRoom();
      set({ refused: 'La partita è già cominciata e non ci sono posti liberi. Chiedi una rivincita a chi ha creato la stanza.' });
      return;
    }
    // Una partita nuova (anche la rivincita): reazioni e richieste ripartono da zero.
    if (lobby.matchId && lobby.matchId !== lastMatch) {
      lastMatch = lobby.matchId;
      resetReactions();
      set({ asked: false });
    }
    set({ lobby });
    useTable.setState({ viewer: Math.max(0, g.seat) });
    if (lobby.started && g.seat >= 0) payIn(lobby.matchId, lobby.cfg.stake);
  };
  g.onHost = hostOnline => set({ hostOnline });
  g.onClosed = () => set({ closed: true });
  g.onReact = (seat, r) => receiveReaction(seat, r);
  set({ role: 'guest', lobby: null, closed: false, me: id, hostOnline: true, rematchAsks: [], asked: false, refused: null });
  try {
    // Ready for the deal before saying hello.
    startGuest(g);
    const r = await g.join(code);
    if (r !== 'ok') {
      dropNet();
      set({ role: null });
      return r;
    }
    guest = g;
    return 'ok';
  } catch {
    dropNet();
    set({ role: null });
    return 'error';
  }
}

/** Una reazione veloce dal tuo posto (con il limite). */
export function sendReaction(id: string): boolean {
  if (host) return trySend(0, id, r => host!.react(r));
  if (guest && guest.seat >= 0) return trySend(guest.seat, id, r => guest!.react(r));
  return false;
}

/** Da ospite, a fine partita: chiedi a chi ha creato la stanza di rigiocare. */
export function askRematch() {
  if (!guest || useOnline.getState().asked) return;
  guest.askRematch();
  set({ asked: true });
}

export async function leaveRoom() {
  const h = host;
  const g = guest;
  host = null;
  guest = null;
  set({ role: null, lobby: null, online: [], closed: false });
  if (h) await h.close().catch(() => {});
  if (g) await g.leave().catch(() => {});
}

/** When an online match ends, settle the pot. */
useTable.subscribe((s, prev) => {
  const lobby = useOnline.getState().lobby;
  const out = s.match?.h?.result?.out;
  if (!lobby?.started || !out || !s.summary || prev.summary) return;
  const m = s.match!;
  payOut({
    matchId: lobby.matchId,
    stake: lobby.cfg.stake,
    mode: m.mode,
    n: m.n,
    me: s.viewer,
    payers: lobby.seats.map((x, i) => (x.type === 'cpu' ? -1 : i)).filter(i => i >= 0),
    winnerTeams: out.winners,
    peerOf: seat => lobby.seats[seat]?.peer,
  });
  // Le sfide tra persone con l'account: ognuno dice chi ha vinto, conta quando la maggioranza è d'accordo.
  const people = lobby.seats.map((x, i) => ({ peer: x.peer, i, cpu: x.type === 'cpu' })).filter(x => !x.cpu && !!x.peer);
  if (people.length >= 2)
    void reportDuel(
      lobby.matchId,
      m.game,
      people.map(x => x.peer!),
      people.filter(x => out.winners.includes(teamOfSeat(m, x.i))).map(x => x.peer!),
    );
});

setOnRematch(room => {
  payIn(room.lobby.matchId, room.lobby.cfg.stake);
  resetReactions();
  set({ rematchAsks: [] });
});
