import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { fmtThirds, GAMES, isScopaRow, isTressetteRow, teamOf, type BriscolaRow, type HandRow, type Match } from '@/engine';
import { leaveRoom } from '@/online/session';
import { hostName, netRole, nextHand, quitMatch, rematch, teamLabel } from '@/state/table';
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

export function Summary({ m, viewer }: { m: Match; viewer: number }) {
  const { width, height } = useWindowDimensions();
  const h = m.h!;
  const res = h.result!;
  const { rows, out } = res;
  const perdere = m.mode === 'perdere';
  const four = m.mode === '4';
  const meWin = !!out && out.winners.includes(teamOf(m, viewer));
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
        <View style={{ marginTop: space.xl, gap: space.s }}>
          {netRole() === 'guest' ? (
            <Text v="lead" style={{ textAlign: 'center' }}>
              {out ? `Aspetta che ${hostName()} faccia ripartire la partita.` : `Aspetta che ${hostName()} distribuisca la prossima mano.`}
            </Text>
          ) : out ? (
            <>
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
});
