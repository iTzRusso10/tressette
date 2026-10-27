import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ease } from '@/ui/motion';
import Svg, { Circle, Path } from 'react-native-svg';
import { GAMES, type GameId, type Match } from '@/engine';
import { FRONTS } from '@/game/cardImages';
import { levelOf } from '@/meta/economy';
import { bonusAvailable, useProfile } from '@/meta/profile';
import { TROPHIES } from '@/meta/progress';
import { useSettings } from '@/state/settings';
import { DailyBonus } from '@/ui/DailyBonus';
import { CoinPill, LevelAvatar } from '@/ui/meta';
import { loadSaved, resumeMatch } from '@/state/table';
import { sfx } from '@/ui/feedback';
import { Button, IconButton, Screen, Squish } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { CARD_RATIO, cardRadius, colors, fonts, gradients, radius, shadow, space } from '@/ui/theme';

/** Three cards that stand for each game. */
const FAN: Record<GameId, [number, number, number]> = { tressette: [12, 32, 21], briscola: [20, 3, 29], scopa: [16, 6, 26] };
const SUB: Record<GameId, string> = {
  tressette: 'In 2, in 4 o a perdere',
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

function MiniCard({ c, w, style }: { c: number; w: number; style?: object }) {
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

function GameTile({ game, width, index }: { game: GameId; width: number; index: number }) {
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

function ResumeCard({ m }: { m: Match }) {
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

/** The daily bonus opens by itself once per app launch, when it is there to collect. */
let bonusShown = false;

export default function Home() {
  const { width } = useWindowDimensions();
  const name = useSettings(s => s.name.trim());
  const coins = useProfile(s => s.coins);
  const xp = useProfile(s => s.xp);
  const unlocked = useProfile(s => Object.keys(s.trophies).length);
  const [saved, setSaved] = useState<Match | null>(null);
  const [bonus, setBonus] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadSaved().then(m => live && setSaved(m));
      // Wait for the saved profile to load before deciding.
      const t = setTimeout(() => {
        if (live && !bonusShown && bonusAvailable()) {
          bonusShown = true;
          setBonus(true);
        }
      }, 700);
      return () => {
        live = false;
        clearTimeout(t);
      };
    }, []),
  );
  const colW = Math.min(width, 520);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { width: colW }]} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.top}>
          <Squish accessibilityRole="button" accessibilityLabel="Il tuo profilo" onPress={() => router.push('/profilo')} style={styles.me} scaleTo={0.95}>
            <LevelAvatar name={name} xp={xp} size={50} />
            <View style={{ flexShrink: 1 }}>
              <Text v="label" numberOfLines={1}>
                {name || 'Il tuo profilo'}
              </Text>
              <Text v="small" style={{ color: colors.textSoft }}>
                Livello {levelOf(xp)}
              </Text>
            </View>
          </Squish>
          <View style={{ flex: 1 }} />
          <CoinPill coins={coins} />
          <IconButton label="Impostazioni" onPress={() => router.push('/impostazioni')}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d={GEAR} stroke={colors.text} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
              <Circle cx={12} cy={12} r={3.2} stroke={colors.text} strokeWidth={1.7} fill="none" />
            </Svg>
          </IconButton>
        </View>
        <View style={styles.titleRow}>
          <Text v="hero" accessibilityRole="header" style={styles.title}>
            Napoletane
          </Text>
        </View>
        <View style={styles.shortcuts}>
          <Squish
            accessibilityRole="button"
            accessibilityLabel={`Trofei, ${unlocked} su ${TROPHIES.length}`}
            onPress={() => router.push('/trofei')}
            style={styles.shortcut}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4.5a2.5 2.5 0 0 0 2.6 4M17 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13v4M8.5 20h7M9.5 17h5"
                stroke={colors.sun}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.shortcutText}>
              Trofei {unlocked}/{TROPHIES.length}
            </Text>
          </Squish>
          <Squish accessibilityRole="button" accessibilityLabel="Profilo e amici" onPress={() => router.push('/profilo')} style={styles.shortcut}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 11a2.6 2.6 0 1 0 0-5.2M17 14c2 .4 3.3 2 3.7 5"
                stroke={colors.mint}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.shortcutText}>Profilo e amici</Text>
          </Squish>
        </View>

        {saved ? <ResumeCard m={saved} /> : null}

        <View style={{ marginTop: space.xxl, gap: space.xl }}>
          {ORDER.map((g, i) => (
            <GameTile key={g} game={g} width={colW} index={i} />
          ))}
        </View>

        <Button label="Gioca con gli amici" sub="Crea una stanza o entra con un codice" onPress={() => router.push('/online')} style={{ marginTop: space.l }} />
        <Button
          kind="quiet"
          label="Come si gioca"
          onPress={() => router.push({ pathname: '/regole/[game]', params: { game: 'tressette' } })}
          style={{ marginTop: space.xs }}
        />
      </ScrollView>
      {bonus ? <DailyBonus onClose={() => setBonus(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.m, paddingBottom: space.xxl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  me: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  titleRow: { marginTop: space.xl },
  title: { fontSize: 50, lineHeight: 56, letterSpacing: -2.2 },
  shortcuts: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.shade,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  shortcutText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.text },
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
