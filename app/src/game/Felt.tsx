import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/ui/theme';
import type { Rect as R } from './layout';

/** The felt: a soft light from above, a brass rail, a dark inner edge. Drawn once, never moves. */
export function Felt({ rect }: { rect: R }) {
  const rad = Math.min(30, rect.w * 0.08);
  return (
    <View testID="fixed-felt" pointerEvents="none" style={[styles.wrap, { left: rect.x - 5, top: rect.y - 5, width: rect.w + 10, height: rect.h + 10, borderRadius: rad + 5 }]}>
      <Svg width={rect.w} height={rect.h} style={{ position: 'absolute', left: 3, top: 3 }}>
        <Defs>
          <RadialGradient id="felt" cx="50%" cy="40%" rx="70%" ry="62%">
            <Stop offset="0" stopColor={colors.pannoLuce} />
            <Stop offset="0.65" stopColor={colors.panno} />
            <Stop offset="1" stopColor={colors.pannoOmbra} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={rect.w} height={rect.h} rx={rad} ry={rad} fill="url(#felt)" />
        <Rect x={1.5} y={1.5} width={rect.w - 3} height={rect.h - 3} rx={rad - 1.5} ry={rad - 1.5} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={3} />
        <Rect x={9} y={9} width={rect.w - 18} height={rect.h - 18} rx={rad - 7} ry={rad - 7} fill="none" stroke={colors.ottone} strokeOpacity={0.16} strokeWidth={1} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.ottoneScuro,
    backgroundColor: colors.ottone,
    boxShadow: '0px 14px 30px rgba(0,0,0,0.45)',
  },
});
