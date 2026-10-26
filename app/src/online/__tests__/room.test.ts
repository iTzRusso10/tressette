import { describe, expect, it } from 'vitest';
import { chooseMove, createMatch, isValidMove, play, seeded, startHand, type Match, type Step } from '@/engine';
import { GuestRoom, hashMatch, HostRoom, seatOrder, type RoomConfig } from '../room';
import { createHub, MemoryTransport } from '../transport';

const flush = () => new Promise(r => setTimeout(r, 0));

async function setup(cfg: RoomConfig, guests: number) {
  const hub = createHub();
  const host = new HostRoom(new MemoryTransport(hub), { id: 'h', name: 'Giuseppe', host: true }, cfg);
  const code = await host.open('1234');
  const gs: { room: GuestRoom; match: Match | null; steps: number }[] = [];
  for (let i = 0; i < guests; i++) {
    const g = { room: new GuestRoom(new MemoryTransport(hub), { id: 'g' + i, name: 'Amico ' + i, host: false }), match: null as Match | null, steps: 0 };
    g.room.onSteps = (steps: Step[]) => {
      g.match = steps.at(-1)!.state;
      g.steps += steps.length;
    };
    g.room.onSync = m => (g.match = m);
    expect(await g.room.join(code)).toBe('ok');
    gs.push(g);
    await flush();
  }
  await flush();
  return { hub, host, code, gs };
}

const base: RoomConfig = { game: 'tressette', mode: '2', perdN: 4, target: 11, level: 'facile', accusi: true, cappotto: true };

describe('stanza online', () => {
  it('chi entra prende un posto, in quattro il primo amico è il compagno', async () => {
    expect(seatOrder({ mode: '4', perdN: 4 })).toEqual([2, 1, 3]);
    const { host, gs } = await setup({ ...base, game: 'scopa', mode: '4' }, 2);
    expect(host.lobby.seats.map(s => s.type)).toEqual(['human', 'remote', 'remote', 'cpu']);
    expect(host.lobby.seats[2].name).toBe('Amico 0');
    expect(gs[0].room.seat).toBe(2);
    expect(gs[1].room.seat).toBe(1);
  });

  it('senza host il codice non funziona', async () => {
    const hub = createHub();
    const g = new GuestRoom(new MemoryTransport(hub), { id: 'x', name: 'X', host: false });
    expect(await g.join('9999')).toBe('nohost');
  });

  for (const cfg of [
    base,
    { ...base, game: 'briscola' as const, mode: '4' as const, target: 1 },
    { ...base, game: 'scopa' as const, mode: '2' as const },
    { ...base, mode: 'perdere' as const, perdN: 4 as const, target: 31 },
  ]) {
    it(`una mano intera resta uguale per tutti: ${cfg.game} ${cfg.mode}`, async () => {
      const guests = cfg.mode === '2' ? 1 : 2;
      const { host, gs } = await setup(cfg, guests);
      host.start();
      const rng = seeded(42);
      let m = createMatch(host.matchConfig(), rng);
      const deal = startHand(m, rng);
      m = deal.at(-1)!.state;
      host.dealt(deal);
      await flush();
      // Moves from friends reach the host through the room.
      const pending: { seat: number; mv: any }[] = [];
      host.onMove = (seat, mv) => pending.push({ seat, mv });
      while (!m.h!.over) {
        const p = m.h!.turn;
        const seat = m.seats[p];
        let mv;
        if (seat.type === 'remote') {
          const g = gs.find(x => x.room.seat === p)!;
          expect(hashMatch(g.match!)).toBe(hashMatch(m));
          g.room.sendMove(chooseMove(g.match!, p, rng));
          await flush();
          const got = pending.shift()!;
          expect(got.seat).toBe(p);
          mv = got.mv;
        } else mv = chooseMove(m, p, rng);
        expect(isValidMove(m, p, mv)).toBe(true);
        m = play(m, p, mv).at(-1)!.state;
        host.played(p, mv, m);
        await flush();
      }
      for (const g of gs) expect(g.match).toEqual(m);
    });
  }

  it('chi perde un messaggio chiede di riallinearsi', async () => {
    const { host, gs } = await setup(base, 1);
    host.start();
    const rng = seeded(3);
    let m = createMatch(host.matchConfig(), rng);
    const deal = startHand(m, rng);
    m = deal.at(-1)!.state;
    host.dealt(deal);
    await flush();
    // A move the guest never hears about.
    const p = m.h!.turn;
    const mv = chooseMove(m, p, rng);
    m = play(m, p, mv).at(-1)!.state;
    (host as unknown as { ver: number }).ver++;
    (host as unknown as { match: Match }).match = m;
    // The next one arrives with a gap: the guest asks again and gets the whole state.
    const q = m.h!.turn;
    const mv2 = chooseMove(m, q, rng);
    m = play(m, q, mv2).at(-1)!.state;
    host.played(q, mv2, m);
    await flush();
    await flush();
    expect(gs[0].match).toEqual(m);
  });

  it('chi entra a partita iniziata riceve lo stato', async () => {
    const { hub, host } = await setup(base, 0);
    host.start();
    const rng = seeded(5);
    let m = createMatch(host.matchConfig(), rng);
    m = startHand(m, rng).at(-1)!.state;
    host.dealt([{ event: { k: 'deal', order: [] }, state: m }]);
    const late = new GuestRoom(new MemoryTransport(hub), { id: 'late', name: 'Tardi', host: false });
    let got: Match | null = null;
    late.onSync = x => (got = x);
    await late.join('1234');
    await flush();
    await flush();
    expect(got).toEqual(m);
  });
});
