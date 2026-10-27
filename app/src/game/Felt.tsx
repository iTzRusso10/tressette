import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/ui/theme';
import type { Rect as R } from './layout';

const RIM = 3;

/** The felt: emerald with a light from above, framed by a rim of white glass. Drawn once, never moves. */
export function Felt({ rect }: { rect: R }) {
  const rad = Math.min(34, rect.w * 0.09);
  const W = rect.w + RIM * 2;
  const H = rect.h + RIM * 2;
  return (
    <View
      testID="fixed-felt"
      pointerEvents="none"
      style={[styles.wrap, { left: rect.x - RIM, top: rect.y - RIM, width: W, height: H, borderRadius: rad + RIM }]}
    >
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset="0.5" stopColor="#FFE3F0" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.35} />
          </LinearGradient>
          <RadialGradient id="felt" cx="50%" cy="34%" rx="75%" ry="66%">
            <Stop offset="0" stopColor={colors.feltLight} />
            <Stop offset="0.55" stopColor={colors.felt} />
            <Stop offset="1" stopColor={colors.feltDark} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} rx={rad + RIM} ry={rad + RIM} fill="url(#rim)" />
        <Rect x={RIM} y={RIM} width={rect.w} height={rect.h} rx={rad} ry={rad} fill="url(#felt)" />
        <Rect
          x={RIM + 1}
          y={RIM + 1}
          width={rect.w - 2}
          height={rect.h - 2}
          rx={rad - 1}
          ry={rad - 1}
          fill="none"
          stroke="#000"
          strokeOpacity={0.22}
          strokeWidth={4}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', boxShadow: '0px 22px 46px rgba(40,8,70,0.45)' },
});
