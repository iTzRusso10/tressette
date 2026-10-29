// Pezzi condivisi della progressione: rarità, barra di avanzamento, ricompense, achievement.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { AchievementCategory } from '@/meta/achievements';
import type { Reward } from '@/meta/arenas';
import { itemByKey } from '@/meta/catalog';
import type { Rarity } from '@/meta/rarity';
import { RARITY_NAMES } from '@/meta/rarity';
import { titleById } from '@/meta/titles';
import { ItemPreview } from './cosmetics';
import { Icon } from './icons';
import { CoinIcon, type Glyph } from './meta';
import { dur, ease } from './motion';
import { Text } from './Text';
import { colors, fonts, radius, space } from './theme';

/* ------------------------------------------------------------------ rarità */

/** Sei rarità, sei colori; il nome è sempre scritto (il colore da solo non basta). */
export const RARITY_STYLE: Record<Rarity, { colors: [string, string]; ink: string }> = {
  comune: { colors: ['#ECE7F4', '#C2B8D6'], ink: colors.ink },
  noncomune: { colors: ['#B8F5D6', '#3CC489'], ink: '#073D25' },
  raro: { colors: ['#A8E2FF', '#4C9BFF'], ink: '#062B5A' },
  epico: { colors: ['#E6BEFF', '#A35CFF'], ink: '#2A0B52' },
  leggendario: { colors: ['#FFF0A6', '#FFB02E'], ink: '#4A2A00' },
  mitico: { colors: ['#FFC4D8', '#F0457A'], ink: '#4A0620' },
};
export const rarityColor = (r: Rarity) => RARITY_STYLE[r].colors[1];

export function RarityChip({ rarity, style }: { rarity: Rarity; style?: StyleProp<ViewStyle> }) {
  const r = RARITY_STYLE[rarity];
  return (
    <LinearGradient colors={r.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.chip, style]}>
      <Text style={[styles.chipText, { color: r.ink }]}>{RARITY_NAMES[rarity]}</Text>
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ barra */

/**
 * Una barra che si riempie: arriva al nuovo valore rallentando, solo quando il valore cambia.
 * Altezza fissa: non sposta niente intorno a sé.
 */
export function Bar({ have, need, height = 8, color = colors.sun, style }: { have: number; need: number; height?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const p = need > 0 ? Math.max(0, Math.min(1, have / need)) : 1;
  const v = useSharedValue(p);
  useEffect(() => {
    v.value = reduce ? p : withTiming(p, { duration: dur.enter * 2, easing: ease.in });
  }, [p, reduce, v]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(v.value > 0 ? 3 : 0, v.value * 100)}%` }));
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: need, now: Math.min(have, need) }}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}

/* ------------------------------------------------------------------ ricompense */

/** Una ricompensa in una riga: monete, titolo, oggetti in piccolo con il nome. */
export function RewardRow({ reward, extraCoins, size = 52, label }: { reward: Reward & { xp?: number }; extraCoins?: number; size?: number; label?: string }) {
  const items = (reward.items ?? []).map(k => itemByKey(k)).filter(i => !!i);
  const title = reward.title ? titleById(reward.title) : undefined;
  const coins = (reward.coins ?? 0) + (extraCoins ?? 0);
  if (!items.length && !title && !coins) return null;
  const ph = Math.round(size * 0.7);
  return (
    <View style={styles.rewards} accessibilityLabel={label}>
      {items.map(i => (
        <View key={`${i.slot}:${i.id}`} style={[styles.reward, { width: size + 18 }]}>
          <ItemPreview item={i} width={size} height={ph} />
          <Text style={styles.rewardText} numberOfLines={2}>
            {i.name}
          </Text>
        </View>
      ))}
      {title ? (
        <View style={[styles.reward, { width: size + 26 }]}>
          <View style={[styles.rewardBox, { height: ph }]}>
            <Icon name="crown" size={22} color={colors.sun} />
          </View>
          <Text style={styles.rewardText} numberOfLines={2}>
            Titolo «{title.name}»
          </Text>
        </View>
      ) : null}
      {coins ? (
        <View style={[styles.reward, { width: size }]}>
          <View style={[styles.rewardBox, { height: ph }]}>
            <CoinIcon size={24} />
          </View>
          <Text style={styles.rewardText}>+{coins.toLocaleString('it-IT')}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ categorie */

export const CATEGORY_GLYPH: Record<AchievementCategory, Glyph> = {
  prime: 'star',
  vittorie: 'cup',
  serie: 'flame',
  partite: 'calendar',
  arene: 'castle',
  trofei: 'cup',
  scopa: 'broom',
  briscola: 'cards',
  tressette: 'seven',
  tavolini: 'table',
  panni: 'cloth',
  dorsi: 'back',
  set: 'gem',
  missioni: 'list',
  stagioni: 'calendar',
  sfide: 'bolt',
  segreti: 'star',
};

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center' },
  chipText: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.3, textTransform: 'uppercase' },
  track: { backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.m },
  reward: { alignItems: 'center', gap: 4 },
  rewardBox: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: radius.s, backgroundColor: 'rgba(255,255,255,0.08)' },
  rewardText: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 13, color: colors.textSoft, textAlign: 'center' },
});
