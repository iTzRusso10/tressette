import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canClaim, claimBonus, levelOf, REFILL, REFILL_BELOW, START_COINS, XP, type BonusState } from './economy';
import { addHand, addMatch, emptyStats, matchReward, newlyUnlocked, TROPHIES, type HandRecord, type MatchRecord, type Stats, type Trophy } from './progress';

/** Something to celebrate on screen: a trophy, a new level, coins earned. */
export type Celebration =
  { id: number; kind: 'trophy'; trophy: Trophy } | { id: number; kind: 'level'; level: number } | { id: number; kind: 'coins'; amount: number; why: string };

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
  /** Trophy id → when it was unlocked (ms). */
  trophies: Record<string, number>;
  bonus: BonusState;
  account: Account | null;
  /** Your code for friends to add you (from the server). */
  friendCode: string | null;
  /** Not saved: what is waiting to be shown. */
  celebrations: Celebration[];
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
      bonus: { lastDay: null, streak: 0 },
      account: null,
      friendCode: null,
      celebrations: [],
    }),
    {
      name: 'napoletane.profilo.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ celebrations: _c, ...rest }) => rest,
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
  remote('match', { match: r });
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
