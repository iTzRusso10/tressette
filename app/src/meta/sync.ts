import { supabase, supabaseConfigured } from '@/lib/supabase';
import { normalize, type Meta, type Progress } from './ledger';
import { progressOf, setRemote, useProfile } from './profile';

/**
 * Con un account la progressione vive sul server: il telefono applica ogni evento subito (così lo
 * schermo risponde) e lo manda alla funzione `progress`, che applica le stesse regole (ledger.ts) e
 * risponde con lo stato vero, che sostituisce quello del telefono. Le monete non si inventano.
 */

interface ServerProfile {
  coins: number;
  xp: number;
  stats: unknown;
  /** Achievement completati (nome storico della colonna). */
  trophies: Record<string, number> | null;
  bonus: { lastDay: string | null; streak: number } | null;
  friend_code: string;
  cups?: number;
  best_cups?: number;
  owned?: string[] | null;
  equipped?: Record<string, string> | null;
  meta?: Partial<Meta> | null;
}

function adopt(sp: ServerProfile) {
  const local = useProfile.getState();
  const p: Progress = normalize(
    {
      coins: sp.coins,
      xp: sp.xp,
      stats: sp.stats as Progress['stats'],
      achievements: sp.trophies ?? {},
      cups: sp.cups ?? 0,
      bestCups: sp.best_cups ?? 0,
      owned: sp.owned ?? [],
      equipped: (sp.equipped ?? {}) as Progress['equipped'],
      bonus: sp.bonus ?? { lastDay: null, streak: 0 },
      // Un server senza la colonna meta (migrazione non ancora fatta) tiene quella del telefono.
      ...(sp.meta ? { meta: sp.meta as Meta } : { meta: local.meta }),
    },
    local.meta.seed,
  );
  useProfile.setState({ ...p, friendCode: sp.friend_code ?? null });
}

async function call(action: string, payload: Record<string, unknown> = {}): Promise<ServerProfile | null> {
  if (!supabaseConfigured || !useProfile.getState().account) return null;
  const { data, error } = await supabase().functions.invoke('progress', { body: { action, ...payload } });
  if (error) throw error;
  return (data?.profile as ServerProfile) ?? null;
}

/** Dopo l'accesso: prende i progressi del server, o la prima volta porta con sé quelli del telefono. */
export async function pullProgress() {
  const p = await call('import', { progress: progressOf() });
  if (p) adopt(p);
}

/** Ogni evento va anche al server; la sua risposta è la verità. */
setRemote((action, payload) => {
  call(action, payload)
    .then(p => p && adopt(p))
    .catch(() => {
      // Senza rete: il server si rimette in pari al prossimo accesso o evento.
    });
});
