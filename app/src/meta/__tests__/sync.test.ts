// La sincronia con il server: eventi in fila, nell'ordine, che sopravvivono a una rete che cade.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
    removeItem: async (k: string) => void store.delete(k),
  },
}));

type Reply = { data?: unknown; error?: unknown };
const calls: string[] = [];
let replies: (() => Reply)[] = [];
vi.mock('@/lib/supabase', () => ({
  supabaseConfigured: true,
  supabase: () => ({
    functions: {
      invoke: async (_fn: string, { body }: { body: { action: string } }) => {
        calls.push(body.action);
        const r = replies.shift();
        return r ? r() : { data: null, error: { context: { status: 503 } } };
      },
    },
  }),
}));

const { useProfile, equip, buyItem, progressOf } = await import('../profile');
const { pullProgress, useSync } = await import('../sync');
const { LEDGER_VERSION } = await import('../ledger');

const flushAll = async () => {
  for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));
};
const serverReply = (coins: number, ledger = LEDGER_VERSION) => () => ({
  data: { ledger, profile: { coins, xp: 0, stats: progressOf().stats, trophies: {}, bonus: null, friend_code: 'X', owned: progressOf().owned, equipped: progressOf().equipped, meta: progressOf().meta } },
});

describe('sincronia', () => {
  beforeEach(() => {
    calls.length = 0;
    replies = [];
    useProfile.setState({ account: { id: 'u1', name: 'G', provider: 'google' }, coins: 5000 });
  });

  it('acquisto e cornice arrivano al server in ordine, e si adotta solo l’ultima risposta', async () => {
    replies = [serverReply(1111), serverReply(2222)];
    buyItem('frame', 'oro-sottile');
    equip('frame', 'oro-sottile');
    await flushAll();
    expect(calls).toEqual(['buy', 'equip']);
    expect(useProfile.getState().coins).toBe(2222);
  });

  it('senza rete gli eventi restano in coda e ripartono dopo', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    replies = [() => ({ data: null, error: { context: undefined } })];
    void pullProgress();
    await vi.advanceTimersByTimeAsync(10);
    expect(calls).toEqual(['import']);
    replies = [serverReply(3333)];
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toEqual(['import', 'import']);
    expect(useProfile.getState().coins).toBe(3333);
    vi.useRealTimers();
  });

  it('un server con regole vecchie non sovrascrive il telefono', async () => {
    replies = [serverReply(9, 0)];
    void pullProgress();
    await flushAll();
    expect(useProfile.getState().coins).toBe(5000);
    expect(useSync.getState().outdated).toBe(true);
  });
});
