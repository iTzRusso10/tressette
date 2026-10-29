import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canClaim, dayOf } from './economy';
import {
  applyHand,
  applyMatch,
  buyItem as buyInLedger,
  claimDaily as claimInLedger,
  equipItem,
  newProgress,
  normalize,
  refill as refillInLedger,
  claimReward as claimRewardInLedger,
  selectAvatar,
  selectShowcase,
  swapMission,
  selectTitle,
  touch,
  type Gain,
  type Progress,
  type BuyRefusal,
} from './ledger';
import type { HandRecord, MatchRecord } from './progress';
import type { Slot } from './catalog';
import { BALANCE } from './balance';
import { achievementById } from './achievements';

export type { Gain, Progress };

/** Qualcosa da festeggiare sullo schermo (una nuova arena prende tutto lo schermo). */
/** `cid` è il numero della festa (non `id`: un achievement o un set hanno già il loro `id`). */
export type Celebration = Gain & { cid: number };

/** I trofei dell'ultima partita, per il riepilogo a fine partita. */
export interface LastMatch {
  delta: number;
  cups: number;
  at: number;
  game?: MatchRecord['game'];
  /** Punteggio di bravura del gioco dopo la partita, e quanto è cambiato. */
  rating?: number;
  ratingDelta?: number;
}

export interface Account {
  id: string;
  name: string;
  avatar?: string;
  provider: 'apple' | 'google' | 'facebook';
}

interface ProfileState extends Progress {
  account: Account | null;
  /** Il tuo codice per farti aggiungere dagli amici (dal server). */
  friendCode: string | null;
  /** Non salvati: cosa aspetta di essere mostrato, e i trofei dell'ultima partita. */
  celebrations: Celebration[];
  lastMatch: LastMatch | null;
}

let seq = 0;
const randomSeed = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Manda un evento al server quando sei collegato (lo imposta sync.ts, per evitare un import circolare). */
type Remote = (action: string, payload: Record<string, unknown>) => void;
let remote: Remote = () => {};
export function setRemote(r: Remote) {
  remote = r;
}

const progressKeys = ['coins', 'xp', 'stats', 'achievements', 'cups', 'bestCups', 'owned', 'equipped', 'bonus', 'meta'] as const;

export const useProfile = create<ProfileState>()(
  persist(
    (): ProfileState => ({
      ...newProgress(randomSeed()),
      account: null,
      friendCode: null,
      celebrations: [],
      lastMatch: null,
    }),
    {
      name: 'napoletane.profilo.v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ celebrations: _c, lastMatch: _l, ...rest }) => rest,
      // Versione 1: il vecchio negozio (panno+sponda, decori), le medaglie in `trophies`, 8 trofei per arena.
      migrate: (saved, version) => {
        const s = (saved ?? {}) as Record<string, unknown>;
        if (version >= 2) return s as unknown as ProfileState;
        const p = normalize(s as Parameters<typeof normalize>[0], randomSeed());
        return { ...p, account: (s.account as Account) ?? null, friendCode: (s.friendCode as string) ?? null } as ProfileState;
      },
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<ProfileState>;
        const p = normalize(s as Parameters<typeof normalize>[0], current.meta.seed);
        return { ...current, ...s, ...p };
      },
    },
  ),
);

const set = useProfile.setState;
const get = useProfile.getState;

/** Lo stato di progressione, senza i campi del solo telefono. */
export function progressOf(s: ProfileState = get()): Progress {
  return Object.fromEntries(progressKeys.map(k => [k, s[k]])) as unknown as Progress;
}

const today = () => dayOf(new Date());

/**
 * Quali guadagni meritano un avviso: le monete solo per la vittoria, gli oggetti solo se arrivano da
 * soli. Tanti achievement o livelli insieme (un profilo che arriva da una versione vecchia) diventano
 * un avviso solo, invece di una fila lunghissima.
 */
function worthShowing(gains: Gain[]): Gain[] {
  const big = gains.some(g => g.k === 'arena' || g.k === 'achievement' || g.k === 'set' || g.k === 'seasonTier' || g.k === 'legend' || g.k === 'prestige');
  const achievements = gains.filter(g => g.k === 'achievement');
  const levels = gains.filter(g => g.k === 'level');
  const many = achievements.length > 3;
  const out = gains.filter(g => {
    if (g.k === 'coins') return !many && (g.why === 'Prima vittoria del giorno' || g.why === 'Vittoria');
    if (g.k === 'item') return !big;
    if (g.k === 'chapter') return false;
    if (g.k === 'achievement') return !many;
    if (g.k === 'level') return levels.length <= 2 || g === levels[levels.length - 1];
    if (g.k === 'mission') return !many;
    // Il punteggio si vede nel riepilogo della partita; le ricompense da riscuotere nella home.
    if (g.k === 'rating' || g.k === 'claimable') return false;
    return true;
  });
  if (many) {
    const coins = achievements.reduce((a, g) => a + (achievementById((g as { id: string }).id)?.coins ?? 0), 0);
    out.unshift({ k: 'coins', amount: coins, why: `${achievements.length} achievement completati` });
  }
  return out;
}

function adopt(p: Progress, gains: Gain[]) {
  const show = worthShowing(gains).map(g => ({ ...g, cid: ++seq }) as Celebration);
  set(s => ({ ...p, celebrations: s.celebrations.concat(show) }));
}

export function dismissCelebration(cid: number) {
  set(s => ({ celebrations: s.celebrations.filter(c => c.cid !== cid) }));
}

export function recordHand(h: HandRecord) {
  const day = today();
  const r = applyHand(progressOf(), h, day);
  adopt(r.p, r.gains);
  remote('hand', { hand: h, day });
}

export function recordMatch(m: Omit<MatchRecord, 'id'>) {
  const day = today();
  const rec: MatchRecord = { ...m, id: randomSeed() };
  const r = applyMatch(progressOf(), rec, day, Date.now());
  adopt(r.p, r.gains);
  set({ lastMatch: { delta: r.delta, cups: r.p.cups, at: Date.now(), game: m.game, rating: r.p.meta.ratings[m.game].r, ratingDelta: r.ratingDelta } });
  remote('match', { match: rec, day });
}

/** Compra un oggetto con le monete. */
export function buyItem(slot: Slot, id: string): { ok: true } | { ok: false; why: BuyRefusal } {
  const day = today();
  const r = buyInLedger(progressOf(), slot, id, day);
  if (!r.ok) return r;
  adopt(r.p, r.gains);
  remote('buy', { slot, item: id, day });
  return { ok: true };
}

/** Mette sul tavolo (o sulle carte) un oggetto posseduto. */
export function equip(slot: Slot, id: string) {
  const p = equipItem(progressOf(), slot, id);
  if (!p) return;
  set({ equipped: p.equipped });
  remote('equip', { slot, item: id });
}

/** Riscuote una ricompensa (o tutte con «*»). */
export function claim(id: string): number {
  const day = today();
  const before = get().coins;
  const r = claimRewardInLedger(progressOf(), id, day);
  if (!r.claimed.length) return 0;
  adopt(r.p, r.gains.filter(g => g.k !== 'coins'));
  remote('claim', { id, day });
  return r.p.coins - before;
}

/** Cambia una missione del giorno (una volta al giorno). */
export function swapDailyMission(key: string): boolean {
  const p = swapMission(progressOf(), key, today());
  if (!p) return false;
  set({ meta: p.meta });
  remote('swap', { key, day: today() });
  return true;
}

export function chooseAvatar(id: string) {
  const p = selectAvatar(progressOf(), id);
  if (!p) return;
  set({ meta: p.meta });
  remote('avatar', { avatar: id });
}

export function chooseShowcase(keys: string[]) {
  const p = selectShowcase(progressOf(), keys);
  if (!p) return;
  set({ meta: p.meta });
  remote('showcase', { showcase: keys });
}

export function chooseTitle(id: string) {
  const p = selectTitle(progressOf(), id);
  if (!p) return;
  set({ meta: p.meta });
  remote('title', { title: id });
}

export const bonusAvailable = (now = new Date()) => canClaim(get().bonus, now);

/** Il bonus di oggi; con `doubled` (dopo un video) vale il doppio. */
export function claimDaily(doubled: boolean, now = new Date()): number {
  const day = dayOf(now);
  const r = claimInLedger(progressOf(), day, doubled);
  if (!r) return 0;
  adopt(r.p, r.gains);
  remote('bonus', { doubled, day });
  return r.amount;
}

/** All'apertura e a ogni cambio di giorno: nuove missioni, stagione nuova. */
export function refreshDay() {
  const r = touch(progressOf(), today());
  adopt(r.p, r.gains);
}

export const canRefill = () => get().coins < BALANCE.coins.refillBelow;

export function refill() {
  const p = refillInLedger(progressOf());
  if (!p) return;
  set({ coins: p.coins });
  remote('refill', {});
}

/** Toglie monete (una posta); false se non bastano. */
export function spend(n: number): boolean {
  if (get().coins < n) return false;
  set(s => ({ coins: s.coins - n }));
  return true;
}

export function celebrateCoins(amount: number, why: string) {
  set(s => ({ celebrations: s.celebrations.concat({ k: 'coins', amount, why, cid: ++seq }) }));
}

export function earn(n: number) {
  if (n > 0) set(s => ({ coins: s.coins + n }));
}

export function setAccount(a: Account | null) {
  set({ account: a });
}
