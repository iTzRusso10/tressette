// Previews of what you can own: a table with its felt and design, a card back, a design on a piece of
// cloth. Used in the shop, among the trophies and on the home screen. Still pictures: nothing moves.
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BACKS, backImage, FRONTS } from '@/game/cardImages';
import { FeltArt, RIM } from '@/game/Felt';
import { useProfile } from '@/meta/profile';
import type { Item } from '@/meta/shop';
import { CARD_RATIO, cardRadius, shadow } from './theme';

/** A felt this wide is drawn at the table's own proportions (rim, corners, trim); smaller ones in scale. */
const TABLE_W = 360;

/** A card shadow that stays in proportion on very small cards. */
const cardShadow = (w: number) => (w >= 34 ? shadow.card : `0px ${w >= 22 ? 1.5 : 1}px ${w >= 22 ? 3.5 : 2.5}px rgba(30,6,60,0.34)`);

/** One card lying on the table: face up (`front`, 0…39) or face down with a back image. */
function Card({ src, w, x, y, r }: { src: number; w: number; x: number; y: number; r: number }) {
  const h = w * CARD_RATIO;
  const rad = cardRadius(w);
  return (
    <View
      style={[
        styles.card,
        { left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: rad, boxShadow: cardShadow(w), transform: [{ rotate: `${r}deg` }] },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: rad }]}>
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
      </View>
    </View>
  );
}

export interface TablePreviewProps {
  /** Felt id (shop.ts). */
  felt: string;
  /** Design id (shop.ts). */
  pattern: string;
  /** Back id for the covered cards; the classic one when missing. */
  back?: string;
  width: number;
  height: number;
  /** Lay a few cards on it: the Settebello face up and two covered cards. */
  cards?: boolean;
}

/** A small table: the same felt as in a match, in scale, with a few cards on it like a photo. */
export const TablePreview = memo(function TablePreview({ felt, pattern, back, width, height, cards }: TablePreviewProps) {
  const s = Math.max(0.3, Math.min(1, width / TABLE_W));
  const B = Math.max(1.5, RIM * s);
  const rad = Math.min(34 * s, (width - 2 * B) * 0.09) + B;
  const iw = width - 2 * B;
  const ih = height - 2 * B;
  // Cards in proportion to the cloth: tall enough to read, never wider than a fifth of it.
  const cw = Math.min((ih * 0.5) / CARD_RATIO, iw * 0.19);
  const cx = width / 2;
  const cy = height / 2 + ih * 0.02;
  const backSrc = backImage(back);
  const big = width >= 160;
  return (
    <View
      style={{ width, height, borderRadius: rad, boxShadow: `0px ${Math.round(4 + 8 * s)}px ${Math.round(10 + 18 * s)}px rgba(40,8,70,0.38)` }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <FeltArt felt={felt} pattern={pattern} width={width} height={height} scale={s} boost={big ? 1.25 : 1.6} />
      {cards ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* The covered cards: a small pile to the left, the top one turned a little. */}
          <Card src={backSrc} w={cw} x={cx - cw * 0.92} y={cy + cw * 0.04} r={-8} />
          <Card src={backSrc} w={cw} x={cx - cw * 0.62} y={cy - cw * 0.02} r={3} />
          {/* The Settebello, just played. */}
          <Card src={FRONTS[16]} w={cw} x={cx + cw * 0.78} y={cy} r={7} />
        </View>
      ) : null}
    </View>
  );
});

/** A card face down with this back. */
export const BackPreview = memo(function BackPreview({ id, width }: { id: string; width: number }) {
  const h = Math.round(width * CARD_RATIO);
  const rad = cardRadius(width);
  return (
    <View
      style={[styles.single, { width, height: h, borderRadius: rad, boxShadow: cardShadow(width) }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: rad }]}>
        <Image source={BACKS[id] ?? backImage(id)} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
      </View>
    </View>
  );
});

/** A design on a piece of cloth (the emerald one unless a felt is given). */
export const PatternPreview = memo(function PatternPreview({
  pattern,
  felt = 'smeraldo',
  width,
  height,
}: {
  pattern: string;
  felt?: string;
  width: number;
  height: number;
}) {
  const s = Math.max(0.3, Math.min(1, width / TABLE_W));
  const rad = Math.min(34 * s, width * 0.09);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: rad,
        overflow: 'hidden',
        boxShadow: `0px ${Math.round(3 + 6 * s)}px ${Math.round(8 + 14 * s)}px rgba(40,8,70,0.34)`,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <FeltArt felt={felt} pattern={pattern} width={width} height={height} scale={s} rim={false} boost={1.9} />
    </View>
  );
});

/** The right preview for an item of the shop: a table for a felt, cloth for a design, a card for a back. */
export function ItemPreview({ item, width, height }: { item: Item; width: number; height: number }) {
  // A design is shown on the felt you use, so you see it as it will be.
  const felt = useProfile(s => s.equipped.felt);
  if (item.slot === 'back') {
    // As tall as the box allows, in card proportions.
    const w = Math.min(width, height / CARD_RATIO);
    return (
      <View style={[styles.center, { width, height }]}>
        <BackPreview id={item.id} width={Math.floor(w)} />
      </View>
    );
  }
  if (item.slot === 'pattern') return <PatternPreview pattern={item.id} felt={felt} width={width} height={height} />;
  return <TablePreview felt={item.id} pattern="nessuno" width={width} height={height} cards={height >= 64} />;
}

const styles = StyleSheet.create({
  card: { position: 'absolute', backgroundColor: '#FFFFFF' },
  single: { backgroundColor: '#FFFFFF' },
  /** The same clean edge as the cards on the table (CardSprite). */
  clip: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(46,18,87,0.22)' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
