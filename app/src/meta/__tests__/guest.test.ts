import { describe, expect, it } from 'vitest';
import { switchAccount } from '../guest';
import { newProgress, type Progress } from '../ledger';
import type { Account } from '../profile';

const acc = (id: string): Account => ({ id, name: id, provider: 'google' });
const withCoins = (coins: number): Progress => ({ ...newProgress('s' + coins), coins });
const fresh = () => withCoins(1000);

describe('ospite e account sullo stesso telefono', () => {
  it("all'accesso l'ospite va da parte e lo schermo non cambia", () => {
    const r = switchAccount({ account: null, guest: null, progress: withCoins(1300) }, acc('a'), fresh);
    expect(r.account?.id).toBe('a');
    expect(r.guest?.coins).toBe(1300);
    expect(r.progress).toBeNull();
  });

  it("all'uscita torna l'ospite di prima, non l'account", () => {
    const r = switchAccount({ account: acc('a'), guest: withCoins(1300), progress: withCoins(90000) }, null, fresh);
    expect(r.account).toBeNull();
    expect(r.guest).toBeNull();
    expect(r.progress?.coins).toBe(1300);
  });

  it("all'uscita senza ospite da parte (telefono già collegato) si riparte da zero", () => {
    const r = switchAccount({ account: acc('a'), guest: null, progress: withCoins(90000) }, null, fresh);
    expect(r.progress?.coins).toBe(1000);
  });

  it('la sessione rinnovata non tocca niente', () => {
    const g = withCoins(1300);
    const r = switchAccount({ account: acc('a'), guest: g, progress: withCoins(90000) }, { ...acc('a'), name: 'nuovo' }, fresh);
    expect(r.progress).toBeNull();
    expect(r.guest).toBe(g);
    expect(r.account?.name).toBe('nuovo');
  });

  it("un altro account non eredita i progressi del primo", () => {
    const r = switchAccount({ account: acc('a'), guest: withCoins(1300), progress: withCoins(90000) }, acc('b'), fresh);
    expect(r.account?.id).toBe('b');
    expect(r.progress?.coins).toBe(1300);
    expect(r.guest?.coins).toBe(1300);
  });

  it('ospite che resta ospite: niente da fare', () => {
    const r = switchAccount({ account: null, guest: null, progress: withCoins(1300) }, null, fresh);
    expect(r.progress).toBeNull();
    expect(r.account).toBeNull();
  });
});
