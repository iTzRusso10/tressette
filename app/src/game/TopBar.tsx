import { Pressable, StyleSheet, View } from 'react-native';
import { nTeams, teamOf, type Match } from '@/engine';
import { Text } from '@/ui/Text';
import { colors, fonts, seatColors } from '@/ui/theme';

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

/** Menu button and the match score. Each score keeps its width, so numbers never push each other. */
export function TopBar({ m, viewer, onMenu, width }: Props) {
  const teams = Array.from({ length: nTeams(m) }, (_, i) => i);
  // Your side first.
  const mine = teamOf(m, viewer);
  teams.sort((a, b) => (a === mine ? -1 : b === mine ? 1 : a - b));
  const compact = teams.length > 2;
  const mx = Math.max(...m.match);
  const mn = Math.min(...m.match);
  const perdere = m.mode === 'perdere';
  return (
    <View style={[styles.bar, { width }]}>
      <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Pausa e menu" hitSlop={8} style={({ pressed }) => [styles.menu, pressed && styles.pressed]}>
        <View style={styles.burger} />
        <View style={[styles.burger, { width: 12 }]} />
        <View style={styles.burger} />
      </Pressable>
      <View style={styles.scores}>
        {teams.map(t => {
          const v = m.match[t];
          const lead = m.handNo > 0 && (perdere ? v === mn && mn < mx : v === mx && v > 0 && mx > mn);
          return (
            <View key={t} style={[styles.score, compact && styles.scoreCompact]}>
              <View style={styles.labelRow}>
                <View style={[styles.swatch, { backgroundColor: teamColor(m, t, viewer) }]} />
                <Text allowFontScaling={false} numberOfLines={1} style={styles.label}>
                  {teamName(m, t, viewer)}
                </Text>
              </View>
              <View style={styles.numRow}>
                <Text allowFontScaling={false} style={[styles.num, compact && styles.numCompact, lead && styles.numLead]}>
                  {v}
                </Text>
                <Text allowFontScaling={false} style={styles.of}>
                  /{m.target}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  menu: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.linea,
    backgroundColor: 'rgba(10,26,20,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  burger: { width: 16, height: 1.8, borderRadius: 1, backgroundColor: colors.ottoneChiaro },
  scores: { flex: 1, flexDirection: 'row', gap: 8 },
  score: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(10,26,20,0.55)',
    borderWidth: 1,
    borderColor: colors.lineaTenue,
  },
  scoreCompact: { paddingHorizontal: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 7, height: 7, borderRadius: 3.5 },
  label: { flex: 1, fontFamily: fonts.ui, fontSize: 12, lineHeight: 14, color: colors.marmoTenue },
  numRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  num: { fontFamily: fonts.display, fontSize: 22, lineHeight: 25, color: colors.marmo, fontVariant: ['lining-nums', 'tabular-nums'] },
  numCompact: { fontSize: 19, lineHeight: 22 },
  numLead: { color: colors.ottoneChiaro },
  of: { fontFamily: fonts.ui, fontSize: 11, lineHeight: 14, color: colors.salvia },
});
