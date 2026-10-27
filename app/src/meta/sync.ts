import { supabase, supabaseConfigured } from '@/lib/supabase';
import { setRemote, useProfile } from './profile';
import { emptyStats, type Stats } from './progress';
import { DEFAULT_EQUIPPED, STARTER_ITEMS, type Slot } from './shop';

/**
 * With an account, progress lives on the server: the device applies each event at once (so the screen
 * reacts immediately) and sends it to the `progress` function, whose answer — the true totals — replaces
 * the local ones. Coins can't be made up on the device.
 */

interface ServerProfile {
  coins: number;
  xp: number;
  stats: Stats | null;
  trophies: Record<string, number> | null;
  bonus: { lastDay: string | null; streak: number } | null;
  friend_code: string;
  /** Trofei delle arene e il massimo mai avuto (le migrazioni li creano a 0). */
  cups?: number;
  best_cups?: number;
  owned?: string[] | null;
  equipped?: Partial<Record<Slot, string>> | null;
}

function adopt(p: ServerProfile) {
  useProfile.setState({
    friendCode: p.friend_code ?? null,
    coins: p.coins,
    xp: p.xp,
    stats: { ...emptyStats(), ...(p.stats ?? {}) },
    trophies: p.trophies ?? {},
    bonus: p.bonus ?? { lastDay: null, streak: 0 },
    // Un server ancora senza la migrazione dei trofei non li manda: allora restano quelli del telefono.
    ...(typeof p.cups === 'number' ? { cups: p.cups, bestCups: Math.max(p.best_cups ?? 0, p.cups) } : {}),
    ...(Array.isArray(p.owned) ? { owned: [...new Set([...STARTER_ITEMS, ...p.owned])] } : {}),
    ...(p.equipped ? { equipped: { ...DEFAULT_EQUIPPED, ...p.equipped } } : {}),
  });
}

async function call(action: string, payload: Record<string, unknown> = {}): Promise<ServerProfile | null> {
  if (!supabaseConfigured || !useProfile.getState().account) return null;
  const { data, error } = await supabase().functions.invoke('progress', { body: { action, ...payload } });
  if (error) throw error;
  return (data?.profile as ServerProfile) ?? null;
}

/** After signing in: take the server's progress, or bring this device's progress along the first time. */
export async function pullProgress() {
  const local = useProfile.getState();
  const p = await call('import', {
    coins: local.coins,
    xp: local.xp,
    stats: local.stats,
    trophies: local.trophies,
    bonus: local.bonus,
    cups: local.cups,
    bestCups: local.bestCups,
    owned: local.owned,
    equipped: local.equipped,
  });
  if (p) adopt(p);
}

/** Every event goes to the server too; its answer is the truth. */
setRemote((action, payload) => {
  call(action, payload)
    .then(p => p && adopt(p))
    .catch(() => {
      // Offline: the server catches up at the next sign-in or event.
    });
});
