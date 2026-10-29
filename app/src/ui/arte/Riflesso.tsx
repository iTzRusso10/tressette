// «Lampara»: la banda di luce che passa su un metallo (docs/direzione-artistica.md §5.7, 5.8).
//
// Export:
// - `Riflesso` { forma?: 'rettangolo' | 'cerchio' | 'path' (default 'rettangolo'), larghezza, altezza,
//                raggio? (rettangolo), d? (path, nelle coordinate larghezza×altezza), pausa? (ms tra due passaggi,
//                default 8000: epico; 6000 leggendario), ritardo? (prima del primo passaggio, default 700),
//                volte? (numero di passaggi; default infinito; 1 per «una volta sola», come sul nome dello
//                svelamento), intensita? (opacità del centro della banda, default 0,55), angolo? (inclinazione
//                della banda in gradi, default 22: segue la luce delle ore 11), attivo? (default true), style? }
//   Si mette sopra l'oggetto, nella stessa misura (posizione assoluta, pointerEvents none).
//   - rettangolo e cerchio: una View con overflow hidden e il raggio giusto; la banda (expo-linear-gradient)
//     scorre con translateX sul thread grafico, senza ridisegnare niente. Va bene a qualsiasi misura.
//   - path: un Svg con ClipPath e la banda come Rect animata (useAnimatedProps su x). react-native-svg ridisegna
//     l'Svg a ogni fotogramma: solo per oggetti ≤ 200×200 punti (cornici).
//   Fermo (useAmbient false: riduci movimento, schermata non a fuoco, app in background, attivo=false) la banda
//   torna fuori dalla sagoma: il fotogramma di riposo è il metallo con il suo riflesso statico.
//   Budget: 1 elemento animato. Sotto i 48 punti non si usa (BUDGET.minimoAnimato): ci pensa chi lo monta.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, LinearGradient as SvgLinear, Path, Rect, Stop } from 'react-native-svg';
import { ease, mov } from './movimento';
import { useAmbient } from './useAmbient';

const ARect = Animated.createAnimatedComponent(Rect);

export interface RiflessoProps {
  forma?: 'rettangolo' | 'cerchio' | 'path';
  larghezza: number;
  altezza: number;
  raggio?: number;
  d?: string;
  pausa?: number;
  ritardo?: number;
  volte?: number;
  intensita?: number;
  angolo?: number;
  attivo?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Il ciclo: 0 = banda prima della sagoma, 1 = banda passata. Dopo l'ultimo passaggio resta a 1 (fuori). */
function useCiclo(attivo: boolean, pausa: number, ritardo: number, volte: number | undefined) {
  const t = useSharedValue(0);
  const vivo = useAmbient(attivo);
  useEffect(() => {
    if (!vivo) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    const passa = withTiming(1, { duration: mov.riflesso, easing: ease.move, reduceMotion: ReduceMotion.System });
    const torna = withTiming(0, { duration: 0 });
    // Primo passaggio dopo `ritardo`, poi uno ogni `pausa` (all'infinito, o `volte` volte).
    t.value = withDelay(ritardo, withRepeat(withSequence(torna, passa, withTiming(1, { duration: pausa })), volte ?? -1, false));
    return () => cancelAnimation(t);
  }, [vivo, pausa, ritardo, volte, t]);
  return t;
}

export function Riflesso({ forma = 'rettangolo', larghezza: w, altezza: h, raggio = 0, d, pausa = mov.pausaRiflesso.epico, ritardo = 700, volte, intensita = 0.55, angolo = 22, attivo = true, style }: RiflessoProps) {
  const t = useCiclo(attivo, pausa, ritardo, volte);
  const banda = Math.max(28, Math.min(w, h) * 0.55);
  // La banda è inclinata: per uscire del tutto deve partire e arrivare oltre la diagonale.
  const extra = Math.tan((angolo * Math.PI) / 180) * h;
  const da = -banda - extra;
  const a = w + extra;
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: da + (a - da) * t.value }, { skewX: `${-angolo}deg` }] }));
  const id = 'rf' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const ap = useAnimatedProps(() => ({ x: da + (a - da) * t.value }));

  const colori = ['rgba(255,250,235,0)', `rgba(255,250,235,${intensita * 0.35})`, `rgba(255,252,240,${intensita})`, `rgba(255,250,235,${intensita * 0.35})`, 'rgba(255,250,235,0)'] as const;
  const posizioni = [0, 0.32, 0.5, 0.68, 1] as const;

  if (forma === 'path') {
    return (
      <Svg pointerEvents="none" width={w} height={h} style={[StyleSheet.absoluteFill, style]}>
        <Defs>
          <ClipPath id={id + 'c'}>
            <Path d={d ?? ''} />
          </ClipPath>
          <SvgLinear id={id + 'g'} x1="0" y1="0" x2="1" y2="0">
            {posizioni.map((o, i) => (
              <Stop key={i} offset={o} stopColor="#FFFCF0" stopOpacity={i === 2 ? intensita : i === 1 || i === 3 ? intensita * 0.35 : 0} />
            ))}
          </SvgLinear>
        </Defs>
        <G clipPath={`url(#${id}c)`}>
          <G transform={`skewX(${-angolo})`}>
            <ARect animatedProps={ap} y={-h} width={banda} height={h * 3} fill={`url(#${id}g)`} />
          </G>
        </G>
      </Svg>
    );
  }
  const r = forma === 'cerchio' ? Math.min(w, h) / 2 : raggio;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: w, height: h, borderRadius: r, overflow: 'hidden' }, style]}>
      <Animated.View style={[styles.banda, { width: banda, height: h * 1.4, top: -h * 0.2 }, st]}>
        <LinearGradient colors={colori} locations={posizioni} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: { position: 'absolute', left: 0 },
});
