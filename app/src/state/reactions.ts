// Le reazioni al tavolo: le bolle che si vedono accanto ai nomi, il limite e il silenzio.
import { create } from 'zustand';
import { canSend, canShow } from '@/meta/reactions';
import { useSettings } from './settings';

interface Bubble {
  id: string;
  /** Cambia a ogni reazione: la bolla nuova sostituisce la vecchia con la sua animazione. */
  n: number;
}

interface ReactionsState {
  bubbles: Record<number, Bubble>;
  sent: number[];
  lastBySeat: Record<number, number>;
  /** Silenzio per questa partita (le impostazioni hanno quello per sempre). */
  muted: boolean;
  /** Il vassoio delle frasi è aperto. */
  tray: boolean;
}

export const useReactions = create<ReactionsState>(() => ({ bubbles: {}, sent: [], lastBySeat: {}, muted: false, tray: false }));
const set = useReactions.setState;
const get = useReactions.getState;

const SHOW_MS = 2600;
let n = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function show(seat: number, id: string) {
  const k = ++n;
  set(s => ({ bubbles: { ...s.bubbles, [seat]: { id, n: k } } }));
  clearTimeout(timers.get(seat));
  timers.set(
    seat,
    setTimeout(() => set(s => (s.bubbles[seat]?.n === k ? { bubbles: Object.fromEntries(Object.entries(s.bubbles).filter(([x]) => Number(x) !== seat)) } : s)), SHOW_MS),
  );
}

/** Una reazione arrivata da un altro posto. */
export function receiveReaction(seat: number, id: string, now = Date.now()) {
  if (get().muted || useSettings.getState().muteReactions) return;
  if (!canShow(id, get().lastBySeat[seat], now)) return;
  set(s => ({ lastBySeat: { ...s.lastBySeat, [seat]: now } }));
  show(seat, id);
}

/** Prova a mandare una reazione: se il limite lo permette la mostra anche qui e ritorna true. */
export function trySend(seat: number, id: string, send: (id: string) => void, now = Date.now()): boolean {
  if (!canSend(get().sent, now)) return false;
  set(s => ({ sent: [...s.sent.slice(-10), now] }));
  send(id);
  show(seat, id);
  return true;
}

export const setMuted = (muted: boolean) => set(s => ({ muted, bubbles: muted ? {} : s.bubbles }));
export const setTray = (tray: boolean) => set({ tray });

/** All'inizio di una partita nuova si riparte puliti. */
export function resetReactions() {
  timers.forEach(t => clearTimeout(t));
  timers.clear();
  set({ bubbles: {}, lastBySeat: {}, muted: false, tray: false });
}
