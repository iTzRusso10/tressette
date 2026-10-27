import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { GAMES, type GameId, type Match } from '@/engine';
import { FRONTS } from '@/game/cardImages';
import { useSettings } from '@/state/settings';
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

/** Enters from below with a spring, one after the other. */
function Enter({ i, children }: { i: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) v.value = withDelay(80 + i * 70, withSpring(1, { damping: 18, stiffness: 160 }));
  }, [i, reduce, v]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ translateY: (1 - v.value) * 36 }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

function GameTile({ game, width }: { game: GameId; width: number }) {
  const [a, b, c] = FAN[game];
  const cw = Math.min(64, width * 0.17);
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={`${GAMES[game].name}: ${SUB[game]}`}
      onPress={() => {
        sfx('tick');
        router.push({ pathname: '/gioca/[game]', params: { game } });
      }}
      style={styles.tile}
      scaleTo={0.97}
    >
      <View style={styles.tileText}>
        <Text style={styles.tileName}>{GAMES[game].name}</Text>
        <Text style={styles.tileSub}>{SUB[game]}</Text>
        <View style={styles.playPill}>
          <Text style={styles.playPillText}>Gioca</Text>
        </View>
      </View>
      <View style={[styles.fan, { width: cw * 2.4 }]} pointerEvents="none">
        <MiniCard c={a} w={cw} style={{ position: 'absolute', right: cw * 1.3, top: 18, transform: [{ rotate: '-14deg' }] }} />
        <MiniCard c={b} w={cw} style={{ position: 'absolute', right: cw * 0.65, top: 8, transform: [{ rotate: '-2deg' }] }} />
        <MiniCard c={c} w={cw * 1.05} style={{ position: 'absolute', right: 0, top: 14, transform: [{ rotate: '12deg' }] }} />
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

export default function Home() {
  const { width } = useWindowDimensions();
  const name = useSettings(s => s.name.trim());
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { width: colW }]} showsVerticalScrollIndicator={false} bounces={false}>
        <Enter i={0}>
          <View style={styles.top}>
            <LinearGradient colors={gradients.sun.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{(name || 'T').slice(0, 1).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text v="small" style={{ color: colors.textSoft }}>
                {name ? `Ciao, ${name}` : 'Ciao!'}
              </Text>
              <Text v="label">Si gioca?</Text>
            </View>
            <IconButton label="Impostazioni" onPress={() => router.push('/impostazioni')}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d={GEAR} stroke={colors.text} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
                <Circle cx={12} cy={12} r={3.2} stroke={colors.text} strokeWidth={1.7} fill="none" />
              </Svg>
            </IconButton>
          </View>
          <Text v="hero" accessibilityRole="header" style={styles.title}>
            Napoletane
          </Text>
        </Enter>

        {saved ? (
          <Enter i={1}>
            <ResumeCard m={saved} />
          </Enter>
        ) : null}

        <View style={{ marginTop: space.l, gap: space.m }}>
          {ORDER.map((g, i) => (
            <Enter key={g} i={i + 2}>
              <GameTile game={g} width={colW} />
            </Enter>
          ))}
        </View>

        <Enter i={5}>
          <Button
            label="Gioca con gli amici"
            sub="Crea una stanza o entra con un codice"
            onPress={() => router.push('/online')}
            style={{ marginTop: space.l }}
          />
          <Button
            kind="quiet"
            label="Come si gioca"
            onPress={() => router.push({ pathname: '/regole/[game]', params: { game: 'tressette' } })}
            style={{ marginTop: space.xs }}
          />
        </Enter>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.m, paddingBottom: space.xxl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', boxShadow: shadow.glow('rgba(255,224,102,0.55)') },
  avatarText: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.ink },
  title: { marginTop: space.xl },
  resume: {
    marginTop: space.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.m,
    paddingRight: space.l,
    borderRadius: radius.l,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.glassStrong, marginTop: 8, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  tile: {
    height: 122,
    borderRadius: radius.xl,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
    overflow: 'hidden',
    flexDirection: 'row',
    boxShadow: shadow.panel,
  },
  tileText: { flex: 1, paddingLeft: 22, paddingTop: 18 },
  tileName: { fontFamily: fonts.display, fontSize: 27, lineHeight: 32, color: colors.text, letterSpacing: -0.8 },
  tileSub: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.textSoft, marginTop: 4 },
  playPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.glassStrong,
  },
  playPillText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.text },
  fan: { height: '100%', marginRight: 12 },
  mini: { overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: shadow.card },
});
