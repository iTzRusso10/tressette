import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { teamOf, type Match } from '@/engine';
import { IconButton } from '@/ui/kit';
import { colors, seatColors } from '@/ui/theme';
import { TOP_BAR } from './layout';

interface Props {
  onMenu: () => void;
}

export function teamName(m: Match, t: number, viewer: number) {
  if (m.mode === '4') return t === teamOf(m, viewer) ? 'Noi' : 'Loro';
  return t === viewer ? 'Tu' : m.seats[t].name;
}

export function teamColor(m: Match, t: number, viewer: number) {
  if (m.mode === '4') return t === teamOf(m, viewer) ? seatColors[0] : seatColors[1];
  return seatColors[(t - viewer + m.n) % m.n];
}

/**
 * Just the menu button: the score is shown in the summary at the end of each hand, so the
 * table can take the whole screen.
 */
export function TopBar({ onMenu }: Props) {
  return (
    <View style={styles.bar}>
      <IconButton label="Pausa e menu" onPress={onMenu}>
        <Svg width={18} height={14} viewBox="0 0 18 14">
          <Path d="M1 1.5h16M1 7h11M1 12.5h16" stroke={colors.text} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: TOP_BAR, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
});
