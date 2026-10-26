import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { GAMES, type GameId, type Match } from '@/engine';
import { FRONTS } from '@/game/cardImages';
import { loadSaved, resumeMatch } from '@/state/table';
import { sfx } from '@/ui/feedback';
import { Button, Screen } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { CARD_RATIO, cardRadius, colors, fonts, space } from '@/ui/theme';

/** The card that stands for each game. */
const EMBLEM: Record<GameId, number> = { tressette: 12, briscola: 20, scopa: 16 };
const SUB: Record<GameId, string> = {
  tressette: 'In due, in quattro o a perdere',
  briscola: 'In due o in quattro',
  scopa: 'In due o in quattro',
};
const ORDER: GameId[] = ['tressette', 'briscola', 'scopa'];

/** A cog with eight teeth. */
const GEAR = (() => {
  const pts: string[] = [];
  const teeth = 8;
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 4 < 2 ? 10 : 7.6;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return 'M' + pts.join('L') + 'Z';
})();

function GameCard({ game, i, cw }: { game: GameId; i: number; cw: number }) {
  const reduce = useReducedMotion();
  const enter = useSharedValue(reduce ? 1 : 0);
  const press = useSharedValue(0);
  useEffect(() => {
    if (!reduce) enter.value = withDelay(120 + i * 90, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [enter, i, reduce]);
  const tilt = (i - 1) * 5;
  const st = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 60 - press.value * 10 + (i === 1 ? 0 : 14) },
      { rotate: `${tilt * enter.value}deg` },
      { scale: 1 + press.value * 0.03 },
    ],
  }));
  const ch = cw * CARD_RATIO;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${GAMES[game].name}: ${SUB[game]}`}
      onPressIn={() => (press.value = withTiming(1, { duration: 120 }))}
      onPressOut={() => (press.value = withTiming(0, { duration: 180 }))}
      onPress={() => {
        sfx('tick');
        router.push({ pathname: '/gioca/[game]', params: { game } });
      }}
      style={{ width: cw + 8, alignItems: 'center' }}
    >
      <Animated.View style={[{ width: cw, height: ch }, st]}>
        <View style={[styles.card, { width: cw, height: ch, borderRadius: cardRadius(cw) }]}>
          <Image source={FRONTS[EMBLEM[game]]} style={{ width: cw, height: ch }} contentFit="fill" transition={null} />
        </View>
      </Animated.View>
      <Text style={[styles.gameName, { marginTop: space.m + 14 }]}>{GAMES[game].name}</Text>
      <Text v="small" style={styles.gameSub}>
        {SUB[game]}
      </Text>
    </Pressable>
  );
}

export default function Home() {
  const { width } = useWindowDimensions();
  const [saved, setSaved] = useState<Match | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadSaved().then(m => live && setSaved(m));
      return () => {
        live = false;
      };
    }, []),
  );
  const colW = Math.min(width, 520);
  const cw = Math.floor(Math.min((colW - 48) / 3 - 8, 132));

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Impostazioni" hitSlop={10} onPress={() => router.push('/impostazioni')} style={({ pressed }) => [styles.gear, pressed && { opacity: 0.7 }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d={GEAR} stroke={colors.ottoneChiaro} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
            <Circle cx={12} cy={12} r={3.2} stroke={colors.ottoneChiaro} strokeWidth={1.6} fill="none" />
          </Svg>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { width: colW }]} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.head}>
          <Text style={styles.wordmark} accessibilityRole="header">
            Napoletane
          </Text>
          <View style={styles.rule} />
          <Text v="body" style={styles.tagline}>
            Scegli il gioco e siediti al tavolo
          </Text>
        </View>
        <View style={styles.fan}>
          {ORDER.map((g, i) => (
            <GameCard key={g} game={g} i={i} cw={cw} />
          ))}
        </View>
        {saved ? (
          <Button
            style={styles.resume}
            label="Riprendi la partita"
            sub={`${GAMES[saved.game].name}, mano ${saved.handNo}, ${saved.match.join(' a ')}`}
            onPress={() => {
              resumeMatch(saved);
              router.push('/tavolo');
            }}
          />
        ) : null}
        <Button kind="secondary" label="Gioca con gli amici" sub="Crea una stanza o entra con un codice" onPress={() => router.push('/online')} style={{ marginTop: space.s }} />
        <Button kind="quiet" label="Come si gioca" onPress={() => router.push({ pathname: '/regole/[game]', params: { game: 'tressette' } })} style={{ marginTop: space.s }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: space.l },
  gear: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.linea,
    backgroundColor: 'rgba(10,26,20,0.4)',
  },
  content: { alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxl, flexGrow: 1, justifyContent: 'center' },
  head: { alignItems: 'center', marginBottom: space.xxl },
  wordmark: { fontFamily: fonts.displayItalic, fontSize: 54, lineHeight: 62, color: colors.marmo, letterSpacing: -0.5 },
  rule: { width: 56, height: 1.5, backgroundColor: colors.ottone, marginTop: space.m, marginBottom: space.m },
  tagline: { textAlign: 'center' },
  fan: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 4, marginBottom: space.xxl },
  card: { overflow: 'hidden', backgroundColor: colors.marmo, boxShadow: '0px 12px 26px rgba(0,0,0,0.45)' },
  gameName: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, color: colors.marmo },
  gameSub: { textAlign: 'center', marginTop: 2 },
  resume: { marginTop: space.s },
});
