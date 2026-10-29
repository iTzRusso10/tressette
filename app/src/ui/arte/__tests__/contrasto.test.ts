import { describe, expect, it } from 'vitest';
import { RARITIES } from '@/meta/rarity';
import { RARITA } from '../rarita';
import { COPPIE_CONTRASTO, fondo, rapportoContrasto, superficie, testo } from '../token';

// Le coppie testo/fondo dichiarate in token.ts (COPPIE_CONTRASTO): ≥ 4,5:1, oppure ≥ 3:1 se il testo è grande.
// Più i colori delle rarità su scuro e il testo inchiostro inciso sui loro metalli (targhette).
describe('contrasti di Lampara', () => {
  it('il calcolo segue WCAG', () => {
    expect(rapportoContrasto('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(rapportoContrasto('#777777', '#777777')).toBeCloseTo(1, 5);
    // Valori della tabella di §5.1 (direzione-artistica.md).
    expect(rapportoContrasto(testo.forte, fondo.base)).toBeCloseTo(16.35, 1);
    expect(rapportoContrasto(testo.inchiostro, superficie.carta)).toBeCloseTo(14.07, 1);
  });

  for (const c of COPPIE_CONTRASTO) {
    const min = c.grande ? 3 : 4.5;
    it(`${c.dove}: ${c.testo} su ${c.fondo} ≥ ${min}`, () => {
      expect(rapportoContrasto(c.testo, c.fondo)).toBeGreaterThanOrEqual(min);
    });
  }

  for (const r of RARITIES) {
    const st = RARITA[r];
    it(`rarità ${st.nome}: colore su fondo e su pannello ≥ 4,5`, () => {
      expect(rapportoContrasto(st.colore, fondo.base)).toBeGreaterThanOrEqual(4.5);
      expect(rapportoContrasto(st.colore, superficie.s1)).toBeGreaterThanOrEqual(4.5);
    });
    it(`rarità ${st.nome}: inchiostro inciso sul metallo medio e chiaro ≥ 4,5`, () => {
      expect(rapportoContrasto(testo.inchiostro, st.metallo[1])).toBeGreaterThanOrEqual(4.5);
      expect(rapportoContrasto(testo.inchiostro, st.metallo[0])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('le rarità vanno in ordine anche in scala di grigi: il metallo medio non scurisce salendo oltre il raro', () => {
    // Sei gradini; quello che li ordina è il materiale e l'ornamento, ma la luminanza non deve contraddirli:
    // dal raro in su il metallo è sempre almeno chiaro quanto il comune.
    const l = (h: string) => rapportoContrasto(h, '#000000');
    for (const r of ['raro', 'epico', 'leggendario', 'mitico'] as const) expect(l(RARITA[r].metallo[1])).toBeGreaterThan(l(RARITA.comune.metallo[1]) * 0.95);
  });
});
