import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { sfx } from './feedback';
import { Text } from './Text';
import { colors, fonts, space } from './theme';

/** Velvet background with a soft light from above. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="0%" rx="90%" ry="65%">
            <Stop offset="0" stopColor={colors.superficieAlta} />
            <Stop offset="0.55" stopColor={colors.vellutoAlto} />
            <Stop offset="1" stopColor={colors.velluto} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>
    </View>
  );
}

export function Screen({ children, style, pad = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Backdrop />
      <View style={[{ flex: 1, paddingTop: ins.top, paddingBottom: pad ? ins.bottom : 0, paddingLeft: ins.left, paddingRight: ins.right }, style]}>
        {children}
      </View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  sub,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet' | 'danger';
  sub?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      disabled={disabled}
      onPress={() => {
        sfx('tick');
        onPress();
      }}
      style={({ pressed }) => [styles.btn, styles[kind], pressed && styles.pressed, disabled && { opacity: 0.4 }, style]}
    >
      <Text style={[styles.btnLabel, kind === 'primary' && styles.btnLabelPrimary, kind === 'danger' && { color: colors.pompeiChiaro }]}>{label}</Text>
      {sub ? <Text style={[styles.btnSub, kind === 'primary' && { color: colors.inchiostro, opacity: 0.7 }]}>{sub}</Text> : null}
    </Pressable>
  );
}

export function BackButton({ label = 'Indietro', onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        sfx('tick');
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Path d="M11.5 3.5L6 9l5.5 5.5" stroke={colors.ottoneChiaro} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

export interface Option<T> {
  value: T;
  label: string;
  sub?: string;
}

/** A row of mutually exclusive options. */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const withSub = options.some(o => o.sub);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choice}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) sfx('tick');
              onChange(o.value);
            }}
            style={({ pressed }) => [styles.opt, withSub && styles.optTall, on && styles.optOn, pressed && !on && { opacity: 0.75 }]}
          >
            <Text style={[styles.optLabel, on && styles.optLabelOn]}>{o.label}</Text>
            {o.sub ? (
              <Text numberOfLines={2} style={[styles.optSub, on && styles.optSubOn]}>
                {o.sub}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        sfx('tick');
        onChange(!value);
      }}
      style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.8 }]}
    >
      <View style={{ flex: 1 }}>
        <Text v="label">{label}</Text>
        {sub ? <Text v="small">{sub}</Text> : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      {note ? (
        <Text v="small" style={{ marginTop: space.s }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.velluto },
  btn: {
    minHeight: 54,
    borderRadius: 27,
    paddingHorizontal: space.xl,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.ottone,
    borderWidth: 1,
    borderColor: colors.ottoneChiaro,
    boxShadow: '0px 6px 18px rgba(200,161,90,0.25)',
  },
  secondary: { backgroundColor: 'rgba(242,236,224,0.06)', borderWidth: 1, borderColor: colors.linea },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'rgba(178,58,46,0.12)', borderWidth: 1, borderColor: 'rgba(217,100,90,0.35)' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  btnLabel: { fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 21, color: colors.marmo },
  btnLabelPrimary: { color: colors.inchiostro },
  btnSub: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 16, color: colors.salvia, marginTop: 1 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.linea,
    backgroundColor: 'rgba(10,26,20,0.4)',
  },
  choice: { flexDirection: 'row', gap: space.s },
  opt: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(242,236,224,0.04)',
    borderWidth: 1,
    borderColor: colors.lineaTenue,
  },
  optTall: { alignItems: 'flex-start', justifyContent: 'flex-start', minHeight: 82, paddingHorizontal: 12 },
  optOn: { backgroundColor: 'rgba(200,161,90,0.14)', borderColor: colors.ottone },
  optLabel: { fontFamily: fonts.uiSemi, fontSize: 15, lineHeight: 19, color: colors.marmoTenue },
  optLabelOn: { color: colors.ottoneChiaro },
  optSub: { fontFamily: fonts.uiRegular, fontSize: 12, lineHeight: 16, color: colors.salvia, marginTop: 3 },
  optSubOn: { color: colors.marmoTenue },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  track: { width: 50, height: 30, borderRadius: 15, backgroundColor: 'rgba(242,236,224,0.12)', padding: 3 },
  trackOn: { backgroundColor: colors.ottone },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.marmoTenue },
  knobOn: { backgroundColor: colors.inchiostro, transform: [{ translateX: 20 }] },
  section: { marginTop: space.xl },
  sectionTitle: { fontFamily: fonts.uiSemi, fontSize: 14, lineHeight: 18, color: colors.salvia, marginBottom: space.s },
});
