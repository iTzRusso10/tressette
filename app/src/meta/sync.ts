import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { LEDGER_VERSION, normalize, type Meta, type Progress } from './ledger';
import { progressOf, setRemote, useProfile } from './profile';

/**
 * Con un account la progressione vive sul server: il telefono applica ogni evento subito (così lo
 * schermo risponde) e lo manda alla funzione `progress`, che applica le stesse regole (ledger.ts) e
 * risponde con lo stato vero, che sostituisce quello del telefono. Le monete non si inventano.
 *
 * Gli eventi partono uno alla volta e nell'ordine in cui sono successi (un acquisto prima della cornice
 * messa in uso, l'ultima mano prima della partita), e si adotta solo la risposta all'ultimo: una risposta
 * vecchia che arriva tardi riporterebbe indietro lo stato, e la partita dopo farebbe rivedere le stesse
 * feste. Un server con regole più vecchie del telefono (funzione non ridistribuita) non si adotta.
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

interface Answer {
  profile: ServerProfile | null;
  ledger: number;
}

/** Se il server ha regole più vecchie di quelle del telefono (va ridistribuita la funzione `progress`). */
export const useSync = create<{ outdated: boolean }>(() => ({ outdated: false }));

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

async function call(action: string, payload: Record<string, unknown> = {}): Promise<Answer | null> {
  if (!supabaseConfigured || !useProfile.getState().account) return null;
  const { data, error } = await supabase().functions.invoke('progress', { body: { action, ...payload } });
  if (error) throw error;
  const profile = (data?.profile as ServerProfile) ?? null;
  return { profile, ledger: typeof data?.ledger === 'number' ? data.ledger : 0 };
}

/**
 * La coda degli eventi non ancora arrivati al server, salvata sul telefono: senza rete (o con il server
 * che non risponde) un acquisto, una partita, il bonus non si perdono, ripartono appena si può e nello
 * stesso ordine. Finché la coda non è vuota lo stato del server non si adotta, perché non li conosce ancora.
 */
interface Pending {
  action: string;
  payload: Record<string, unknown>;
  /** L'account per cui è nato: uscito o cambiato account, non si manda più. */
  uid: string;
}

const OUTBOX_KEY = 'napoletane.coda.v1';
const OUTBOX_MAX = 400;
let outbox: Pending[] = [];
let loaded: Promise<void> | null = null;
let flushing: Promise<void> | null = null;
let retryIn = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let warned = false;

const load = () =>
  (loaded ??= AsyncStorage.getItem(OUTBOX_KEY)
    .then(raw => {
      const saved = raw ? (JSON.parse(raw) as Pending[]) : [];
      if (Array.isArray(saved)) outbox = saved.filter(e => e && typeof e.action === 'string' && typeof e.uid === 'string').concat(outbox);
    })
    .catch(() => {}));

const persist = () => void AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.slice(-OUTBOX_MAX))).catch(() => {});

/** Senza rete, o il server occupato o in errore: si riprova. Una richiesta rifiutata (4xx) no. */
function retryable(e: unknown): boolean {
  const status = (e as { context?: { status?: number } })?.context?.status;
  return typeof status !== 'number' || status >= 500 || status === 408 || status === 409 || status === 429;
}

function later() {
  if (retryTimer) return;
  retryIn = Math.min(60000, retryIn ? retryIn * 2 : 4000);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, retryIn);
}

async function drain() {
  await load();
  while (outbox.length) {
    const ev = outbox[0];
    if (useProfile.getState().account?.id !== ev.uid) {
      outbox.shift();
      persist();
      continue;
    }
    let a: Answer | null;
    try {
      a = await call(ev.action, ev.payload);
    } catch (e) {
      if (retryable(e)) return later();
      a = null;
    }
    outbox.shift();
    persist();
    retryIn = 0;
    if (!a?.profile) continue;
    if (a.ledger < LEDGER_VERSION) {
      useSync.setState({ outdated: true });
      if (!warned) {
        warned = true;
        console.warn(`Il server dei progressi ha le regole v${a.ledger}, il telefono v${LEDGER_VERSION}: ridistribuisci la funzione (da app/: npx supabase functions deploy progress).`);
      }
      continue;
    }
    useSync.setState({ outdated: false });
    // Si adotta solo la risposta all'ultimo evento, e solo se si è ancora nello stesso account.
    if (!outbox.length && useProfile.getState().account?.id === ev.uid) adopt(a.profile);
  }
}

function flush(): Promise<void> {
  return (flushing ??= drain()
    .catch(() => {})
    .finally(() => {
      flushing = null;
      // Arrivati altri eventi mentre si chiudeva il giro.
      if (outbox.length && !retryTimer && useProfile.getState().account) void flush();
    }));
}

/** Mette in coda un evento per il server e la fa ripartire. */
async function send(action: string, payload: Record<string, unknown> = {}): Promise<void> {
  const uid = useProfile.getState().account?.id;
  if (!supabaseConfigured || !uid) return;
  // Prima la coda salvata, poi il nuovo evento: l'ordine resta quello in cui le cose sono successe.
  await load();
  outbox.push({ action, payload, uid });
  if (outbox.length > OUTBOX_MAX) outbox.splice(0, outbox.length - OUTBOX_MAX);
  persist();
  return flush();
}

/** Dopo l'accesso: prende i progressi del server, o la prima volta porta con sé quelli del telefono. */
export function pullProgress() {
  return send('import', { progress: progressOf() });
}

/** Ogni evento va anche al server; la sua risposta è la verità. */
setRemote((action, payload) => {
  void send(action, payload);
});
