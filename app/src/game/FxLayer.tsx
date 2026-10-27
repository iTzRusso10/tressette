import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  FadeOutUp,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import type { Match } from '@/engine';
import { useTable, type Fx } from '@/state/table';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, seatColors } from '@/ui/theme';
import { Confetti } from './Confetti';
import { sideOf, TAG_W, type Geometry } from './layout';

function anchor(g: Geometry, m: Match, viewer: number, p: number) {
  const t = g.tags[sideOf(m, viewer, p)];
  const cx = t.a === 'l' ? t.x + TAG_W / 2 : t.a === 'r' ? t.x - TAG_W / 2 : t.x;
  return { x: cx, y: t.y };
}

const colorOf = (m: Match, viewer: number, p: number) => seatColors[(p - viewer + m.n) % m.n];

/** Points rising from a player's name. */
function Float({ fx, g, m, viewer }: { fx: Fx; g: Geometry; m: Match; viewer: number }) {
  const p = fx.p ?? 0;
  const a = anchor(g, m, viewer, p);
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  const s = useSharedValue(0.4);
  useEffect(() => {
    o.value = withSequence(withTiming(1, { duration: 140 }), withDelay(fx.ms - 560, withTiming(0, { duration: 400 })));
    s.value = withSpring(1, { damping: 10, stiffness: 220 });
    y.value = withTiming(-40, { duration: fx.ms, easing: Easing.out(Easing.cubic) });
  }, [fx.ms, o, s, y]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.float, { left: a.x - 90, top: a.y - 12 }, st]}>
      <Text allowFontScaling={false} style={[styles.floatText, { textShadowColor: colorOf(m, viewer, p) }]}>
        {fx.text}
      </Text>
    </Animated.View>
  );
}

/** A signal (Busso, Striscio, Volo) above a player's name. */
function Bubble({ fx, g, m, viewer }: { fx: Fx; g: Geometry; m: Match; viewer: number }) {
  const a = anchor(g, m, viewer, fx.p ?? 0);
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      style={[styles.bubble, { left: a.x - 50, top: a.y - 32 }]}
    >
      <Text allowFontScaling={false} style={styles.bubbleText}>
        {fx.text}
      </Text>
    </Animated.View>
  );
}

/** The big moments, written on the felt with a burst of confetti: Scopa!, Cappotto! */
function Moment({ fx, g }: { fx: Fx; g: Geometry }) {
  const s = useSharedValue(0.3);
  const o = useSharedValue(0);
  const r = useSharedValue(-14);
  useEffect(() => {
    s.value = withSpring(1, { damping: 8, stiffness: 170 });
    r.value = withSpring(-5, { damping: 9, stiffness: 140 });
    o.value = withSequence(withTiming(1, { duration: 120 }), withDelay(fx.ms - 480, withTiming(0, { duration: 360 })));
  }, [fx.ms, o, r, s]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  const cy = g.area.y + g.area.h / 2;
  return (
    <>
      <Confetti x={g.felt.x + g.felt.w / 2} y={cy} count={34} spread={0.8} duration={1500} seed={fx.id} />
      <Animated.View pointerEvents="none" style={[styles.moment, { left: g.felt.x, width: g.felt.w, top: cy - 52 }, st]}>
        <Text allowFontScaling={false} style={styles.momentText}>
          {fx.text}
        </Text>
        {fx.sub ? (
          <Text allowFontScaling={false} style={styles.momentSub}>
            {fx.sub}
          </Text>
        ) : null}
      </Animated.View>
    </>
  );
}

/** Notices drop in over the score bar, like a system notification: they never cover a card. */
function Toast({ fx, g }: { fx: Fx; g: Geometry }) {
  const left = g.cx - g.colW / 2 + 12;
  return (
    <Animated.View
      entering={SlideInUp.springify().damping(16)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={[styles.toast, { left, width: g.colW - 24, top: 5 }]}
    >
      <Text allowFontScaling={false} numberOfLines={1} style={styles.toastTitle}>
        {fx.text}
      </Text>
      {fx.sub ? (
        <Text allowFontScaling={false} numberOfLines={1} style={styles.toastSub}>
          {fx.sub}
        </Text>
      ) : null}
    </Animated.View>
  );
}

export function FxLayer({ g, m, viewer }: { g: Geometry; m: Match; viewer: number }) {
  const fx = useTable(s => s.fx);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
      {fx.map(f =>
        f.kind === 'float' ? (
          <Float key={f.id} fx={f} g={g} m={m} viewer={viewer} />
        ) : f.kind === 'bubble' ? (
          <Bubble key={f.id} fx={f} g={g} m={m} viewer={viewer} />
        ) : f.kind === 'moment' ? (
          <Moment key={f.id} fx={f} g={g} />
        ) : (
          <Toast key={f.id} fx={f} g={g} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  float: { position: 'absolute', width: 180, alignItems: 'center' },
  floatText: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: '#FFFFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  bubble: {
    position: 'absolute',
    width: 100,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 16px rgba(40,8,70,0.35)',
  },
  bubbleText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.ink },
  moment: { position: 'absolute', alignItems: 'center' },
  momentText: {
    fontFamily: fonts.display,
    fontSize: 60,
    lineHeight: 72,
    letterSpacing: -2,
    color: '#FFFFFF',
    textShadowColor: colors.pink,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  momentSub: { fontFamily: fonts.semi, fontSize: 15, lineHeight: 19, color: colors.text, marginTop: 2 },
  toast: {
    position: 'absolute',
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    justifyContent: 'center',
    backgroundColor: colors.shadeStrong,
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: '0px 10px 26px rgba(40,8,70,0.4)',
  },
  toastTitle: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, color: colors.text },
  toastSub: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.textSoft },
});
