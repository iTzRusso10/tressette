import { Image } from 'expo-image';
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { ease } from '@/ui/motion';
import { cardName, type Card } from '@/engine';
import { cardRadius, colors, shadow } from '@/ui/theme';
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
  /** The board appeared during a deal (the first hand): deal from the deck anyway. */
  fresh: boolean;
  /** At a new hand: how long the deck is shuffled before the deal, and on which side this card goes. */
  shuffle: number;
  half: -1 | 1;
  origin: { x: number; y: number; s: number };
  duration: number;
  dim: boolean;
  glow: boolean;
  lift: boolean;
  /** The back in use (an image of BACKS in cardImages.ts); the classic one by default. */
  back?: number;
  onPress?: (c: Card) => void;
}

function CardSpriteImpl({ c, place, cw, ch, delay, dealKey, fresh, shuffle, half, origin, duration, dim, glow, lift, back: backSrc = BACK, onPress }: Props) {
  const start = fresh ? { x: origin.x, y: origin.y, r: 0, s: origin.s, o: 0, up: false } : place;
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const r = useSharedValue(start.r);
  const s = useSharedValue(start.s);
  const o = useSharedValue(start.o);
  const flip = useSharedValue(start.up ? 1 : 0);
  const lastDeal = useRef(fresh ? -1 : dealKey);

  useEffect(() => {
    const move = { duration, easing: ease.in };
    let wait = delay;
    if (lastDeal.current !== dealKey) {
      lastDeal.current = dealKey;
      // New hand: every card back on the deck, face down.
      x.value = origin.x;
      y.value = origin.y;
      r.value = 0;
      s.value = origin.s;
      o.value = place.o ? 1 : 0;
      flip.value = 0;
      if (shuffle > 0 && place.o) {
        // The shuffle: the deck splits in two halves and comes back together, twice.
        const step = shuffle / 4;
        const split = cw * origin.s * 0.62;
        x.value = withSequence(
          withTiming(origin.x + half * split, { duration: step, easing: ease.move }),
          withTiming(origin.x, { duration: step, easing: ease.move }),
          withTiming(origin.x + half * split * 0.8, { duration: step, easing: ease.move }),
          withTiming(origin.x, { duration: step, easing: ease.move }),
          withDelay(delay, withTiming(place.x, move)),
        );
        wait = shuffle + delay;
        // Thrown cards turn a little in the air and straighten as they land.
        r.value = withDelay(
          wait,
          withSequence(
            withTiming(half * 14, { duration: duration * 0.3, easing: ease.in }),
            withTiming(place.r, { duration: duration * 0.7, easing: ease.in }),
          ),
        );
        y.value = withDelay(wait, withTiming(place.y, move));
        s.value = withDelay(wait, withTiming(place.s, move));
        flip.value = withDelay(wait + duration * 0.55, withTiming(place.up ? 1 : 0, { duration: duration * 0.5, easing: Easing.inOut(Easing.quad) }));
        return;
      }
    }
    x.value = withDelay(wait, withTiming(place.x, move));
    y.value = withDelay(wait, withTiming(place.y, move));
    r.value = withDelay(wait, withTiming(place.r, move));
    s.value = withDelay(wait, withTiming(place.s, move));
    // Out of play: fade only at the end of the trip, so you see where the cards went.
    o.value = withDelay(wait + (place.o ? 0 : duration * 0.6), withTiming(place.o, { duration: place.o ? 120 : 200 }));
    flip.value = withDelay(wait + duration * 0.25, withTiming(place.up ? 1 : 0, { duration: duration * 0.6, easing: Easing.inOut(Easing.quad) }));
  }, [place.x, place.y, place.r, place.s, place.o, place.up, delay, dealKey, shuffle, half, origin.x, origin.y, origin.s, duration, cw, x, y, r, s, o, flip]);

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
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }]}>
        <Animated.View style={[StyleSheet.absoluteFill, back]}>
          <Image source={backSrc} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
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
    <Animated.View style={[styles.abs, { width: cw, height: ch, zIndex: place.z }, outer]} pointerEvents={onPress ? 'auto' : 'none'}>
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
    backgroundColor: '#FFFFFF',
    boxShadow: shadow.card,
  },
  lifted: {
    boxShadow: shadow.lifted,
  },
  /** A clean edge for every card: the scans are cropped square, the corner and hairline are drawn here. */
  clip: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(46,18,87,0.22)' },
  dim: { backgroundColor: 'rgba(30,8,56,0.45)' },
  glow: {
    position: 'absolute',
    left: -3,
    top: -3,
    right: -3,
    bottom: -3,
    borderWidth: 3,
    borderColor: colors.sun,
    boxShadow: '0px 0px 18px rgba(255,224,102,0.85)',
  },
});
