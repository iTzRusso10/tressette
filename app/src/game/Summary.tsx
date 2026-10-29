import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ARENAS, arenaProgress } from '@/meta/arenas';
import { useProfile } from '@/meta/profile';
import { leagueOf, leagueProgress, RATING } from '@/meta/rating';
import { startSearch } from '@/online/search';
import { CoinIcon } from '@/ui/meta';
import { LeagueCoin } from '@/ui/competition';
import { Bar } from '@/ui/progression';
import { TrophyIcon } from '@/ui/icons';
import { dur } from '@/ui/motion';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { fmtThirds, GAMES, isScopaRow, isTressetteRow, teamOf, type BriscolaRow, type HandRow, type Match } from '@/engine';
import { askRematch, leaveRoom, useOnline } from '@/online/session';
import { currentQueue, hostName, netRole, nextHand, quitMatch, rematch, teamLabel } from '@/state/table';
import { Button } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { Confetti } from './Confetti';
import { Sheet } from './Sheet';
import { teamColor, teamName } from './TopBar';

function details(m: Match, r: HandRow): string[] {
  if (isScopaRow(r))
    return [
      `Scope ${r.scope}`,
      `Carte ${r.cards}${r.pCards ? ' ✓' : ''}`,
      `Denari ${r.den}${r.pDen ? ' ✓' : ''}`,
      `Settebello ${r.sb ? '✓' : '–'}`,
      `Primiera ${r.prim}${r.pPrim ? ' ✓' : ''}`,
    ];
  if (isTressetteRow(r)) {
    const out = [`Carte ${fmtThirds(r.cardsT)}`, `Ultima ${r.ult ? '+1' : '–'}`];
    if (m.accusi) out.push(`Accusi ${r.acc ? '+' + r.acc : '–'}`);
    out.push(`Prese ${r.tricks}`);
    return out;
  }
  const b = r as BriscolaRow;
  return [`Punti ${b.pts}`, `Prese ${b.tricks}`];
}

/** Trophies won or lost with the match (partita veloce), and how far the next arena is. */
function TrophyLine() {
  const last = useProfile(s => s.lastMatch);
  const arenaIdx = useProfile(s => s.meta.arena);
  if (!last) return null;
  const arena = ARENAS[arenaIdx];
  const { have, need } = arenaProgress(last.cups, arenaIdx);
  const d = last.delta;
  return (
    <Animated.View entering={FadeIn.delay(300).duration(dur.enter)} style={styles.cups}>
      <TrophyIcon size={34} muted={d < 0} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cupsDelta, d < 0 && { color: colors.coral }]}>
          {d > 0 ? `+${d} ${d === 1 ? 'trofeo' : 'trofei'}` : d < 0 ? `${d} ${d === -1 ? 'trofeo' : 'trofei'}` : 'Trofei invariati'}
        </Text>
        <Text v="small" numberOfLines={1}>
          {arena.name}, {Math.min(have, need)} su {need}
        </Text>
        <Bar have={have} need={need} height={6} style={{ marginTop: 4 }} />
      </View>
    </Animated.View>
  );
}

/** La classificata: quanto si è mosso il punteggio del gioco, la lega e quanto manca alla prossima. */
function RatingLine() {
  const last = useProfile(s => s.lastMatch);
  const g = useProfile(s => (last?.game ? s.meta.ratings[last.game] : null));
  if (!last?.game || last.rating === undefined || !g) return null;
  const d = last.ratingDelta ?? 0;
  const placedNow = g.n >= RATING.placement;
  const league = leagueOf(last.rating);
  const prog = leagueProgress(last.rating);
  return (
    <Animated.View entering={FadeIn.delay(300).duration(dur.enter)} style={[styles.cups, styles.league]}>
      <LeagueCoin league={league} size={34} dim={!placedNow} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cupsDelta, { color: colors.text }, d < 0 && { color: colors.coral }]}>
          {d > 0 ? `+${d} punti` : d < 0 ? `−${-d} punti` : 'Punteggio invariato'}
        </Text>
        <Text v="small" numberOfLines={1}>
          {placedNow ? `${league.name}, ${last.rating.toLocaleString('it-IT')} punti` : `Calibrazione: ${g.n} su ${RATING.placement} partite`}
        </Text>
        {placedNow && prog ? <Bar have={prog[0]} need={prog[1]} height={6} color={league.colors[1]} style={{ marginTop: 4 }} /> : null}
      </View>
    </Animated.View>
  );
}

/** Contro il computer e tra amici: monete ed esperienza (niente trofei né lega). */
function RewardLine() {
  const last = useProfile(s => s.lastMatch);
  if (!last) return null;
  return (
    <Animated.View entering={FadeIn.delay(300).duration(dur.enter)} style={[styles.cups, styles.reward]}>
      <CoinIcon size={34} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cupsDelta, { color: colors.text }]}>
          +{last.coins ?? 0} monete · +{last.xp ?? 0} esperienza
        </Text>
        <Text v="small" numberOfLines={2}>
          {last.queue === 'friends'
            ? 'Tra amici non si vincono trofei né punti della lega.'
            : 'Trofei e lega si vincono online, nella partita veloce e in classificata.'}
        </Text>
      </View>
    </Animated.View>
  );
}

function MatchReward() {
  const q = useProfile(s => s.lastMatch?.queue);
  return q === 'quick' ? <TrophyLine /> : q === 'ranked' ? <RatingLine /> : <RewardLine />;
}

export function Summary({ m, viewer }: { m: Match; viewer: number }) {
  const { width, height } = useWindowDimensions();
  const asked = useOnline(s => s.asked);
  const asks = useOnline(s => s.rematchAsks);
  const h = m.h!;
  const res = h.result!;
  const { rows, out } = res;
  const perdere = m.mode === 'perdere';
  const four = m.mode === '4';
  const meWin = !!out && out.winners.includes(teamOf(m, viewer));
  // Partita veloce e classificata: niente rivincita, si cerca una partita nuova.
  const q = currentQueue();
  const mm = q === 'quick' || q === 'ranked' ? q : null;
  let title = `Fine della mano ${m.handNo}`;
  let sub = perdere
    ? `Si perde a ${m.target}.`
    : m.game === 'briscola'
      ? `Vince chi arriva a ${m.target} ${m.target === 1 ? 'partita' : 'partite'}.`
      : `Si vince a ${m.target}.`;
  if (m.game === 'briscola' && !out) {
    const w = (rows as BriscolaRow[]).find(r => r.total);
    const mine = w && w.t === teamOf(m, viewer);
    const who = mine ? (four ? 'Avete vinto' : 'Hai vinto') : w ? `${teamLabel(m, w.t)} ${four ? 'vincono' : 'vince'}` : '';
    sub = w ? `${who} la mano con ${w.pts} punti.` : 'Pareggio: 60 a 60.';
  }
  if (out) {
    const wl = out.winners.map(t => teamLabel(m, t)).join(' e ');
    title = meWin ? (four ? 'Avete vinto!' : 'Hai vinto!') : perdere ? `Vince ${wl}` : four ? 'Hanno vinto loro' : `Vince ${wl}`;
    if (out.cappotto) {
      title = meWin ? 'Cappotto! Hai vinto' : `Cappotto di ${wl}`;
      sub = `${meWin ? 'Hai' : wl + ' ha'} preso tutti i punti della mano: partita vinta.`;
    } else if (perdere) sub = `${out.losers.map(t => teamLabel(m, t)).join(' e ')} è arrivato a ${m.target}.`;
    else sub = `${m.match.join(' a ')} dopo ${m.handNo} ${m.handNo === 1 ? 'mano' : 'mani'}.`;
  }
  const order = rows.slice().sort((a, b) => (perdere ? m.match[a.t] - m.match[b.t] : a.t === teamOf(m, viewer) ? -1 : b.t === teamOf(m, viewer) ? 1 : 0));
  const mx = Math.max(...m.match);
  const mn = Math.min(...m.match);

  return (
    <>
      <Sheet title={title} sub={sub}>
        {order.map(r => {
          const total = m.match[r.t];
          const top = perdere ? total === mn : total === mx && mx > 0;
          const gain = m.game === 'briscola' ? (r.total ? 'mano vinta' : '') : '+' + r.total;
          return (
            <View key={r.t} style={[styles.row, top && styles.rowTop]}>
              <View style={styles.rowHead}>
                <View style={[styles.swatch, { backgroundColor: teamColor(m, r.t, viewer) }]} />
                <Text numberOfLines={1} style={styles.rowName}>
                  {four ? `${teamName(m, r.t, viewer)}, ${teamLabel(m, r.t)}` : teamName(m, r.t, viewer)}
                </Text>
                <Text style={styles.gain}>{gain}</Text>
                <Text style={styles.total}>
                  {total}
                  <Text style={styles.of}>/{m.target}</Text>
                </Text>
              </View>
              <Text v="small" style={styles.details}>
                {details(m, r).join('   ')}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, (total / m.target) * 100)}%`, backgroundColor: teamColor(m, r.t, viewer) }]} />
              </View>
            </View>
          );
        })}
        {h.accusi.length ? (
          <Text v="small" style={{ marginTop: space.s }}>
            Accusi: {h.accusi.map(a => `${m.seats[a.p].name}, ${a.label.toLowerCase()} (+${a.pts})`).join('; ')}
          </Text>
        ) : null}
        {out ? <MatchReward /> : null}
        <View style={{ marginTop: space.xl, gap: space.s }}>
          {out && mm ? (
            <>
              <Button
                label="Nuova partita"
                sub={`${mm === 'quick' ? 'Partita veloce' : 'Classificata'}, ${GAMES[m.game].name}`}
                onPress={() => {
                  quitMatch();
                  void leaveRoom();
                  void startSearch({ kind: mm, game: m.game, mode: m.mode, perdN: m.n === 2 ? 2 : 4 });
                  router.replace('/cerca');
                }}
              />
              <Button
                kind="secondary"
                label="Torna alla home"
                onPress={() => {
                  quitMatch();
                  void leaveRoom();
                  router.replace('/');
                }}
              />
            </>
          ) : netRole() === 'guest' ? (
            <>
              <Text v="lead" style={{ textAlign: 'center' }}>
                {out ? (asked ? `Hai chiesto la rivincita: decide ${hostName()}.` : `Aspetta che ${hostName()} faccia ripartire la partita.`) : `Aspetta che ${hostName()} distribuisca la prossima mano.`}
              </Text>
              {out && !asked ? <Button kind="secondary" label="Chiedi la rivincita" onPress={askRematch} /> : null}
            </>
          ) : out ? (
            <>
              {asks.length ? (
                <Text v="lead" style={{ textAlign: 'center', color: colors.sun }}>
                  {asks.join(' e ')} {asks.length === 1 ? 'chiede' : 'chiedono'} la rivincita
                </Text>
              ) : null}
              <Button label="Rivincita" onPress={rematch} />
              <Button
                kind="secondary"
                label="Cambia gioco"
                onPress={() => {
                  quitMatch();
                  leaveRoom();
                  router.replace('/');
                }}
              />
            </>
          ) : (
            <Button label="Prossima mano" sub={`${GAMES[m.game].name}, mano ${m.handNo + 1}`} onPress={nextHand} />
          )}
        </View>
      </Sheet>
      {out && meWin ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 2100 }]}>
          <Confetti x={width / 2} y={height * 0.42} count={70} spread={1.2} duration={2400} seed={m.handNo} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: space.m,
    paddingHorizontal: space.l,
    borderRadius: radius.l,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLineSoft,
    marginBottom: space.s,
  },
  rowTop: { borderColor: 'rgba(255,255,255,0.55)', backgroundColor: colors.glassStrong },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  rowName: { flex: 1, fontFamily: fonts.bold, fontSize: 15.5, lineHeight: 20, color: colors.text },
  gain: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 18, color: colors.sun },
  total: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text, minWidth: 66, textAlign: 'right', fontVariant: ['tabular-nums'] },
  of: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textFaint },
  details: { marginTop: space.xs, color: colors.textSoft },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: space.s, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  cups: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    marginTop: space.m,
    padding: space.m,
    paddingHorizontal: space.l,
    borderRadius: radius.l,
    backgroundColor: 'rgba(255,224,102,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,224,102,0.45)',
  },
  league: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.glassLine },
  reward: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.glassLineSoft },
  cupsDelta: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.sun },
});
