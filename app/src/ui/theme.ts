// Gran Caffè: velvet green, brass, marble, Bodoni numerals.

export const colors = {
  /** App background: deep green velvet. */
  velluto: '#10291F',
  vellutoAlto: '#163628',
  /** Raised surfaces on velvet (sheets, panels). */
  superficie: '#1A3A2D',
  superficieAlta: '#22473A',
  /** The table felt. */
  panno: '#1D5440',
  pannoLuce: '#25684F',
  pannoOmbra: '#143F2F',
  /** Brass: rail, primary actions, your side. */
  ottone: '#C8A15A',
  ottoneChiaro: '#E3C687',
  ottoneScuro: '#8C6A2E',
  /** Text on dark. */
  marmo: '#F2ECE0',
  marmoTenue: '#BFC9BF',
  salvia: '#8FA398',
  /** Opponents, warnings. */
  pompei: '#B23A2E',
  pompeiChiaro: '#D9645A',
  /** Partner, third player. */
  maiolica: '#4F7FC9',
  /** Fourth player a perdere. */
  acqua: '#5BAE9A',
  inchiostro: '#0A1A14',
  linea: 'rgba(200,161,90,0.28)',
  lineaTenue: 'rgba(242,236,224,0.10)',
} as const;

/** One color per team or player, in seat order relative to the viewer (you first). */
export const seatColors = [colors.ottone, colors.pompeiChiaro, colors.maiolica, colors.acqua] as const;

export const fonts = {
  display: 'BodoniModa_700Bold',
  displayItalic: 'BodoniModa_600SemiBold_Italic',
  displayMedium: 'BodoniModa_500Medium',
  ui: 'Figtree_500Medium',
  uiRegular: 'Figtree_400Regular',
  uiSemi: 'Figtree_600SemiBold',
  uiBold: 'Figtree_700Bold',
} as const;

/** Type scale (a fourth, rounded): 13, 15, 17, 20, 26, 34, 46, 60. */
export const type = {
  small: 13,
  body: 15,
  lead: 17,
  title: 20,
  h2: 26,
  h1: 34,
  hero: 46,
  giant: 60,
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** Card proportions of the scans (360x575) and their corner. */
export const CARD_RATIO = 575 / 360;
export const cardRadius = (w: number) => Math.round(w * 0.055 * 10) / 10;
