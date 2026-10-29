import { describe, expect, it } from 'vitest';
import { BONUS_LADDER, bonusFor, canClaim, claimBonus, nextStreak } from '../economy';
import { agreed, payout, winningSeats } from '../stakes';

const day = (s: string, h = 12) => new Date(`${s}T${String(h).padStart(2, '0')}:00:00`);

describe('bonus giornaliero', () => {
  it('una volta al giorno', () => {
    let st = { lastDay: null as string | null, streak: 0 };
    expect(canClaim(st, day('2026-10-27'))).toBe(true);
    const r = claimBonus(st, day('2026-10-27', 1));
    expect(r.amount).toBe(100);
    st = r.state;
    expect(canClaim(st, day('2026-10-27', 23))).toBe(false);
    expect(() => claimBonus(st, day('2026-10-27', 23))).toThrow();
    expect(canClaim(st, day('2026-10-28', 0))).toBe(true);
  });

  it('la serie cresce di giorno in giorno; saltare fa scendere di un gradino per giorno', () => {
    let st = { lastDay: null as string | null, streak: 0 };
    const got: number[] = [];
    for (const d of ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']) {
      const r = claimBonus(st, day(d));
      got.push(r.amount);
      st = r.state;
    }
    expect(got).toEqual([...BONUS_LADDER, 500]);
    expect(st.streak).toBe(8);
    expect(nextStreak(st, day('2026-11-03'))).toBe(7);
    expect(nextStreak(st, day('2026-11-20'))).toBe(1);
    expect(bonusFor(1)).toBe(100);
  });

  it('a cavallo del mese e dell’anno', () => {
    expect(nextStreak({ lastDay: '2026-12-31', streak: 4 }, day('2027-01-01'))).toBe(5);
  });
});

describe('posta online', () => {
  it('in due il vincitore prende il piatto', () => {
    expect(winningSeats('2', 2, [1])).toEqual([1]);
    expect(payout(500, 2, [0, 1], [1])).toEqual([0, 1000]);
  });
  it('in quattro a coppie i due compagni si dividono il piatto', () => {
    expect(winningSeats('4', 4, [0])).toEqual([0, 2]);
    expect(payout(100, 4, [0, 1, 2, 3], [0, 2])).toEqual([200, 0, 200, 0]);
  });
  it('a perdere vince chi ha meno punti, anche a pari merito', () => {
    expect(winningSeats('perdere', 4, [1, 3])).toEqual([1, 3]);
    expect(payout(1000, 4, [0, 1, 2, 3], [1, 3])).toEqual([0, 2000, 0, 2000]);
  });
  it('il computer non paga e non incassa', () => {
    // You and a friend against two computer seats: your team wins and you share the pot of two.
    expect(payout(500, 4, [0, 2], [0, 2])).toEqual([500, 0, 500, 0]);
    // A perdere a computer seat wins alone: stakes back.
    expect(payout(500, 4, [0, 1], [3])).toEqual([500, 500, 0, 0]);
  });
  it('si paga solo se la maggioranza è d’accordo', () => {
    expect(agreed(2, [['a']])).toBeNull();
    expect(agreed(2, [['a'], ['a']])).toEqual(['a']);
    expect(
      agreed(3, [
        ['a', 'b'],
        ['b', 'a'],
      ]),
    ).toEqual(['a', 'b']);
    expect(agreed(4, [['a'], ['b'], ['a']])).toBeNull();
  });
});
