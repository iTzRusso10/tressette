// Lo stato sociale sul telefono: amici (con chi è online), richieste, inviti alle partite e rivalità.
// Mentre l'app è aperta e sei collegato dice al server che ci sei (`ping`, ogni minuto) e guarda se
// sono arrivati inviti (ogni 20 secondi). Niente di questo gira quando l'app è in secondo piano.
import { AppState } from 'react-native';
import { supabaseConfigured } from '@/lib/supabase';
import { create } from 'zustand';
import { loadFriends, type Friend } from '@/meta/friends';
import { useProfile } from '@/meta/profile';
import { answerFriendRequest, answerInvite, friendRequests, myInvites, myRivals, ping, type Invite, type PlayerCard, type Rival } from '@/meta/social';

interface SocialState {
  friends: Friend[] | null;
  requests: PlayerCard[];
  invites: Invite[];
  rivals: Rival[];
  /** Inviti già visti e chiusi (non ricompaiono). */
  dismissed: string[];
  error: boolean;
}

export const useSocial = create<SocialState>(() => ({ friends: null, requests: [], invites: [], rivals: [], dismissed: [], error: false }));
const set = useSocial.setState;
const get = useSocial.getState;

const signedIn = () => !!useProfile.getState().account;

/** Ricarica amici, richieste e rivalità. */
export async function refreshSocial() {
  // Senza server non c'è niente da chiedere: resta quello che c'è (anche nella pagina di prova).
  if (!supabaseConfigured) return set(s => ({ friends: s.friends ?? [] }));
  if (!signedIn()) return set({ friends: [], requests: [], rivals: [], invites: [] });
  try {
    const [friends, requests, rivals] = await Promise.all([loadFriends(), friendRequests(), myRivals()]);
    set({ friends, requests, rivals, error: false });
  } catch {
    set(s => ({ friends: s.friends ?? [], error: true }));
  }
}

export async function refreshInvites() {
  if (!supabaseConfigured || !signedIn()) return;
  try {
    const list = await myInvites();
    const seen = get().dismissed;
    set({ invites: list.filter(i => !seen.includes(i.id)) });
  } catch {
    // Senza rete si riprova al prossimo giro.
  }
}

export async function answerRequest(id: string, accept: boolean) {
  set(s => ({ requests: s.requests.filter(r => r.id !== id) }));
  await answerFriendRequest(id, accept);
  if (accept) await refreshSocial();
}

/** Accetta o rifiuta un invito. Se accetti ritorna il codice della stanza, o null se è scaduto. */
export async function respondInvite(inv: Invite, accept: boolean): Promise<string | null> {
  set(s => ({ invites: s.invites.filter(i => i.id !== inv.id), dismissed: [...s.dismissed, inv.id].slice(-50) }));
  const r = await answerInvite(inv.id, accept);
  return accept && /^\d{4}$/.test(r) ? r : null;
}

let timers: ReturnType<typeof setInterval>[] = [];
let started = false;

function tick(kind: 'ping' | 'invites') {
  if (AppState.currentState !== 'active' || !signedIn()) return;
  if (kind === 'ping') void ping();
  else void refreshInvites();
}

/** Comincia a dire «ci sono» e a guardare gli inviti. Si chiama una volta, all'avvio. */
export function startPresence() {
  if (started) return;
  started = true;
  timers = [setInterval(() => tick('ping'), 60000), setInterval(() => tick('invites'), 20000)];
  // Appena torni nell'app (o fai l'accesso) si aggiorna subito.
  AppState.addEventListener('change', st => {
    if (st === 'active') {
      tick('ping');
      tick('invites');
    }
  });
  useProfile.subscribe((s, prev) => {
    if (s.account?.id !== prev.account?.id) {
      set({ friends: null, requests: [], invites: [], rivals: [], dismissed: [] });
      tick('ping');
      tick('invites');
    }
  });
  setTimeout(() => {
    tick('ping');
    tick('invites');
  }, 1500);
}

export function stopPresence() {
  timers.forEach(clearInterval);
  timers = [];
  started = false;
}
