// Le sei rarità: dicono quanto è difficile avere un oggetto, mai un vantaggio in partita.

export type Rarity = 'comune' | 'noncomune' | 'raro' | 'epico' | 'leggendario' | 'mitico';

export const RARITIES: Rarity[] = ['comune', 'noncomune', 'raro', 'epico', 'leggendario', 'mitico'];

export const RARITY_NAMES: Record<Rarity, string> = {
  comune: 'Comune',
  noncomune: 'Non comune',
  raro: 'Raro',
  epico: 'Epico',
  leggendario: 'Leggendario',
  mitico: 'Mitico',
};

/** Ordine di prestigio, 0 (comune) … 5 (mitico). */
export const rarityRank = (r: Rarity) => RARITIES.indexOf(r);
