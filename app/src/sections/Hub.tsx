import { router, useLocalSearchParams } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { levelOf } from '@/meta/economy';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { sfx } from '@/ui/feedback';
import { Icon, TrophyIcon, type IconName } from '@/ui/icons';
import { IconButton, Screen, Squish } from '@/ui/kit';
import { CoinPill, CountUp, LevelAvatar } from '@/ui/meta';
import { Text } from '@/ui/Text';
import { colors, fonts, radius, space } from '@/ui/theme';
import { Amici } from './Amici';
import { Classifica } from './Classifica';
import { Gioca } from './Gioca';
import { Negozio } from './Negozio';
import { Trofei } from './Trofei';

export type Tab = 'negozio' | 'amici' | 'gioca' | 'classifica' | 'trofei';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'negozio', label: 'Negozio', icon: 'shop' },
  { id: 'amici', label: 'Amici', icon: 'friends' },
  { id: 'gioca', label: 'Gioca', icon: 'play' },
  { id: 'classifica', label: 'Classifica', icon: 'podium' },
  { id: 'trofei', label: 'Trofei', icon: 'trophy' },
];
const HOME = 2;

interface Tabs {
  go: (t: Tab) => void;
  active: Tab;
  /** Shows a panel over the whole hub (above the bar), or closes it with null. */
  sheet: (node: ReactNode | null) => void;
}
const TabsContext = createContext<Tabs>({ go: () => {}, active: 'gioca', sheet: () => {} });
/** Lets a section switch to another section (the Gioca arena card opens the Trofei road, and so on). */
export const useTabs = () => useContext(TabsContext);

/** The bar above every section: you (level), your trophies, your coins, settings. */
function HubTop({ onTrophies }: { onTrophies: () => void }) {
  const name = useSettings(s => s.name.trim());
  const account = useProfile(s => s.account);
  const xp = useProfile(s => s.xp);
  const coins = useProfile(s => s.coins);
  const cups = useProfile(s => s.cups);
  const shown = account?.name || name;
  return (
    <View style={styles.top}>
      <Squish accessibilityRole="button" accessibilityLabel={`Il tuo profilo, livello ${levelOf(xp)}`} onPress={() => router.push('/profilo')} scaleTo={0.94}>
        <View style={styles.me}>
          <LevelAvatar name={shown} xp={xp} size={44} />
          <Text v="label" numberOfLines={1} style={styles.meName}>
            {shown || 'Profilo'}
          </Text>
        </View>
      </Squish>
      <View style={{ flex: 1 }} />
      <Squish accessibilityRole="button" accessibilityLabel={`${cups} trofei`} onPress={onTrophies} scaleTo={0.94}>
        <View style={styles.pill}>
          <TrophyIcon size={22} />
          <CountUp value={cups} style={styles.pillText} />
        </View>
      </Squish>
      <CoinPill coins={coins} />
      <IconButton label="Impostazioni" onPress={() => router.push('/impostazioni')}>
        <Icon name="gear" size={20} stroke={1.7} />
      </IconButton>
    </View>
  );
}

function TabBar({ index, x, width, onPress }: { index: number; x: { value: number }; width: number; onPress: (i: number) => void }) {
  const ins = useSafeAreaInsets();
  const barW = Math.min(width, 560);
  const itemW = barW / TABS.length;
  // The light under the current tab follows the pages as they slide.
  const light = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value / Math.max(1, width)) * itemW }] }));
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(ins.bottom, 8) }]}>
      <View style={{ width: barW, alignSelf: 'center', height: 62 }}>
        <Animated.View pointerEvents="none" style={[styles.light, { width: itemW - 8 }, light]} />
        <View style={styles.items} accessibilityRole="tablist">
          {TABS.map((t, i) => {
            const on = i === index;
            const center = i === HOME;
            return (
              <Squish
                key={t.id}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: on }}
                onPress={() => onPress(i)}
                outerStyle={{ width: itemW }}
                style={styles.item}
                scaleTo={0.9}
              >
                {center ? (
                  <View style={[styles.playBubble, on && styles.playBubbleOn]}>
                    <Icon name="play" size={24} color={on ? colors.ink : colors.text} stroke={2.1} />
                  </View>
                ) : (
                  <Icon name={t.icon} size={23} color={on ? colors.sun : colors.textSoft} stroke={on ? 2.2 : 1.8} />
                )}
                <Text style={[styles.itemLabel, on && styles.itemLabelOn]} numberOfLines={1}>
                  {t.label}
                </Text>
              </Squish>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Page({ width, mounted, children }: { width: number; mounted: boolean; children: ReactNode }) {
  return <View style={{ width, flex: 1 }}>{mounted ? children : null}</View>;
}

/**
 * The heart of the app: five sections side by side, swiped like pages, with a bar at the bottom.
 * Gioca is in the middle and is where the app opens.
 */
export function Hub() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const start = Math.max(0, TABS.findIndex(t => t.id === tab));
  const first = tab && start >= 0 && TABS[start]?.id === tab ? start : HOME;
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(first);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([first]));
  const ref = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [overlay, setOverlay] = useState<ReactNode | null>(null);

  /** A page becomes the current one: it and its neighbours get mounted (so a swipe never shows a blank page). */
  const show = useCallback((i: number) => {
    setIndex(i);
    setSeen(s => (s.has(i) && s.has(i - 1) && s.has(i + 1) ? s : new Set([...s, i, i - 1, i + 1].filter(n => n >= 0 && n < TABS.length))));
  }, []);

  // A link like /?tab=negozio while the hub is already open.
  const [prevTab, setPrevTab] = useState(tab);
  if (tab !== prevTab) {
    setPrevTab(tab);
    const i = TABS.findIndex(t => t.id === tab);
    if (i >= 0) show(i);
  }

  // While the pages slide to a tapped tab they pass over the others: those must not become current.
  const heading = useSharedValue(-1);
  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      heading.value = -1;
    },
    onScroll: e => {
      x.value = e.contentOffset.x;
      const i = Math.round(e.contentOffset.x / Math.max(1, width));
      if (Math.abs(e.contentOffset.x - i * width) >= 2) return;
      if (heading.value >= 0 && heading.value !== i) return;
      heading.value = -1;
      runOnJS(show)(i);
    },
  });

  // The pages follow the current index: at once when opening or when the window changes size
  // (desktop, rotation), sliding when a tab is tapped. A swipe has already put them there.
  const shownWidth = useRef(0);
  useEffect(() => {
    const target = index * width;
    const jump = shownWidth.current !== width;
    shownWidth.current = width;
    if (Math.abs(x.value - target) < 1 && !jump) return;
    const id = setTimeout(() => ref.current?.scrollTo({ x: target, animated: !jump }), 0);
    return () => clearTimeout(id);
  }, [index, width, ref, x]);

  const go = (i: number) => {
    if (i === index) return;
    sfx('tick', { haptic: false });
    heading.value = i;
    show(i);
  };

  const ctx: Tabs = { go: (t: Tab) => go(TABS.findIndex(x2 => x2.id === t)), active: TABS[index].id, sheet: setOverlay };

  return (
    <TabsContext.Provider value={ctx}>
      <Screen pad={false}>
        <HubTop onTrophies={() => go(4)} />
        <Animated.ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentOffset={{ x: first * width, y: 0 }}
          style={{ flex: 1 }}
        >
          <Page width={width} mounted={seen.has(0)}>
            <Negozio active={index === 0} />
          </Page>
          <Page width={width} mounted={seen.has(1)}>
            <Amici active={index === 1} />
          </Page>
          <Page width={width} mounted={seen.has(2)}>
            <Gioca active={index === 2} />
          </Page>
          <Page width={width} mounted={seen.has(3)}>
            <Classifica active={index === 3} />
          </Page>
          <Page width={width} mounted={seen.has(4)}>
            <Trofei active={index === 4} />
          </Page>
        </Animated.ScrollView>
        <TabBar index={index} x={x} width={width} onPress={go} />
        {overlay}
      </Screen>
    </TabsContext.Provider>
  );
}

const styles = StyleSheet.create({
  top: { height: 60, flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.l, width: '100%', maxWidth: 720, alignSelf: 'center' },
  me: { flexDirection: 'row', alignItems: 'center', gap: space.s, maxWidth: 150 },
  meName: { flexShrink: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingLeft: 8,
    paddingRight: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.shade,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  pillText: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  bar: {
    backgroundColor: 'rgba(28,8,52,0.88)',
    borderTopWidth: 1,
    borderTopColor: colors.glassLineSoft,
    paddingTop: 6,
  },
  items: { flexDirection: 'row', height: 62 },
  item: { height: 62, alignItems: 'center', justifyContent: 'center', gap: 3 },
  itemLabel: { fontFamily: fonts.semi, fontSize: 11, lineHeight: 14, color: colors.textSoft },
  itemLabelOn: { color: colors.text, fontFamily: fonts.bold },
  light: { position: 'absolute', left: 4, top: 2, height: 58, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,0.10)' },
  playBubble: {
    width: 40,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  playBubbleOn: { backgroundColor: colors.sun },
});
