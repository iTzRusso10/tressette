import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, FadeOutUp, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { Match } from '@/engine';
import { useTable, type Fx } from '@/state/table';
import { Text } from '@/ui/Text';
import { colors, fonts } from '@/ui/theme';
import { sideOf, TAG_W, type Geometry } from './layout';

function anchor(g: Geometry, m: Match, viewer: number, p: number) {
  const t = g.tags[sideOf(m, viewer, p)];
  const cx = t.a === 'l' ? t.x + TAG_W / 2 : t.a === 'r' ? t.x - TAG_W / 2 : t.x;
  return { x: cx, y: t.y };
}

function Float({ fx, g, m, viewer }: { fx: Fx; g: Geometry; m: Match; viewer: number }) {
  const a = anchor(g, m, viewer, fx.p ?? 0);
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withSequence(withTiming(1, { duration: 160 }), withDelay(fx.ms - 560, withTiming(0, { duration: 400 })));
    y.value = withTiming(-34, { duration: fx.ms, easing: Easing.out(Easing.cubic) });
  }, [fx.ms, o, y]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.float, { left: a.x - 80, top: a.y - 8 }, st]}>
      <Text allowFontScaling={false} style={styles.floatText}>
        {fx.text}
      </Text>
    </Animated.View>
  );
}

function Bubble({ fx, g, m, viewer }: { fx: Fx; g: Geometry; m: Match; viewer: number }) {
  const a = anchor(g, m, viewer, fx.p ?? 0);
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} pointerEvents="none" style={[styles.bubble, { left: a.x - 50, top: a.y - 30 }]}>
      <Text allowFontScaling={false} style={styles.bubbleText}>
        {fx.text}
      </Text>
    </Animated.View>
  );
}

/** The big moments, written on the felt: Scopa!, Cappotto! */
function Moment({ fx, g }: { fx: Fx; g: Geometry }) {
  const s = useSharedValue(0.6);
  const o = useSharedValue(0);
  useEffect(() => {
    s.value = withSpring(1, { damping: 12, stiffness: 180 });
    o.value = withSequence(withTiming(1, { duration: 140 }), withDelay(fx.ms - 500, withTiming(0, { duration: 360 })));
  }, [fx.ms, o, s]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: '-4deg' }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.moment, { left: g.felt.x, width: g.felt.w, top: g.felt.y + g.felt.h / 2 - 60 }, st]}>
      <Text allowFontScaling={false} style={styles.momentText}>
        {fx.text}
      </Text>
      {fx.sub ? (
        <Text allowFontScaling={false} style={styles.momentSub}>
          {fx.sub}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/** Notices drop in over the score bar, like a system notification: they never cover a card. */
function Toast({ fx, g }: { fx: Fx; g: Geometry }) {
  const left = g.cx - g.colW / 2 + 12;
  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={[styles.toast, { left, width: g.colW - 24, top: 4 }]}
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
  float: { position: 'absolute', width: 160, alignItems: 'center', zIndex: 900 },
  floatText: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    color: colors.ottoneChiaro,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bubble: {
    position: 'absolute',
    width: 100,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.pompei,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 900,
    boxShadow: '0px 4px 10px rgba(0,0,0,0.35)',
  },
  bubbleText: { fontFamily: fonts.uiBold, fontSize: 13, lineHeight: 16, color: colors.marmo },
  moment: { position: 'absolute', alignItems: 'center', zIndex: 950 },
  momentText: {
    fontFamily: fonts.displayItalic,
    fontSize: 64,
    lineHeight: 74,
    color: colors.ottoneChiaro,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  momentSub: { fontFamily: fonts.uiSemi, fontSize: 15, lineHeight: 19, color: colors.marmo, marginTop: 2 },
  toast: {
    position: 'absolute',
    zIndex: 920,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: colors.superficieAlta,
    borderWidth: 1,
    borderColor: colors.linea,
    boxShadow: '0px 8px 20px rgba(0,0,0,0.4)',
  },
  toastTitle: { fontFamily: fonts.uiBold, fontSize: 14, lineHeight: 18, color: colors.marmo },
  toastSub: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 16, color: colors.marmoTenue },
});
