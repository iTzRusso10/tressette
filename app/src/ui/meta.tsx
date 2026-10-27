import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { levelOf, levelProgress } from '@/meta/economy';
import type { Glyph } from '@/meta/progress';
import { Text } from './Text';
import { colors, fonts, gradients, radius } from './theme';

/* ------------------------------------------------------------------ coin */

export function CoinIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgGradient id="coin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF3B0" />
          <Stop offset="0.5" stopColor="#FFD23F" />
          <Stop offset="1" stopColor="#F59E0B" />
        </SvgGradient>
      </Defs>
      <Circle cx={12} cy={12} r={11} fill="url(#coin)" stroke="#C2700A" strokeWidth={1} />
      <Circle cx={12} cy={12} r={7.6} fill="none" stroke="#C2700A" strokeOpacity={0.55} strokeWidth={1.2} />
      <Path d="M12 7.6l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#FFFBEA" />
    </Svg>
  );
}

/** A number that counts to its new value and pops when it changes. */
export function CountUp({ value, style }: { value: number; style?: object }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const pop = useSharedValue(0);
  useEffect(() => {
    if (value === from.current) return;
    const start = from.current;
    from.current = value;
    pop.value = withSequence(withTiming(1, { duration: 110 }), withSpring(0, { damping: 9, stiffness: 170 }));
    const steps = 18;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(Math.round(start + ((value - start) * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [value, pop]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.18 * pop.value }] }));
  return <Animated.Text style={[style, st]}>{shown.toLocaleString('it-IT')}</Animated.Text>;
}

export function CoinPill({ coins }: { coins: number }) {
  return (
    <View style={styles.coinPill} accessibilityLabel={`${coins} monete`}>
      <CoinIcon size={22} />
      <CountUp value={coins} style={styles.coinText} />
    </View>
  );
}

/* ------------------------------------------------------------------ avatar with level */

/** An avatar with a ring that fills as you approach the next level, and the level number. */
export function LevelAvatar({ name, xp, size = 52 }: { name: string; xp: number; size?: number }) {
  const lvl = levelOf(xp);
  const p = levelProgress(xp);
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Livello ${lvl}`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={3} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.sun}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <LinearGradient colors={gradients.sun.colors} style={[styles.avatarIn, { margin: 6, borderRadius: (size - 12) / 2 }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.36, lineHeight: size * 0.44 }]}>{(name || 'T').slice(0, 1).toUpperCase()}</Text>
      </LinearGradient>
      <View style={styles.levelChip}>
        <Text style={styles.levelText}>{lvl}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ trophy badge */

const GLYPHS: Record<Glyph, string> = {
  cup: 'M7 4h10v4a5 5 0 0 1-10 0zM7 6H4.5a2.5 2.5 0 0 0 2.6 4M17 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13v4M8.5 20h7M9.5 17h5',
  star: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  flame: 'M12 21c-3.6 0-6-2.5-6-5.8 0-3.4 2.6-5 3.4-8.2 1.9 1.4 2.4 3 2.3 4.6 1.2-.8 1.8-2 1.8-3.6 2.6 2 4.5 4.6 4.5 7.3C18 18.5 15.6 21 12 21z',
  crown: 'M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13zM5.5 20h13',
  broom: 'M15.5 3.5l-4.8 8M9 10.8l4.6 2.6-2.8 6.6c-2.5-.6-4.6-1.8-6.3-3.6z',
  seven: 'M7 5h10l-6 14M9.5 12h6',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8',
  cards: 'M5 7.5l7-2.4 3.5 10.4-7 2.4zM12.6 5.6l5.2 1.4-2.6 10.6',
  friends: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 11a2.6 2.6 0 1 0 0-5.2M17 14c2 .4 3.3 2 3.7 5',
  medal: 'M8 3l2.5 5M16 3l-2.5 5M12 9.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM12 12.3l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z',
};

/** Tier colors by reward: bronze-ish pink, silver-ish sky, gold. */
function tier(coins: number): [string, string] {
  if (coins >= 500) return ['#FFE27A', '#F59E0B'];
  if (coins >= 200) return ['#B9E2FF', '#5B8CFF'];
  return ['#FFC2DD', '#F0457A'];
}

export function Badge({ glyph, coins, size = 64, locked }: { glyph: Glyph; coins: number; size?: number; locked?: boolean }) {
  const [a, b] = locked ? ['#C9BCD8', '#7C6B93'] : tier(coins);
  const id = `b${glyph}${coins}${locked ? 'l' : ''}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={locked ? { opacity: 0.55 } : undefined}>
      <Defs>
        <RadialGradient id={id} cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </RadialGradient>
      </Defs>
      <Path d="M32 3l24 10v18c0 15-10 26-24 30C18 57 8 46 8 31V13z" fill={`url(#${id})`} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={2} />
      <Path d="M32 9l18 7.5V31c0 11.5-7.5 20-18 23.5C21.5 51 14 42.5 14 31V16.5z" fill="#FFFFFF" fillOpacity={0.14} />
      <G transform="translate(17 16) scale(1.25)">
        <Path d={GLYPHS[glyph]} fill="none" stroke="#FFFFFF" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {locked ? <Rect x={26} y={44} width={12} height={9} rx={2} fill="#FFFFFF" fillOpacity={0.85} /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.shade,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  coinText: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  avatarIn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, color: colors.ink },
  levelChip: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: { fontFamily: fonts.display, fontSize: 11, lineHeight: 14, color: '#FFFFFF' },
});
