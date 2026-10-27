import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ARENA_SIZE } from '@/meta/arenas';
import type { Rarity } from '@/meta/shop';
import { TrophyIcon } from '@/ui/icons';
import { dur, ease } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

/** The column every section is laid out in: centered, never wider than a phone and a half. */
export function SectionScroll({ children, max = 560, refresh }: { children: ReactNode; max?: number; refresh?: ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { width: Math.min(width, max) }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refresh as never}
    >
      {children}
    </ScrollView>
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <Text v="h1" accessibilityRole="header">
          {title}
        </Text>
        {sub ? (
          <Text v="body" style={{ marginTop: 2 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Eight places for the eight trophies of an arena. The ones just won fill in one after the other. */
export function Pips({ have, fresh = 0, size = 22, gap = 6 }: { have: number; fresh?: number; size?: number; gap?: number }) {
  return (
    <View style={[styles.pips, { gap }]} accessibilityLabel={`${Math.min(have, ARENA_SIZE)} trofei su ${ARENA_SIZE}`}>
      {Array.from({ length: ARENA_SIZE }, (_, i) => (
        <Pip key={i} on={i < have} delay={i >= have - fresh && i < have ? (i - (have - fresh)) * 140 + 250 : -1} size={size} />
      ))}
    </View>
  );
}

function Pip({ on, delay, size }: { on: boolean; delay: number; size: number }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(delay >= 0 && !reduce ? 0 : 1);
  useEffect(() => {
    if (delay >= 0 && !reduce) v.value = withDelay(delay, withTiming(1, { duration: dur.enter, easing: ease.in }));
  }, [delay, reduce, v]);
  const st = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * v.value, transform: [{ scale: 0.6 + 0.4 * v.value }] }));
  return (
    <View style={[styles.pip, { width: size, height: size, borderRadius: size / 2 }]}>
      {on ? (
        <Animated.View style={st}>
          <TrophyIcon size={size - 4} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const RARITY: Record<Rarity, { label: string; colors: [string, string]; ink: string }> = {
  comune: { label: 'Comune', colors: ['#E9E4F2', '#BEB3D3'], ink: colors.ink },
  raro: { label: 'Raro', colors: ['#9FE0FF', '#4C9BFF'], ink: '#062B5A' },
  epico: { label: 'Epico', colors: ['#E3B8FF', '#A35CFF'], ink: '#2A0B52' },
  leggendario: { label: 'Leggendario', colors: ['#FFF0A6', '#FFB02E'], ink: '#4A2A00' },
};
export const rarityColor = (r: Rarity) => RARITY[r].colors[1];

export function RarityChip({ rarity, style }: { rarity: Rarity; style?: StyleProp<ViewStyle> }) {
  const r = RARITY[rarity];
  return (
    <LinearGradient colors={r.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.chip, style]}>
      <Text style={[styles.chipText, { color: r.ink }]}>{r.label}</Text>
    </LinearGradient>
  );
}

/** A panel of violet glass, the container for content in the sections. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.s, paddingBottom: space.xxxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginBottom: space.l },
  pips: { flexDirection: 'row', alignItems: 'center' },
  pip: { backgroundColor: 'rgba(20,4,40,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center' },
  chipText: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.3, textTransform: 'uppercase' },
  panel: { padding: space.l, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
});
