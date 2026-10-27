import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useProfile } from '@/meta/profile';
import { TROPHIES } from '@/meta/progress';
import { BackButton, Screen } from '@/ui/kit';
import { Badge, CoinIcon } from '@/ui/meta';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

/** The color of a trophy's tier, the same as its badge. */
const tierColor = (coins: number) => (coins >= 500 ? '#FFC23D' : coins >= 200 ? '#8FB8FF' : '#FF8FBF');

export default function Trofei() {
  const { width } = useWindowDimensions();
  const stats = useProfile(s => s.stats);
  const have = useProfile(s => s.trophies);
  const colW = Math.min(width, 620);
  const cols = colW > 520 ? 3 : 2;
  const gap = space.m;
  const cw = (colW - 40 - gap * (cols - 1)) / cols;
  // Unlocked first (newest first), then the closest to being unlocked.
  const list = TROPHIES.slice().sort((a, b) => {
    const ua = have[a.id] ?? 0;
    const ub = have[b.id] ?? 0;
    if (ua || ub) return ub - ua;
    const [pa, ga] = a.progress(stats);
    const [pb, gb] = b.progress(stats);
    return pb / gb - pa / ga;
  });
  const count = Object.keys(have).length;
  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { width: colW }]} showsVerticalScrollIndicator={false}>
        <Text v="h1" accessibilityRole="header">
          Trofei
        </Text>
        <Text v="body" style={{ marginTop: space.xs }}>
          {count === 0 ? 'Gioca e vinci per sbloccarli: ognuno vale monete ed esperienza.' : `Ne hai sbloccati ${count} su ${TROPHIES.length}.`}
        </Text>
        <View style={[styles.grid, { gap }]}>
          {list.map(t => {
            const [p, goal] = t.progress(stats);
            const on = !!have[t.id];
            return (
              <View
                key={t.id}
                style={[styles.card, { width: cw }, on && { borderColor: tierColor(t.coins), boxShadow: `0px 0px 18px ${tierColor(t.coins)}55` }]}
              >
                <Badge glyph={t.glyph} coins={t.coins} size={58} locked={!on} />
                <Text style={styles.name} numberOfLines={2}>
                  {t.title}
                </Text>
                <Text style={styles.desc} numberOfLines={3}>
                  {t.desc}
                </Text>
                <View style={styles.foot}>
                  {on ? (
                    <Text style={styles.done}>Sbloccato</Text>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${(p / goal) * 100}%` }]} />
                      </View>
                      <Text style={styles.count}>
                        {p}/{goal}
                      </Text>
                    </View>
                  )}
                  <View style={styles.reward}>
                    <CoinIcon size={14} />
                    <Text style={styles.rewardText}>{t.coins}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, justifyContent: 'center', paddingHorizontal: space.l },
  content: { alignSelf: 'center', paddingHorizontal: 20, paddingBottom: space.xxxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.l },
  card: {
    padding: space.m,
    paddingTop: space.l,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.panelLine,
    alignItems: 'center',
  },
  name: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 18, color: colors.text, textAlign: 'center', marginTop: space.s },
  desc: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textSoft, textAlign: 'center', marginTop: 3, minHeight: 30 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'stretch', marginTop: space.m },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.sun },
  count: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textFaint, marginTop: 3 },
  done: { flex: 1, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.mint },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rewardText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.text },
});
