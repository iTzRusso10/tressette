import { describe, expect, it } from 'vitest';
import { claimReward, newProgress, swapMission } from '@/meta/ledger';
import { arrivoUltima, bachecaDi, fineVolo, iconaDi, scaglioneTutto, specialiDi, statoDi } from '../dati';
import { MISSIONS } from '@/meta/missions';

const GIORNO = '2026-10-29';

describe('la bacheca del circolo', () => {
  it('tre missioni del giorno e quattro della settimana, da fare', () => {
    const b = bachecaDi(newProgress('prova'), GIORNO);
    expect(b.giorno).toHaveLength(3);
    expect(b.settimana).toHaveLength(4);
    expect([...b.giorno, ...b.settimana].every(x => x.stato === 'dafare' && x.have === 0)).toBe(true);
    expect(b.cambioLibero).toBe(true);
    expect(b.giorno.every(x => x.cambiabile)).toBe(true);
    expect(b.settimana.some(x => x.cambiabile)).toBe(false);
  });

  it('gli stati seguono il registro: in corso, da riscuotere, riscossa', () => {
    const p = newProgress('prova');
    const [a, c, d] = bachecaDi(p, GIORNO).giorno;
    p.meta.missions.day = GIORNO;
    p.meta.missions.p[a.key] = Math.max(1, a.goal - 1);
    if (a.goal === 1) p.meta.missions.p[a.key] = 0;
    p.meta.missions.p[c.key] = c.goal;
    p.meta.missions.done.push(c.key, d.key);
    p.meta.claims.push({ id: c.claimId, why: c.testo, coins: c.ricompensa.coins, xp: c.ricompensa.xp });
    p.meta.claimed.push(d.claimId);
    const b = bachecaDi(p, GIORNO);
    expect(b.giorno[0].stato).toBe(a.goal === 1 ? 'dafare' : 'incorso');
    expect(b.giorno[1].stato).toBe('riscuotere');
    expect(b.giorno[2].stato).toBe('riscossa');
    // Riscuotere passa da ledger.ts: dopo, la missione è riscossa.
    const q = claimReward(p, c.claimId, GIORNO).p;
    expect(bachecaDi(q, GIORNO).giorno[1].stato).toBe('riscossa');
  });

  it('il cambio è uno al giorno', () => {
    const p = newProgress('prova');
    const b = bachecaDi(p, GIORNO);
    const q = swapMission(p, b.giorno[0].key, GIORNO)!;
    const dopo = bachecaDi(q, GIORNO);
    expect(dopo.cambioLibero).toBe(false);
    expect(dopo.giorno.some(x => x.cambiabile)).toBe(false);
    expect(dopo.giorno.map(x => x.id)).not.toContain(b.giorno[0].id);
  });

  it('a un giorno nuovo le missioni ripartono da zero', () => {
    const p = newProgress('prova');
    const k = bachecaDi(p, GIORNO).giorno[0].key;
    p.meta.missions.p[k] = 1;
    const domani = bachecaDi(p, '2026-10-30');
    expect(domani.giorno.every(x => x.have === 0)).toBe(true);
  });

  it('ogni missione ha un\'icona e una frase corta', () => {
    for (const m of MISSIONS) expect(iconaDi(m.id)).toBeTruthy();
    expect(statoDi(false, false, 0)).toBe('dafare');
  });

  it('evento e stagione diventano manifesti', () => {
    const s = specialiDi(newProgress('prova'), GIORNO);
    expect(s[0].tipo).toBe('evento');
    expect(s[0].righe).toHaveLength(3);
    const dopo = specialiDi(newProgress('prova'), '2026-11-10');
    expect(dopo.some(x => x.tipo === 'stagione')).toBe(true);
  });

  it('i tempi di riscossione stanno nel budget (§5.10, §5.11)', () => {
    expect(arrivoUltima()).toBeLessThanOrEqual(700);
    expect(fineVolo()).toBeLessThanOrEqual(700);
    expect(scaglioneTutto(1)).toBe(0);
    expect(scaglioneTutto(2)).toBe(120);
    for (let n = 2; n <= 7; n++) expect((n - 1) * scaglioneTutto(n) + fineVolo()).toBeLessThanOrEqual(1200);
  });
});
