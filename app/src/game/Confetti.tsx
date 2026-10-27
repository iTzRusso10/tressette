import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { seeded } from '@/engine/rng';
import { colors } from '@/ui/theme';

const PALETTE = [colors.sun, colors.mint, colors.sky, colors.rose, '#FFFFFF', colors.orange];

interface Bit {
  x: number;
  vx: number;
  vy: number;
  spin: number;
  w: number;
  h: number;
  color: string;
  delay: number;
  round: boolean;
}

function Piece({ b, t, x0, y0 }: { b: Bit; t: SharedValue<number>; x0: number; y0: number }) {
  const st = useAnimatedStyle(() => {
    const k = Math.max(0, t.value - b.delay) / (1 - b.delay);
    const s = k * 1.6;
    return {
      opacity: k <= 0 ? 0 : k > 0.8 ? (1 - k) * 5 : 1,
      transform: [
        { translateX: x0 + b.x + b.vx * s },
        { translateY: y0 + b.vy * s + 520 * s * s },
        { rotate: `${b.spin * k}deg` },
        { scaleX: Math.cos(k * b.spin * 0.05) },
      ],
    };
  });
  return <Animated.View style={[styles.bit, { width: b.w, height: b.h, backgroundColor: b.color, borderRadius: b.round ? b.w : 1.5 }, st]} />;
}

/** A burst of confetti from a point, for wins, a Scopa or a cappotto. */
export function Confetti({
  x,
  y,
  count = 40,
  spread = 1,
  duration = 1900,
  seed = 1,
}: {
  x: number;
  y: number;
  count?: number;
  spread?: number;
  duration?: number;
  seed?: number;
}) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  const bits = useMemo<Bit[]>(() => {
    const rnd = seeded(seed);
    return Array.from({ length: reduce ? 0 : count }, (_, i) => {
      const a = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.15;
      const v = (240 + rnd() * 360) * spread;
      return {
        x: (rnd() - 0.5) * 30,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        spin: (rnd() - 0.5) * 900,
        w: 6 + rnd() * 6,
        h: 8 + rnd() * 8,
        color: PALETTE[i % PALETTE.length],
        delay: rnd() * 0.12,
        round: rnd() < 0.3,
      };
    });
  }, [count, spread, reduce, seed]);
  useEffect(() => {
    t.value = withDelay(30, withTiming(1, { duration, easing: Easing.linear }));
  }, [t, duration]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => (
        <Piece key={i} b={b} t={t} x0={x} y0={y} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bit: { position: 'absolute', left: 0, top: 0 },
});
