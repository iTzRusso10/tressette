import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { arenaOf } from '@/meta/arenas';
import { signOut } from '@/meta/auth';
import { levelOf, levelProgress, xpForLevel } from '@/meta/economy';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { TrophyIcon } from '@/ui/icons';
import { BackButton, Button, Glass, Screen, Section } from '@/ui/kit';
import { CoinPill, LevelAvatar } from '@/ui/meta';
import { SignInPanel } from '@/ui/SignIn';
import { Text } from '@/ui/Text';
import { colors, fonts, gradients, radius, space } from '@/ui/theme';

const GAME_NAMES = { tressette: 'Tressette', briscola: 'Briscola', scopa: 'Scopa' } as const;

export default function Profilo() {
  const p = useProfile();
  const localName = useSettings(s => s.name.trim());

  const name = p.account?.name || localName || 'Tu';
  const lvl = levelOf(p.xp);
  const winRate = p.stats.played ? Math.round((p.stats.won / p.stats.played) * 100) : 0;

  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
        <View style={{ flex: 1 }} />
        <CoinPill coins={p.coins} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          {p.account?.avatar ? (
            <View>
              <Image source={{ uri: p.account.avatar }} style={styles.photo} />
              <View style={styles.levelChip}>
                <Text style={styles.levelChipText}>{lvl}</Text>
              </View>
            </View>
          ) : (
            <LevelAvatar name={name} xp={p.xp} size={84} />
          )}
          <View style={{ flex: 1 }}>
            <Text v="h1" numberOfLines={1}>
              {name}
            </Text>
            <Text v="small" style={{ color: colors.textSoft }}>
              Livello {lvl}: {p.xp - xpForLevel(lvl)} su {xpForLevel(lvl + 1) - xpForLevel(lvl)} punti per il prossimo
            </Text>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.max(4, levelProgress(p.xp) * 100)}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.record}>
          <Text v="lead">
            {p.stats.played
              ? `${p.stats.played} ${p.stats.played === 1 ? 'partita' : 'partite'}, ${p.stats.won} ${p.stats.won === 1 ? 'vinta' : 'vinte'} (${winRate}%).`
              : 'Ancora nessuna partita: le tue statistiche compaiono qui.'}
          </Text>
          {(Object.keys(GAME_NAMES) as (keyof typeof GAME_NAMES)[]).map(g => {
            const st = p.stats.byGame[g];
            return (
              <View key={g} style={styles.gameRow}>
                <Text v="label" style={styles.gameName}>
                  {GAME_NAMES[g]}
                </Text>
                <View style={styles.bar}>
                  <LinearGradient
                    colors={gradients.games[g]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${st.played ? Math.max(6, (st.won / st.played) * 100) : 0}%` }]}
                  />
                </View>
                <Text v="small" style={styles.gameCount}>
                  {st.won}/{st.played}
                </Text>
              </View>
            );
          })}
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{p.stats.scope} scope</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Serie migliore: {p.stats.bestStreak}</Text>
            </View>
            {p.stats.settebelli ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{p.stats.settebelli} settebelli</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.road}>
          <View style={styles.roadCell}>
            <TrophyIcon size={26} />
            <Text style={styles.roadNum}>{p.cups}</Text>
            <Text v="small">trofei</Text>
          </View>
          <View style={styles.roadCell}>
            <Text style={styles.roadNum}>{arenaOf(p.bestCups).index + 1}</Text>
            <Text v="small" numberOfLines={1}>
              {arenaOf(p.bestCups).name}
            </Text>
          </View>
          <View style={styles.roadCell}>
            <Text style={styles.roadNum}>{Object.keys(p.trophies).length}</Text>
            <Text v="small">medaglie</Text>
          </View>
        </View>

        {p.account ? (
          <Section title="Account">
            <Glass style={styles.signedIn}>
              <Text v="label" style={{ flex: 1 }}>
                Collegato con {p.account.provider === 'apple' ? 'Apple' : p.account.provider === 'google' ? 'Google' : 'Facebook'}
              </Text>
              <Button kind="secondary" label="Amici" onPress={() => router.dismissTo({ pathname: '/', params: { tab: 'amici' } })} style={{ minHeight: 44, paddingHorizontal: 16 }} />
            </Glass>
            <Button kind="quiet" label="Esci dall’account" onPress={() => signOut()} style={{ marginTop: space.s }} />
          </Section>
        ) : (
          <Section title="Account">
            <SignInPanel title="Salva i progressi e gioca con gli amici" body="Con un account ritrovi monete, trofei, tavoli e livello su ogni telefono, e vedi gli amici che giocano." />
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  road: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  roadCell: { flex: 1, alignItems: 'center', paddingVertical: space.m, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  roadNum: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text, fontVariant: ['tabular-nums'] },
  signedIn: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, backgroundColor: colors.panel, borderColor: colors.panelLine },
  top: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: space.xxxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.s },
  photo: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.sun },
  levelChip: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChipText: { fontFamily: fonts.display, fontSize: 12, lineHeight: 15, color: '#FFFFFF' },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.glassStrong, marginTop: 8, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4, backgroundColor: colors.sun },
  record: {
    marginTop: space.xl,
    padding: space.l,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
    gap: space.m,
  },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  gameName: { width: 84 },
  bar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  gameCount: { width: 40, textAlign: 'right', color: colors.textSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.glass },
  chipText: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: 16, color: colors.text },
});
