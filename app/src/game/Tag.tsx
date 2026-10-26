import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
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

function Dot({ t, i }: { t: SharedValue<number>; i: number }) {
  const st = useAnimatedStyle(() => {
    const ph = (t.value * 3 - i + 3) % 3;
    return { opacity: ph < 1 ? 0.35 + 0.65 * Math.sin(Math.PI * ph) : 0.35 };
  });
  return <Animated.View style={[styles.dot, st]} />;
}

/** The computer is thinking. */
function Dots() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1);
  }, [t]);
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map(i => (
        <Dot key={i} t={t} i={i} />
      ))}
    </View>
  );
}

/** A player at the table. Fixed width: the name never moves, whatever the status says. */
export function Tag({ pos, name, status, color, active, thinking, isYou }: Props) {
  const left = pos.a === 'l' ? pos.x : pos.a === 'r' ? pos.x - TAG_W : pos.x - TAG_W / 2;
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.value = withTiming(active ? 1 : 0, { duration: 260 });
  }, [active, ring]);
  const ringSt = useAnimatedStyle(() => ({ opacity: ring.value }));
  return (
    <View testID={`fixed-tag-${name}`} pointerEvents="none" style={[styles.tag, { left, top: pos.y, width: TAG_W, height: TAG_H }]}>
      <Animated.View style={[styles.activeRing, ringSt]} />
      <View style={[styles.avatar, { borderColor: color }]}>
        <Text allowFontScaling={false} style={styles.initial}>
          {name.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.text}>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <View style={styles.statusRow}>
          {thinking ? (
            <Dots />
          ) : (
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.status, active && styles.statusActive]}>
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
    backgroundColor: 'rgba(10,26,20,0.78)',
    borderWidth: 1,
    borderColor: colors.linea,
    zIndex: 600,
  },
  activeRing: {
    position: 'absolute',
    left: -1,
    top: -1,
    right: -1,
    bottom: -1,
    borderRadius: TAG_H / 2 + 1,
    borderWidth: 1.5,
    borderColor: colors.ottoneChiaro,
    boxShadow: '0px 0px 12px rgba(227,198,135,0.45)',
  },
  avatar: {
    width: TAG_H - 10,
    height: TAG_H - 10,
    borderRadius: (TAG_H - 10) / 2,
    borderWidth: 2,
    backgroundColor: colors.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 20, color: colors.marmo, marginTop: -1 },
  text: { flex: 1, marginLeft: 8 },
  name: { fontFamily: fonts.uiSemi, fontSize: 14, lineHeight: 17, color: colors.marmo },
  statusRow: { height: 15, justifyContent: 'center' },
  status: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 15, color: colors.salvia },
  statusActive: { color: colors.ottoneChiaro },
  dots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.ottoneChiaro },
});
