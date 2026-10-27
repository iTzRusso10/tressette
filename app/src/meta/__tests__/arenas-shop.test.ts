import { describe, expect, it } from 'vitest';
import { ARENA_SIZE, ARENAS, applyTrophies, arenaFloor, arenaItems, arenaOf, itemsUpTo, LAST_ARENA, trophyDelta } from '../arenas';
import { buy, canEquip, DEFAULT_EQUIPPED, ITEMS, itemById, offerOf, OFFER_DISCOUNT, priceOf, STARTER_ITEMS } from '../shop';

const cpu = (won: boolean, level: 'facile' | 'medio' | 'difficile') => ({ won, level, online: false });
const online = (won: boolean) => ({ won, level: 'facile' as const, online: true });

describe('trofei', () => {
  it('vittorie: Facile +1, Medio +2, Esperto +3, online +3', () => {
    expect(trophyDelta(cpu(true, 'facile'))).toBe(1);
    expect(trophyDelta(cpu(true, 'medio'))).toBe(2);
    expect(trophyDelta(cpu(true, 'difficile'))).toBe(3);
    expect(trophyDelta(online(true))).toBe(3);
  });

  it('sconfitte: contro il computer facile non si perde niente, altrimenti −1', () => {
    expect(trophyDelta(cpu(false, 'facile'))).toBe(0);
    expect(trophyDelta(cpu(false, 'medio'))).toBe(-1);
    expect(trophyDelta(cpu(false, 'difficile'))).toBe(-1);
    expect(trophyDelta(online(false))).toBe(-1);
  });

  it('il pavimento dell’arena raggiunta non si perde', () => {
    // Nella prima arena si scende fino a 0, non sotto.
    expect(applyTrophies(0, 0, online(false))).toMatchObject({ trophies: 0, delta: 0, arenas: [] });
    // Arrivato a 8 (seconda arena), una sconfitta non riporta a 7.
    const r = applyTrophies(8, 8, online(false));
    expect(r).toMatchObject({ trophies: 8, delta: 0, best: 8, arenas: [] });
    // Sopra il pavimento si perde normalmente.
    expect(applyTrophies(10, 10, cpu(false, 'medio'))).toMatchObject({ trophies: 9, delta: -1, best: 10 });
    // Il pavimento dipende dal massimo mai avuto, non dai trofei attuali.
    expect(applyTrophies(17, 20, online(false))).toMatchObject({ trophies: 16, delta: -1, best: 20 });
    expect(applyTrophies(16, 20, online(false))).toMatchObject({ trophies: 16, delta: 0, best: 20 });
  });

  it('a 8 trofei si entra nella seconda arena, una volta sola', () => {
    expect(ARENA_SIZE).toBe(8);
    const r = applyTrophies(7, 7, cpu(true, 'facile'));
    expect(r.trophies).toBe(8);
    expect(r.best).toBe(8);
    expect(r.arenas.map(a => a.id)).toEqual([ARENAS[1].id]);
    expect(arenaOf(8).index).toBe(1);
    expect(arenaOf(7).index).toBe(0);
    // Riscendere e risalire non la regala di nuovo.
    const again = applyTrophies(8, 12, cpu(true, 'facile'));
    expect(again.arenas).toEqual([]);
  });

  it('più arene in un colpo solo', () => {
    // 6 + 3 = 9: dalla prima alla seconda.
    expect(applyTrophies(6, 6, online(true)).arenas.map(a => a.index)).toEqual([1]);
    // Dopo un import a cavallo di più arene (best basso, trofei alti) arrivano tutte quelle saltate.
    const r = applyTrophies(22, 7, cpu(true, 'difficile'));
    expect(r.trophies).toBe(25);
    expect(r.best).toBe(25);
    expect(r.arenas.map(a => a.index)).toEqual([1, 2, 3]);
  });

  it('dopo l’ultima arena i trofei continuano a crescere', () => {
    const last = arenaFloor(LAST_ARENA);
    expect(last).toBe(LAST_ARENA * ARENA_SIZE);
    const r1 = applyTrophies(last - 1, last - 1, cpu(true, 'facile'));
    expect(r1.arenas.map(a => a.index)).toEqual([LAST_ARENA]);
    let cups = r1.trophies;
    let best = r1.best;
    for (let i = 0; i < 20; i++) {
      const r = applyTrophies(cups, best, online(true));
      expect(r.arenas).toEqual([]);
      cups = r.trophies;
      best = r.best;
    }
    expect(cups).toBe(last + 60);
    expect(arenaOf(cups).index).toBe(LAST_ARENA);
    // E il pavimento resta quello dell'ultima arena.
    expect(applyTrophies(last, best, online(false)).trophies).toBe(last);
  });

  it('ogni arena dà il suo panno, a volte un dorso, e oggetti che esistono nel negozio', () => {
    for (const a of ARENAS) {
      const items = arenaItems(a);
      expect(items[0]).toBe(a.felt);
      for (const id of items) expect(itemById(id), id).toBeDefined();
      expect(itemById(a.felt)?.slot).toBe('felt');
      if (a.back) expect(itemById(a.back)?.slot).toBe('back');
      // Non si comprano: si vincono.
      for (const id of items) expect(itemById(id)?.price, id).toBeNull();
    }
    expect(itemsUpTo(0)).toEqual([ARENAS[0].felt]);
    expect(itemsUpTo(LAST_ARENA).length).toBe(ARENAS.length + ARENAS.filter(a => a.back).length);
  });
});

describe('negozio', () => {
  const day = '2026-10-27';
  const starter = [...STARTER_ITEMS];
  /** Id usati da più di un oggetto (vedi sotto): i test che comprano evitano questi. */
  const dupes = new Set(ITEMS.map(i => i.id).filter((id, i, all) => all.indexOf(id) !== i));
  /** Un oggetto in vendita che oggi non è l'offerta, per provare il prezzo pieno. */
  const notOffer = (d: string, owned: string[]) => ITEMS.find(i => i.price !== null && !dupes.has(i.id) && i.id !== offerOf(d, owned)?.id)!;

  it('gli oggetti di partenza sono quelli in uso all’inizio', () => {
    expect([...STARTER_ITEMS].sort()).toEqual(Object.values(DEFAULT_EQUIPPED).sort());
  });

  // BUG in shop.ts: 'vesuvio' (panno, decoro, dorso), 'onde' e 'sole' (decoro e dorso) hanno lo stesso id,
  // e itemById restituisce solo l'ultimo. Quando gli id saranno univoci questo test fallirà: va tolto `.fails`.
  it('ogni oggetto ha un id suo', () => {
    expect([...dupes]).toEqual([]);
  });

  it('compra un oggetto: scala le monete e lo aggiunge', () => {
    const item = notOffer(day, starter);
    const r = buy(item.id, 100000, starter, day);
    expect(r).toEqual({ ok: true, coins: 100000 - item.price!, owned: [...starter, item.id] });
  });

  it('già posseduto', () => {
    const item = notOffer(day, starter);
    expect(buy(item.id, 100000, [...starter, item.id], day)).toEqual({ ok: false, why: 'owned' });
    // Anche quelli di partenza.
    expect(buy('smeraldo', 100000, starter, day)).toEqual({ ok: false, why: 'owned' });
  });

  it('non in vendita (oggetti delle arene) e oggetti che non esistono', () => {
    expect(buy('reggia', 100000, starter, day)).toEqual({ ok: false, why: 'notForSale' });
    expect(buy('corona', 100000, starter, day)).toEqual({ ok: false, why: 'notForSale' });
    expect(buy('non-esiste', 100000, starter, day)).toEqual({ ok: false, why: 'unknown' });
  });

  it('monete insufficienti', () => {
    const item = notOffer(day, starter);
    expect(buy(item.id, item.price! - 1, starter, day)).toEqual({ ok: false, why: 'coins' });
    expect(buy(item.id, item.price!, starter, day)).toMatchObject({ ok: true, coins: 0 });
  });

  it('l’offerta del giorno è scontata, uguale per lo stesso giorno, e si paga scontata', () => {
    // Un giorno la cui offerta ha un id univoco (vedi il bug degli id doppi).
    const d = Array.from({ length: 60 }, (_, i) => `2026-12-${String((i % 28) + 1).padStart(2, '0')}`)
      .concat(Array.from({ length: 28 }, (_, i) => `2027-01-${String(i + 1).padStart(2, '0')}`))
      .find(x => !dupes.has(offerOf(x, starter)?.id ?? ''))!;
    const offer = offerOf(d, starter)!;
    expect(offer).not.toBeNull();
    expect(offer.price).not.toBeNull();
    expect(offerOf(d, starter)?.id).toBe(offer.id);
    const price = priceOf(offer, d, starter)!;
    expect(price).toBe(Math.round((offer.price! * (1 - OFFER_DISCOUNT)) / 10) * 10);
    expect(price).toBeLessThan(offer.price!);
    expect(price % 10).toBe(0);
    // Con le monete giuste per il prezzo scontato si compra; con una in meno no.
    expect(buy(offer.id, price, starter, d)).toMatchObject({ ok: true, coins: 0 });
    expect(buy(offer.id, price - 1, starter, d)).toEqual({ ok: false, why: 'coins' });
    // Lo stesso oggetto, un giorno in cui non è in offerta, costa il prezzo pieno.
    const other = Array.from({ length: 28 }, (_, i) => `2027-02-${String(i + 1).padStart(2, '0')}`).find(x => offerOf(x, starter)?.id !== offer.id)!;
    expect(priceOf(offer, other, starter)).toBe(offer.price);
    // Giorni diversi danno (in generale) offerte diverse.
    const days = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    expect(new Set(days.map(d => offerOf(d, starter)?.id)).size).toBeGreaterThan(1);
    // Non propone mai un oggetto che hai già.
    expect(offerOf(d, [...starter, offer.id])?.id).not.toBe(offer.id);
  });

  it('niente offerta quando hai già tutto', () => {
    const all = ITEMS.map(i => i.id);
    expect(offerOf(day, all)).toBeNull();
  });

  it('canEquip: solo oggetti posseduti e del posto giusto', () => {
    expect(canEquip('smeraldo', 'felt', [])).toBe(true); // quelli di partenza sempre
    expect(canEquip('classico', 'back', [])).toBe(true);
    expect(canEquip('classico', 'felt', starter)).toBe(false); // posto sbagliato
    expect(canEquip('reggia', 'felt', starter)).toBe(false); // non posseduto
    expect(canEquip('reggia', 'felt', [...starter, 'reggia'])).toBe(true);
    expect(canEquip('rosone', 'pattern', [...starter, 'rosone'])).toBe(true);
    expect(canEquip('rosone', 'back', [...starter, 'rosone'])).toBe(false);
    expect(canEquip('non-esiste', 'felt', ['non-esiste'])).toBe(false);
  });
});
