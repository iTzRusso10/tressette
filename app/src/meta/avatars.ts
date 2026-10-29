// Gli avatar: un simbolo su un fondo colorato, scelto dal profilo. Sono tutti gratuiti (la collezione da
// sbloccare sono le cornici). «foto» usa la foto dell'account, «iniziale» la prima lettera del nome.

export type AvatarGlyph = 'iniziale' | 'foto' | 'coppa' | 'denaro' | 'spada' | 'bastone' | 'sole' | 'luna' | 'corona' | 'vesuvio' | 'limone' | 'corno' | 'sette' | 'stella';

export interface Avatar {
  id: string;
  name: string;
  glyph: AvatarGlyph;
  /** Fondo (due colori, dall'alto in basso) e simbolo. */
  colors: [string, string, string];
}

export const AVATARS: Avatar[] = [
  { id: 'iniziale', name: 'Iniziale', glyph: 'iniziale', colors: ['#FFF1A8', '#FFC23D', '#2E1257'] },
  { id: 'foto', name: 'Foto', glyph: 'foto', colors: ['#FFF1A8', '#FFC23D', '#2E1257'] },
  { id: 'coppa', name: 'Coppe', glyph: 'coppa', colors: ['#FFD2DE', '#F0457A', '#FFFFFF'] },
  { id: 'denaro', name: 'Denari', glyph: 'denaro', colors: ['#FFF1A8', '#F2A21E', '#7A3E08'] },
  { id: 'spada', name: 'Spade', glyph: 'spada', colors: ['#C9E2FF', '#3E7BD6', '#FFFFFF'] },
  { id: 'bastone', name: 'Bastoni', glyph: 'bastone', colors: ['#C8F2DA', '#2E9A5E', '#FFFFFF'] },
  { id: 'sole', name: 'Sole', glyph: 'sole', colors: ['#FFE2C4', '#FF8A3D', '#FFFFFF'] },
  { id: 'luna', name: 'Luna', glyph: 'luna', colors: ['#3B2A7E', '#17093A', '#F3D58C'] },
  { id: 'corona', name: 'Corona', glyph: 'corona', colors: ['#7A2E9C', '#3B1E6B', '#FFE066'] },
  { id: 'vesuvio', name: 'Vesuvio', glyph: 'vesuvio', colors: ['#FFB38A', '#7A2E9C', '#FFFFFF'] },
  { id: 'limone', name: 'Limone', glyph: 'limone', colors: ['#1F8FA0', '#0B4D5E', '#F2C230'] },
  { id: 'corno', name: 'Cornicello', glyph: 'corno', colors: ['#FFFFFF', '#F2E6EA', '#D5283A'] },
  { id: 'sette', name: 'Settebello', glyph: 'sette', colors: ['#14806A', '#06352E', '#FFE066'] },
  { id: 'stella', name: 'Stella', glyph: 'stella', colors: ['#2B3C7A', '#0A1029', '#FFE066'] },
];

export const DEFAULT_AVATAR = 'iniziale';
export const avatarById = (id: string | undefined) => AVATARS.find(a => a.id === id) ?? AVATARS[0];
