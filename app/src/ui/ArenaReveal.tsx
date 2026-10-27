import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '@/game/Confetti';
import type { Arena } from '@/meta/arenas';
import { itemById } from '@/meta/shop';
import { ArenaScene } from './ArenaScene';
import { TablePreview } from './cosmetics';
import { sfx } from './feedback';
import { Button } from './kit';
import { CoinIcon } from './meta';
import { dur, ease } from './motion';
import { Text } from './Text';
import { colors, fonts, radius, space } from './theme';

/** The big moment: a new arena is yours. The place, the new table, what you won. */
export function ArenaReveal({ arena, onClose }: { arena: Arena; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const w = Math.min(width - 40, 440);
  const sceneH = Math.round(Math.min(w * 0.62, height * 0.3));
  const tw = Math.round(w * 0.78);
  const felt = itemById(arena.felt);
  const back = arena.back ? itemById(arena.back) : null;
  useEffect(() => {
    sfx('arena', { haptic: true });
  }, []);
  return (
    <Animated.View
      entering={FadeIn.duration(dur.enter)}
      exiting={FadeOut.duration(dur.exit)}
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, styles.root, { paddingTop: ins.top + space.l, paddingBottom: ins.bottom + space.l }]}
    >
      <LinearGradient colors={['rgba(20,4,40,0.96)', 'rgba(46,18,87,0.97)', 'rgba(20,4,40,0.98)']} style={StyleSheet.absoluteFill} />
      <View style={{ width: w, alignItems: 'center' }}>
        <Animated.Text entering={FadeInDown.delay(120).duration(dur.enter).easing(ease.in)} style={styles.kicker}>
          Nuova arena
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(220).duration(dur.enter + 80).easing(ease.in)} style={[styles.scene, { width: w, height: sceneH }]}>
          <ArenaScene id={arena.id} width={w} height={sceneH} />
          <LinearGradient colors={['rgba(20,4,40,0)', 'rgba(20,4,40,0.8)']} style={[StyleSheet.absoluteFill, { top: sceneH * 0.4 }]} />
          <View style={styles.sceneText}>
            <Text style={styles.number}>Arena {arena.index + 1}</Text>
            <Text style={styles.name}>{arena.name}</Text>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(520).duration(dur.enter + 80).easing(ease.in)} style={{ marginTop: -sceneH * 0.12 }}>
          <TablePreview felt={arena.felt} pattern="nessuno" back={arena.back ?? 'classico'} width={tw} height={Math.round(tw * 0.56)} cards />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(800).duration(dur.enter)} style={styles.won}>
          <Text v="body" style={{ textAlign: 'center' }}>
            {arena.desc}
          </Text>
          <View style={styles.rewards}>
            <View style={styles.reward}>
              <Text style={styles.rewardText}>Panno {felt?.name}</Text>
            </View>
            {back ? (
              <View style={styles.reward}>
                <Text style={styles.rewardText}>Dorso {back.name}</Text>
              </View>
            ) : null}
            {arena.coins ? (
              <View style={styles.reward}>
                <CoinIcon size={18} />
                <Text style={styles.rewardText}>+{arena.coins.toLocaleString('it-IT')}</Text>
              </View>
            ) : null}
          </View>
          <Text v="small" style={{ textAlign: 'center' }}>
            Il nuovo tavolo è già sul tuo panno. Puoi cambiarlo quando vuoi nel Negozio.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(1000).duration(dur.enter)} style={{ alignSelf: 'stretch', marginTop: space.xl }}>
          <Button label="Avanti" onPress={onClose} />
        </Animated.View>
      </View>
      <Confetti x={width / 2} y={height * 0.3} count={44} spread={0.9} duration={2000} seed={arena.index + 1} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 6000, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.sun, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: space.m },
  scene: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,224,102,0.7)', boxShadow: '0px 0px 40px rgba(255,224,102,0.35)' },
  sceneText: { position: 'absolute', left: space.l, right: space.l, bottom: space.l + 10 },
  number: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.sun, letterSpacing: 0.6, textTransform: 'uppercase' },
  name: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text, letterSpacing: -1 },
  won: { alignItems: 'center', gap: space.m, marginTop: space.l },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  rewardText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.text },
});
