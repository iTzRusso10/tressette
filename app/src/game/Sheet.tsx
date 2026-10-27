import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { dur, ease } from '@/ui/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/ui/Text';
import { colors, space } from '@/ui/theme';

/** A panel rising from the bottom over a dimmed table. */
export function Sheet({ title, sub, children, onDismiss }: { title: string; sub?: string; children: ReactNode; onDismiss?: () => void }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View entering={FadeIn.duration(dur.enter)} exiting={FadeOut.duration(dur.exit)} style={[StyleSheet.absoluteFill, styles.dim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Chiudi" disabled={!onDismiss} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(dur.enter + 40).easing(ease.in)}
        exiting={SlideOutDown.duration(dur.exit).easing(ease.out)}
        accessibilityViewIsModal
        style={[styles.panel, { paddingBottom: ins.bottom + space.l }]}
      >
        <LinearGradient
          colors={['#6A2A95', '#43197A', colors.night]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.bg]}
        />
        <View style={styles.grip} />
        <ScrollView bounces={false} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <Text v="h1" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34 }}>
            {title}
          </Text>
          {sub ? (
            <Text v="body" style={{ marginTop: space.xs }}>
              {sub}
            </Text>
          ) : null}
          <View style={{ marginTop: space.l }}>{children}</View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 2000, justifyContent: 'flex-end' },
  dim: { backgroundColor: 'rgba(30,6,56,0.55)' },
  panel: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glassLine,
    boxShadow: '0px -12px 34px rgba(30,6,56,0.4)',
  },
  bg: { borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  grip: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.glassLine, marginTop: 10 },
  inner: { paddingHorizontal: space.xl, paddingTop: space.l },
});
