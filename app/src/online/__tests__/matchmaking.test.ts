import { describe, expect, it } from 'vitest';
import { BALANCE } from '@/meta/balance';
import { xpForLevel } from '@/meta/levels';
import { mmRules, seatsOf } from '../matchmaking';
import { GuestRoom, HostRoom, type RoomConfig } from '../room';
import { createHub, MemoryTransport } from '../transport';

const flush = () => new Promise(r => setTimeout(r, 0));

describe('matchmaking', () => {
  it('il server usa gli stessi numeri del telefono (livello della classificata, secondi prima del computer)', async () => {
    const mod = 'node:fs';
    const { readFileSync } = (await import(/* @vite-ignore */ mod)) as { readFileSync: (p: URL, enc: string) => string };
    const sql = readFileSync(new URL('../../../supabase/migrations/20261031000000_matchmaking.sql', import.meta.url), 'utf8');
    expect(Number(/mm_ranked_xp\(\)[^$]*\$\$ select (\d+) \$\$/.exec(sql)![1])).toBe(xpForLevel(BALANCE.matchmaking.rankedLevel));
    expect(Number(/mm_cpu_after\(\)[^$]*\$\$ select (\d+) \$\$/.exec(sql)![1])).toBe(BALANCE.matchmaking.cpuAfterSeconds);
  });

  it('regole uguali per tutti: corte nella veloce, Briscola a due mani in classificata', () => {
    expect(mmRules('quick', 'tressette', '2').target).toBe(21);
    expect(mmRules('ranked', 'tressette', 'perdere').target).toBe(31);
    expect(mmRules('quick', 'briscola', '2').target).toBe(1);
    expect(mmRules('ranked', 'briscola', '4').target).toBe(2);
    expect(mmRules('quick', 'scopa', '4').target).toBe(11);
    expect(seatsOf({ mode: '2', perdN: 4 })).toBe(2);
    expect(seatsOf({ mode: 'perdere', perdN: 2 })).toBe(2);
    expect(seatsOf({ mode: '4', perdN: 2 })).toBe(4);
  });

  it('nella stanza del matchmaking i posti sono già assegnati e chi passa per caso non si siede', async () => {
    const hub = createHub();
    const cfg: RoomConfig = { game: 'scopa', mode: '4', perdN: 4, target: 11, level: 'medio', accusi: true, cappotto: true, stake: 0, queue: 'quick', mm: 'mm-1' };
    const host = new HostRoom(new MemoryTransport(hub), { id: 'a', name: 'Anna', host: true }, cfg, [
      { peer: 'b', name: 'Bruno', seat: 1 },
      { peer: 'c', name: 'Carla', seat: 2 },
    ]);
    const code = await host.open('mmprova');
    expect(host.lobby.seats.map(s => s.type)).toEqual(['human', 'remote', 'remote', 'cpu']);
    expect(host.expected()).toEqual(['b', 'c']);

    const carla = new GuestRoom(new MemoryTransport(hub), { id: 'c', name: 'Carla', host: false });
    expect(await carla.join(code)).toBe('ok');
    const stranger = new GuestRoom(new MemoryTransport(hub), { id: 'x', name: 'Xeno', host: false });
    expect(await stranger.join(code)).toBe('ok');
    await flush();
    await flush();
    expect(carla.seat).toBe(2);
    expect(stranger.seat).toBe(-1);
    expect(host.lobby.seats[3].type).toBe('cpu');

    // L'id della partita è quello del matchmaking: è quello che il server verifica.
    host.start();
    expect(host.lobby.matchId).toBe('mm-1');
  });
});
