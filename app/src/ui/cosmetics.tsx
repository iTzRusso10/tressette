// Le anteprime di quello che si può possedere: un tavolino con il suo panno, una grafica del panno, un dorso,
// una cornice. Si usano nel negozio, tra i trofei, nella schermata iniziale, nel profilo e sul palco della
// personalizzazione (src/app/personalizza.tsx). Il tavolo vero della partita è Felt.tsx: qui si usa lo stesso
// disegno (FeltArt) e in vetrina gli si posano sopra i materiali di Lampara (src/ui/arte/oggetti.ts).
//
// Export (FIRME INVARIATE: le usano hub, trofei, profilo, banner, stagione):
// - `TablePreview` { table, felt, back?, width, height, cards? }  il tavolo in scala. Le carte (il mazzetto coperto e
//                  il Settebello) stanno in basso a destra, piccole, così il disegno del panno (bordi, angoli e
//                  centro) resta libero. Da 160 punti in su: la trama cotta del tessuto, la grana del materiale
//                  sulla sponda (legno, cuoio, metallo spazzolato, marmo, lacca), la cucitura a due toni, lo
//                  spessore del piano con l'ombra di contatto e la luce dall'alto a sinistra.
// - `BackPreview`  { id, width }  una carta coperta con il suo spessore (tre fogli sotto) e la vernice che prende
//                  la luce dall'alto a sinistra, tanto più lucida quanto più è rara. Ferma.
// - `ClothPreview` { felt, width, height }  un pezzo di panno senza sponda, con la sua trama e l'orlo cucito.
// - `ComingPreview`{ item, width, height }  un oggetto «in arrivo»: la sagoma in velluto scuro con il bordo del
//                  metallo della sua rarità, matita e pennello incrociati e la scritta. Non finge la grafica vera.
// - `ItemPreview`  { item, width, height }  l'anteprima giusta per un oggetto (tavolino sul panno in uso, panno sul
//                  tavolino in uso, dorso, cornice).
// - `FramePreview` { frame, width, height }  la cornice intorno al tuo avatar.
// In più, per la vetrina (palco della personalizzazione, scheda dell'oggetto):
// - `TavoloVetrina`{ table, felt, back?, width, height, vivo? }  come TablePreview grande, e se la sponda è di
//                  metallo, vetro, pietra o lacca di rarità epica o più alta, il riflesso passa sulla sponda.
// - `DorsoVetrina` { id, width, vivo? }  come BackPreview, e dall'epico il riflesso passa sulla carta.
// - `FondoRarita`  { rarita, width, height, raggio?, children }  il fondo di una scheda secondo la rarità (negozio,
//                  camerino): comune e non comune legno scuro liscio; raro velluto blu con il filo d'argento; epico
//                  velluto porpora con il filo dorato; leggendario velluto bordeaux, filo d'oro e cantonali d'oro;
//                  mitico madreperla scura, filo d'oro rosa e cantonali con il corallo. Statico.
// Nessuna animazione nelle anteprime: si anima solo la vetrina, solo dall'epico, ferma con riduci movimento.
import { Image } from 'expo-image';
import { LinearGradient as LG } from 'expo-linear-gradient';
import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, RadialGradient, Image as SvgImage, Rect, Stop } from 'react-native-svg';
import { backImage, FRONTS } from '@/game/cardImages';
import { FeltArt, RAIL } from '@/game/Felt';
import { useProfile } from '@/meta/profile';
import { useSettings } from '@/state/settings';
import { PlayerAvatar } from './avatar';
import type { Item } from '@/meta/catalog';
import type { Rarity } from '@/meta/rarity';
import { vetrinaDorso, vetrinaPanno, vetrinaTavolino } from './arte/oggetti';
import { rarita } from './arte/rarita';
import { Riflesso } from './arte/Riflesso';
import { DENSITA_TRAME, TRAME, type NomeTrama } from './arte/trame';
import { fontArte, mescola } from './arte/token';
import { CARD_RATIO, cardRadius } from './theme';
import { Text } from './Text';

/** Un tavolo largo così si disegna nelle proporzioni del tavolo vero (sponda, angoli, filetto); più piccoli in scala. */
const TABLE_W = 360;

/** Ombra di carta: nero caldo (Lampara), in proporzione anche sulle carte piccolissime. */
const cardShadow = (w: number) => (w >= 34 ? '0px 1px 1.5px rgba(8,3,4,0.45), 2px 4px 7px rgba(8,3,4,0.35)' : `0px ${w >= 22 ? 1 : 0.75}px ${w >= 22 ? 2.5 : 1.5}px rgba(8,3,4,0.45)`);

const uidOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

/** Una carta sul tavolo: scoperta (`FRONTS[c]`) o coperta con un dorso. */
function Card({ src, w, x, y, r }: { src: number; w: number; x: number; y: number; r: number }) {
  const h = w * CARD_RATIO;
  const rad = cardRadius(w);
  return (
    <View style={[styles.card, { left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: rad, boxShadow: cardShadow(w), transform: [{ rotate: `${r}deg` }] }]}>
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: rad }]}>
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ materiali in vetrina */

/** La trama cotta (src/ui/arte/trame) dentro un Svg già aperto, ritagliata da `clip`. */
function TramaIn({ nome, opacita, id, clip, scala = 1 }: { nome: NomeTrama; opacita: number; id: string; clip: string; scala?: number }) {
  const t = TRAME[nome];
  const lato = (t.px / DENSITA_TRAME) * scala;
  return (
    <>
      <Defs>
        <Pattern id={id} x={0} y={0} width={lato} height={lato} patternUnits="userSpaceOnUse">
          <SvgImage href={t.src} x={0} y={0} width={lato} height={lato} preserveAspectRatio="none" />
        </Pattern>
      </Defs>
      <Path d={clip} fill={`url(#${id})`} opacity={opacita} fillRule="evenodd" />
    </>
  );
}

const rr = (x: number, y: number, w: number, h: number, r: number) => {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + q} ${y}H${x + w - q}A${q} ${q} 0 0 1 ${x + w} ${y + q}V${y + h - q}A${q} ${q} 0 0 1 ${x + w - q} ${y + h}H${x + q}A${q} ${q} 0 0 1 ${x} ${y + h - q}V${y + q}A${q} ${q} 0 0 1 ${x + q} ${y}Z`;
};

/**
 * Lo strato «di vetrina» sopra FeltArt: la grana del materiale sulla sponda, la trama del tessuto sul panno, la
 * cucitura a due toni (scura e chiara spostata di mezzo punto) e il filo di luce in alto a sinistra sulla sponda.
 * Solo alfa sopra il disegno: i colori del catalogo restano quelli del tavolo vero.
 */
function Vetrina({ table, felt, width, height, B, rad, R0, s }: { table: string; felt: string; width: number; height: number; B: number; rad: number; R0: number; s: number }) {
  const id = 'vt' + uidOf(useId());
  const t = vetrinaTavolino(table);
  const p = vetrinaPanno(felt);
  const sponda = rr(0, 0, width, height, R0) + rr(B, B, width - 2 * B, height - 2 * B, rad);
  const panno = rr(B, B, width - 2 * B, height - 2 * B, rad);
  const cIn = Math.max(4, 9 * s);
  return (
    <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id + 'l'} x1="0" y1="0" x2={width} y2={height} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.7" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.45} />
        </LinearGradient>
        <RadialGradient id={id + 'p'} cx={width * 0.42} cy={height * 0.3} r={Math.max(width, height) * 0.7} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFD9A0" stopOpacity={0.1} />
          <Stop offset="0.6" stopColor="#FFD9A0" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.16} />
        </RadialGradient>
      </Defs>
      {/* il tessuto: trama cotta (panno a fili, velluto a pelo) e la luce calda della lampada da ore 11 */}
      <TramaIn nome={p.trama} opacita={p.opacita} id={id + 'tp'} clip={panno} scala={Math.max(0.5, s)} />
      <Path d={panno} fill={`url(#${id}p)`} />
      {/* la sponda: la grana del suo materiale (legno, cuoio, spazzolato, marmo, lacca) */}
      {t.trama ? <TramaIn nome={t.trama} opacita={t.opacita} id={id + 'ts'} clip={sponda} scala={Math.max(0.35, s * 0.7)} /> : null}
      {/* la cucitura dove il panno incontra la sponda: filo scuro e filo chiaro spostato di mezzo punto */}
      <Path d={rr(B + cIn, B + cIn + 0.6, width - 2 * (B + cIn), height - 2 * (B + cIn), Math.max(2, rad - cIn))} fill="none" stroke="#000000" strokeOpacity={0.3} strokeWidth={Math.max(0.8, 1.1 * s)} strokeDasharray={`${4 * s + 1} ${3 * s + 1}`} />
      {/* il bordo della sponda prende la luce in alto a sinistra e va in ombra in basso a destra */}
      <Path d={rr(0.75, 0.75, width - 1.5, height - 1.5, R0 - 0.75)} fill="none" stroke={`url(#${id}l)`} strokeWidth={1.5} />
      <Path d={rr(B - 0.5, B - 0.5, width - 2 * B + 1, height - 2 * B + 1, rad + 0.5)} fill="none" stroke="#000000" strokeOpacity={0.35} strokeWidth={1} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ tavolo */

export interface TablePreviewProps {
  /** Id del tavolino (la sponda). */
  table: string;
  /** Id della grafica del panno. */
  felt: string;
  /** Id del dorso delle carte coperte; il classico se manca. */
  back?: string;
  width: number;
  height: number;
  /** Qualche carta sopra: il Settebello scoperto e due carte coperte, in un angolo. */
  cards?: boolean;
}

function geometria(width: number, height: number) {
  // In miniatura (100–300 punti) la sponda resta più spessa della scala vera: è lei che dice il materiale
  // (legno, cuoio, metallo, pietra), e sotto i 4,5 punti le sue guarnizioni sparirebbero.
  const vero = width / TABLE_W;
  const s = Math.max(0.3, Math.min(1, width >= 100 ? Math.max(vero, Math.min(0.58, vero * 1.7)) : vero));
  const B = Math.max(2, RAIL * s);
  const rad = Math.min(34 * s, (width - 2 * B) * 0.09);
  return { s, B, rad, R0: rad + B, iw: width - 2 * B, ih: height - 2 * B };
}

/** Le carte in un angolo (in basso a destra, verso chi guarda): mai sopra il centro del disegno. */
function CarteInAngolo({ width, height, back, B, rad, iw, ih }: { width: number; height: number; back?: string; B: number; rad: number; iw: number; ih: number }) {
  // Piccole: un quinto dell'altezza del panno per la carta, così il panno resta il protagonista.
  const cw = Math.max(9, Math.min((ih * 0.34) / CARD_RATIO, iw * 0.12));
  const ch = cw * CARD_RATIO;
  const m = Math.max(rad * 0.55, cw * 0.55) + B;
  const cy = height - m - ch / 2;
  const x1 = width - m - cw * 0.5;
  const backSrc = backImage(back);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* il mazzetto coperto, appena sfalsato, e il Settebello giocato accanto */}
      <Card src={backSrc} w={cw} x={x1 - cw * 1.25} y={cy + cw * 0.04} r={-7} />
      <Card src={backSrc} w={cw} x={x1 - cw * 1.02} y={cy - cw * 0.03} r={3} />
      <Card src={FRONTS[16]} w={cw} x={x1} y={cy - cw * 0.02} r={9} />
    </View>
  );
}

/** Un tavolo piccolo: lo stesso della partita, in scala, con qualche carta in un angolo come in una foto. */
export const TablePreview = memo(function TablePreview({ table, felt, back, width, height, cards }: TablePreviewProps) {
  const g = geometria(width, height);
  const big = width >= 160;
  // Lo spessore del piano: si vede sotto la sponda, in ombra (il tavolo è un oggetto, non un adesivo).
  const piano = big ? Math.max(3, Math.round(5 * g.s)) : 0;
  return (
    <View
      style={{ width, height, borderRadius: g.R0, boxShadow: big ? `0px ${piano}px 0px ${'rgba(14,6,4,0.85)'}, 0px ${piano + 2}px 4px rgba(8,3,4,0.5), ${Math.round(6 * g.s)}px ${Math.round(18 * g.s)}px ${Math.round(26 * g.s)}px rgba(8,3,4,0.45)` : `0px 2px 4px rgba(8,3,4,0.45), 2px 5px 9px rgba(8,3,4,0.3)` }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <FeltArt table={table} felt={felt} width={width} height={height} scale={g.s} boost={big ? 1.25 : 1.6} />
      {big ? <Vetrina table={table} felt={felt} width={width} height={height} B={g.B} rad={g.rad} R0={g.R0} s={g.s} /> : null}
      {cards ? <CarteInAngolo width={width} height={height} back={back} B={g.B} rad={g.rad} iw={g.iw} ih={g.ih} /> : null}
    </View>
  );
});

/**
 * Il tavolo in vetrina: TablePreview con il riflesso che passa sulla sponda lucida delle rarità alte (metallo, vetro,
 * pietra, lacca; dall'epico). Il riflesso corre sulle due fasce lunghe della sponda, in alto e in basso, con lo
 * stesso tempo: è una sola luce che attraversa il tavolo, e non tocca mai il panno (le carte restano leggibili).
 */
export function TavoloVetrina({ table, felt, back, width, height, vivo = true, cards = true }: TablePreviewProps & { vivo?: boolean }) {
  const g = geometria(width, height);
  const t = vetrinaTavolino(table);
  const anima = vivo && t.anima;
  const pausa = rarita(t.rarita).pausaRiflesso ?? 8000;
  const fascia = (top: number) => (
    <View pointerEvents="none" style={{ position: 'absolute', left: g.R0 * 0.6, right: g.R0 * 0.6, top, height: g.B }}>
      <Riflesso forma="rettangolo" larghezza={width - g.R0 * 1.2} altezza={g.B} pausa={pausa} intensita={t.riflesso === 'netto' ? 0.75 : 0.45} ritardo={1100} angolo={30} />
    </View>
  );
  return (
    <View style={{ width, height }}>
      <TablePreview table={table} felt={felt} back={back} width={width} height={height} cards={cards} />
      {anima ? fascia(0) : null}
      {anima ? fascia(height - g.B) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ dorso */

/** La carta coperta: il dorso con lo spessore (tre fogli sotto, spostati in basso a destra) e la vernice. */
function Dorso({ id, width }: { id: string; width: number }) {
  const h = Math.round(width * CARD_RATIO);
  const rad = cardRadius(width);
  const big = width >= 48;
  const d = vetrinaDorso(id);
  const fogli = big ? 3 : 0;
  return (
    <View style={{ width, height: h }}>
      {Array.from({ length: fogli }, (_, i) => (
        // il mazzo sotto: tre bordi di carta avorio, in ombra, per dire che la carta ha uno spessore
        <View key={i} style={[styles.foglio, { left: 0.6 * (fogli - i), top: 0.9 * (fogli - i), width, height: h, borderRadius: rad, opacity: 0.9 - i * 0.12 }]} />
      ))}
      <View style={[styles.single, { width, height: h, borderRadius: rad, boxShadow: cardShadow(width) }]}>
        <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: rad }]}>
          <Image source={backImage(id)} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
          {big ? (
            // la vernice: lucida in alto a sinistra (più lucida per i dorsi rari), il bordo che va in ombra in basso a destra
            <LG
              colors={[`rgba(255,250,235,${0.08 + d.lucido * 0.32})`, 'rgba(255,250,235,0)', 'rgba(255,250,235,0)', 'rgba(8,3,4,0.18)']}
              locations={[0, 0.32, 0.7, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Una carta coperta con questo dorso. */
export const BackPreview = memo(function BackPreview({ id, width }: { id: string; width: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Dorso id={id} width={width} />
    </View>
  );
});

/** Il dorso in vetrina: dall'epico il riflesso passa sulla vernice (mai filtri sulla carta). */
export function DorsoVetrina({ id, width, vivo = true }: { id: string; width: number; vivo?: boolean }) {
  const d = vetrinaDorso(id);
  const h = Math.round(width * CARD_RATIO);
  return (
    <View style={{ width, height: h }}>
      <Dorso id={id} width={width} />
      {vivo && d.anima && width >= 48 ? <Riflesso forma="rettangolo" larghezza={width} altezza={h} raggio={cardRadius(width)} pausa={rarita(d.rarita).pausaRiflesso ?? 8000} intensita={0.42} ritardo={1400} style={styles.solo} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ panno */

/** Una grafica del panno da sola, senza sponda: un pezzo di panno con la sua trama e l'orlo cucito. */
export const ClothPreview = memo(function ClothPreview({ felt, width, height }: { felt: string; width: number; height: number }) {
  const s = Math.max(0.3, Math.min(1, width / TABLE_W));
  const rad = Math.min(34 * s, width * 0.09);
  const id = 'cp' + uidOf(useId());
  const p = vetrinaPanno(felt);
  const big = width >= 120;
  const o = Math.max(3, 6 * s);
  return (
    <View
      style={{ width, height, borderRadius: rad, overflow: 'hidden', boxShadow: `0px 1px 2px rgba(8,3,4,0.5), ${Math.round(3 + 4 * s)}px ${Math.round(8 + 10 * s)}px ${Math.round(14 + 12 * s)}px rgba(8,3,4,0.4)` }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <FeltArt table="vetro" felt={felt} width={width} height={height} scale={s} rim={false} boost={1.6} />
      {big ? (
        <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
          <TramaIn nome={p.trama} opacita={p.opacita} id={id + 't'} clip={rr(0, 0, width, height, rad)} scala={Math.max(0.5, s)} />
          <Path d={rr(o, o + 0.6, width - 2 * o, height - 2 * o, Math.max(2, rad - o))} fill="none" stroke="#000000" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 3" />
          <Path d={rr(o, o, width - 2 * o, height - 2 * o, Math.max(2, rad - o))} fill="none" stroke="#FFFFFF" strokeOpacity={0.28} strokeWidth={0.9} strokeDasharray="4 3" />
        </Svg>
      ) : null}
    </View>
  );
});

/* ------------------------------------------------------------------ fondo della scheda per rarità */

const FONDI: Record<Rarity, { c: [string, string]; filo: string | null; cantonali: string | null; perla?: string }> = {
  comune: { c: ['#2E1E18', '#1A100C'], filo: null, cantonali: null },
  noncomune: { c: ['#33201A', '#1C110C'], filo: null, cantonali: null },
  raro: { c: ['#1E2E4E', '#0C1428'], filo: '#AEB7C2', cantonali: null },
  epico: { c: ['#3A1C4E', '#180A24'], filo: '#C2A672', cantonali: null },
  leggendario: { c: ['#4E1622', '#20070E'], filo: '#E2B24A', cantonali: '#F2C24E' },
  mitico: { c: ['#3E2C38', '#170F16'], filo: '#E3A07A', cantonali: '#E8AC8E', perla: '#D8485A' },
};

/** Il fondo della scheda di un oggetto, secondo la sua rarità (vedi l'intestazione). */
export function FondoRarita({ rarita: r, width, height, raggio = 8, children }: { rarita: Rarity; width: number; height: number; raggio?: number; children?: React.ReactNode }) {
  const id = 'fr' + uidOf(useId());
  const f = FONDI[r] ?? FONDI.comune;
  const k = Math.min(16, Math.max(9, Math.min(width, height) * 0.12));
  const velluto = r !== 'comune' && r !== 'noncomune';
  const angolo = (x: number, y: number, sx: number, sy: number, i: number) => (
    <G key={i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
      <Path d={`M0 0H${k}L${k * 0.78} ${k * 0.22}H${k * 0.22}V${k * 0.78}L0 ${k}Z`} fill={f.cantonali!} />
      <Path d={`M0 0H${k}L${k * 0.78} ${k * 0.22}H${k * 0.22}V${k * 0.78}L0 ${k}Z`} fill={`url(#${id}m)`} />
      {f.perla ? <Circle cx={k * 0.3} cy={k * 0.3} r={k * 0.14} fill={f.perla} /> : <Circle cx={k * 0.3} cy={k * 0.3} r={k * 0.09} fill="#2A1810" opacity={0.5} />}
    </G>
  );
  return (
    <View style={{ width, height, borderRadius: raggio, overflow: 'hidden' }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx="44%" cy="34%" r="80%">
            <Stop offset="0" stopColor={velluto ? f.c[1] : f.c[0]} />
            <Stop offset="0.62" stopColor={velluto ? f.c[1] : mescola(f.c[0], f.c[1], 0.6)} />
            <Stop offset="1" stopColor={velluto ? f.c[0] : f.c[1]} />
          </RadialGradient>
          <LinearGradient id={id + 'm'} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
        {velluto ? <TramaIn nome="velluto" opacita={0.35} id={id + 't'} clip={rr(0, 0, width, height, raggio)} /> : <TramaIn nome="legno" opacita={0.35} id={id + 't'} clip={rr(0, 0, width, height, raggio)} />}
        {/* la luce della lampada sul fondo, e l'incavo: ombra sul bordo alto (la scheda è un cassetto) */}
        <Rect x={0} y={0} width={width} height={height} fill="none" stroke="#000000" strokeOpacity={0.45} strokeWidth={3} />
        {f.filo ? <Path d={rr(4.5, 4.5, width - 9, height - 9, Math.max(2, raggio - 3))} fill="none" stroke={f.filo} strokeOpacity={0.75} strokeWidth={r === 'leggendario' || r === 'mitico' ? 1.4 : 1} /> : null}
        {f.cantonali
          ? [angolo(2, 2, 1, 1, 0), angolo(width - 2, 2, -1, 1, 1), angolo(2, height - 2, 1, -1, 2), angolo(width - 2, height - 2, -1, -1, 3)]
          : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ in arrivo */

/**
 * Un oggetto «in arrivo»: la sua forma (tavolo o carta) in velluto scuro, bordata del metallo della sua rarità,
 * con matita e pennello incrociati e la scritta. Non finge di essere la grafica vera.
 */
export const ComingPreview = memo(function ComingPreview({ item, width, height }: { item: Item; width: number; height: number }) {
  const uid = uidOf(useId());
  const R = rarita(item.rarity);
  const [hi, mid, lo] = R.metallo;
  const card = item.slot === 'back';
  const sw = card ? Math.min(width, height / CARD_RATIO) : width;
  const sh = card ? sw * CARD_RATIO : height;
  const r = card ? cardRadius(sw) : Math.min(sw, sh) * 0.14;
  const m = Math.min(sw, sh);
  const icon = Math.max(14, Math.min(46, m * (card ? 0.34 : 0.3)));
  const label = m >= 54;
  const fs = Math.max(9, Math.min(12, m * 0.1));
  const inset = Math.max(3, Math.min(9, m * 0.06));
  return (
    <View style={[styles.center, { width, height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: sw, height: sh, borderRadius: r, boxShadow: m < 34 ? '0px 1px 2px rgba(8,3,4,0.5)' : '0px 2px 3px rgba(8,3,4,0.5), 4px 10px 18px rgba(8,3,4,0.4)' }}>
        <Svg width={sw} height={sh} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`cg${uid}`} cx="50%" cy="44%" rx="62%" ry="66%">
              <Stop offset="0" stopColor="#2A1418" />
              <Stop offset="0.75" stopColor="#1A0C10" />
              <Stop offset="1" stopColor="#3A1A22" />
            </RadialGradient>
            <LinearGradient id={`cb${uid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={hi} />
              <Stop offset="0.5" stopColor={mid} />
              <Stop offset="1" stopColor={lo} />
            </LinearGradient>
          </Defs>
          <Rect x={1} y={1} width={sw - 2} height={sh - 2} rx={r} ry={r} fill={`url(#cg${uid})`} stroke={`url(#cb${uid})`} strokeWidth={2} />
          {/* il posto dove andrà l'illustrazione: una cornice tratteggiata a matita */}
          <Rect x={inset} y={inset} width={sw - 2 * inset} height={sh - 2 * inset} rx={Math.max(2, r - inset)} ry={Math.max(2, r - inset)} fill="none" stroke={mid} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="4 4" />
          <Path d={`M${r} 2H${sw - r}`} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1} strokeLinecap="round" />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <ArtTools size={icon} color={hi} accent={mid} />
          {label ? (
            <Text allowFontScaling={false} style={[styles.coming, { fontSize: fs, color: '#D8C6AA', marginTop: Math.round(icon * 0.18) }]}>
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
        <Path d="M10 38 L12.5 30.5 L32 11 L37 16 L17.5 35.5 Z" />
        <Path d="M12.5 30.5 L17.5 35.5" />
        <Path d="M28.5 14.5 L33.5 19.5" />
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
  if (item.slot === 'frame') return <FramePreview frame={item.id} width={width} height={height} />;
  if (item.slot === 'back') {
    // Alta quanto il riquadro permette, nelle proporzioni di una carta (con il suo spessore).
    const w = Math.min(width, (height - 3) / CARD_RATIO);
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

/** Una cornice intorno al tuo avatar: come la vedranno gli altri. */
export function FramePreview({ frame, width, height }: { frame: string; width: number; height: number }) {
  const avatar = useProfile(s => s.meta.avatar);
  const photo = useProfile(s => s.account?.avatar ?? null);
  const account = useProfile(s => s.account?.name);
  const local = useSettings(s => s.name.trim());
  return (
    <View style={[styles.center, { width, height }]}>
      <PlayerAvatar avatar={avatar} photo={photo} name={account || local || 'Tu'} frame={frame} size={Math.floor(Math.min(width, height))} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', backgroundColor: '#FFFFFF' },
  single: { backgroundColor: '#FFFFFF' },
  foglio: { position: 'absolute', backgroundColor: '#E4D4B4', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,36,18,0.45)' },
  /** Lo stesso bordo pulito delle carte sul tavolo (CardSprite). */
  clip: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(42,24,16,0.28)' },
  center: { alignItems: 'center', justifyContent: 'center' },
  coming: { fontFamily: fontArte.soraBold, letterSpacing: 1, textTransform: 'uppercase' },
  solo: { pointerEvents: 'none' },
});
