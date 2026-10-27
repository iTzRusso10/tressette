import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canClaim, claimBonus, levelOf, REFILL, REFILL_BELOW, START_COINS, XP, type BonusState } from './economy';
import { addHand, addMatch, emptyStats, matchReward, newlyUnlocked, TROPHIES, type HandRecord, type MatchRecord, type Stats, type Trophy } from './progress';
import { applyTrophies, arenaItems, type Arena } from './arenas';
import { buy, canEquip, DEFAULT_EQUIPPED, STARTER_ITEMS, type BuyResult, type Slot } from './shop';

/** Something to celebrate on screen: a medal, a new level, coins earned, a new arena. */
export type Celebration =
  | { id: number; kind: 'trophy'; trophy: Trophy }
  | { id: number; kind: 'level'; level: number }
  | { id: number; kind: 'coins'; amount: number; why: string }
  | { id: number; kind: 'arena'; arena: Arena };

/** How the last match went for trophies: shown in the summary at the end of the match. */
export interface LastMatch {
  /** Trophies won (positive) or lost (negative). */
  delta: number;
  cups: number;
  at: number;
}

export interface Account {
  id: string;
  name: string;
  avatar?: string;
  provider: 'apple' | 'google' | 'facebook';
}

interface ProfileState {
  coins: number;
  xp: number;
  stats: Stats;
  /** Medals: id → when it was unlocked (ms). (Called trophies in the code and on the server for history.) */
  trophies: Record<string, number>;
  /** Trophies of the arena road ("trofei" on screen), and the most ever held (it sets the arena floor). */
  cups: number;
  bestCups: number;
  /** Shop and arena items owned (the starters are always owned), and the ones in use. */
  owned: string[];
  equipped: Record<Slot, string>;
  bonus: BonusState;
  account: Account | null;
  /** Your code for friends to add you (from the server). */
  friendCode: string | null;
  /** Not saved: what is waiting to be shown. */
  celebrations: Celebration[];
  /** Not saved: trophies of the last match, for its summary. */
  lastMatch: LastMatch | null;
}

let seq = 0;

/** Sends an event to the server when signed in (set by sync.ts, to avoid an import cycle). */
type Remote = (action: string, payload: Record<string, unknown>) => void;
let remote: Remote = () => {};
export function setRemote(r: Remote) {
  remote = r;
}

export const useProfile = create<ProfileState>()(
  persist(
    (): ProfileState => ({
      coins: START_COINS,
      xp: 0,
      stats: emptyStats(),
      trophies: {},
      cups: 0,
      bestCups: 0,
      owned: [...STARTER_ITEMS],
      equipped: { ...DEFAULT_EQUIPPED },
      bonus: { lastDay: null, streak: 0 },
      account: null,
      friendCode: null,
      celebrations: [],
      lastMatch: null,
    }),
    {
      name: 'napoletane.profilo.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ celebrations: _c, lastMatch: _l, ...rest }) => rest,
      // Profiles saved before trophies and the shop existed.
      merge: (saved, current) => ({ ...current, ...(saved as Partial<ProfileState>) }),
    },
  ),
);

const set = useProfile.setState;
const get = useProfile.getState;

export const level = () => levelOf(get().xp);

type NewCelebration = Celebration extends infer C ? (C extends Celebration ? Omit<C, 'id'> : never) : never;

function celebrate(c: NewCelebration) {
  set(s => ({ celebrations: s.celebrations.concat({ ...c, id: ++seq } as Celebration) }));
}

export function dismissCelebration(id: number) {
  set(s => ({ celebrations: s.celebrations.filter(c => c.id !== id) }));
}

/** Adds experience and coins, checks new trophies (which pay out in turn) and level-ups. */
function apply(stats: Stats, coins: number, xp: number) {
  const before = get();
  const levelBefore = levelOf(before.xp);
  const fresh = newlyUnlocked(stats, before.trophies);
  const now = Date.now();
  const trophies = { ...before.trophies };
  let c = coins;
  let x = xp;
  for (const t of fresh) {
    trophies[t.id] = now;
    c += t.coins;
    x += t.xp;
  }
  set({ stats, trophies, coins: before.coins + c, xp: before.xp + x });
  fresh.forEach(t => celebrate({ kind: 'trophy', trophy: t }));
  const levelAfter = levelOf(before.xp + x);
  if (levelAfter > levelBefore) celebrate({ kind: 'level', level: levelAfter });
}

export function recordHand(h: HandRecord) {
  apply(addHand(get().stats, h), 0, XP.hand + h.scope * XP.scopa);
  remote('hand', { hand: h });
}

export function recordMatch(r: MatchRecord) {
  const reward = matchReward(r);
  apply(addMatch(get().stats, r), reward.coins, reward.xp);
  if (reward.coins) celebrate({ kind: 'coins', amount: reward.coins, why: 'Vittoria' });
  const t = applyTrophies(get().cups, get().bestCups, r);
  set({ cups: t.trophies, bestCups: t.best, lastMatch: { delta: t.delta, cups: t.trophies, at: Date.now() } });
  for (const a of t.arenas) reachArena(a);
  remote('match', { match: r });
}

/** A new arena: its coins, its items, and its felt (and back) on the table straight away. */
function reachArena(a: Arena) {
  const s = get();
  const items = arenaItems(a);
  const equipped = { ...s.equipped, felt: a.felt, ...(a.back ? { back: a.back } : {}) };
  set({ coins: s.coins + a.coins, owned: [...new Set([...s.owned, ...items])], equipped });
  celebrate({ kind: 'arena', arena: a });
}

/** Buys an item from the shop with coins (`day` is today, for the offer of the day). */
export function buyItem(id: string, day: string): BuyResult {
  const s = get();
  const r = buy(id, s.coins, s.owned, day);
  if (r.ok) {
    set({ coins: r.coins, owned: r.owned });
    remote('buy', { item: id, day });
  }
  return r;
}

/** Puts an owned item on the table (or on the cards). */
export function equip(slot: Slot, id: string) {
  const s = get();
  if (!canEquip(id, slot, s.owned)) return;
  set({ equipped: { ...s.equipped, [slot]: id } });
  remote('equip', { slot, item: id });
}

export const bonusAvailable = (now = new Date()) => canClaim(get().bonus, now);

/** Today's bonus; with `doubled` (after watching a video) it pays twice. */
export function claimDaily(doubled: boolean, now = new Date()): number {
  const { state, amount } = claimBonus(get().bonus, now);
  const total = doubled ? amount * 2 : amount;
  const stats = { ...get().stats, bonusStreak: Math.max(get().stats.bonusStreak, state.streak) };
  set({ bonus: state, coins: get().coins + total });
  apply(stats, 0, 0);
  remote('bonus', { doubled, day: state.lastDay });
  return total;
}

export const canRefill = () => get().coins < REFILL_BELOW;

/** Free coins after a video, when the wallet runs low. */
export function refill() {
  set(s => ({ coins: s.coins + REFILL }));
  remote('refill', {});
}

/** Takes coins (a stake); false if there aren't enough. */
export function spend(n: number): boolean {
  if (get().coins < n) return false;
  set(s => ({ coins: s.coins - n }));
  return true;
}

export function celebrateCoins(amount: number, why: string) {
  celebrate({ kind: 'coins', amount, why });
}

export function earn(n: number) {
  if (n > 0) set(s => ({ coins: s.coins + n }));
}

export function setAccount(a: Account | null) {
  set({ account: a });
}

export { TROPHIES };
