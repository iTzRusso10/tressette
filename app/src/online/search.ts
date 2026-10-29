// La ricerca di una partita (veloce o classificata), dall'entrata in coda al tavolo. Lo stato serve alla
// schermata /cerca: da quanto si aspetta, chi si è trovato, quando si può andare al tavolo.

import { create } from 'zustand';
import { CPU_NAMES, type Seat } from '@/engine';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { startMatch } from '@/state/table';
import { LocalMatchmaker, mmRules, POLL_MS, seatsOf, type Matchmaker, type MmMatch, type MmRequest } from './matchmaking';
import { SupabaseMatchmaker } from './mmServer';
import type { RoomConfig } from './room';
import { clientId, joinMmRoom, leaveRoom, LOCAL, onlineConfigured, openMmRoom, useOnline } from './session';

export type SearchPhase =
  /** Niente in corso. */
  | 'idle'
  /** In coda. */
  | 'searching'
  /** Trovata: si mostra contro chi, poi ci si siede. */
  | 'found'
  /** Al tavolo (o quasi): la schermata può andare a /tavolo. */
  | 'ready'
  /** Serve l'accesso, la classificata è ancora chiusa, l'online non c'è, qualcosa è andato storto. */
  | 'login'
  | 'locked'
  | 'offline'
  | 'error';

interface SearchState {
  phase: SearchPhase;
  req: MmRequest | null;
  /** Secondi di attesa. */
  waited: number;
  match: MmMatch | null;
  me: string;
  error: string | null;
  /** Quando è cominciata la ricerca (per il tempo che passa sullo schermo). */
  since: number;
}

export const useSearch = create<SearchState>(() => ({ phase: 'idle', req: null, waited: 0, match: null, me: '', error: null, since: 0 }));
const set = useSearch.setState;

let mm: Matchmaker | null = null;
let run = 0;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const myName = () => useSettings.getState().name.trim() || useProfile.getState().account?.name || 'Giocatore';

/** Entra in coda e aspetta: quando si trova la partita, ci si siede da soli. */
export async function startSearch(req: MmRequest) {
  const id = ++run;
  await stopMm();
  set({ req, waited: 0, match: null, error: null });
  if (!onlineConfigured) return set({ phase: 'offline' });
  // Trofei e punteggio sono del tuo account: senza accesso il server non saprebbe a chi darli.
  if (!LOCAL && !useProfile.getState().account) return set({ phase: 'login' });
  set({ phase: 'searching', since: Date.now() });
  mm = LOCAL ? new LocalMatchmaker() : new SupabaseMatchmaker();
  try {
    const me = await clientId();
    set({ me });
    let st = await mm.join(req, me, myName());
    while (id === run) {
      if (st.status === 'locked') return set({ phase: 'locked' });
      if (st.status === 'found') return await seat(st.match, id);
      if (st.status === 'none') throw new Error('fuori dalla coda');
      set({ waited: st.waited });
      await sleep(POLL_MS);
      if (id !== run) return;
      st = await mm.poll();
    }
  } catch {
    if (id === run) set({ phase: 'error', error: 'Non riesco a collegarmi. Controlla la connessione e riprova.' });
  }
}

/** Esce dalla coda (o dalla partita appena trovata, se non è ancora cominciata). */
export async function cancelSearch() {
  run++;
  await stopMm();
  if (useSearch.getState().phase !== 'ready') await leaveRoom();
  set({ phase: 'idle', waited: 0, match: null, error: null });
}

async function stopMm() {
  const m = mm;
  mm = null;
  if (m) await m.cancel().catch(() => {});
}

/** La partita c'è: si apre il tavolo (chi aspettava da più tempo), ci si entra, o si gioca qui con il computer. */
async function seat(match: MmMatch, id: number) {
  set({ phase: 'found', match });
  mm = null;
  const me = useSearch.getState().me;
  const name = myName();
  const rules = mmRules(match.kind, match.game, match.mode);
  // Un attimo per vedere contro chi si gioca.
  await sleep(1600);
  if (id !== run) return;

  // Nessun altro: si gioca qui, con il computer ai posti liberi, e vale per i trofei (dimezzati).
  if (match.players.length === 1) {
    const seats: Seat[] = [{ name, type: 'human' }, ...CPU_NAMES.slice(0, match.seats - 1).map(n => ({ name: n, type: 'cpu' as const }))];
    startMatch(
      {
        game: match.game,
        mode: match.mode,
        perdN: match.seats,
        seats,
        level: match.level,
        target: rules.target,
        accusi: rules.accusi,
        cappotto: rules.cappotto,
      },
      { queue: match.kind, mm: match.id, withCpu: true },
    );
    return set({ phase: 'ready' });
  }

  const cfg: RoomConfig = {
    game: match.game,
    mode: match.mode,
    perdN: match.seats,
    target: rules.target,
    level: match.level,
    accusi: rules.accusi,
    cappotto: rules.cappotto,
    stake: 0,
    queue: match.kind,
    mm: match.id,
    scores: Object.fromEntries(match.players.map(p => [p.id, p.score])),
  };
  try {
    if (match.host === me) {
      const reserved = match.players.filter(p => p.id !== me).map(p => ({ peer: p.id, name: p.name, seat: p.seat }));
      await openMmRoom(match.code, cfg, name, reserved);
      if (id === run) set({ phase: 'ready' });
    } else {
      const r = await joinMmRoom(match.code, name);
      if (id !== run) return;
      if (r !== 'ok') return set({ phase: 'error', error: 'Chi doveva aprire il tavolo non è arrivato. Cerca un’altra partita.' });
      // Si va al tavolo quando chi l'ha aperto distribuisce.
      const started = await waitFor(() => !!useOnline.getState().lobby?.started, 25000);
      if (id !== run) return;
      if (!started) {
        await leaveRoom();
        return set({ phase: 'error', error: 'La partita non è partita. Cerca un’altra partita.' });
      }
      set({ phase: 'ready' });
    }
  } catch {
    if (id === run) set({ phase: 'error', error: 'Non riesco a collegarmi al tavolo. Cerca un’altra partita.' });
  }
}

async function waitFor(ok: () => boolean, ms: number): Promise<boolean> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (ok()) return true;
    await sleep(200);
  }
  return ok();
}

/** Quanti posti ha il tavolo cercato (per mostrare i posti vuoti mentre si aspetta). */
export const searchSeats = (r: MmRequest) => seatsOf(r);
