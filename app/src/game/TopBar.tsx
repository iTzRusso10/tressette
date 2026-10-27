import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { dur, ease } from '@/ui/motion';
import Svg, { Path } from 'react-native-svg';
import { nTeams, teamOf, type Match } from '@/engine';
import { IconButton } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, seatColors } from '@/ui/theme';

interface Props {
  m: Match;
  viewer: number;
  onMenu: () => void;
  width: number;
}

export function teamName(m: Match, t: number, viewer: number) {
  if (m.mode === '4') return t === teamOf(m, viewer) ? 'Noi' : 'Loro';
  return t === viewer ? 'Tu' : m.seats[t].name;
}

export function teamColor(m: Match, t: number, viewer: number) {
  if (m.mode === '4') return t === teamOf(m, viewer) ? seatColors[0] : seatColors[1];
  return seatColors[(t - viewer + m.n) % m.n];
}

/** A score that counts up to its new value and jumps a little when it changes. */
function Score({ value, color, size }: { value: number; color: string; size: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const pop = useSharedValue(0);
  useEffect(() => {
    if (value === from.current) return;
    const start = from.current;
    from.current = value;
    pop.value = withSequence(withTiming(1, { duration: dur.press, easing: ease.in }), withTiming(0, { duration: dur.quick + 60, easing: ease.move }));
    const steps = Math.min(12, Math.abs(value - start));
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(Math.round(start + ((value - start) * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [value, pop]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.3 * pop.value }, { translateY: -3 * pop.value }] }));
  return (
    <Animated.Text allowFontScaling={false} style={[styles.num, { fontSize: size, lineHeight: size * 1.15, textShadowColor: color }, st]}>
      {shown}
    </Animated.Text>
  );
}

/** Menu button and the match score. Each score keeps its width, so numbers never push each other. */
export function TopBar({ m, viewer, onMenu, width }: Props) {
  const teams = Array.from({ length: nTeams(m) }, (_, i) => i);
  const mine = teamOf(m, viewer);
  teams.sort((a, b) => (a === mine ? -1 : b === mine ? 1 : a - b));
  const compact = teams.length > 2;
  return (
    <View style={[styles.bar, { width }]}>
      <IconButton label="Pausa e menu" onPress={onMenu}>
        <Svg width={18} height={14} viewBox="0 0 18 14">
          <Path d="M1 1.5h16M1 7h11M1 12.5h16" stroke={colors.text} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </IconButton>
      <View style={styles.scores}>
        {teams.map(t => {
          const color = teamColor(m, t, viewer);
          return (
            <View key={t} style={[styles.score, compact && styles.scoreCompact]}>
              {compact ? (
                // Four players each on their own: the same initial and color as at the table, so no name gets cut.
                <View style={[styles.initial, { backgroundColor: color }]} accessibilityLabel={teamName(m, t, viewer)}>
                  <Text allowFontScaling={false} style={styles.initialText}>
                    {teamName(m, t, viewer).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.swatch, { backgroundColor: color }]} />
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.label}>
                    {teamName(m, t, viewer)}
                  </Text>
                </>
              )}
              <Score value={m.match[t]} color={color} size={compact ? 17 : 21} />
              <Text allowFontScaling={false} style={styles.of}>
                /{m.target}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  scores: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
    paddingHorizontal: 6,
  },
  score: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 0 },
  scoreCompact: { gap: 4 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  label: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, color: colors.text },
  initial: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontFamily: fonts.display, fontSize: 11, lineHeight: 14, color: colors.ink },
  num: { fontFamily: fonts.display, color: colors.text, fontVariant: ['tabular-nums'], textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  of: { fontFamily: fonts.medium, fontSize: 10.5, lineHeight: 13, color: colors.textFaint, marginTop: 4 },
});
