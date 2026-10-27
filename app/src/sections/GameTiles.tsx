import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { GAMES, type GameId, type Match } from '@/engine';
import { FRONTS } from '@/game/cardImages';
import { resumeMatch } from '@/state/table';
import { sfx } from '@/ui/feedback';
import { Squish } from '@/ui/kit';
import { ease } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { CARD_RATIO, cardRadius, colors, fonts, gradients, radius, shadow, space } from '@/ui/theme';

/** Three cards that stand for each game. */
export const FAN: Record<GameId, [number, number, number]> = { tressette: [12, 32, 21], briscola: [20, 3, 29], scopa: [16, 6, 26] };
export const SUB: Record<GameId, string> = {
  tressette: 'In 2, in 4 o a perdere',
  briscola: 'In due o in quattro',
  scopa: 'In due o in quattro',
};
export const ORDER: GameId[] = ['tressette', 'briscola', 'scopa'];

export function MiniCard({ c, w, style }: { c: number; w: number; style?: object }) {
  return (
    <View style={[styles.mini, { width: w, height: w * CARD_RATIO, borderRadius: cardRadius(w) }, style]}>
      <Image source={FRONTS[c]} style={{ width: w, height: w * CARD_RATIO }} contentFit="fill" transition={null} />
    </View>
  );
}

/**
 * The one entrance of the screen: each game's cards are dealt onto its tile, game after game.
 * Everything else is simply there.
 */
function DealtCard({ c, w, i, pose }: { c: number; w: number; i: number; pose: { right: number; top: number; rotate: number } }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) v.value = withDelay(120 + i * 60, withTiming(1, { duration: 420, easing: ease.in }));
  }, [i, reduce, v]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value * 2),
    transform: [{ translateY: (1 - v.value) * 70 }, { translateX: (1 - v.value) * 40 }, { rotate: `${pose.rotate * v.value + 25 * (1 - v.value)}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', right: pose.right, top: pose.top }, st]}>
      <MiniCard c={c} w={w} />
    </Animated.View>
  );
}

export function GameTile({ game, width, index, onPick }: { game: GameId; width: number; index: number; onPick?: () => void }) {
  const cards = FAN[game];
  const cw = Math.min(70, width * 0.18);
  const poses = [
    { right: cw * 1.35, top: -6, rotate: -14 },
    { right: cw * 0.68, top: -16, rotate: -3 },
    { right: 4, top: -8, rotate: 11 },
  ];
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={`${GAMES[game].name}: ${SUB[game]}`}
      onPress={() => {
        sfx('tick');
        onPick?.();
        router.push({ pathname: '/gioca/[game]', params: { game } });
      }}
      style={[styles.tile, { boxShadow: `0px 14px 30px ${gradients.games[game][1]}66` }]}
      scaleTo={0.97}
    >
      <LinearGradient
        colors={gradients.games[game]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
      />
      <View style={styles.tileShine} />
      <View style={styles.tileText}>
        <Text style={styles.tileName}>{GAMES[game].name}</Text>
        <Text style={styles.tileSub}>{SUB[game]}</Text>
      </View>
      <View style={[styles.fan, { width: cw * 2.5 }]} pointerEvents="none">
        {cards.map((c, i) => (
          <DealtCard key={c} c={c} w={cw} i={index * 3 + i} pose={poses[i]} />
        ))}
      </View>
    </Squish>
  );
}

export function ResumeCard({ m }: { m: Match }) {
  const progress = Math.min(1, Math.max(...m.match) / m.target);
  const [a, b] = FAN[m.game];
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={`Riprendi la partita: ${GAMES[m.game].name}, mano ${m.handNo}`}
      onPress={() => {
        sfx('tick');
        resumeMatch(m);
        router.push('/tavolo');
      }}
      style={styles.resume}
      scaleTo={0.97}
    >
      <View style={{ width: 50, height: 58 }}>
        <MiniCard c={a} w={34} style={{ position: 'absolute', left: 0, top: 3, transform: [{ rotate: '-8deg' }] }} />
        <MiniCard c={b} w={34} style={{ position: 'absolute', left: 13, top: 0, transform: [{ rotate: '7deg' }] }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text v="label">Riprendi la partita</Text>
        <Text v="small" style={{ color: colors.textSoft }}>
          {GAMES[m.game].name}, mano {m.handNo}, {m.match.join(' a ')}
        </Text>
        <View style={styles.track}>
          <LinearGradient
            colors={gradients.primary.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${Math.max(6, progress * 100)}%` }]}
          />
        </View>
      </View>
      <View style={styles.play}>
        <Svg width={14} height={16} viewBox="0 0 14 16">
          <Path d="M2 1.5L12.5 8 2 14.5Z" fill={colors.ink} />
        </Svg>
      </View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  resume: {
    marginTop: space.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.m,
    paddingRight: space.l,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
  },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.glassStrong, marginTop: 8, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  tile: { height: 112, borderRadius: radius.xl, flexDirection: 'row' },
  tileShine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 56,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  tileText: { flex: 1, paddingLeft: 22, justifyContent: 'center' },
  tileName: { fontFamily: fonts.display, fontSize: 30, lineHeight: 35, color: colors.text, letterSpacing: -1 },
  tileSub: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 17, color: 'rgba(255,255,255,0.88)', marginTop: 3 },
  fan: { height: '100%', marginRight: 12 },
  mini: { overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: shadow.card },
});
