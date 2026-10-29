// Le cornici (src/ui/arte/cornici.ts): ce n'è una per ogni cornice del catalogo, il cerchio dell'avatar resta
// ≥ 70% della misura, niente esce dalla tela, e la scala delle rarità cresce davvero (§5.7).
import { describe, expect, it } from 'vitest';
import { FRAMES } from '@/meta/catalog';
import { rarityRank } from '@/meta/rarity';
import { CORNICI, FONDI_AVATAR, ingombro, stileCornice } from '@/ui/arte/cornici';
import { AVATARS } from '@/meta/avatars';

/** Quanto «pesa» una cornice: bordo, smalto, ornamento, gemme (castoni compresi), cimiero, pendente. */
export const ricchezza = (id: string) => {
  const s = stileCornice(id);
  const gemmeGiro = s.giro?.tipo === 'castoni' || s.giro?.tipo === 'semi' ? 1 : 0;
  return (
    (s.bordo ? 1 : 0) +
    (s.fascia ? 1 : 0) +
    (s.giro ? 1 + gemmeGiro : 0) +
    (s.gemme ? 1 + (s.gemme.taglio === 'brillante' ? 1 : 0) : 0) +
    (s.cimiero ? 3 : 0) +
    (s.pendente ? 1 : 0) +
    (s.fascia?.tipo === 'madreperla' || s.fascia?.tipo === 'madreperlaNera' ? 1 : 0)
  );
};

describe('cornici', () => {
  it('ogni cornice del catalogo ha il suo stile, con la stessa rarità', () => {
    for (const f of FRAMES) {
      expect(CORNICI[f.id], f.id).toBeDefined();
      expect(CORNICI[f.id].rarita, f.id).toBe(f.rarity);
    }
  });
  it('il cerchio dell’avatar è almeno il 70% della misura e niente esce dalla tela', () => {
    for (const f of FRAMES) {
      const s = stileCornice(f.id);
      expect(s.foro * 2, f.id).toBeGreaterThanOrEqual(0.7);
      expect(ingombro(s), f.id).toBeLessThanOrEqual(50);
    }
  });
  it('la presenza cresce con la rarità: più ricca, e più spazio intorno all’avatar (in media)', () => {
    const media = (r: number, fn: (id: string) => number) => {
      const xs = FRAMES.filter(f => rarityRank(f.rarity) === r).map(f => fn(f.id));
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    for (let r = 1; r < 6; r++) {
      expect(media(r, ricchezza)).toBeGreaterThan(media(r - 1, ricchezza));
      // la cornice occupa più spazio intorno all'avatar (anello e ornamento che sporge)
      expect(media(r, id => ingombro(stileCornice(id)) - stileCornice(id).foro * 100)).toBeGreaterThan(media(r - 1, id => ingombro(stileCornice(id)) - stileCornice(id).foro * 100));
    }
  });
  it('«Corona» ha molta più presenza di «Oro sottile»', () => {
    expect(ricchezza('corona')).toBeGreaterThanOrEqual(ricchezza('oro-sottile') + 5);
    expect(stileCornice('corona').spessore).toBeGreaterThan(stileCornice('oro-sottile').spessore * 1.5);
  });
  it('ogni avatar ha un fondo', () => {
    for (const a of AVATARS) expect(FONDI_AVATAR[a.id], a.id).toBeDefined();
  });
});
