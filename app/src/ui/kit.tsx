import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { dur, ease } from './motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { sfx } from './feedback';
import { Text } from './Text';
import { colors, fonts, gradients, radius, shadow, space } from './theme';

/** The sunset sky, with a soft light from the top left. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={gradients.sky.colors}
        locations={gradients.sky.locations}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="sun" cx="12%" cy="6%" rx="70%" ry="42%">
            <Stop offset="0" stopColor="#FFD9A0" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sun)" />
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

/** Pressable that gives a little under the finger and comes back, without bouncing. */
export function Squish({
  style,
  outerStyle,
  children,
  scaleTo = 0.96,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; outerStyle?: StyleProp<ViewStyle>; children: ReactNode; scaleTo?: number }) {
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      style={outerStyle}
      onPressIn={e => {
        s.set(withTiming(scaleTo, { duration: dur.press, easing: ease.in }));
        rest.onPressIn?.(e);
      }}
      onPressOut={e => {
        s.set(withTiming(1, { duration: dur.quick, easing: ease.in }));
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, st]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Glass({ children, style, strong }: { children?: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean }) {
  return <View style={[styles.glass, strong && styles.glassStrong, style]}>{children}</View>;
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
  const primary = kind === 'primary';
  // A button that grows in a row (flex) needs its pressable area to grow too.
  const flex = StyleSheet.flatten(style)?.flex;
  return (
    <Squish
      outerStyle={flex ? { flex } : undefined}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        sfx('tick');
        onPress();
      }}
      style={[styles.btn, styles[kind], disabled && { opacity: 0.45 }, style]}
    >
      {primary ? (
        <LinearGradient
          colors={gradients.primary.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
        />
      ) : null}
      <Text style={[styles.btnLabel, primary && { color: colors.ink }, kind === 'danger' && { color: '#FFE3E3' }]}>{label}</Text>
      {sub ? <Text style={[styles.btnSub, primary && { color: colors.ink, opacity: 0.65 }]}>{sub}</Text> : null}
    </Squish>
  );
}

export function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        sfx('tick');
        onPress();
      }}
      style={styles.icon}
      scaleTo={0.9}
    >
      {children}
    </Squish>
  );
}

export function BackButton({ label = 'Indietro', onPress }: { label?: string; onPress?: () => void }) {
  return (
    <IconButton
      label={label}
      onPress={() => {
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Path d="M11.5 3.5L6 9l5.5 5.5" stroke={colors.text} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </IconButton>
  );
}

export interface Option<T> {
  value: T;
  label: string;
}

/** A row of mutually exclusive options: the chosen one turns white. */
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
  // Con tante voci le pillole si stringono, per restare su una riga anche sul telefono piccolo.
  const compact = options.length >= 5 || options.some(o => o.label.length * options.length > 30);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.choice, compact && { gap: 5 }]}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Squish
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) sfx('tick');
              onChange(o.value);
            }}
            outerStyle={{ flex: 1 }}
            style={[styles.opt, compact && styles.optCompact, on && styles.optOn]}
          >
            <Text style={[styles.optLabel, compact && styles.optLabelCompact, on && styles.optLabelOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {o.label}
            </Text>
          </Squish>
        );
      })}
    </View>
  );
}

export function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, { duration: dur.quick, easing: ease.move });
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        sfx('tick');
        onChange(!value);
      }}
      style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1 }}>
        <Text v="label">{label}</Text>
        {sub ? <Text v="small">{sub}</Text> : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <Animated.View style={[styles.knob, value && styles.knobOn, knob]} />
      </View>
    </Pressable>
  );
}

export function Section({ title, children, note }: { title: string; children?: ReactNode; note?: string }) {
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
  screen: { flex: 1, backgroundColor: colors.night },
  glass: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassLine, borderRadius: radius.l },
  glassStrong: { backgroundColor: colors.glassStrong },
  btn: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primary: { boxShadow: '0px 10px 28px rgba(255,255,255,0.35)' },
  secondary: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassLine },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'rgba(255,90,90,0.22)', borderWidth: 1, borderColor: 'rgba(255,170,170,0.45)' },
  btnLabel: { fontFamily: fonts.bold, fontSize: 16.5, lineHeight: 21, color: colors.text },
  btnSub: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 16, color: colors.textSoft, marginTop: 1 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  choice: { flexDirection: 'row', gap: space.s },
  opt: {
    height: 48,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLineSoft,
  },
  optOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF', boxShadow: '0px 8px 20px rgba(255,255,255,0.28)' },
  optLabel: { fontFamily: fonts.semi, fontSize: 14.5, lineHeight: 18, color: colors.text },
  optLabelOn: { color: colors.ink },
  optCompact: { paddingHorizontal: 2 },
  optLabelCompact: { fontSize: 12.5, lineHeight: 16, letterSpacing: -0.2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  track: { width: 52, height: 32, borderRadius: 16, backgroundColor: colors.glassStrong, padding: 4 },
  trackOn: { backgroundColor: colors.sun },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', boxShadow: shadow.card },
  knobOn: { backgroundColor: colors.ink },
  section: { marginTop: space.xl },
  sectionTitle: { fontFamily: fonts.semi, fontSize: 13.5, lineHeight: 18, color: colors.textSoft, marginBottom: space.s },
});
