// «La bacheca del circolo»: i pezzi disegnati (docs/direzione-artistica.md §5.17). Tutti statici salvo dove
// detto; la luce viene da in alto a sinistra (ore 11), le ombre cadono in basso a destra.
//
// Export:
// - `IconaSmalto` { tipo: TipoIcona, misura? (default 30) } medaglione di smalto in cloisonné d'ottone: il
//                 colore e il disegno dicono il tipo di obiettivo (vinci, gioca, trofei, scopa, online…). Statico.
// - `Puntina`     { misura? (default 14), seme? } puntina d'ottone vista dall'alto, con la sua ombra. Statica.
// - `Tacche`      { have, goal, larghezza, seme?, piccolo? } l'avanzamento come sul segnapunti del tavolo: fino a
//                 5 tacche a matita (la quinta sbarra le altre quattro); oltre, una linea a matita su un binario
//                 stampato. Il numero «2/5» è sempre scritto accanto. Statico (cambia solo quando cambia il valore).
// - `Busta`       { coins, xp, stato, larghezza, altezza, onPress?, testID?, accessibilityLabel?, timbra?,
//                 registra? (ref della vista, da cui partono le monete), item? (ReactNode) } la ricompensa appuntata
//                 al biglietto. Chiusa color carta (da fare, in corso), d'oro (da riscuotere: si tocca, un riflesso
//                 passa una volta), aperta e sbiadita (riscossa). Numero in Sora 700 16 pt.
// - `Orecchia`    { visibile, misura? } l'angolo piegato del biglietto riscosso: si piega in 280 ms (mov.posa).
// - `GRAFITE`     il colore della matita
// - `Entra`       { ritardo? (-1: nessuna entrata), children, style? } l'entrata di un foglio (opacità e +12 px, 280 ms, ease.in);
//                 `ritardoEntrata(i)` lo scaglione (80 + 40 × i, al massimo 6)
// Budget: Busta ha al più un Riflesso (una volta sola) e la piega; nient'altro si muove.
import { useEffect, useId, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinear, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import { Text } from '../Text';
import { Moneta } from '../arte/Ricompensa';
import { Riflesso } from '../arte/Riflesso';
import { dur, ease, mov } from '../arte/movimento';
import { fontArte, mescola, primitivi, stopSmalto, testo } from '../arte/token';
import type { StatoMissione, TipoIcona } from './dati';
import type { Vista } from './voli';

export const GRAFITE = '#3E3833';
const uid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

/* ------------------------------------------------------------------ icone di smalto */

/** Il colore dello smalto e il disegno (24×24, a filo) per ogni tipo di obiettivo. */
const SMALTI: Record<TipoIcona, { tinta: string; d: string; pieno?: boolean }> = {
  vittoria: { tinta: primitivi.ceralacca.luce, d: 'M6.2 16.4h11.6M6.6 16.4L5.6 9l3.9 3 2.5-5.2 2.5 5.2 3.9-3-1 7.4' },
  partita: { tinta: primitivi.maiolica.blu, d: 'M8.2 6.4h5.2a1 1 0 0 1 1 1v9.2a1 1 0 0 1-1 1H8.2a1 1 0 0 1-1-1V7.4a1 1 0 0 1 1-1zM14.4 8.3l2.3.7a1 1 0 0 1 .7 1.2l-2 7.2' },
  trofei: { tinta: '#B8862A', d: 'M8.4 5.8h7.2v3.3a3.6 3.6 0 0 1-7.2 0zM8.4 7.1H6.3a2.1 2.1 0 0 0 2.4 3.1M15.6 7.1h2.1a2.1 2.1 0 0 1-2.4 3.1M12 12.8v3.2M9.3 18.2h5.4M10.2 16h3.6' },
  scopa: { tinta: primitivi.maiolica.raminaScura, d: 'M16 5.2l-4.6 7.1M8.4 11.4l4.6 2.9-2.6 4.7c-1.9-.3-3.9-1.6-5-3.2zM7.5 16.6l1.6-2.6M9.7 17.9l1.3-2.4' },
  mani: { tinta: '#2B3A67', d: 'M6.5 9.6L12 18l5.5-8.4M8.6 7.7L12 18l3.4-10.3M6.5 9.6c2-1.6 3.4-2.1 5.5-2.1s3.5.5 5.5 2.1' },
  punti: { tinta: '#A4482A', d: 'M12 6.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6zM12 9.4c1 1 1 2.2 0 3.2-1-1-1-2.2 0-3.2zM12 14.6c-1-1-1-2.2 0-3.2 1 1 1 2.2 0 3.2zM9.4 12c1-1 2.2-1 3.2 0-1 1-2.2 1-3.2 0zM14.6 12c-1 1-2.2 1-3.2 0 1-1 2.2-1 3.2 0z' },
  serie: { tinta: '#A4482A', d: 'M12 18.6c-2.9 0-4.8-1.9-4.8-4.4 0-2.7 2.3-3.9 2.9-6.8 1.5 1.1 1.9 2.5 1.9 3.5 1-.6 1.5-1.5 1.6-2.7 1.8 1.5 3.2 3.5 3.2 6 0 2.5-1.9 4.4-4.8 4.4z' },
  esperto: { tinta: '#6B3FA0', d: 'M12 5.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L12 15.4l-3.8 2 .7-4.3-3.1-3 4.3-.6z' },
  online: { tinta: '#1F6F7A', d: 'M12 5.6a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8zM5.6 12h12.8M12 5.6c1.9 1.9 2.7 4.1 2.7 6.4s-.8 4.5-2.7 6.4c-1.9-1.9-2.7-4.1-2.7-6.4s.8-4.5 2.7-6.4z' },
  oggetto: { tinta: '#6B3FA0', d: 'M8.2 6.6h7.6l2.9 3.4-6.7 8.2-6.7-8.2zM5.3 10h13.4M10.2 6.6l-.9 3.4 2.7 8.2 2.7-8.2-.9-3.4' },
  calendario: { tinta: primitivi.maiolica.raminaScura, d: 'M6.2 7.6h11.6v10.6H6.2zM6.2 10.9h11.6M9.2 5.6v3.4M14.8 5.6v3.4M9 14.4l2 1.8 3.6-3.6' },
  giochi: { tinta: '#A4482A', d: 'M4.8 8.4h4.1v7.6H4.8zM10 7.2h4v9.6h-4zM15.1 8.4h4.1v7.6h-4.1z' },
  quattro: { tinta: primitivi.maiolica.blu, d: 'M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zM12 4.8v1.6M12 17.6v1.6M4.8 12h1.6M17.6 12h1.6' },
};

export function IconaSmalto({ tipo, misura = 30 }: { tipo: TipoIcona; misura?: number }) {
  const id = 'is' + uid(useId());
  const s = SMALTI[tipo];
  const [chiaro, medio, scuro] = stopSmalto(s.tinta);
  // Il disegno è un filo d'ottone (cloisonné) con lo smalto avorio dentro: sotto il filo scuro, sopra il chiaro.
  return (
    <Svg width={misura} height={misura} viewBox="0 0 32 32" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id={id + 'b'} cx="36%" cy="30%" r="78%">
          <Stop offset={0} stopColor={primitivi.ottone.filo} />
          <Stop offset={0.5} stopColor={primitivi.ottone.medio} />
          <Stop offset={1} stopColor={primitivi.ottone.scuro} />
        </RadialGradient>
        <SvgLinear id={id + 's'} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset={0} stopColor={chiaro} />
          <Stop offset={0.55} stopColor={medio} />
          <Stop offset={1} stopColor={scuro} />
        </SvgLinear>
        <RadialGradient id={id + 'l'} cx="34%" cy="28%" rx="30%" ry="20%">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* ombra di contatto sul supporto */}
      <Circle cx={16.6} cy={17.2} r={14.6} fill="#080304" opacity={0.28} />
      <Circle cx={16} cy={16} r={14.6} fill={`url(#${id}b)`} />
      <Circle cx={16} cy={16} r={14.1} fill="none" stroke={primitivi.ottone.filo} strokeOpacity={0.55} strokeWidth={0.7} />
      <Circle cx={16} cy={16} r={11.6} fill={`url(#${id}s)`} />
      {/* il bordo dello smalto, incassato: ombra in alto a sinistra, luce in basso a destra */}
      <Circle cx={15.7} cy={15.7} r={11.6} fill="none" stroke="#080304" strokeOpacity={0.45} strokeWidth={0.9} />
      <Circle cx={16.3} cy={16.3} r={11.6} fill="none" stroke={primitivi.ottone.filo} strokeOpacity={0.55} strokeWidth={0.6} />
      <G transform="translate(4 4)">
        <Path d={s.d} fill="none" stroke={primitivi.ottone.ombra} strokeWidth={3.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} transform="translate(0.3 0.4)" />
        <Path d={s.d} fill="none" stroke={primitivi.ottone.medio} strokeWidth={2.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={s.d} fill="none" stroke={primitivi.maiolica.bianco} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* la macchia di luce dello smalto (vetro) */}
      <Ellipse cx={16} cy={16} rx={11.6} ry={11.6} fill={`url(#${id}l)`} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ puntina */

export function Puntina({ misura = 14 }: { misura?: number }) {
  const id = 'pn' + uid(useId());
  return (
    <Svg width={misura + 4} height={misura + 4} viewBox="0 0 18 18" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id={id} cx="38%" cy="32%" r="70%">
          <Stop offset={0} stopColor={primitivi.ottone.filo} />
          <Stop offset={0.45} stopColor={primitivi.ottone.medio} />
          <Stop offset={1} stopColor={primitivi.ottone.ombra} />
        </RadialGradient>
      </Defs>
      {/* l'ombra cade in basso a destra, lunga: la testa sta sollevata dal foglio */}
      <Ellipse cx={10.6} cy={11.2} rx={6.2} ry={5.6} fill="#080304" opacity={0.32} />
      <Circle cx={8.6} cy={8.6} r={6.2} fill={`url(#${id})`} />
      <Circle cx={8.6} cy={8.6} r={6.2} fill="none" stroke={primitivi.ottone.ombra} strokeOpacity={0.6} strokeWidth={0.7} />
      <Ellipse cx={6.8} cy={6.4} rx={2.1} ry={1.4} fill="#FFFFFF" opacity={0.55} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ tacche */

export function Tacche({ have, goal, larghezza, seme = 1, piccolo = false }: { have: number; goal: number; larghezza: number; seme?: number; piccolo?: boolean }) {
  const h = piccolo ? 18 : 20;
  const n = Math.min(goal, Math.max(0, have));
  const testoNum = `${n}/${goal}`;
  // Il numero ha sempre il suo posto, misurato sulle cifre (cifre tabellari: ~8 punti l'una a 13 pt).
  const numW = Math.ceil(testoNum.length * (piccolo ? 7.4 : 8.2)) + 2;
  const w = Math.max(24, larghezza - numW - 6);
  const rnd = seeded(seme);
  const tremolio = () => (rnd() - 0.5) * 1.1;
  let disegno: ReactNode;
  if (goal <= 5) {
    // Il segnapunti: un posto stampato per ogni tacca (un filo tenue) e i segni a matita sopra; la quinta tacca è
    // il tratto obliquo che sbarra le quattro.
    const vert = Math.min(goal, 4);
    const passo = Math.min(13, (w - 8) / Math.max(4, vert + (goal === 5 ? 0.5 : 0)));
    const x0 = 4;
    const righe: ReactNode[] = [];
    for (let i = 0; i < vert; i++) {
      const x = x0 + i * passo + passo / 2;
      if (i < Math.min(n, 4)) {
        const a = tremolio();
        const b = tremolio();
        righe.push(<Path key={'m' + i} d={`M${x + a} 2.5Q${x + 0.9} ${h / 2} ${x + b} ${h - 2.5}`} stroke={GRAFITE} strokeWidth={2} strokeLinecap="round" fill="none" />);
      } else {
        righe.push(<Path key={'g' + i} d={`M${x} 3.5V${h - 3.5}`} stroke={testo.inchiostroTenue} strokeOpacity={0.38} strokeWidth={1.2} strokeDasharray="2 2.2" strokeLinecap="round" />);
      }
    }
    if (goal === 5) {
      const xa = x0 + passo * 0.05;
      const xb = x0 + passo * (vert - 0.05);
      if (n >= 5) righe.push(<Path key="m5" d={`M${xa} ${h - 3}Q${(xa + xb) / 2} ${h / 2 + tremolio()} ${xb} 3`} stroke={GRAFITE} strokeWidth={1.9} strokeLinecap="round" fill="none" />);
      else righe.push(<Path key="g5" d={`M${xa} ${h - 3}L${xb} 3`} stroke={testo.inchiostroTenue} strokeOpacity={0.3} strokeWidth={1.1} strokeDasharray="2 2.4" />);
    }
    disegno = righe;
  } else {
    // Il binario stampato (due fili e le tacche ai quarti) e la linea a matita fin dove sei arrivato.
    const y = h / 2;
    const fino = 2 + (w - 4) * (n / goal);
    const quarti = [0, 0.25, 0.5, 0.75, 1].map(f => 2 + (w - 4) * f);
    disegno = (
      <>
        <Path d={`M2 ${y - 2.4}H${w - 2}M2 ${y + 2.4}H${w - 2}`} stroke={testo.inchiostroTenue} strokeOpacity={0.5} strokeWidth={0.8} />
        {quarti.map((x, i) => (
          <Path key={i} d={`M${x} ${y - 4.5}V${y + 4.5}`} stroke={testo.inchiostroTenue} strokeOpacity={0.55} strokeWidth={0.9} />
        ))}
        {n > 0 ? <Path d={`M2 ${y + tremolio() * 0.4}Q${fino / 2} ${y + tremolio() * 0.8} ${fino} ${y + tremolio() * 0.4}`} stroke={GRAFITE} strokeWidth={2.6} strokeLinecap="round" fill="none" /> : null}
      </>
    );
  }
  return (
    <View style={[styles.tacche, { width: larghezza, height: h }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={w} height={h}>{disegno}</Svg>
      <Text style={[styles.numTacche, piccolo && { fontSize: 12, lineHeight: 15 }, { width: numW }]} numberOfLines={1}>
        {testoNum}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ busta */

const ORO = ['#F7E3A6', primitivi.fogliaOro, '#C9A04A', '#E0BC62'] as const;

function DisegnoBusta({ w, h, stato }: { w: number; h: number; stato: StatoMissione }) {
  const id = 'bs' + uid(useId());
  const oro = stato === 'riscuotere';
  const aperta = stato === 'riscossa';
  const base = oro ? ORO : ([primitivi.carta.luce, primitivi.carta.medio, primitivi.carta.scuro, primitivi.carta.scuro] as const);
  const bordo = oro ? '#8A6526' : primitivi.carta.bordo;
  const punta = h * 0.44;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinear id={id + 'b'} x1="0.15" y1="0" x2="0.85" y2="1">
          {base.map((c, i) => (
            <Stop key={i} offset={i / (base.length - 1)} stopColor={c} />
          ))}
        </SvgLinear>
        <SvgLinear id={id + 'f'} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#000000" stopOpacity={0} />
          <Stop offset={1} stopColor="#3A2410" stopOpacity={oro ? 0.16 : 0.1} />
        </SvgLinear>
      </Defs>
      <Rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={3} fill={`url(#${id}b)`} stroke={bordo} strokeWidth={1} />
      {aperta ? (
        // Aperta: il lembo è alzato (si vede il dentro più scuro) e la busta è vuota.
        <Path d={`M1.5 3.5L${w / 2} ${punta * 0.55}L${w - 1.5} 3.5Z`} fill="#3A2410" opacity={0.18} />
      ) : (
        <>
          {/* il lembo chiuso: due pieghe e la sua ombra */}
          <Path d={`M1.2 1.8L${w / 2} ${punta}L${w - 1.2} 1.8`} fill={`url(#${id}f)`} stroke={bordo} strokeOpacity={0.9} strokeWidth={0.9} />
          <Path d={`M2 3L${w / 2} ${punta + 1.2}L${w - 2} 3`} fill="none" stroke="#FFFFFF" strokeOpacity={oro ? 0.4 : 0.55} strokeWidth={0.6} />
        </>
      )}
      {/* il bordo in luce in alto a sinistra */}
      <Path d={`M1.5 ${h - 4}V4a2.5 2.5 0 0 1 2.5-2.5H${w * 0.6}`} stroke="#FFFFFF" strokeOpacity={oro ? 0.55 : 0.6} strokeWidth={0.8} fill="none" />
    </Svg>
  );
}

export function Busta({
  coins,
  xp,
  stato,
  larghezza: w,
  altezza: h,
  onPress,
  testID,
  accessibilityLabel,
  registra,
  item,
  etichetta,
  muta = false,
}: {
  coins: number;
  xp: number;
  stato: StatoMissione;
  larghezza: number;
  altezza: number;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  registra?: (v: Vista | null) => void;
  item?: ReactNode;
  /** La seconda riga quando non è da riscuotere (default: l'esperienza). */
  etichetta?: string;
  /** Solo la busta, senza scritte (decorazione). */
  muta?: boolean;
}) {
  const riscuotere = stato === 'riscuotere';
  const riscossa = stato === 'riscossa';
  const seconda = muta ? '' : riscuotere ? 'Riscuoti' : riscossa ? 'Riscossa' : (etichetta ?? (xp ? `+${xp.toLocaleString('it-IT')} esp.` : ''));
  const contenuto = (
    <View ref={registra} collapsable={false} style={[styles.busta, { width: w, height: h, boxShadow: riscuotere ? '0px 1px 2px rgba(8,3,4,0.5), 2px 5px 9px rgba(8,3,4,0.35)' : '0px 1px 1.5px rgba(8,3,4,0.35)' }]}>
      <DisegnoBusta w={w} h={h} stato={stato} />
      {riscuotere ? <Riflesso larghezza={w} altezza={h} raggio={3} volte={1} ritardo={260} intensita={0.6} /> : null}
      <View style={[styles.bustaDentro, { paddingTop: h * 0.3 }]}>
        <View style={styles.bustaRiga}>
          {item ?? (coins ? <Moneta misura={17} /> : null)}
          {coins ? <Text style={[styles.bustaNum, riscossa && styles.barrato]}>{coins.toLocaleString('it-IT')}</Text> : null}
        </View>
        {seconda ? (
          <Text style={[styles.bustaSotto, riscuotere && styles.bustaSottoOro]} numberOfLines={1}>
            {seconda}
          </Text>
        ) : null}
      </View>
    </View>
  );
  // Sempre lo stesso albero (un Pressable, spento quando non c'è niente da riscuotere): la vista da cui partono
  // le monete resta montata mentre la busta cambia stato, e il web la può misurare.
  const tocca = riscuotere && !!onPress;
  return (
    <Pressable
      testID={testID}
      accessible
      accessibilityRole={tocca ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={tocca ? undefined : { disabled: true }}
      disabled={!tocca}
      onPress={onPress}
      hitSlop={tocca ? 6 : 0}
      style={({ pressed }) => [pressed && tocca && { transform: [{ scale: 0.96 }] }]}
    >
      {contenuto}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ orecchia */

export function Orecchia({ visibile, misura = 18, colore = primitivi.carta.scuro }: { visibile: boolean; misura?: number; colore?: string }) {
  const riduci = useReducedMotion();
  const v = useSharedValue(visibile ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(visibile ? 1 : 0, { duration: riduci ? 0 : mov.posa, easing: ease.in });
  }, [visibile, riduci, v]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateX: (1 - v.value) * misura * 0.5 }, { translateY: (1 - v.value) * misura * 0.5 }, { scale: 0.5 + v.value * 0.5 }] }));
  const m = misura;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: 0, bottom: 0, width: m, height: m }, st]}>
      <Svg width={m} height={m}>
        {/* il triangolo di sughero che si scopre e il lembo piegato sopra, con la sua ombra */}
        <Path d={`M${m} 0V${m}H0Z`} fill={primitivi.sughero.scuro} />
        <Path d={`M${m} 0L0 ${m}L${m * 0.08} ${m * 0.08}Z`} fill="#080304" opacity={0.25} transform="translate(1.2 1.2)" />
        <Path d={`M${m} 0L0 ${m}L${m * 0.06} ${m * 0.06}Z`} fill={mescola(colore, '#000000', 0.06)} stroke={primitivi.carta.bordo} strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tacche: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  numTacche: { fontFamily: fontArte.soraBold, fontSize: 13, lineHeight: 16, color: testo.inchiostro, fontVariant: ['tabular-nums'], textAlign: 'right' },
  busta: { borderRadius: 3 },
  bustaDentro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bustaRiga: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bustaNum: { fontFamily: fontArte.soraBold, fontSize: 16, lineHeight: 20, color: testo.inchiostro, fontVariant: ['tabular-nums'] },
  barrato: { color: testo.inchiostroTenue },
  bustaSotto: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 15, color: testo.inchiostroTenue },
  bustaSottoOro: { color: testo.inchiostro, fontFamily: fontArte.soraBold, letterSpacing: 0.3 },
});

/* ------------------------------------------------------------------ entrata */

/**
 * L'entrata di un foglio o della bacheca (§5.9): da +12 px e opacità 0 a posto, ease.in, dopo `ritardo`. Con
 * riduci movimento solo una dissolvenza breve. Non usa le entrate di layout di Reanimated: sul web mettono la
 * vista in posizione assoluta durante l'entrata e il contenuto sotto si sovrappone.
 */
export function Entra({ ritardo = 0, children, style }: { ritardo?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const riduci = useReducedMotion();
  const v = useSharedValue(ritardo < 0 ? 1 : 0);
  useEffect(() => {
    if (ritardo < 0) return;
    v.value = withDelay(riduci ? 0 : ritardo, withTiming(1, { duration: riduci ? dur.quick : dur.enter, easing: ease.in, reduceMotion: ReduceMotion.Never }));
  }, [riduci, ritardo, v]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: riduci ? 0 : (1 - v.value) * 12 }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/** Il ritardo d'entrata dell'elemento `indice` (§5.9: superfici a 80 ms, poi scaglione di 40, al massimo 6). */
export const ritardoEntrata = (indice: number) => 80 + Math.min(indice, 5) * mov.scaglione;
