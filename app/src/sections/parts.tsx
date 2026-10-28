import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { sfx } from '@/ui/feedback';
import { Squish } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';

/** The column every section is laid out in: centered, never wider than a phone and a half. */
export function SectionScroll({ children, max = 560, refresh }: { children: ReactNode; max?: number; refresh?: ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { width: Math.min(width, max) }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refresh as never}
    >
      {children}
    </ScrollView>
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <Text v="h1" accessibilityRole="header">
          {title}
        </Text>
        {sub ? (
          <Text v="body" style={{ marginTop: 2 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Una riga di filtri a pillola che scorre in orizzontale: quello scelto è bianco. */
export function FilterChips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Squish
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) sfx('tick');
              onChange(o.value);
            }}
            style={[styles.filter, on && styles.filterOn]}
          >
            <Text style={[styles.filterText, on && styles.filterTextOn]}>{o.label}</Text>
          </Squish>
        );
      })}
    </ScrollView>
  );
}

/** A panel of violet glass, the container for content in the sections. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: space.s, paddingBottom: space.xxxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginBottom: space.l },
  filters: { gap: space.s, paddingRight: space.l },
  filter: { height: 40, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  filterOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  filterText: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 17, color: colors.text },
  filterTextOn: { color: colors.ink },
  panel: { padding: space.l, borderRadius: radius.l, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
});
