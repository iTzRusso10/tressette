import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { dur, ease } from './motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '@/game/Confetti';
import { useAdSim } from '@/meta/ads';
import { dismissCelebration, useProfile, type Celebration } from '@/meta/profile';
import { sfx } from './feedback';
import { ArenaReveal } from './ArenaReveal';
import { Badge, CoinIcon } from './meta';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

/** One celebration at a time, dropping in from the top: a medal, a new level, coins earned. (A new arena gets the whole screen.) */
function Banner({ c }: { c: Exclude<Celebration, { kind: 'arena' }> }) {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 24, 420);
  useEffect(() => {
    sfx(c.kind === 'coins' ? 'coin' : c.kind === 'trophy' ? 'trophy' : 'win', { haptic: true });
    const t = setTimeout(() => dismissCelebration(c.id), c.kind === 'trophy' ? 3200 : 2400);
    return () => clearTimeout(t);
  }, [c]);
  return (
    <Animated.View
      entering={SlideInUp.duration(dur.enter + 40).easing(ease.in)}
      exiting={SlideOutUp.duration(dur.exit).easing(ease.out)}
      pointerEvents="none"
      style={[styles.banner, { top: ins.top + 8, width: w, left: (width - w) / 2 }]}
    >
      {c.kind === 'trophy' ? (
        <>
          <Animated.View entering={FadeIn.delay(160).duration(dur.enter)}>
            <Badge glyph={c.trophy.glyph} coins={c.trophy.coins} size={54} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Medaglia vinta</Text>
            <Text style={styles.title} numberOfLines={1}>
              {c.trophy.title}
            </Text>
            <View style={styles.reward}>
              <CoinIcon size={16} />
              <Text style={styles.rewardText}>+{c.trophy.coins}</Text>
            </View>
          </View>
        </>
      ) : c.kind === 'level' ? (
        <>
          <View style={styles.levelBig}>
            <Text style={styles.levelBigText}>{c.level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Nuovo livello</Text>
            <Text style={styles.title}>Sei al livello {c.level}</Text>
          </View>
        </>
      ) : (
        <>
          <CoinIcon size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{c.why}</Text>
            <Text style={styles.title}>+{c.amount} monete</Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}

/** A simulated rewarded video, until AdMob is connected. */
function AdSim() {
  const { playing, left } = useAdSim();
  if (!playing) return null;
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, styles.ad]}>
      <Text style={styles.adTitle}>Video premio</Text>
      <Text style={styles.adSub}>Qui ci sarà la pubblicità. Il premio arriva tra {left}…</Text>
    </Animated.View>
  );
}

export function Overlays() {
  const c = useProfile(s => s.celebrations[0]);
  // A new arena waits until you leave the table: first the end of the match, then the new place.
  const atTable = usePathname() === '/tavolo';
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 5000 }]}>
      {c && c.kind !== 'arena' ? <Banner key={c.id} c={c} /> : null}
      {c?.kind === 'arena' && !atTable ? <ArenaReveal key={c.id} arena={c.arena} onClose={() => dismissCelebration(c.id)} /> : null}
      {c?.kind === 'trophy' ? <Confetti key={'k' + c.id} x={width / 2} y={110} count={30} spread={0.7} duration={1600} seed={c.id} /> : null}
      <AdSim />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingRight: 18,
    borderRadius: radius.l,
    backgroundColor: colors.shadeStrong,
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: '0px 16px 36px rgba(30,6,56,0.5)',
  },
  kicker: { fontFamily: fonts.semi, fontSize: 12, lineHeight: 15, color: colors.sun },
  title: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, color: colors.text },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rewardText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.text },
  levelBig: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' },
  levelBigText: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.ink },
  ad: { backgroundColor: 'rgba(10,2,20,0.92)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  adTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text },
  adSub: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.textSoft, textAlign: 'center', marginTop: 8 },
});
