import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GAMES, type GameId } from '@/engine';
import { RULES } from '@/content/rules';
import { BackButton, Choice, Screen } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, space } from '@/ui/theme';

const LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', 'F', 'C', 'R'];

export default function Rules() {
  const { game: raw } = useLocalSearchParams<{ game: string }>();
  const game: GameId = raw === 'briscola' || raw === 'scopa' ? raw : 'tressette';
  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text v="h1" accessibilityRole="header">
          Come si gioca
        </Text>
        <View style={{ marginTop: space.l }}>
          <Choice<GameId>
            label="Gioco"
            value={game}
            onChange={g => router.setParams({ game: g })}
            options={(['tressette', 'briscola', 'scopa'] as GameId[]).map(g => ({ value: g, label: GAMES[g].name }))}
          />
        </View>
        {RULES[game].map(sec => (
          <View key={sec.title} style={styles.section}>
            <Text v="h2" style={styles.h}>
              {sec.title}
            </Text>
            {sec.ranks ? (
              <View style={styles.ranks} accessibilityLabel={`Ordine di forza: ${sec.ranks.join(', ')}`}>
                {sec.ranks.map((r, i) => (
                  <View key={r} style={[styles.rank, i === 0 && styles.rankTop]}>
                    <Text style={[styles.rankText, i === 0 && { color: colors.ink }]}>{LABEL[r]}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {sec.ranksNote ? (
              <Text v="small" style={{ marginBottom: space.s }}>
                {sec.ranksNote}
              </Text>
            ) : null}
            <Text v="lead" style={styles.p}>
              {sec.text}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  section: { marginTop: space.xl },
  h: { marginBottom: space.s },
  p: { color: colors.textSoft, fontFamily: fonts.regular, lineHeight: 26 },
  ranks: { flexDirection: 'row', gap: 5, marginBottom: space.s, flexWrap: 'wrap' },
  rank: {
    width: 30,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankTop: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  rankText: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.text },
});
