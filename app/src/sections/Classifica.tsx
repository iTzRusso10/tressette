// Classifiche: i trofei di sempre (la progressione permanente), e per ogni gioco il punteggio di
// bravura della stagione e la prestazione della settimana. Del mondo, degli amici o dei vicini di
// posizione. In fondo alla stagione, il percorso con i premi.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { GameId } from '@/engine';
import { ARENAS, arenaByTrophies } from '@/meta/arenas';
import { dayOf } from '@/meta/economy';
import { loadGameBoard, loadLeaderboard, mySeasonHistory, type GamePeriod, type GameRankRow, type GameScope, type RankRow, type SeasonResult } from '@/meta/leaderboard';
import { daysToWeekEnd, weekOf } from '@/meta/missions';
import { useProfile } from '@/meta/profile';
import { LEAGUES, leagueOf, leagueProgress, performance, RATING } from '@/meta/rating';
import { seasonAt } from '@/meta/seasons';
import { useSettings } from '@/state/settings';
import { ArenaScene } from '@/ui/ArenaScene';
import { PlayerAvatar } from '@/ui/avatar';
import { GAME_LABEL, GAMES, LeagueCoin } from '@/ui/competition';
import { Icon, TrophyIcon } from '@/ui/icons';
import { Button, Choice, Squish } from '@/ui/kit';
import { LevelAvatar } from '@/ui/meta';
import { dur } from '@/ui/motion';
import { Bar } from '@/ui/progression';
import { SignInPanel } from '@/ui/SignIn';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { FilterChips, Panel, SectionScroll, SectionTitle } from './parts';
import { SeasonCard } from './Season';

type Board = 'trofei' | GamePeriod;
type Scope = GameScope;

/** Oro, argento e bronzo per i primi tre. */
const PODIUM = ['#FFC93D', '#D5DCE8', '#E39A5B'];
const n = (x: number) => x.toLocaleString('it-IT');

function Rank({ n: k }: { n: number }) {
  const top = k <= 3;
  return (
    <View style={[styles.rank, top && { backgroundColor: PODIUM[k - 1] }]}>
      <Text style={[styles.rankText, top && { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {k}
      </Text>
    </View>
  );
}

const openPlayer = (id: string, isMe: boolean) => (isMe ? router.push('/profilo') : router.push({ pathname: '/giocatore/[id]', params: { id } }));

function TrophyRow({ r }: { r: RankRow }) {
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${r.rank}°, ${r.name}, ${r.cups} trofei`} onPress={() => openPlayer(r.id, r.isMe)} scaleTo={0.98}>
      <View style={[styles.row, r.isMe && styles.rowMe]}>
        <Rank n={r.rank} />
        {r.avatar ? <Image source={{ uri: r.avatar }} style={styles.photo} /> : <LevelAvatar name={r.name} xp={r.xp} size={40} />}
        <View style={{ flex: 1 }}>
          <Text v="label" numberOfLines={1}>
            {r.isMe ? `${r.name} (tu)` : r.name}
          </Text>
          <Text v="small" numberOfLines={1}>
            {arenaByTrophies(r.cups).name}
          </Text>
        </View>
        <View style={styles.score}>
          <TrophyIcon size={18} />
          <Text style={styles.scoreText}>{n(r.cups)}</Text>
        </View>
      </View>
    </Squish>
  );
}

function GameRow({ r, period }: { r: GameRankRow; period: GamePeriod }) {
  const pub = r.pub as { avatar?: string; frame?: string };
  const league = leagueOf(r.score);
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${r.rank}°, ${r.name}, ${r.score} punti`} onPress={() => openPlayer(r.id, r.isMe)} scaleTo={0.98}>
      <View style={[styles.row, r.isMe && styles.rowMe]}>
        <Rank n={r.rank} />
        <PlayerAvatar avatar={pub.avatar} photo={r.photo} name={r.name} frame={pub.frame} size={42} />
        <View style={{ flex: 1 }}>
          <Text v="label" numberOfLines={1}>
            {r.isMe ? `${r.name} (tu)` : r.name}
          </Text>
          <Text v="small" numberOfLines={1}>
            {period === 'stagione' ? `${league.name} · ${r.games} partite` : `${r.games} partite questa settimana`}
          </Text>
        </View>
        <View style={styles.score}>
          {period === 'stagione' ? <LeagueCoin league={league} size={22} /> : <Icon name="chart" size={18} color={colors.sun} />}
          <Text style={styles.scoreText}>{n(r.score)}</Text>
        </View>
      </View>
    </Squish>
  );
}

/** La tua posizione nei trofei: l'arena dietro, i trofei davanti. Anche senza account. */
function MeTrophies({ rank }: { rank: number | null }) {
  const cups = useProfile(s => s.cups);
  const account = useProfile(s => s.account);
  const name = useSettings(s => s.name.trim());
  const arena = ARENAS[useProfile(s => s.meta.arena)];
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
          <Text style={styles.meCupsText}>{n(cups)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Il tuo punteggio in un gioco: lega, avanzamento, posizione. Calcolato sul telefono, la posizione dal server. */
function MeGame({ game, period, rank }: { game: GameId; period: GamePeriod; rank: { rank: number; total: number } | null }) {
  const g = useProfile(s => s.meta.ratings[game]);
  const stored = useProfile(s => s.meta.weekly[game]);
  const day = dayOf(new Date());
  // La settimana nuova comincia da zero anche prima della prossima partita.
  const weekly = stored.week === weekOf(day) ? stored : { week: weekOf(day), n: 0, opp: 0, w: 0, l: 0 };
  const placedNow = g.n >= RATING.placement;
  const league = leagueOf(g.r);
  const next = LEAGUES[LEAGUES.indexOf(league) + 1];
  const prog = leagueProgress(g.r);
  const perf = performance(weekly);
  const left = daysToWeekEnd(day);
  const kicker = rank && rank.rank ? `${rank.rank}° su ${n(rank.total)}` : period === 'stagione' ? (placedNow ? 'La tua lega' : 'In calibrazione') : 'La tua settimana';
  return (
    <View style={[styles.meGame, { borderColor: period === 'stagione' && placedNow ? league.colors[1] : colors.panelLine }]}>
      {period === 'stagione' ? (
        <>
          <LeagueCoin league={league} size={58} dim={!placedNow} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.meKicker}>{kicker}</Text>
            <Text style={styles.meTitle} numberOfLines={1}>
              {placedNow ? league.name : `${g.n} su ${RATING.placement} partite`}
            </Text>
            <Text v="small" numberOfLines={2}>
              {placedNow
                ? `${GAME_LABEL[game]} · ${n(g.r)} punti · record ${n(g.peak)}`
                : `Ancora ${RATING.placement - g.n} ${RATING.placement - g.n === 1 ? 'partita' : 'partite'} di ${GAME_LABEL[game]} per entrare in classifica.`}
            </Text>
            {placedNow && prog && next ? (
              <View style={{ marginTop: 4, gap: 3 }}>
                <Bar have={prog[0]} need={prog[1]} height={5} color={league.colors[2]} />
                <Text style={styles.meNote}>
                  {n(next.min - g.r)} punti alla {next.name}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <View style={styles.weekIcon}>
            <Icon name="chart" size={28} color={colors.sun} stroke={2.2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.meKicker}>{kicker}</Text>
            <Text style={styles.meTitle} numberOfLines={1}>
              {perf !== null ? `${n(perf)} punti` : `${weekly.n} su ${RATING.weeklyMin} partite`}
            </Text>
            <Text v="small" numberOfLines={2}>
              {perf !== null
                ? `${weekly.w} vinte e ${weekly.l} perse a ${GAME_LABEL[game]} · si chiude tra ${left} ${left === 1 ? 'giorno' : 'giorni'}`
                : `Gioca ${RATING.weeklyMin - weekly.n} ${RATING.weeklyMin - weekly.n === 1 ? 'partita' : 'partite'} di ${GAME_LABEL[game]} questa settimana per entrare.`}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function History({ game, list }: { game: GameId; list: SeasonResult[] }) {
  const mine = list.filter(r => r.game === game);
  if (!mine.length) return null;
  return (
    <View style={{ marginTop: space.xl }}>
      <Text style={styles.head}>Le tue stagioni a {GAME_LABEL[game]}</Text>
      <Panel style={{ paddingVertical: space.s }}>
        {mine.map((r, i) => (
          <View key={r.season} style={[styles.hist, i > 0 && styles.divider]}>
            <LeagueCoin league={leagueOf(r.rating)} size={28} />
            <View style={{ flex: 1 }}>
              <Text v="label" numberOfLines={1}>
                {r.name}
              </Text>
              <Text v="small">
                {leagueOf(r.rating).name} · {n(r.rating)} punti
              </Text>
            </View>
            <Text style={styles.histRank}>
              {r.rank}°<Text style={styles.histOf}> su {n(r.players)}</Text>
            </Text>
          </View>
        ))}
      </Panel>
    </View>
  );
}

const EXPLAIN: Record<GamePeriod, string> = {
  stagione:
    'Il punteggio sale battendo chi è più forte di te e scende perdendo con chi è più debole: giocare tanto non basta. Si entra dopo dieci partite; a fine stagione la lega ti dà monete e la sua cornice.',
  settimana:
    'La prestazione della settimana: la forza media degli avversari e il saldo tra vittorie e sconfitte, da cinque partite in su. I primi tre di ogni gioco vincono monete e la cornice del podio.',
};

type Loaded =
  | { key: string; kind: 'trofei'; rows: RankRow[]; me: RankRow | null }
  | { key: string; kind: 'gioco'; rows: GameRankRow[]; me: { rank: number; total: number } | null }
  | { key: string; error: true };

export function Classifica({ active }: { active: boolean }) {
  const account = useProfile(s => s.account);
  const lastGame = useSettings(s => s.lastGame);
  const [board, setBoard] = useState<Board>('stagione');
  const [game, setGame] = useState<GameId>(lastGame);
  const [scope, setScope] = useState<Scope>('mondo');
  const [history, setHistory] = useState<SeasonResult[]>([]);
  const effScope: Scope = board === 'trofei' && scope === 'vicini' ? 'mondo' : scope;
  const key = board === 'trofei' ? `trofei:${effScope}` : `${board}:${game}:${effScope}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!active || !account) return;
    let live = true;
    const job: Promise<Loaded> =
      board === 'trofei'
        ? loadLeaderboard(effScope === 'amici' ? 'amici' : 'mondo').then(d => ({ key, kind: 'trofei' as const, ...d }))
        : loadGameBoard(game, board, effScope).then(d => ({ key, kind: 'gioco' as const, rows: d.rows, me: d.me }));
    job.then(d => live && setLoaded(d)).catch(() => live && setLoaded({ key, error: true }));
    return () => {
      live = false;
    };
  }, [active, account, board, game, effScope, key, version]);

  useEffect(() => {
    if (!active || !account) return;
    let live = true;
    mySeasonHistory()
      .then(h => live && setHistory(h))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [active, account]);

  // Mentre si carica un'altra lista, la vecchia non resta sullo schermo.
  const current = loaded && loaded.key === key ? loaded : null;
  const error = !!current && 'error' in current;
  const data = current && !('error' in current) ? current : null;
  const season = seasonAt(dayOf(new Date()));

  const emptyText =
    board === 'trofei'
      ? effScope === 'amici'
        ? 'Aggiungi degli amici nella sezione Amici per sfidarli in classifica.'
        : 'Ancora nessuno in classifica: vinci una partita e sei il primo.'
      : effScope === 'amici'
        ? 'Nessun amico in questa classifica. Aggiungine nella sezione Amici.'
        : board === 'settimana'
          ? `Questa settimana nessuno ha ancora giocato ${RATING.weeklyMin} partite di ${GAME_LABEL[game]}.`
          : `Nessuno ha ancora finito la calibrazione a ${GAME_LABEL[game]}: servono ${RATING.placement} partite.`;

  return (
    <SectionScroll>
      <SectionTitle title="Classifica" sub={season ? `${season.season.name}: la bravura per gioco, la settimana e i trofei di sempre.` : 'La bravura per gioco, la settimana e i trofei di sempre.'} />
      <Choice<Board>
        label="Quale classifica"
        value={board}
        onChange={setBoard}
        options={[
          { value: 'stagione', label: 'Stagione' },
          { value: 'settimana', label: 'Settimana' },
          { value: 'trofei', label: 'Trofei' },
        ]}
      />
      {board !== 'trofei' ? (
        <View style={{ marginTop: space.m }}>
          <FilterChips<GameId> label="Gioco" value={game} onChange={setGame} options={GAMES.map(g => ({ value: g, label: GAME_LABEL[g] }))} />
        </View>
      ) : null}
      <View style={{ marginTop: space.m }}>
        {board === 'trofei' ? <MeTrophies rank={data?.kind === 'trofei' ? (data.me?.rank ?? null) : null} /> : <MeGame game={game} period={board} rank={data?.kind === 'gioco' ? data.me : null} />}
      </View>
      {board !== 'trofei' ? (
        <Text v="small" style={{ marginTop: space.s }}>
          {EXPLAIN[board]}
        </Text>
      ) : null}
      {account ? (
        <>
          <View style={{ marginTop: space.l }}>
            <FilterChips<Scope>
              label="Chi"
              value={effScope}
              onChange={setScope}
              options={[
                { value: 'mondo', label: 'Tutti' },
                { value: 'amici', label: 'Amici' },
                ...(board === 'trofei' ? [] : [{ value: 'vicini' as const, label: 'Vicino a te' }]),
              ]}
            />
          </View>
          <View style={{ marginTop: space.m, gap: space.s }}>
            {error ? (
              <Panel style={styles.empty}>
                <Text v="body" style={{ textAlign: 'center' }}>
                  Non riesco a caricare la classifica. Controlla la connessione.
                </Text>
                <Button kind="secondary" label="Riprova" onPress={reload} style={{ marginTop: space.m, minHeight: 44 }} />
              </Panel>
            ) : data === null ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: space.xl }} />
            ) : data.rows.length === 0 ? (
              <Panel style={styles.empty}>
                <Icon name="podium" size={28} color={colors.textSoft} />
                <Text v="body" style={{ textAlign: 'center', marginTop: space.s }}>
                  {emptyText}
                </Text>
              </Panel>
            ) : data.kind === 'trofei' ? (
              <Animated.View entering={FadeIn.duration(dur.enter)} style={{ gap: space.s }}>
                {data.rows.map(r => (
                  <TrophyRow key={r.id} r={r} />
                ))}
                {data.me && !data.rows.some(r => r.isMe) ? (
                  <>
                    <Text style={styles.dots}>···</Text>
                    <TrophyRow r={data.me} />
                  </>
                ) : null}
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(dur.enter)} style={{ gap: space.s }}>
                {data.rows.map(r => (
                  <GameRow key={r.id} r={r} period={board as GamePeriod} />
                ))}
              </Animated.View>
            )}
          </View>
          {board === 'stagione' ? <History game={game} list={history} /> : null}
        </>
      ) : (
        <View style={{ marginTop: space.l }}>
          <SignInPanel
            title="Entra in classifica"
            body="Con un account il tuo punteggio di ogni gioco, la settimana e i trofei finiscono nelle classifiche di tutti e in quelle dei tuoi amici."
          />
        </View>
      )}
      {board === 'stagione' ? (
        <View style={{ marginTop: space.xl }}>
          <Text style={styles.head}>Il percorso della stagione</Text>
          <SeasonCard />
        </View>
      ) : null}
    </SectionScroll>
  );
}

const styles = StyleSheet.create({
  me: { height: 120, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassLine },
  meIn: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l, gap: space.m },
  meKicker: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, textTransform: 'uppercase', letterSpacing: 0.4 },
  meName: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text, letterSpacing: -0.4, marginTop: 2 },
  meTitle: { fontFamily: fonts.display, fontSize: 20, lineHeight: 25, color: colors.text, letterSpacing: -0.4 },
  meNote: { fontFamily: fonts.semi, fontSize: 11.5, lineHeight: 15, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  meCups: { alignItems: 'center' },
  meCupsText: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.text, fontVariant: ['tabular-nums'] },
  meGame: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, minHeight: 120, borderRadius: radius.xl, backgroundColor: colors.panel, borderWidth: 1.5 },
  weekIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,224,102,0.14)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: colors.panel },
  rowMe: { borderWidth: 1.5, borderColor: colors.sun },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  photo: { width: 40, height: 40, borderRadius: 20 },
  score: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scoreText: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center' },
  dots: { textAlign: 'center', color: colors.textFaint, fontFamily: fonts.bold, fontSize: 16, lineHeight: 18 },
  head: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: space.s },
  hist: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.s },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  histRank: { fontFamily: fonts.display, fontSize: 17, lineHeight: 21, color: colors.text, fontVariant: ['tabular-nums'] },
  histOf: { fontFamily: fonts.semi, fontSize: 12, color: colors.textFaint },
});
