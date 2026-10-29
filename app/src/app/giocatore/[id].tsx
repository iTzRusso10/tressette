// Il profilo di un altro giocatore: avatar e cornice, titolo, trofei, statistiche e punteggio per
// gioco, vetrina, leghe passate, e le vostre sfide. Da qui si aggiunge agli amici o si sfida.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { GameId } from '@/engine';
import { ARENAS } from '@/meta/arenas';
import { DEFAULT_TITLE, titleById } from '@/meta/titles';
import { useProfile } from '@/meta/profile';
import { duelsWith, isOnline, publicProfile, removeFriend, seenText, sendFriendRequest, type PublicView, type RequestResult } from '@/meta/social';
import { PlayerAvatar } from '@/ui/avatar';
import { GAME_LABEL, GAMES, GameStats, LeagueHistory, Showcase } from '@/ui/competition';
import { sfx } from '@/ui/feedback';
import { Icon, TrophyIcon } from '@/ui/icons';
import { BackButton, Button, Choice, Screen, Section } from '@/ui/kit';
import { dur } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

const REQUEST_TEXT: Record<RequestResult, string> = {
  sent: 'Richiesta mandata: diventate amici quando la accetta.',
  friends: 'Ora siete amici.',
  already: 'Hai già mandato una richiesta.',
  self: 'Sei tu.',
  notfound: 'Giocatore non trovato.',
  limit: 'Hai mandato troppe richieste oggi: riprova domani.',
  error: 'Non riesco a collegarmi, riprova.',
};

type Duel = { game: GameId; won: boolean; lost: boolean; at: string };

export default function Giocatore() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useProfile(s => s.account);
  const { width } = useWindowDimensions();
  const [view, setView] = useState<PublicView | null | 'error'>(null);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [game, setGame] = useState<GameId>('tressette');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [version, setVersion] = useState(0);
  const colW = Math.min(width, 560) - 40;

  useEffect(() => {
    if (account && id === account.id) {
      router.replace('/profilo');
      return;
    }
    let live = true;
    Promise.all([publicProfile(id), duelsWith(id).catch(() => [] as Duel[])])
      .then(([v, d]) => {
        if (!live) return;
        setView(v ?? 'error');
        setDuels(d);
      })
      .catch(() => live && setView('error'));
    return () => {
      live = false;
    };
  }, [id, account, version]);

  const top = (
    <View style={styles.top}>
      <BackButton />
    </View>
  );

  if (!account)
    return (
      <Screen>
        {top}
        <View style={styles.content}>
          <Text v="body">Per vedere i profili degli altri giocatori entra con un account dal tuo profilo.</Text>
        </View>
      </Screen>
    );

  if (view === null)
    return (
      <Screen>
        {top}
        <ActivityIndicator color={colors.text} style={{ marginTop: space.xxxl }} />
      </Screen>
    );

  if (view === 'error')
    return (
      <Screen>
        {top}
        <View style={styles.content}>
          <Text v="body">Non riesco a caricare questo profilo. Controlla la connessione.</Text>
          <Button kind="secondary" label="Riprova" onPress={() => setVersion(v => v + 1)} style={{ marginTop: space.l }} />
        </View>
      </Screen>
    );

  const pub = view.pub;
  const level = pub.prestige ? `P${pub.prestige}` : String(pub.level ?? 1);
  const title = titleById(pub.title ?? DEFAULT_TITLE) ?? titleById(DEFAULT_TITLE)!;
  const arena = ARENAS[Math.min(ARENAS.length - 1, Math.max(0, pub.arena ?? 0))];
  const online = isOnline(view.lastSeen);

  const add = async () => {
    setMsg(null);
    const r = await sendFriendRequest(view.id);
    if (r === 'sent' || r === 'friends') sfx('pts');
    setMsg(REQUEST_TEXT[r]);
    if (r === 'friends') setVersion(v => v + 1);
  };
  const remove = async () => {
    await removeFriend(view.id).catch(() => {});
    setConfirmRemove(false);
    setVersion(v => v + 1);
  };
  const challenge = () => router.push({ pathname: '/gioca/[game]', params: { game, online: '1', invite: view.id } });

  return (
    <Screen>
      {top}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(dur.enter)}>
          <View style={styles.head}>
            <PlayerAvatar avatar={pub.avatar} photo={view.photo} name={view.name} frame={pub.frame} size={100} badge={level} />
            <View style={{ flex: 1 }}>
              <Text v="h1" numberOfLines={1}>
                {view.name}
              </Text>
              <View style={styles.titleRow}>
                <Icon name="crown" size={15} color={colors.sun} />
                <Text style={styles.titleText} numberOfLines={1}>
                  {title.name}
                </Text>
              </View>
              <View style={styles.seen}>
                <View style={[styles.dot, { backgroundColor: online ? colors.mint : 'rgba(255,255,255,0.35)' }]} />
                <Text v="small">{seenText(view.lastSeen)}</Text>
              </View>
            </View>
          </View>

          {view.friend ? (
            <View style={styles.actions}>
              <Choice<GameId> label="Gioco della sfida" value={game} onChange={setGame} options={GAMES.map(g => ({ value: g, label: GAME_LABEL[g] }))} />
              <Button label={`Sfida a ${GAME_LABEL[game]}`} sub="Crei la stanza e gli arriva l’invito" onPress={challenge} style={{ marginTop: space.s }} />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button label="Aggiungi agli amici" onPress={add} />
            </View>
          )}
          {msg ? (
            <Animated.View entering={FadeIn.duration(dur.quick)}>
              <Text v="small" style={{ textAlign: 'center', marginTop: space.s, color: colors.mint }}>
                {msg}
              </Text>
            </Animated.View>
          ) : null}

          <View style={styles.road}>
            <View style={styles.roadCell}>
              <TrophyIcon size={24} />
              <Text style={styles.roadNum}>{view.cups.toLocaleString('it-IT')}</Text>
              <Text v="small">trofei</Text>
            </View>
            <View style={styles.roadCell}>
              <Text style={styles.roadNum}>{arena.n}</Text>
              <Text v="small" numberOfLines={2} style={{ paddingHorizontal: 6, textAlign: 'center' }}>
                {arena.name}
              </Text>
            </View>
            <View style={styles.roadCell}>
              <Text style={styles.roadNum}>{pub.achievements ?? 0}</Text>
              <Text v="small">achievement</Text>
            </View>
          </View>

          <Section title="Le vostre sfide">
            <View style={styles.h2h}>
              <View style={styles.h2hSide}>
                <Text style={styles.h2hNum}>{view.myWins}</Text>
                <Text v="small">vinte da te</Text>
              </View>
              <Text style={styles.h2hDash}>–</Text>
              <View style={styles.h2hSide}>
                <Text style={styles.h2hNum}>{view.theirWins}</Text>
                <Text v="small" numberOfLines={1}>
                  vinte da {view.name}
                </Text>
              </View>
            </View>
            {duels.length ? (
              <View style={styles.duels}>
                {duels.slice(0, 8).map((d, i) => (
                  <View key={`${d.at}${i}`} style={[styles.duel, i > 0 && styles.divider]}>
                    <View style={[styles.result, { backgroundColor: d.won ? colors.mint : d.lost ? colors.coral : colors.glassStrong }]}>
                      <Text style={styles.resultText}>{d.won ? 'V' : d.lost ? 'P' : '='}</Text>
                    </View>
                    <Text style={styles.duelGame}>{GAME_LABEL[d.game]}</Text>
                    <Text v="small">{new Date(d.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text v="small" style={{ marginTop: space.s }}>
                Ancora nessuna sfida online tra voi. Contano le partite in stanza con l’account, confermate da entrambi.
              </Text>
            )}
          </Section>

          <Section title="Partite">
            <Text v="small" style={{ marginBottom: space.s }}>
              {pub.played ? `${pub.played.toLocaleString('it-IT')} partite, ${(pub.won ?? 0).toLocaleString('it-IT')} vinte. Serie migliore: ${pub.bestStreak ?? 0}.` : 'Ancora nessuna partita.'}
            </Text>
            <GameStats games={pub.games ?? {}} />
          </Section>

          {pub.showcase?.length ? (
            <Section title="Vetrina">
              <Showcase keys={pub.showcase} width={colW} />
            </Section>
          ) : null}

          {pub.leagues?.length ? (
            <Section title="Stagioni passate">
              <LeagueHistory leagues={pub.leagues} />
            </Section>
          ) : null}

          {view.friend ? (
            <View style={{ marginTop: space.xl }}>
              {confirmRemove ? (
                <View style={styles.confirm}>
                  <Text v="label" style={{ textAlign: 'center' }}>
                    Togli {view.name} dagli amici?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: space.s, marginTop: space.m }}>
                    <Button kind="secondary" label="No" onPress={() => setConfirmRemove(false)} style={{ flex: 1, minHeight: 48 }} />
                    <Button kind="secondary" label="Sì, togli" onPress={remove} style={{ flex: 1, minHeight: 48 }} />
                  </View>
                </View>
              ) : (
                <Button kind="quiet" label="Togli dagli amici" onPress={() => setConfirmRemove(true)} />
              )}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: space.xxxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.s },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 26 },
  titleText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.sun },
  seen: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { marginTop: space.l },
  road: { flexDirection: 'row', gap: space.s, marginTop: space.l },
  roadCell: { flex: 1, alignItems: 'center', paddingVertical: space.m, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  roadNum: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text, fontVariant: ['tabular-nums'] },
  h2h: { flexDirection: 'row', alignItems: 'center', padding: space.l, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  h2hSide: { flex: 1, alignItems: 'center' },
  h2hNum: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text, fontVariant: ['tabular-nums'] },
  h2hDash: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.textFaint },
  duels: { marginTop: space.s, paddingHorizontal: space.m, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  duel: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.s + 2 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  result: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultText: { fontFamily: fonts.display, fontSize: 12, lineHeight: 15, color: colors.ink },
  duelGame: { flex: 1, fontFamily: fonts.semi, fontSize: 14, lineHeight: 18, color: colors.text },
  confirm: { padding: space.l, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
});
