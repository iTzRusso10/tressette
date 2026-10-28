// I 15 set estetici: un tavolino, un panno e un dorso pensati insieme. Si possono usare anche separati;
// chi li possiede tutti e tre completa il set e ottiene il suo stemma (sul profilo) e delle monete.

import { itemByKey } from './catalog.ts';

export interface CosmeticSet {
  id: string;
  name: string;
  /** Chiavi del catalogo: tavolino, panno, dorso. */
  table: string;
  felt: string;
  back: string;
  /** Lo stemma che si ottiene (colori per disegnarlo: fondo, metallo). */
  badge: { colors: [string, string] };
  coins: number;
}

const S = (id: string, name: string, table: string, felt: string, back: string, colors: [string, string], coins: number): CosmeticSet => ({
  id,
  name,
  table: `table:${table}`,
  felt: `felt:${felt}`,
  back: `back:${back}`,
  badge: { colors },
  coins,
});

export const SETS: CosmeticSet[] = [
  S('circolo-italiano', 'Il Circolo Italiano', 'tavolo-del-circolo', 'verde-tradizionale', 'tricolore', ['#1C6338', '#F3D58C'], 500),
  S('venezia-reale', 'Venezia Reale', 'tavolo-veneziano', 'venezia-al-tramonto', 'fregio-veneziano', ['#860F22', '#F3D58C'], 1000),
  S('roma-imperiale', 'Roma Imperiale', 'marmo-di-carrara', 'mosaico-romano', 'roma-imperiale', ['#7A1E1E', '#F3D58C'], 1000),
  S('re-di-denari', 'Il Re di Denari', 'oro-antico', 'oro-e-nero', 'oro-classico', ['#1A181F', '#F3D58C'], 1500),
  S('oro-e-onore', 'Oro e Onore', 'radica-di-lusso', 'ricamo-d-oro', 'scudo-imperiale', ['#43101E', '#F3D58C'], 1500),
  S('notte-stellata', 'Notte Stellata', 'notte-stellata', 'costellazioni', 'polvere-stellare', ['#17224D', '#C9D6FF'], 1500),
  S('drago-cremisi', 'Drago Cremisi', 'drago-cremisi', 'drago-cremisi', 'drago-cremisi', ['#5A0E18', '#E05A4A'], 2000),
  S('fenice-eterna', 'Fenice Eterna', 'fenice-eterna', 'fenice-dorata', 'fenice-dorata', ['#5A2008', '#FFB36B'], 3000),
  S('palazzo-di-cristallo', 'Il Palazzo di Cristallo', 'cristallo-blu', 'cristallo-blu', 'cristallo-magico', ['#1556B0', '#BFE9FF'], 2000),
  S('regno-degli-assi', 'Il Regno degli Assi', 'trono-degli-assi', 'corona-degli-assi', 'trono-degli-assi', ['#2E030A', '#FFE38A'], 3000),
  S('signore-delle-carte', 'Il Signore delle Carte', 'ebano-reale', 'il-grande-maestro', 'il-re-delle-carte', ['#1A0F2E', '#F3D58C'], 3000),
  S('corona-degli-immortali', 'La Corona degli Immortali', 'tavolo-degli-immortali', 'il-panno-degli-immortali', 'corona-degli-immortali', ['#0B090E', '#B58CFF'], 5000),
  S('universo-infinito', 'L’Universo Infinito', 'universo-infinito', 'universo-infinito', 'universo-infinito', ['#0C0830', '#7FD0FF'], 3000),
  S('destino-dei-tre-giochi', 'Il Destino dei Tre Giochi', 'trono-celeste', 'destino', 'i-tre-giochi', ['#0E182E', '#FFE38A'], 4000),
  S('leggenda-vivente', 'La Leggenda Vivente', 'il-tavolo-leggendario', 'leggenda-vivente', 'leggenda-vivente', ['#1E1408', '#FFFFFF'], 5000),
];

export const setParts = (s: CosmeticSet) => [s.table, s.felt, s.back];

/** Set completi con questi oggetti. */
export const completedSets = (owned: readonly string[]) => SETS.filter(s => setParts(s).every(k => owned.includes(k)));

/** Un set si può completare oggi solo se i tre pezzi sono pronti (non «in arrivo»). */
export const setReady = (s: CosmeticSet) => setParts(s).every(k => itemByKey(k)?.status === 'ready');

export const setOf = (key: string) => SETS.filter(s => setParts(s).includes(key));
