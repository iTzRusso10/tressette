// Il tuo profilo: avatar e cornice, titolo, livello, trofei e arena, statistiche e punteggio per gioco,
// vetrina, leghe delle stagioni passate, collezione e account. È costruito dal profilo pubblico
// (`publicOf`): quello che vedi qui è quello che vedono gli altri, più le cose che vedi solo tu.
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ACHIEVEMENTS } from '@/meta/achievements';
import { ARENAS } from '@/meta/arenas';
import { itemsOf, keyOf, SLOT_NAMES, SLOTS } from '@/meta/catalog';
import { signOut } from '@/meta/auth';
import { levelInfo, levelProgress } from '@/meta/levels';
import { publicOf, titleOf } from '@/meta/ledger';
import { progressOf, useProfile } from '@/meta/profile';
import { SETS } from '@/meta/sets';
import { useSettings } from '@/state/settings';
import { PlayerAvatar } from '@/ui/avatar';
import { GameStats, LeagueHistory, Showcase } from '@/ui/competition';
import { Icon, TrophyIcon } from '@/ui/icons';
import { BackButton, Button, Glass, Screen, Section, Squish } from '@/ui/kit';
import { CoinPill, Emblem } from '@/ui/meta';
import { ProfileEditor, type EditorTab } from '@/ui/ProfileEditor';
import { SignInPanel } from '@/ui/SignIn';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

export default function Profilo() {
  const p = useProfile();
  const localName = useSettings(s => s.name.trim());
  const { width } = useWindowDimensions();
  const [editor, setEditor] = useState<EditorTab | null>(null);

  const prog = progressOf(p);
  const pub = publicOf(prog);
  const name = p.account?.name || localName || 'Tu';
  const info = levelInfo(p.xp);
  const lvl = info.prestige > 0 ? `P${info.prestige}` : String(info.level);
  const title = titleOf(prog);
  const arena = ARENAS[p.meta.arena];
  const colW = Math.min(width, 560) - 40;
  const winRate = p.stats.played ? Math.round((p.stats.won / p.stats.played) * 100) : 0;
  const secrets = ACHIEVEMENTS.filter(a => a.hint);

  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
        <View style={{ flex: 1 }} />
        <CoinPill coins={p.coins} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Squish accessibilityRole="button" accessibilityLabel="Cambia avatar e cornice" onPress={() => setEditor('avatar')} scaleTo={0.95}>
            <PlayerAvatar avatar={p.meta.avatar} photo={p.account?.avatar} name={name} frame={p.equipped.frame} size={100} badge={lvl} />
          </Squish>
          <View style={{ flex: 1 }}>
            <Text v="h1" numberOfLines={1}>
              {name}
            </Text>
            <Squish
              accessibilityRole="button"
              accessibilityLabel={`Titolo: ${title.name}. Cambialo nella sezione Trofei`}
              onPress={() => router.dismissTo({ pathname: '/', params: { tab: 'trofei' } })}
              scaleTo={0.97}
              style={styles.titleRow}
            >
              <Icon name="crown" size={15} color={colors.sun} />
              <Text style={styles.titleText} numberOfLines={1}>
                {title.name}
              </Text>
            </Squish>
            <Text v="small" style={{ color: colors.textSoft }}>
              {info.prestige > 0 ? `Prestigio ${info.prestige}` : `Livello ${info.level}`}: {info.have.toLocaleString('it-IT')} su {info.need.toLocaleString('it-IT')} punti
            </Text>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.max(4, levelProgress(p.xp) * 100)}%` }]} />
            </View>
          </View>
        </View>
        <Squish accessibilityRole="button" onPress={() => setEditor('avatar')} scaleTo={0.97} style={styles.edit}>
          <Icon name="user" size={16} color={colors.text} />
          <Text style={styles.editText}>Avatar, cornice e vetrina</Text>
          <Icon name="chevron" size={16} color={colors.textSoft} />
        </Squish>

        <View style={styles.road}>
          <View style={styles.roadCell}>
            <TrophyIcon size={24} />
            <Text style={styles.roadNum}>{p.cups.toLocaleString('it-IT')}</Text>
            <Text v="small">trofei</Text>
          </View>
          <View style={styles.roadCell}>
            <Text style={styles.roadNum}>{arena.n}</Text>
            <Text v="small" numberOfLines={2} style={styles.roadName}>
              {arena.name}
            </Text>
          </View>
          <View style={styles.roadCell}>
            <Text style={styles.roadNum}>{Object.keys(p.achievements).length}</Text>
            <Text v="small" numberOfLines={1}>
              achievement
            </Text>
            <Text style={styles.roadSub} numberOfLines={1}>
              {pub.secrets} su {secrets.length} segreti
            </Text>
          </View>
        </View>

        <Section title="Partite">
          <Text v="small" style={{ marginBottom: space.s }}>
            {p.stats.played
              ? `${p.stats.played.toLocaleString('it-IT')} ${p.stats.played === 1 ? 'partita' : 'partite'}, ${p.stats.won.toLocaleString('it-IT')} ${p.stats.won === 1 ? 'vinta' : 'vinte'} (${winRate}%). Serie migliore: ${p.stats.bestStreak}. Il punteggio di ogni gioco decide la lega e la classifica della stagione.`
              : 'Ancora nessuna partita: le tue statistiche compaiono qui.'}
          </Text>
          <GameStats games={pub.games} />
        </Section>

        <Section title="Vetrina">
          <Showcase keys={pub.showcase} width={colW} onEdit={() => setEditor('vetrina')} />
        </Section>

        {pub.leagues.length ? (
          <Section title="Stagioni passate">
            <LeagueHistory leagues={pub.leagues} />
          </Section>
        ) : null}

        <Section title="Collezione">
          <View style={styles.record}>
            {SLOTS.map(s => {
              const all = itemsOf(s).filter(i => i.price > 0);
              const mine = all.filter(i => p.owned.includes(keyOf(i))).length;
              return (
                <View key={s} style={styles.gameRow}>
                  <Text v="label" style={styles.gameName}>
                    {SLOT_NAMES[s]}
                  </Text>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { backgroundColor: colors.sun, width: `${Math.max(mine ? 4 : 0, (mine / all.length) * 100)}%` }]} />
                  </View>
                  <Text v="small" style={styles.gameCount}>
                    {mine}/{all.length}
                  </Text>
                </View>
              );
            })}
            <View style={styles.badges} accessibilityLabel={`Stemmi dei set: ${p.meta.sets.length} su ${SETS.length}`}>
              {SETS.map(st => (
                <Emblem key={st.id} glyph="gem" colors={st.badge.colors} size={30} locked={!p.meta.sets.includes(st.id)} />
              ))}
            </View>
            <Text v="small">
              {p.meta.sets.length ? `${p.meta.sets.length} set completati su ${SETS.length}.` : 'Completa un set (tavolino, panno e dorso dello stesso gruppo) per il suo stemma.'}
            </Text>
          </View>
        </Section>

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
            <SignInPanel title="Salva i progressi e gioca con gli amici" body="Con un account ritrovi monete, trofei, tavoli e livello su ogni telefono, entri nelle classifiche e vedi gli amici che giocano." />
          </Section>
        )}
      </ScrollView>
      {editor ? <ProfileEditor start={editor} onClose={() => setEditor(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: space.xxxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.s },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', minHeight: 30 },
  titleText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.sun },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.glassStrong, marginTop: 8, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4, backgroundColor: colors.sun },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    minHeight: 44,
    marginTop: space.m,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLineSoft,
  },
  editText: { flex: 1, fontFamily: fonts.semi, fontSize: 14, lineHeight: 18, color: colors.text },
  road: { flexDirection: 'row', gap: space.s, marginTop: space.l },
  roadCell: { flex: 1, alignItems: 'center', paddingVertical: space.m, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  roadNum: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text, fontVariant: ['tabular-nums'] },
  roadName: { paddingHorizontal: 6, textAlign: 'center' },
  roadSub: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textFaint },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signedIn: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, backgroundColor: colors.panel, borderColor: colors.panelLine },
  record: { padding: space.l, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine, gap: space.m },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  gameName: { width: 84 },
  bar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  gameCount: { width: 40, textAlign: 'right', color: colors.textSoft },
});
