// Le anteprime di quello che si può possedere: un tavolino con il suo panno, una grafica del panno, un
// dorso. Si usano nel negozio, tra i trofei e nella schermata iniziale. Immagini ferme: niente si muove.
import { Image } from 'expo-image';
import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { backImage, FRONTS } from '@/game/cardImages';
import { FeltArt, RAIL } from '@/game/Felt';
import { useProfile } from '@/meta/profile';
import type { Item } from '@/meta/catalog';
import type { Rarity } from '@/meta/rarity';
import { CARD_RATIO, cardRadius, fonts, shadow } from './theme';
import { Text } from './Text';

/** Un tavolo largo così si disegna nelle proporzioni del tavolo vero (sponda, angoli, filetto); più piccoli in scala. */
const TABLE_W = 360;

/** Un'ombra di carta che resta in proporzione anche sulle carte piccolissime. */
const cardShadow = (w: number) => (w >= 34 ? shadow.card : `0px ${w >= 22 ? 1.5 : 1}px ${w >= 22 ? 3.5 : 2.5}px rgba(30,6,60,0.34)`);

/** Una carta sul tavolo: scoperta (`FRONTS[c]`) o coperta con un dorso. */
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
  /** Id del tavolino (la sponda). */
  table: string;
  /** Id della grafica del panno. */
  felt: string;
  /** Id del dorso delle carte coperte; il classico se manca. */
  back?: string;
  width: number;
  height: number;
  /** Qualche carta sopra: il Settebello scoperto e due carte coperte. */
  cards?: boolean;
}

/** Un tavolo piccolo: lo stesso della partita, in scala, con qualche carta sopra come in una foto. */
export const TablePreview = memo(function TablePreview({ table, felt, back, width, height, cards }: TablePreviewProps) {
  const s = Math.max(0.3, Math.min(1, width / TABLE_W));
  const B = Math.max(2, RAIL * s);
  const rad = Math.min(34 * s, (width - 2 * B) * 0.09) + B;
  const iw = width - 2 * B;
  const ih = height - 2 * B;
  // Carte in proporzione al panno: alte abbastanza da leggersi, mai più larghe di un quinto.
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
      <FeltArt table={table} felt={felt} width={width} height={height} scale={s} boost={big ? 1.25 : 1.6} />
      {cards ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Le carte coperte: un mazzetto a sinistra, quella sopra un po' girata. */}
          <Card src={backSrc} w={cw} x={cx - cw * 0.92} y={cy + cw * 0.04} r={-8} />
          <Card src={backSrc} w={cw} x={cx - cw * 0.62} y={cy - cw * 0.02} r={3} />
          {/* Il Settebello, appena giocato. */}
          <Card src={FRONTS[16]} w={cw} x={cx + cw * 0.78} y={cy} r={7} />
        </View>
      ) : null}
    </View>
  );
});

/** Una carta coperta con questo dorso. */
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
        <Image source={backImage(id)} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
      </View>
    </View>
  );
});

/** Una grafica del panno da sola, senza sponda: un pezzo di panno. */
export const ClothPreview = memo(function ClothPreview({ felt, width, height }: { felt: string; width: number; height: number }) {
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
      <FeltArt table="vetro" felt={felt} width={width} height={height} scale={s} rim={false} boost={1.6} />
    </View>
  );
});

/* ------------------------------------------------------------------ in arrivo */

/** I colori di ogni rarità per la sagoma «in arrivo»: luce, colore pieno, ombra. */
const RARITY_TINT: Record<Rarity, [string, string, string]> = {
  comune: ['#F2EEF8', '#BEB3D3', '#6E6290'],
  noncomune: ['#C8F5D8', '#5CCB8A', '#1E6B44'],
  raro: ['#CFEFFF', '#4C9BFF', '#163E8A'],
  epico: ['#F0DAFF', '#A35CFF', '#45198A'],
  leggendario: ['#FFF4C2', '#FFB02E', '#8A4A00'],
  mitico: ['#FFD8E8', '#FF5A8A', '#7A0F3A'],
};

/**
 * Un oggetto «in arrivo»: la sua forma (tavolo o carta) in vetro scuro, bordata del colore della
 * rarità, con una matita e un pennello incrociati e la scritta. Non finge di essere la grafica vera.
 */
export const ComingPreview = memo(function ComingPreview({ item, width, height }: { item: Item; width: number; height: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hi, mid, lo] = RARITY_TINT[item.rarity] ?? RARITY_TINT.comune;
  const card = item.slot === 'back';
  // La sagoma: una carta in proporzione o un tavolo che riempie il riquadro.
  const sw = card ? Math.min(width, height / CARD_RATIO) : width;
  const sh = card ? sw * CARD_RATIO : height;
  const r = card ? cardRadius(sw) : Math.min(sw, sh) * 0.14;
  const m = Math.min(sw, sh);
  const icon = Math.max(14, Math.min(46, m * (card ? 0.34 : 0.3)));
  const label = m >= 54;
  const fs = Math.max(9, Math.min(13, m * 0.1));
  const inset = Math.max(3, Math.min(9, m * 0.06));
  return (
    <View style={[styles.center, { width, height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: sw, height: sh, borderRadius: r, boxShadow: `0px ${Math.round(2 + m * 0.03)}px ${Math.round(6 + m * 0.08)}px rgba(30,6,60,0.32)` }}>
        <Svg width={sw} height={sh} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`cg${uid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#3A1C66" stopOpacity={0.92} />
              <Stop offset="1" stopColor="#1C0C36" stopOpacity={0.96} />
            </LinearGradient>
            <RadialGradient id={`cl${uid}`} cx="50%" cy="40%" rx="60%" ry="55%">
              <Stop offset="0" stopColor={mid} stopOpacity={0.3} />
              <Stop offset="1" stopColor={mid} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`cb${uid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={hi} />
              <Stop offset="0.5" stopColor={mid} />
              <Stop offset="1" stopColor={lo} />
            </LinearGradient>
          </Defs>
          <Rect x={0.75} y={0.75} width={sw - 1.5} height={sh - 1.5} rx={r} ry={r} fill={`url(#cg${uid})`} stroke={`url(#cb${uid})`} strokeWidth={1.5} />
          <Rect x={0} y={0} width={sw} height={sh} rx={r} ry={r} fill={`url(#cl${uid})`} />
          {/* Una cornice tratteggiata: il posto dove andrà l'illustrazione. */}
          <Rect
            x={inset}
            y={inset}
            width={sw - 2 * inset}
            height={sh - 2 * inset}
            rx={Math.max(2, r - inset)}
            ry={Math.max(2, r - inset)}
            fill="none"
            stroke={hi}
            strokeOpacity={0.4}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {/* Il riflesso del vetro in alto. */}
          <Path d={`M${r} 1.5H${sw - r}`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} strokeLinecap="round" />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <ArtTools size={icon} color={hi} accent={mid} />
          {label ? (
            <Text allowFontScaling={false} style={[styles.coming, { fontSize: fs, color: hi, marginTop: Math.round(icon * 0.18) }]}>
              In arrivo
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

/** Una matita e un pennello incrociati, in linea, disegnati in SVG. */
function ArtTools({ size, color, accent }: { size: number; color: string; accent: string }) {
  const sw = Math.max(1.2, size / 16);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G fill="none" stroke={color} strokeWidth={(sw * 48) / size} strokeLinecap="round" strokeLinejoin="round">
        {/* La matita, da in basso a sinistra in alto a destra. */}
        <Path d="M10 38 L12.5 30.5 L32 11 L37 16 L17.5 35.5 Z" />
        <Path d="M12.5 30.5 L17.5 35.5" />
        <Path d="M28.5 14.5 L33.5 19.5" />
        {/* Il pennello, dall'altra parte. */}
        <Path d="M38 38 L24.5 24.5" />
        <Path d="M21.5 21.5 C18.5 18.5 14.5 18 12 19.5 C13.5 22 12.5 25.5 16 28.5 C19 30.5 22.5 28.5 23.5 26.5 Z" />
      </G>
      <Circle cx={10.6} cy={37.4} r={1.6} fill={accent} />
      <Path d="M21.5 21.5 C18.5 18.5 14.5 18 12 19.5 C13.5 22 12.5 25.5 16 28.5 C19 30.5 22.5 28.5 23.5 26.5 Z" fill={accent} fillOpacity={0.35} />
    </Svg>
  );
}

/**
 * L'anteprima giusta per un oggetto: un tavolino con il panno in uso, un panno sul tavolino in uso,
 * un dorso su una carta. Gli oggetti «in arrivo» hanno la loro sagoma.
 */
export function ItemPreview({ item, width, height }: { item: Item; width: number; height: number }) {
  const equipped = useProfile(s => s.equipped);
  if (item.status === 'coming') return <ComingPreview item={item} width={width} height={height} />;
  if (item.slot === 'back') {
    // Alta quanto il riquadro permette, nelle proporzioni di una carta.
    const w = Math.min(width, height / CARD_RATIO);
    return (
      <View style={[styles.center, { width, height }]}>
        <BackPreview id={item.id} width={Math.floor(w)} />
      </View>
    );
  }
  const cards = height >= 64;
  if (item.slot === 'table') return <TablePreview table={item.id} felt={equipped.felt} back={equipped.back} width={width} height={height} cards={cards} />;
  return <TablePreview table={equipped.table} felt={item.id} back={equipped.back} width={width} height={height} cards={cards} />;
}

const styles = StyleSheet.create({
  card: { position: 'absolute', backgroundColor: '#FFFFFF' },
  single: { backgroundColor: '#FFFFFF' },
  /** Lo stesso bordo pulito delle carte sul tavolo (CardSprite). */
  clip: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(46,18,87,0.22)' },
  center: { alignItems: 'center', justifyContent: 'center' },
  coming: { fontFamily: fonts.bold, letterSpacing: 0.4, textTransform: 'uppercase' },
});
