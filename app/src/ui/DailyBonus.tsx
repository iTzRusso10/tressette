import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import { showRewarded } from '@/meta/ads';
import { BONUS_LADDER, bonusFor, nextStreak } from '@/meta/economy';
import { claimDaily, useProfile } from '@/meta/profile';
import { sfx } from './feedback';
import { Button } from './kit';
import { CoinIcon } from './meta';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

function Day({ i, amount, state, w }: { i: number; amount: number; state: 'done' | 'today' | 'next'; w: number }) {
  // The seventh day is the big prize: twice as wide and golden.
  const big = i === 6;
  const bob = useSharedValue(0);
  useEffect(() => {
    if (state === 'today') bob.value = withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0, { duration: 650 })), -1);
  }, [state, bob]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * bob.value }, { scale: 1 + 0.06 * bob.value }] }));
  return (
    <Animated.View
      entering={ZoomIn.delay(120 + i * 50)
        .springify()
        .damping(13)}
      style={[styles.day, { width: big ? w * 2 + 8 : w }, big && styles.big, state === 'today' && styles.today, state === 'done' && styles.done]}
    >
      <Text style={[styles.dayLabel, (state === 'today' || big) && { color: colors.ink }]}>{big ? 'Dal 7° giorno' : `Giorno ${i + 1}`}</Text>
      <Animated.View style={st}>
        <CoinIcon size={big ? 34 : state === 'today' ? 30 : 24} />
      </Animated.View>
      <Text style={[styles.dayAmount, big && styles.bigAmount, (state === 'today' || big) && { color: colors.ink }]}>{amount}</Text>
      {state === 'done' ? (
        <View style={styles.check}>
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M2.5 6.2l2.2 2.2 4.8-5" stroke={colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      ) : null}
    </Animated.View>
  );
}

function FlyingCoin({ t, x0, y0, dx, dy, delay }: { t: SharedValue<number>; x0: number; y0: number; dx: number; dy: number; delay: number }) {
  const st = useAnimatedStyle(() => {
    const k = Math.min(1, Math.max(0, (t.value - delay) / (1 - delay)));
    const arc = Math.sin(Math.PI * k) * 60;
    return {
      opacity: k <= 0 || k >= 1 ? 0 : 1,
      transform: [{ translateX: x0 + dx * k }, { translateY: y0 + dy * k - arc }, { scale: 1 - 0.4 * k }],
    };
  });
  return (
    <Animated.View style={[styles.flying, st]}>
      <CoinIcon size={26} />
    </Animated.View>
  );
}

/** The daily bonus: seven days in a row, today in the middle of the stage, a video to double it. */
export function DailyBonus({ onClose }: { onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const bonus = useProfile(s => s.bonus);
  const now = useMemo(() => new Date(), []);
  const streak = nextStreak(bonus, now);
  const amount = bonusFor(streak);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const t = useSharedValue(0);
  const coins = useMemo(() => {
    const r = seeded(streak * 31 + 7);
    return Array.from({ length: 14 }, (_, i) => ({ dx: width - 90 - width / 2 + (r() - 0.5) * 40, dy: -height * 0.42 + (r() - 0.5) * 30, delay: i * 0.035 }));
  }, [streak, width, height]);

  const claim = async (double: boolean) => {
    if (busy) return;
    setBusy(true);
    if (double && !(await showRewarded())) {
      setBusy(false);
      return;
    }
    const got = claimDaily(double, now);
    setDone(got);
    sfx('win', { haptic: true });
    t.value = withDelay(150, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }));
    setTimeout(onClose, 1500);
  };

  const day = Math.min(streak, 7);
  const panelW = Math.min(width - 32, 420);
  // Four days on the first row, three on the second (the last one double).
  const tileW = Math.floor((panelW - 44 - 2 - 3 * 8) / 4);
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, styles.dim]} />
      <Animated.View entering={ZoomIn.springify().damping(15)} exiting={FadeOut.duration(180)} style={[styles.panel, { width: panelW }]}>
        <LinearGradient
          colors={['#7A2E9C', '#4A1C80', colors.night]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
        />
        <Text style={styles.title}>Bonus del giorno</Text>
        <Text style={styles.sub}>{streak > 1 ? `${streak} giorni di fila: continua così!` : 'Torna ogni giorno: il premio cresce.'}</Text>
        <View style={styles.grid}>
          {BONUS_LADDER.map((a, i) => (
            <Day key={i} i={i} w={tileW} amount={a} state={i + 1 < day ? 'done' : i + 1 === day ? 'today' : 'next'} />
          ))}
        </View>
        {done === null ? (
          <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 18 }}>
            <Button label={`Raddoppia: ${amount * 2} monete`} sub="Guarda un breve video" onPress={() => claim(true)} disabled={busy} />
            <Button kind="secondary" label={`Ritira ${amount}`} onPress={() => claim(false)} disabled={busy} />
          </View>
        ) : (
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.gotRow}>
            <CoinIcon size={34} />
            <Text style={styles.got}>+{done}</Text>
          </Animated.View>
        )}
      </Animated.View>
      {coins.map((c, i) => (
        <FlyingCoin key={i} t={t} x0={width / 2 - 13} y0={height * 0.5} dx={c.dx} dy={c.dy} delay={c.delay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 4000, alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(20,4,40,0.62)' },
  panel: {
    borderRadius: 30,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: '0px 24px 50px rgba(20,4,40,0.55)',
  },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text, letterSpacing: -0.6 },
  sub: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, color: colors.textSoft, marginTop: 4, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  day: {
    height: 96,
    borderRadius: radius.m,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLineSoft,
  },
  big: {
    backgroundColor: colors.sun,
    borderColor: '#FFF1A8',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  bigAmount: { fontSize: 20, lineHeight: 24 },
  today: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF', boxShadow: '0px 0px 24px rgba(255,224,102,0.8)' },
  done: { opacity: 0.6 },
  dayLabel: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textSoft },
  dayAmount: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.text },
  check: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 8 },
  got: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.sun },
  flying: { position: 'absolute', left: 0, top: 0 },
});
