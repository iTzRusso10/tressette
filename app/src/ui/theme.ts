// Tramonto: a sunset sky (orange, pink, violet), white glass panels, an emerald felt, Sora throughout.

export const colors = {
  /** Text and icons on the sky. */
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.80)',
  textFaint: 'rgba(255,255,255,0.72)',
  /** Dark violet: text on white buttons and chips. */
  ink: '#2E1257',
  /** Glass panels on the sky. */
  glass: 'rgba(255,255,255,0.16)',
  glassStrong: 'rgba(255,255,255,0.26)',
  glassLine: 'rgba(255,255,255,0.32)',
  glassLineSoft: 'rgba(255,255,255,0.16)',
  /** Dark glass: names on the felt, notices, sheets. */
  shade: 'rgba(36,10,66,0.55)',
  shadeStrong: 'rgba(36,10,66,0.82)',
  sheet: '#3A1868',
  /** The felt. */
  felt: '#0B4D42',
  feltLight: '#14806A',
  feltDark: '#06352E',
  /** Sky stops. */
  orange: '#FF8A3D',
  pink: '#F0457A',
  violet: '#7A2E9C',
  night: '#3B1E6B',
  peach: '#FFE9DD',
  /** Players: you, then the others in seat order. */
  sun: '#FFE066',
  mint: '#7CF2D2',
  sky: '#9CCBFF',
  rose: '#FFB8D6',
  /** Errors and leaving. */
  coral: '#FF7A7A',
} as const;

export const gradients = {
  sky: { colors: [colors.orange, colors.pink, colors.violet, colors.night] as const, locations: [0, 0.42, 0.78, 1] as const },
  primary: { colors: ['#FFFFFF', colors.peach] as const },
  sun: { colors: ['#FFF1A8', colors.sun, '#FFC23D'] as const },
} as const;

/** One color per player, in seat order relative to the viewer (you first). */
export const seatColors = [colors.sun, colors.mint, colors.sky, colors.rose] as const;

export const fonts = {
  display: 'Sora_800ExtraBold',
  bold: 'Sora_700Bold',
  semi: 'Sora_600SemiBold',
  medium: 'Sora_500Medium',
  regular: 'Sora_400Regular',
} as const;

/** Type scale: 12, 14, 16, 19, 24, 32, 44, 58. */
export const type = {
  small: 12.5,
  body: 14.5,
  lead: 16,
  title: 19,
  h2: 24,
  h1: 32,
  hero: 44,
  giant: 58,
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { s: 12, m: 18, l: 24, xl: 30, pill: 999 } as const;

/** Card proportions of the scans (360x575) and their corner. */
export const CARD_RATIO = 575 / 360;
export const cardRadius = (w: number) => Math.round(w * 0.055 * 10) / 10;

/** Soft drop shadows (boxShadow works on iOS, Android and the web). */
export const shadow = {
  card: '0px 6px 14px rgba(30,6,60,0.35)',
  lifted: '0px 16px 28px rgba(30,6,60,0.45)',
  panel: '0px 14px 34px rgba(30,6,60,0.28)',
  glow: (c: string) => `0px 0px 22px ${c}`,
} as const;
