// Line icons for the tab bar and the sections, one stroke style for the whole app (24×24, round joins).
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from './theme';

export type IconName = 'shop' | 'friends' | 'play' | 'podium' | 'trophy' | 'gear' | 'lock' | 'check' | 'plus' | 'share' | 'chevron' | 'user' | 'crown' | 'sparkle';

const PATHS: Record<IconName, string> = {
  shop: 'M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8zM9 10.5V7a3 3 0 0 1 6 0v3.5',
  friends: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 11a2.6 2.6 0 1 0 0-5.2M17 14c2 .4 3.3 2 3.7 5',
  play: 'M6.2 6.8l6-2.2 4.4 12.1-6 2.2zM13.6 4.9l4.7 1.2-2.6 10.4',
  podium: 'M9 9h6v12H9zM3 13h6v8H3zM15 15h6v6h-6zM12 3.2l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0zM7 6H4.5a2.5 2.5 0 0 0 2.6 4M17 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13v4M8.5 20h7M9.5 17h5',
  gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.5 7.5 0 0 1-1.9 1.1l-.3 2H9l-.3-2a7.5 7.5 0 0 1-1.9-1.1l-1.9.7-1.8-3.1 1.6-1.2a7.6 7.6 0 0 1 0-2.9L3.1 9.3l1.8-3.1 1.9.7a7.5 7.5 0 0 1 1.9-1.1l.3-2h3.6l.3 2a7.5 7.5 0 0 1 1.9 1.1l1.9-.7 1.8 3.1-1.6 1.2a7.6 7.6 0 0 1 0 2.9z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13zM12 14.5v2.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  share: 'M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12v7.5h14V12',
  chevron: 'M9 5.5l6.5 6.5L9 18.5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2',
  crown: 'M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13zM5.5 20h13',
  sparkle: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
};

export function Icon({ name, size = 22, color = colors.text, stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** The gold cup of the trophies: the same everywhere a number of trophies is shown. */
export function TrophyIcon({ size = 20, muted }: { size?: number; muted?: boolean }) {
  const id = muted ? 'cupMuted' : 'cupGold';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={muted ? '#E3DAEE' : '#FFF3B0'} />
          <Stop offset="0.55" stopColor={muted ? '#B3A6C6' : '#FFC93D'} />
          <Stop offset="1" stopColor={muted ? '#7C6B93' : '#E08A00'} />
        </LinearGradient>
      </Defs>
      <Path d="M6.5 3.5h11v4.6a5.5 5.5 0 0 1-11 0z" fill={`url(#${id})`} stroke={muted ? '#6E5E86' : '#B86A00'} strokeWidth={1} />
      <Path d="M6.5 5.2H4.2a2.6 2.6 0 0 0 2.9 4.4M17.5 5.2h2.3a2.6 2.6 0 0 1-2.9 4.4" fill="none" stroke={muted ? '#9B8DB0' : '#F5B21E'} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M10.6 13.4h2.8l.6 3.6h-4z" fill={muted ? '#9B8DB0' : '#F0A417'} />
      <Path d="M7.6 17h8.8a1 1 0 0 1 1 1v2.5H6.6V18a1 1 0 0 1 1-1z" fill={muted ? '#8A7AA2' : '#C9780A'} />
      <Path d="M9 5.2c0 2.4.6 4 2 5" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
