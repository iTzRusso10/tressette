import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/ui/Text';
import { colors, space } from '@/ui/theme';

/** A panel rising from the bottom over a dimmed table. */
export function Sheet({ title, sub, children, onDismiss }: { title: string; sub?: string; children: ReactNode; onDismiss?: () => void }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, styles.dim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Chiudi" disabled={!onDismiss} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(320)}
        exiting={SlideOutDown.duration(220)}
        accessibilityViewIsModal
        style={[styles.panel, { paddingBottom: ins.bottom + space.l }]}
      >
        <View style={styles.grip} />
        <ScrollView bounces={false} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <Text v="h2" accessibilityRole="header">
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
  dim: { backgroundColor: 'rgba(5,14,10,0.62)' },
  panel: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.linea,
    boxShadow: '0px -10px 30px rgba(0,0,0,0.35)',
  },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.linea, marginTop: 10 },
  inner: { paddingHorizontal: space.xl, paddingTop: space.l },
});
