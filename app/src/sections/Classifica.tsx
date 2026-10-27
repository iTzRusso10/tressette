import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { arenaOf } from '@/meta/arenas';
import { loadLeaderboard, type RankRow, type RankScope } from '@/meta/leaderboard';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { ArenaScene } from '@/ui/ArenaScene';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Button, Choice } from '@/ui/kit';
import { LevelAvatar } from '@/ui/meta';
import { dur } from '@/ui/motion';
import { SignInPanel } from '@/ui/SignIn';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { Panel, SectionScroll, SectionTitle } from './parts';

/** Gold, silver and bronze for the first three. */
const PODIUM = ['#FFC93D', '#D5DCE8', '#E39A5B'];

function Rank({ n }: { n: number }) {
  const top = n <= 3;
  return (
    <View style={[styles.rank, top && { backgroundColor: PODIUM[n - 1] }]}>
      <Text style={[styles.rankText, top && { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {n}
      </Text>
    </View>
  );
}

function Row({ r }: { r: RankRow }) {
  return (
    <View style={[styles.row, r.isMe && styles.rowMe]}>
      <Rank n={r.rank} />
      {r.avatar ? <Image source={{ uri: r.avatar }} style={styles.photo} /> : <LevelAvatar name={r.name} xp={r.xp} size={40} />}
      <View style={{ flex: 1 }}>
        <Text v="label" numberOfLines={1}>
          {r.isMe ? `${r.name} (tu)` : r.name}
        </Text>
        <Text v="small" numberOfLines={1}>
          {arenaOf(r.cups).name}
        </Text>
      </View>
      <View style={styles.cups}>
        <TrophyIcon size={18} />
        <Text style={styles.cupsText}>{r.cups}</Text>
      </View>
    </View>
  );
}

/** Your place: the arena behind, your trophies in front. Shown even without an account. */
function Me({ rank }: { rank: number | null }) {
  const cups = useProfile(s => s.cups);
  const account = useProfile(s => s.account);
  const name = useSettings(s => s.name.trim());
  const arena = arenaOf(cups);
  const { width } = useWindowDimensions();
  return (
    <View style={styles.me}>
      <View style={StyleSheet.absoluteFill}>
        <ArenaScene id={arena.id} width={Math.min(width, 560) - 40} height={120} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(28,8,52,0.55)' }]} />
      </View>
      <View style={styles.meIn}>
        <View style={{ flex: 1 }}>
          <Text style={styles.meKicker}>{rank ? `${rank}° posto` : 'La tua posizione'}</Text>
          <Text style={styles.meName} numberOfLines={1}>
            {account?.name || name || 'Tu'}
          </Text>
          <Text v="small" style={{ color: colors.textSoft }}>
            {arena.name}
          </Text>
        </View>
        <View style={styles.meCups}>
          <TrophyIcon size={30} />
          <Text style={styles.meCupsText}>{cups}</Text>
        </View>
      </View>
    </View>
  );
}

export function Classifica({ active }: { active: boolean }) {
  const account = useProfile(s => s.account);
  const [scope, setScope] = useState<RankScope>('mondo');
  const [loaded, setLoaded] = useState<{ scope: RankScope; rows: RankRow[]; me: RankRow | null } | { scope: RankScope; error: true } | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion(v => v + 1);
  useEffect(() => {
    if (!active || !account) return;
    let live = true;
    loadLeaderboard(scope)
      .then(d => live && setLoaded({ scope, ...d }))
      .catch(() => live && setLoaded({ scope, error: true }));
    return () => {
      live = false;
    };
  }, [active, account, scope, version]);
  // While another list loads, the old one doesn't stay on screen.
  const current = loaded && loaded.scope === scope ? loaded : null;
  const error = !!current && 'error' in current;
  const data = current && !('error' in current) ? current : null;

  return (
    <SectionScroll>
      <SectionTitle title="Classifica" sub="Chi ha più trofei sale. Chi perde, scende." />
      <Me rank={data?.me?.rank ?? null} />
      {account ? (
        <>
          <View style={{ marginTop: space.l }}>
            <Choice<RankScope>
              label="Classifica"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'mondo', label: 'Tutti' },
                { value: 'amici', label: 'Amici' },
              ]}
            />
          </View>
          <View style={{ marginTop: space.m, gap: space.s }}>
            {error ? (
              <Panel style={styles.empty}>
                <Text v="body" style={{ textAlign: 'center' }}>
                  Non riesco a caricare la classifica. Controlla la connessione.
                </Text>
                <Button kind="secondary" label="Riprova" onPress={load} style={{ marginTop: space.m, minHeight: 44 }} />
              </Panel>
            ) : data === null ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: space.xl }} />
            ) : data.rows.length === 0 ? (
              <Panel style={styles.empty}>
                <Icon name="podium" size={28} color={colors.textSoft} />
                <Text v="body" style={{ textAlign: 'center', marginTop: space.s }}>
                  {scope === 'amici' ? 'Aggiungi degli amici nella sezione Amici per sfidarli in classifica.' : 'Ancora nessuno in classifica: vinci una partita e sei il primo.'}
                </Text>
              </Panel>
            ) : (
              <Animated.View entering={FadeIn.duration(dur.enter)} style={{ gap: space.s }}>
                {data.rows.map(r => (
                  <Row key={r.id} r={r} />
                ))}
                {data.me && !data.rows.some(r => r.isMe) ? (
                  <>
                    <Text style={styles.dots}>···</Text>
                    <Row r={data.me} />
                  </>
                ) : null}
              </Animated.View>
            )}
          </View>
        </>
      ) : (
        <View style={{ marginTop: space.l }}>
          <SignInPanel
            title="Entra in classifica"
            body="Con un account i tuoi trofei finiscono nella classifica di tutti i giocatori e in quella dei tuoi amici."
          />
        </View>
      )}
    </SectionScroll>
  );
}

const styles = StyleSheet.create({
  me: { height: 120, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassLine },
  meIn: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l, gap: space.m },
  meKicker: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, textTransform: 'uppercase', letterSpacing: 0.4 },
  meName: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text, letterSpacing: -0.4, marginTop: 2 },
  meCups: { alignItems: 'center' },
  meCupsText: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: colors.panel },
  rowMe: { borderWidth: 1.5, borderColor: colors.sun },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  photo: { width: 40, height: 40, borderRadius: 20 },
  cups: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cupsText: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center' },
  dots: { textAlign: 'center', color: colors.textFaint, fontFamily: fonts.bold, fontSize: 16, lineHeight: 18 },
});
