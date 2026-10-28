import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  cardName,
  chooseMove,
  createMatch,
  GAMES,
  isValidMove,
  legalCards,
  play,
  scopaOptions,
  startHand,
  SETTEBELLO,
  SUITS,
  suitOf,
  teamOf,
  type Card,
  type GameEvent,
  type Match,
  type MatchConfig,
  type Move,
  type Signal,
  type Step,
} from '@/engine';
import { assignSlots } from '@/game/layout';
import type { GuestRoom, HostRoom } from '@/online/room';
import { recordHand, recordMatch } from '@/meta/profile';
import { cancelSfx, sfx, sfxAfter, type Sfx } from '@/ui/feedback';
import { dur } from '@/ui/motion';
import { dealTimes, landAt, moveAt } from '@/ui/sfxTiming';
import { useSettings } from './settings';

const SAVE_KEY = 'napoletane.partita.v1';

/** Web only, for visual checks: `?auto` lets the computer play your cards too. */
const AUTOPLAY = typeof location !== 'undefined' && /[?&]auto\b/.test(location.search ?? '');

export type FxKind = 'toast' | 'float' | 'bubble' | 'moment';
export interface Fx {
  id: number;
  kind: FxKind;
  text: string;
  sub?: string;
  p?: number;
  ms: number;
}

export interface TableState {
  match: Match | null;
  /** The last event shown, with a counter so effects can react to repeats. */
  event: GameEvent | null;
  eventId: number;
  /** Cards being dealt right now, in order, for the staggered deal. */
  dealing: Card[] | null;
  /** The viewer's seat while it is their turn. */
  awaiting: number | null;
  thinking: number;
  paused: boolean;
  summary: boolean;
  /** Touch: the first tap lifts a card, the second plays it. */
  selected: Card | null;
  /** Scopa: the captures to choose from for the selected card. */
  choices: Card[][] | null;
  pendingSig: Signal | null;
  fx: Fx[];
  viewer: number;
  /** Scopa: each table card's slot, kept while the card stays on the table. */
  slots: Map<Card, number>;
}

const initial: TableState = {
  match: null,
  event: null,
  eventId: 0,
  dealing: null,
  awaiting: null,
  thinking: -1,
  paused: false,
  summary: false,
  selected: null,
  choices: null,
  pendingSig: null,
  fx: [],
  viewer: 0,
  slots: new Map(),
};

/** Shows a match state, keeping Scopa table cards in their slots. */
const show = (m: Match) => ({ match: m, slots: assignSlots(get().slots, m.h?.table ?? []) });

export const useTable = create<TableState>(() => ({ ...initial }));
const set = useTable.setState;
const get = useTable.getState;

/* ------------------------------------------------------------------ timing */

const speed = () => (useSettings.getState().fast ? 0.55 : 1);
export const T = {
  /** The deck is shuffled before each hand. */
  shuffle: 560,
  /** Between one dealt card and the next. */
  dealCard: 52,
  play: 430,
  look: 1350,
  collect: 600,
  draw: 300,
  reveal: 2200,
  cpuMin: 650,
  cpuMax: 1100,
};

let gen = 0;
let resumeWaiters: (() => void)[] = [];

/* ------------------------------------------------------------------ online */

type Net = { role: 'host'; room: HostRoom } | { role: 'guest'; room: GuestRoom } | null;
let net: Net = null;
export const netRole = () => net?.role ?? null;
export const hostName = () => (net?.role === 'guest' ? (net.room.lobby?.host.name ?? '') : '');

/** Set by the online session: what to do when the host starts a rematch (pay the stake). */
let onRematch: ((room: HostRoom) => void) | null = null;
export function setOnRematch(f: (room: HostRoom) => void) {
  onRematch = f;
}

/** A friend's move, waited for at their turn. */
let remoteWait: { seat: number; resolve: (mv: Move) => void } | null = null;
/** When a friend's seat went offline: after a while the computer plays for them. */
const offlineSince = new Map<number, number>();
const OFFLINE_GRACE = 15000;

let humanResolve: ((mv: Move) => void) | null = null;
let fxSeq = 0;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* Sounds in time with the cards: a card sounds when it lands on the felt, not when it leaves. */

/** How long a card flies (Board: dur.card × speed). */
const flight = () => dur.card * speed();
/** Plays k after ms, unless the table has changed meanwhile (left, or a new match). */
const sfxAt = (g: number, k: Sfx, ms: number, opts: { haptic?: boolean } = {}) => sfxAfter(k, ms, { ...opts, when: () => g === gen });
/** One sound for each dealt card, as it lands (Board: dealIdx × T.dealCard). */
function dealSounds(g: number, count: number, startMs: number, stepMs: number) {
  const sp = speed();
  for (const at of dealTimes(count, { startMs: startMs * sp, stepMs: stepMs * sp, flightMs: flight() })) sfxAt(g, 'deal', at, { haptic: false });
}
async function wait(ms: number) {
  await sleep(ms * speed());
  while (get().paused) await new Promise<void>(r => resumeWaiters.push(r));
}

export function pushFx(kind: FxKind, text: string, opts: { sub?: string; p?: number; ms?: number } = {}) {
  const f: Fx = { id: ++fxSeq, kind, text, sub: opts.sub, p: opts.p, ms: opts.ms ?? 2000 };
  set(s => ({ fx: kind === 'toast' ? s.fx.filter(x => x.kind !== 'toast').concat(f) : s.fx.concat(f) }));
  setTimeout(() => set(s => ({ fx: s.fx.filter(x => x.id !== f.id) })), f.ms * (kind === 'toast' ? speed() : 1));
}

/* ------------------------------------------------------------------ saving */

async function save() {
  const m = get().match;
  // Online, only the host keeps the match; a friend's copy can't be resumed on its own.
  if (!m || net?.role === 'guest') return;
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(m));
  } catch {
    // Saving is best effort.
  }
}
export async function clearSave() {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
export async function loadSaved(): Promise<Match | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Match;
    return m && m.h && !m.finished ? m : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ helpers */

export const nameOf = (m: Match, p: number) => m.seats[p]?.name ?? '';
export const teamLabel = (m: Match, t: number) => (m.mode === '4' ? [t, t + 2].map(p => nameOf(m, p)).join(' e ') : nameOf(m, t));

/* ------------------------------------------------------------------ flow */

export function startMatch(cfg: MatchConfig) {
  gen++;
  cancelSfx();
  const m = createMatch(cfg);
  set({ ...initial, match: m });
  clearSave();
  newHand();
}

export function resumeMatch(m: Match) {
  gen++;
  cancelSfx();
  set({ ...initial, ...show(m), summary: !!m.h?.over });
  if (!m.h?.over) loop(gen);
}

export function quitMatch() {
  gen++;
  cancelSfx();
  humanResolve = null;
  remoteWait = null;
  resumeWaiters.splice(0).forEach(r => r());
  set({ ...initial });
  const n = net;
  net = null;
  if (n?.role === 'host') {
    n.room.close();
    clearSave();
  } else if (n?.role === 'guest') n.room.leave();
  else clearSave();
}

/** Online, as host: the friends' seats are 'remote' and their moves come from the room. */
export function startHostMatch(room: HostRoom) {
  net = { role: 'host', room };
  offlineSince.clear();
  room.onMove = (seat, mv) => {
    const w = remoteWait;
    const m = get().match;
    if (!w || w.seat !== seat || !m || !isValidMove(m, seat, mv)) return;
    remoteWait = null;
    w.resolve(mv);
  };
  room.start();
  startMatch(room.matchConfig());
}

/** Online, as a friend: the host deals and decides, here we show what happens and send our moves. */
export function startGuest(room: GuestRoom) {
  gen++;
  net = { role: 'guest', room };
  const g = gen;
  set({ ...initial, viewer: room.seat });
  let chain = Promise.resolve();
  const enqueue = (job: () => Promise<void>) => {
    chain = chain.then(async () => {
      if (g !== gen) return;
      await job();
      if (g !== gen) return;
      guestTurn();
    });
  };
  room.onSteps = steps =>
    enqueue(async () => {
      if (steps[0]?.event.k === 'deal') set({ summary: false });
      await runSteps(steps, g);
    });
  room.onSync = m =>
    enqueue(async () => {
      set({ ...show(m), event: null, summary: !!m.h?.over, viewer: room.seat });
    });
}

/** A friend's turn indicator and input, from the state they are looking at. */
function guestTurn() {
  const s = get();
  const m = s.match;
  const h = m?.h;
  if (!m || !h || h.over) return set({ awaiting: null, thinking: -1 });
  if (h.turn === s.viewer) {
    set({ awaiting: s.viewer, thinking: -1, selected: null, choices: null });
    if (AUTOPLAY) setTimeout(() => get().awaiting === s.viewer && submit(chooseMove(get().match!, s.viewer)), 700);
  } else set({ awaiting: null, thinking: h.turn });
}

export function setPaused(paused: boolean) {
  set({ paused });
  if (!paused) resumeWaiters.splice(0).forEach(r => r());
}

export function nextHand() {
  const m = get().match;
  if (!m || m.finished) return;
  set({ summary: false });
  newHand();
}

export function rematch() {
  const m = get().match;
  if (!m) return;
  if (net?.role === 'host') {
    // Online a rematch is a new match: a new id, and the stake goes in again.
    net.room.start();
    onRematch?.(net.room);
  }
  const s = useSettings.getState();
  startMatch({
    game: m.game,
    mode: m.mode,
    perdN: m.n === 2 ? 2 : 4,
    seats: m.seats,
    level: m.level,
    target: m.target,
    accusi: s.accusi,
    cappotto: m.cappotto,
  });
}

async function newHand() {
  const g = gen;
  const m = get().match!;
  const steps = startHand(m);
  if (net?.role === 'host') net.room.dealt(steps);
  await runSteps(steps, g);
  if (g !== gen) return;
  loop(g);
}

async function runSteps(steps: Step[], g: number) {
  for (const st of steps) {
    if (g !== gen) return;
    set(s => ({ ...show(st.state), event: st.event, eventId: s.eventId + 1 }));
    await present(st, g);
  }
}

/** Effects and pauses for each event, so people can follow what happened. */
async function present(st: Step, g: number) {
  const e = st.event;
  const m = st.state;
  const h = m.h!;
  const me = get().viewer;
  switch (e.k) {
    case 'deal': {
      set({ dealing: e.order });
      // The shuffle sound lasts as long as the shuffle; then each card sounds as it lands.
      sfxAt(g, 'shuffle', moveAt(), { haptic: false });
      dealSounds(g, e.order.length, T.shuffle, T.dealCard);
      await wait(T.shuffle);
      if (g !== gen) return;
      await wait(e.order.length * T.dealCard + 500);
      if (g !== gen) return;
      set({ dealing: null });
      const opener = nameOf(m, h.turn);
      if (m.game === 'briscola') pushFx('toast', `Mano ${m.handNo}`, { sub: `Briscola a ${SUITS[h.trump]}. Apre ${opener}.`, ms: 2600 });
      else pushFx('toast', `Mano ${m.handNo}`, { sub: `Distribuisce ${nameOf(m, m.dealer)}, apre ${opener}.`, ms: 2200 });
      if (h.accusi.length) await wait(700);
      return;
    }
    case 'accuso':
      pushFx('toast', `${nameOf(m, e.p)} accusa`, { sub: `${e.label}, +${e.pts}`, ms: 2400 });
      pushFx('float', `+${e.pts}`, { p: e.p, ms: 1500 });
      sfx('pts', { haptic: teamOf(m, e.p) === teamOf(m, me) });
      await wait(1300);
      return;
    case 'play':
      sfxAt(g, 'card', landAt(flight()), { haptic: false });
      // The signal is said over the player's name; the suit is the card just played.
      if (e.sig) pushFx('bubble', e.sig + '!', { p: e.p, ms: 2400 });
      await wait(h.inPlay ? T.play : T.play + (m.game === 'scopa' ? 150 : 0));
      return;
    case 'capture':
      await wait(T.look * 0.7);
      return;
    case 'trickWon':
      await wait(T.look);
      return;
    case 'collect': {
      // The cards start moving to the taker now: the sweep goes with them, the points just after.
      sfxAt(g, 'sweep', moveAt(), { haptic: false });
      const after = moveAt(flight() * 0.4);
      const mine = teamOf(m, e.w) === teamOf(m, me);
      if (e.scopa) {
        pushFx('moment', 'Scopa!', { sub: nameOf(m, e.w), p: e.w, ms: 1700 });
        sfxAt(g, 'scopa', after, { haptic: mine });
      } else if (e.settebello) {
        pushFx('float', 'Settebello', { p: e.w, ms: 1500 });
        sfxAt(g, 'pts', after, { haptic: mine });
      } else if (e.pts) {
        const big = m.game !== 'briscola' || Number(e.pts) >= 10;
        if (big) {
          pushFx('float', '+' + e.pts + (e.ultima ? ' ultima' : ''), { p: e.w, ms: 1500 });
          sfxAt(g, 'pts', after, { haptic: mine && (e.ultima || m.game === 'briscola') });
        }
      }
      await wait(T.collect);
      return;
    }
    case 'reveal': {
      sfxAt(g, 'card', landAt(flight()), { haptic: false });
      const others = e.cards.filter(x => x.p !== me);
      if (others.length) pushFx('toast', `${nameOf(m, others[0].p)} pesca`, { sub: cardName(others[0].c), ms: T.reveal });
      await wait(T.reveal);
      return;
    }
    case 'draw':
      sfxAt(g, 'deal', landAt(flight()), { haptic: false });
      await wait(m.game === 'tressette' ? T.play : T.draw);
      return;
    case 'deckEmpty':
      pushFx('toast', m.game === 'scopa' ? 'Ultima mano' : 'Mazzo finito', {
        sub: m.game === 'scopa' ? 'Le carte del mazzo sono finite.' : 'Si giocano le ultime carte.',
        ms: 1700,
      });
      await wait(250);
      return;
    case 'dealRound':
      set({ dealing: e.order });
      dealSounds(g, e.order.length, 0, T.dealCard * 1.4);
      await wait(e.order.length * T.dealCard * 1.4 + 600);
      set({ dealing: null });
      return;
    case 'tableToLast':
      pushFx('toast', 'Fine della mano', { sub: `Le carte rimaste in tavola vanno a ${nameOf(m, e.p)}.`, ms: 2000 });
      sfxAt(g, 'sweep', moveAt(), { haptic: false });
      await wait(T.collect + 600);
      return;
    case 'handEnd': {
      if (e.cappotto >= 0) {
        pushFx('moment', 'Cappotto!', { sub: teamLabel(m, e.cappotto), p: e.cappotto, ms: 2200 });
        sfx('scopa', { haptic: true });
        await wait(1200);
      }
      await wait(450);
      if (g !== gen) return;
      const out = h.result?.out;
      const myTeam = teamOf(m, me);
      // Your progress: statistics, trophies, coins and experience.
      recordHand({
        scope: m.game === 'scopa' ? h.scope[me] : 0,
        settebello: m.game === 'scopa' && h.capt[me].includes(SETTEBELLO),
        napoletana: h.accusi.some(a => a.p === me && a.label.startsWith('Napoletana')),
        cappotto: e.cappotto >= 0 && e.cappotto === myTeam,
      });
      if (out) recordMatch({ game: m.game, mode: m.mode, level: m.level, online: !!net, won: out.winners.includes(myTeam) });
      if (out && out.winners.includes(myTeam)) sfx('win');
      await save();
      set({ summary: true });
      return;
    }
  }
}

async function loop(g: number) {
  while (g === gen) {
    const m = get().match!;
    const h = m.h!;
    if (h.over) return;
    const p = h.turn;
    const seat = m.seats[p];
    await save();
    if (g !== gen) return;
    let mv: Move | null;
    if (seat.type === 'remote' && net?.role === 'host') {
      set({ thinking: p });
      mv = await awaitRemote(p, g);
      if (g !== gen) return;
      set({ thinking: -1 });
    } else if (seat.type === 'cpu' || AUTOPLAY) {
      set({ thinking: p });
      const t0 = Date.now();
      await wait(40);
      if (g !== gen) return;
      mv = chooseMove(get().match!, p);
      const spent = Date.now() - t0;
      await wait(Math.max(0, T.cpuMin + Math.random() * (T.cpuMax - T.cpuMin) - spent / speed()));
      if (g !== gen) return;
      set({ thinking: -1 });
    } else {
      mv = await new Promise<Move>(res => {
        humanResolve = res;
        set({ awaiting: p, selected: null, choices: null, pendingSig: null });
      });
      if (g !== gen) return;
    }
    const cur = get().match!;
    if (!isValidMove(cur, p, mv)) continue;
    const steps = play(cur, p, mv);
    if (net?.role === 'host') net.room.played(p, mv, steps.at(-1)!.state);
    await runSteps(steps, g);
  }
}

/** Waits for a friend's move; if they stay offline, the computer plays their turn. */
function awaitRemote(p: number, g: number): Promise<Move> {
  return new Promise(resolve => {
    remoteWait = { seat: p, resolve };
    const room = net?.role === 'host' ? net.room : null;
    let warned = false;
    const tick = () => {
      if (g !== gen || remoteWait?.seat !== p) return;
      const online = room?.isOnline(p) ?? false;
      if (online) offlineSince.delete(p);
      else if (!offlineSince.has(p)) offlineSince.set(p, Date.now());
      const since = offlineSince.get(p);
      if (since !== undefined && Date.now() - since > OFFLINE_GRACE) {
        const m = get().match!;
        if (!warned) pushFx('toast', `${nameOf(m, p)} non è in linea`, { sub: 'Gioca il computer al suo posto.', ms: 2200 });
        warned = true;
        remoteWait = null;
        resolve(chooseMove(m, p));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

/* ------------------------------------------------------------------ input */

export function canPlay(c: Card): boolean {
  const s = get();
  return !!s.match && s.awaiting === s.viewer && !s.paused && s.match.h!.hands[s.viewer].includes(c);
}

function submit(mv: Move) {
  if (net?.role === 'guest') {
    const sig = get().pendingSig;
    set({ awaiting: null, selected: null, choices: null, pendingSig: null });
    sfx('tick', { haptic: true });
    net.room.sendMove({ ...mv, sig: mv.sig ?? sig });
    return;
  }
  const r = humanResolve;
  if (!r) return;
  humanResolve = null;
  const sig = get().pendingSig;
  set({ awaiting: null, selected: null, choices: null, pendingSig: null });
  sfx('tick', { haptic: true });
  r({ ...mv, sig: mv.sig ?? sig });
}

/**
 * A tap on one of your cards. With `direct` (mouse, or a drag onto the table) the card is played at once;
 * otherwise the first tap lifts it and the second plays it.
 */
export function tapCard(c: Card, direct = false) {
  const s = get();
  if (!canPlay(c)) return;
  const m = s.match!;
  const h = m.h!;
  if (m.game === 'scopa') {
    const opts = scopaOptions(c, h.table);
    if (opts.length <= 1 && (direct || s.selected === c)) return submit({ c, take: opts[0] || [] });
    sfx('tick', { haptic: true });
    set({ selected: c, choices: opts.length > 1 ? opts : null });
    return;
  }
  if (!legalCards(m, s.viewer).includes(c)) {
    sfx('nope');
    pushFx('toast', 'Rispondi a seme', { sub: `Devi giocare ${SUITS[suitOf(h.trick[0].c)]}.`, ms: 1500 });
    set({ selected: null });
    return;
  }
  if (direct || s.selected === c) return submit({ c });
  sfx('tick', { haptic: true });
  set({ selected: c });
}

export function chooseCapture(take: Card[]) {
  const s = get();
  if (s.selected === null) return;
  submit({ c: s.selected, take });
}

export function clearSelection() {
  if (get().selected !== null) set({ selected: null, choices: null });
}

export function toggleSignal(sig: Signal) {
  sfx('tick', { haptic: true });
  set(s => ({ pendingSig: s.pendingSig === sig ? null : sig }));
}

/** Tressette in four, your opening card: may give a signal. */
export function canSignal(): boolean {
  const s = get();
  const m = s.match;
  return !!m && m.game === 'tressette' && m.mode === '4' && s.awaiting === s.viewer && !m.h!.trick.length;
}

export const gameTitle = (m: Match) => GAMES[m.game].name;
