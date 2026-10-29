// La ricerca di una partita veloce o classificata: i posti del tavolo che si riempiono, il tempo che
// passa, e il via. Se in 20 secondi non si trova nessuno, nella partita veloce il posto lo prende un
// computer (dichiarato, trofei dimezzati); nella classificata si continua ad aspettare una persona.
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { GAMES, MODE_INFO } from '@/engine';
import { BALANCE } from '@/meta/balance';
import { useProfile } from '@/meta/profile';
import type { MmMatch, MmRequest } from '@/online/matchmaking';
import { cancelSearch, searchSeats, startSearch, useSearch } from '@/online/search';
import { PlayerAvatar } from '@/ui/avatar';
import { Icon } from '@/ui/icons';
import { BackButton, Button, Screen } from '@/ui/kit';
import { dur } from '@/ui/motion';
import { SignInPanel } from '@/ui/SignIn';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, seatColors, space } from '@/ui/theme';

const SEAT = 76;

/** Il punto che sale e scende: tre in fila dicono «sto cercando» (l'unica animazione che non si ferma). */
function Dot({ t, i }: { t: SharedValue<number>; i: number }) {
  const st = useAnimatedStyle(() => {
    const ph = (t.value * 3 - i + 3) % 3;
    const k = ph < 1 ? Math.sin(Math.PI * ph) : 0;
    return { opacity: 0.35 + 0.65 * k, transform: [{ translateY: -3 * k }] };
  });
  return <Animated.View style={[styles.dot, st]} />;
}

function Dots() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 1050, easing: Easing.linear }), -1);
    return () => cancelAnimation(t);
  }, [t, reduce]);
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map(i => (
        <Dot key={i} t={t} i={i} />
      ))}
    </View>
  );
}

/** Un posto al tavolo: tu, una persona trovata, il computer, o ancora vuoto. */
function SeatView({ i, req, match, me }: { i: number; req: MmRequest; match: MmMatch | null; me: string }) {
  const account = useProfile(s => s.account);
  const avatar = useProfile(s => s.meta.avatar);
  const frame = useProfile(s => s.equipped.frame);
  const color = seatColors[i % seatColors.length];
  const four = req.mode === '4';
  const partner = four && i === 2;
  let body: ReactNode;
  let name: string;
  if (i === 0) {
    name = 'Tu';
    body = <PlayerAvatar avatar={avatar} photo={account?.avatar} name={account?.name ?? 'Tu'} frame={frame} size={SEAT} />;
  } else if (match) {
    // I posti sono contati da te: chi è al posto (tuo + i) del tavolo.
    const mine = match.players.find(p => p.id === me)?.seat ?? 0;
    const p = match.players.find(x => x.seat === (mine + i) % match.seats);
    name = p ? p.name : 'Computer';
    body = p ? (
      <View style={[styles.empty, styles.filled, { borderColor: color }]}>
        <Text style={[styles.initial, { color }]}>{p.name.slice(0, 1).toUpperCase()}</Text>
      </View>
    ) : (
      <View style={[styles.empty, styles.filled, { borderColor: colors.glassLine }]}>
        <Icon name="play" size={28} color={colors.textSoft} />
      </View>
    );
  } else {
    name = partner ? 'Compagno' : 'Avversario';
    body = (
      <View style={styles.empty}>
        <Dots />
      </View>
    );
  }
  return (
    <View style={styles.seat} accessible accessibilityLabel={i === 0 ? 'Tu' : match ? name : `${name}: ancora da trovare`}>
      {body}
      <Text style={styles.seatName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.seatRole} numberOfLines={1}>
        {i === 0 ? ' ' : !match ? 'da trovare' : four ? (partner ? 'compagno' : 'avversario') : 'avversario'}
      </Text>
    </View>
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Cerca() {
  const { phase, req, match, me, error, since } = useSearch();
  const account = useProfile(s => s.account);
  const [now, setNow] = useState(() => Date.now());

  // Il tempo che passa, una volta al secondo.
  useEffect(() => {
    if (phase !== 'searching') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Al tavolo appena è pronto.
  useEffect(() => {
    if (phase === 'ready') router.replace('/tavolo');
  }, [phase]);

  // Dopo l'accesso si riparte da soli.
  useEffect(() => {
    if (phase === 'login' && account && req) void startSearch(req);
  }, [phase, account, req]);

  // Uscendo da qui (indietro) si esce anche dalla coda.
  useEffect(
    () => () => {
      if (useSearch.getState().phase !== 'ready') void cancelSearch();
    },
    [],
  );

  const leave = () => {
    void cancelSearch();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!req)
    return (
      <Screen>
        <View style={styles.top}>
          <BackButton onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );

  const n = searchSeats(req);
  const quick = req.kind === 'quick';
  const waited = phase === 'searching' ? Math.max(0, (now - since) / 1000) : 0;
  const cpuAfter = BALANCE.matchmaking.cpuAfterSeconds;
  const people = match?.players.length ?? 0;
  const title =
    phase === 'found' || phase === 'ready'
      ? people > 1
        ? 'Avversari trovati'
        : 'Giochi con il computer'
      : phase === 'login'
        ? 'Serve l’accesso'
        : phase === 'locked'
          ? 'Classificata chiusa'
          : phase === 'offline'
            ? 'Online non attivo'
            : phase === 'error'
              ? 'Qualcosa non va'
              : 'Cerco avversari';
  const hint =
    phase === 'found' || phase === 'ready'
      ? people > 1
        ? 'Ci si siede al tavolo…'
        : `Nessuno era libero: i posti li prende un computer. Vinci ${BALANCE.trophies.quickCpu.win} trofei, ne perdi ${BALANCE.trophies.quickCpu.loss}.`
      : phase === 'searching'
        ? quick
          ? waited < cpuAfter
            ? `Cerco giocatori della tua arena. Se tra ${Math.ceil(cpuAfter - waited)} secondi non c’è nessuno, giochi con un computer.`
            : 'Ancora un attimo…'
          : 'Cerco chi ha un punteggio vicino al tuo. Più aspetti, più si allarga la ricerca.'
        : phase === 'locked'
          ? `La classificata si apre al livello ${BALANCE.matchmaking.rankedLevel}. Intanto gioca la partita veloce.`
          : phase === 'offline'
            ? 'Il matchmaking ha bisogno del server. Intanto puoi giocare contro il computer.'
            : (error ?? '');

  return (
    <Screen>
      <View style={styles.top}>
        <BackButton label={phase === 'searching' ? 'Annulla la ricerca' : 'Indietro'} onPress={leave} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>
          {quick ? 'Partita veloce' : 'Classificata'} · {GAMES[req.game].name} {MODE_INFO[req.game][req.mode]![0].toLowerCase()}
        </Text>
        <Text v="h1" accessibilityRole="header" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
          {title}
        </Text>
        <Text style={[styles.clock, phase !== 'searching' && { opacity: 0 }]} accessibilityElementsHidden={phase !== 'searching'}>
          {clock(waited)}
        </Text>

        {phase === 'searching' || phase === 'found' || phase === 'ready' ? (
          <View style={styles.table}>
            {/* In quattro a coppie prima il compagno (il posto di fronte), poi gli avversari. */}
            {(n === 4 && req.mode === '4' ? [0, 2, 1, 3] : Array.from({ length: n }, (_, i) => i)).map(i => (
              <SeatView key={i} i={i} req={req} match={match} me={me} />
            ))}
          </View>
        ) : null}

        {hint ? (
          <Animated.View key={hint.slice(0, 12)} entering={FadeIn.duration(dur.enter)} style={styles.hintBox}>
            <Text v="body" style={styles.hint}>
              {hint}
            </Text>
          </Animated.View>
        ) : null}

        {phase === 'login' ? (
          <View style={{ marginTop: space.xl }}>
            <SignInPanel
              title="Gioca con il tuo account"
              body="Trofei, lega e classifiche sono legati al tuo account: così nessuno li può inventare e li ritrovi su ogni telefono."
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          {phase === 'searching' ? <Button kind="secondary" label="Annulla" onPress={leave} /> : null}
          {phase === 'error' ? <Button label="Cerca di nuovo" onPress={() => void startSearch(req)} /> : null}
          {phase === 'locked' ? <Button label="Partita veloce" onPress={() => void startSearch({ ...req, kind: 'quick' })} /> : null}
          {phase === 'offline' ? (
            <Button label="Gioca contro il computer" onPress={() => router.replace({ pathname: '/gioca/[game]', params: { game: req.game } })} />
          ) : null}
          {phase === 'error' || phase === 'locked' || phase === 'offline' || phase === 'login' ? (
            <Button kind="quiet" label="Torna alla home" onPress={leave} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, justifyContent: 'center', paddingHorizontal: space.l },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.xl, paddingBottom: space.xxl, alignItems: 'stretch' },
  kicker: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    color: colors.sun,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: space.s,
  },
  clock: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 48,
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginTop: space.s,
  },
  table: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: space.l, marginTop: space.xl },
  seat: { width: SEAT + 10, alignItems: 'center' },
  empty: {
    width: SEAT,
    height: SEAT,
    borderRadius: SEAT / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.glassLine,
    backgroundColor: 'rgba(40,12,74,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { borderStyle: 'solid', backgroundColor: colors.panel },
  initial: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  seatName: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.text, marginTop: space.s, textAlign: 'center' },
  seatRole: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.textFaint, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', height: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text },
  hintBox: {
    marginTop: space.xl,
    minHeight: 72,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
    justifyContent: 'center',
  },
  hint: { textAlign: 'center', color: colors.textSoft },
  actions: { marginTop: space.xl, gap: space.s },
});
