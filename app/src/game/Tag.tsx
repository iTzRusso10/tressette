import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/ui/Text';
import { colors, fonts } from '@/ui/theme';
import { TAG_H, TAG_W, type TagPos } from './layout';

interface Props {
  pos: TagPos;
  name: string;
  status: string;
  color: string;
  active: boolean;
  thinking: boolean;
  isYou: boolean;
}

function Dot({ t, i, color }: { t: SharedValue<number>; i: number; color: string }) {
  const st = useAnimatedStyle(() => {
    const ph = (t.value * 3 - i + 3) % 3;
    const k = ph < 1 ? Math.sin(Math.PI * ph) : 0;
    return { opacity: 0.35 + 0.65 * k, transform: [{ translateY: -2.5 * k }] };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, st]} />;
}

/** The computer is thinking. */
function Dots({ color }: { color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1050, easing: Easing.linear }), -1);
    return () => cancelAnimation(t);
  }, [t]);
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map(i => (
        <Dot key={i} t={t} i={i} color={color} />
      ))}
    </View>
  );
}

/** A player at the table. Fixed width: the name never moves, whatever the status says. */
export function Tag({ pos, name, status, color, active, thinking, isYou }: Props) {
  const left = pos.a === 'l' ? pos.x : pos.a === 'r' ? pos.x - TAG_W : pos.x - TAG_W / 2;
  const on = useSharedValue(active ? 1 : 0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    on.value = withSpring(active ? 1 : 0, { damping: 14, stiffness: 180 });
    if (active) pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
    else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [active, on, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: on.value * (0.75 + 0.25 * pulse.value), transform: [{ scale: 1 + 0.02 * pulse.value * on.value }] }));
  const avatar = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.08 * on.value }] }));
  return (
    <View testID={`fixed-tag-${name}`} pointerEvents="none" style={[styles.tag, { left, top: pos.y, width: TAG_W, height: TAG_H }]}>
      <Animated.View style={[styles.ring, { borderColor: color, boxShadow: `0px 0px 16px ${color}` }, ring]} />
      <Animated.View style={[styles.avatar, { backgroundColor: color }, avatar]}>
        <Text allowFontScaling={false} style={styles.initial}>
          {name.slice(0, 1).toUpperCase()}
        </Text>
      </Animated.View>
      <View style={styles.text}>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <View style={styles.statusRow}>
          {thinking ? (
            <Dots color={color} />
          ) : (
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.status, active && { color }]}>
              {active && isYou ? 'Tocca a te' : status}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: TAG_H / 2,
    backgroundColor: colors.shade,
    borderWidth: 1,
    borderColor: colors.glassLineSoft,
    zIndex: 600,
  },
  ring: { position: 'absolute', left: -2, top: -2, right: -2, bottom: -2, borderRadius: TAG_H / 2 + 2, borderWidth: 2 },
  avatar: { width: TAG_H - 8, height: TAG_H - 8, borderRadius: (TAG_H - 8) / 2, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.ink },
  text: { flex: 1, marginLeft: 8 },
  name: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, color: colors.text },
  statusRow: { height: 15, justifyContent: 'center' },
  status: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.textSoft },
  dots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
