import { Image } from 'expo-image';
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { cardName, type Card } from '@/engine';
import { cardRadius, colors } from '@/ui/theme';
import { BACK, FRONTS } from './cardImages';
import type { Place } from './layout';

interface Props {
  c: Card;
  place: Place;
  cw: number;
  ch: number;
  /** Delay before moving, for the staggered deal. */
  delay: number;
  /** Changes at every new hand: the card first jumps to `origin`, then flies to its place. */
  dealKey: number;
  origin: { x: number; y: number; s: number };
  duration: number;
  dim: boolean;
  glow: boolean;
  lift: boolean;
  onPress?: (c: Card) => void;
}

const ease = Easing.out(Easing.cubic);

function CardSpriteImpl({ c, place, cw, ch, delay, dealKey, origin, duration, dim, glow, lift, onPress }: Props) {
  const x = useSharedValue(place.x);
  const y = useSharedValue(place.y);
  const r = useSharedValue(place.r);
  const s = useSharedValue(place.s);
  const o = useSharedValue(place.o);
  const flip = useSharedValue(place.up ? 1 : 0);
  const lastDeal = useRef(dealKey);

  useEffect(() => {
    const cfg = { duration, easing: ease };
    if (lastDeal.current !== dealKey) {
      lastDeal.current = dealKey;
      // New hand: start from the deck, face down, then fly out in dealing order.
      x.value = origin.x;
      y.value = origin.y;
      r.value = 0;
      s.value = origin.s;
      o.value = 1;
      flip.value = 0;
    }
    x.value = withDelay(delay, withTiming(place.x, cfg));
    y.value = withDelay(delay, withTiming(place.y, cfg));
    r.value = withDelay(delay, withTiming(place.r, cfg));
    s.value = withDelay(delay, withTiming(place.s, cfg));
    o.value = withDelay(delay + (place.o ? 0 : duration * 0.6), withTiming(place.o, { duration: place.o ? 120 : 200 }));
    flip.value = withDelay(delay + duration * 0.25, withTiming(place.up ? 1 : 0, { duration: duration * 0.6, easing: Easing.inOut(Easing.quad) }));
  }, [place.x, place.y, place.r, place.s, place.o, place.up, delay, dealKey, origin.x, origin.y, origin.s, duration, x, y, r, s, o, flip]);

  const outer = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateX: x.value - cw / 2 },
      { translateY: y.value - ch / 2 },
      { rotate: `${r.value}deg` },
      { scale: s.value },
      // Turning over: squeeze to an edge, swap faces, open again. Stays sharp on every platform.
      { scaleX: Math.max(0.02, Math.abs(Math.cos(Math.PI * flip.value))) },
    ],
  }));
  const front = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 1 : 0 }));
  const back = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 0 : 1 }));

  const radius = cardRadius(cw);
  const body = (
    <View style={[styles.card, { width: cw, height: ch, borderRadius: radius }, lift && styles.lifted]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        <Animated.View style={[StyleSheet.absoluteFill, back]}>
          <Image source={BACK} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, front]}>
          <Image source={FRONTS[c]} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
        </Animated.View>
        {dim && <View style={[StyleSheet.absoluteFill, styles.dim]} />}
      </View>
      {glow && <View pointerEvents="none" style={[styles.glow, { borderRadius: radius + 3 }]} />}
    </View>
  );

  return (
    <Animated.View
      style={[styles.abs, { width: cw, height: ch, zIndex: place.z }, outer]}
      pointerEvents={onPress ? 'auto' : 'none'}
    >
      {onPress ? (
        <Pressable onPress={() => onPress(c)} accessibilityRole="button" accessibilityLabel={cardName(c)} style={StyleSheet.absoluteFill}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </Animated.View>
  );
}

export const CardSprite = memo(CardSpriteImpl);

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  card: {
    backgroundColor: colors.marmo,
    boxShadow: '0px 2px 5px rgba(0,0,0,0.38)',
  },
  lifted: {
    boxShadow: '0px 10px 18px rgba(0,0,0,0.45)',
  },
  dim: { backgroundColor: 'rgba(10,26,20,0.42)' },
  glow: {
    position: 'absolute',
    left: -3,
    top: -3,
    right: -3,
    bottom: -3,
    borderWidth: 2.5,
    borderColor: colors.ottoneChiaro,
    boxShadow: '0px 0px 14px rgba(227,198,135,0.75)',
  },
});
