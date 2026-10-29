// «Lampara»: piani che scorrono a velocità diverse (docs/direzione-artistica.md §5.5, 5.14).
//
// Export:
// - `Parallasse` { scorrimento?: SharedValue<number> (lo scrollY di una lista, da useAnimatedScrollHandler; senza,
//                  i piani stanno fermi), origine? (lo scrollY a cui i piani sono al loro posto: 0 per una scena
//                  in cima alla schermata, come nel profilo), larghezza, altezza, style?, children: <Piano> }
//                il contenitore della scena: overflow hidden, misura fissa.
// - `Piano`      { fattore: number (0,2 sfondo, 0,5 ambiente, 0,8 mezzo, 1 tavolo, 1,15 primo piano: vedi
//                  token.ts LIVELLI), deriva?: { x?: number, y?: number } (spostamento ambientale lento, punti, ≤ 6),
//                  durata? (ms del mezzo ciclo della deriva, 4000–6000), attivo?, style?, children }
//                un piano: si sposta di (1 − fattore) × (scorrimento − origine) in verticale (lo sfondo resta più
//                indietro del contenuto), al massimo di `sporgenzaPiano(fattore, altezza)` punti. Per non lasciare
//                buchi il piano è più alto della scena di quella sporgenza sopra e sotto: il suo contenuto deve
//                riempire il piano (100%), non la sola altezza della scena. Con `deriva` ha anche un respiro lentissimo (la «camera» che galleggia): si ferma
//                con useAmbient, e anche lo scorrimento si ferma (il piano resta dov'è) se il movimento è ridotto.
// - `sporgenzaPiano(fattore, altezza)`  quanti punti un piano sporge sopra e sotto la scena (0 per fattore ≥ 1)
// - `useScorrimento()`  { scorrimento: SharedValue<number>, onScroll } aiuto: da passare a una Animated.ScrollView
//                (scrollEventThrottle 16) per guidare la Parallasse.
//
// Budget: ogni Piano con `deriva` conta come 1 elemento animato; lo scorrimento non conta (segue il dito).
// I piani si muovono solo come View (transform), mai ridisegnando l'SVG dentro.
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { BUDGET, ease, mov } from './movimento';
import { useAmbient, useRiduciMovimento } from './useAmbient';

/** Quanto può spostarsi (e quindi quanto sporge) un piano: un quarto della scena per lo sfondo (0,2). */
export function sporgenzaPiano(fattore: number, altezza: number): number {
  return Math.max(0, Math.round(altezza * 0.3 * (1 - fattore)));
}

const Scorre = createContext<{ s: SharedValue<number>; origine: number; altezza: number } | null>(null);

export function useScorrimento() {
  const scorrimento = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => {
    scorrimento.value = e.contentOffset.y;
  });
  return { scorrimento, onScroll };
}

export function Parallasse({ scorrimento, origine = 0, larghezza, altezza, style, children }: { scorrimento?: SharedValue<number>; origine?: number; larghezza: number | `${number}%`; altezza: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const ctx = useMemo(() => (scorrimento ? { s: scorrimento, origine, altezza } : null), [scorrimento, origine, altezza]);
  return (
    <Scorre.Provider value={ctx}>
      <View style={[{ width: larghezza, height: altezza, overflow: 'hidden' }, style]}>{children}</View>
    </Scorre.Provider>
  );
}

export function Piano({ fattore, deriva, durata = 5000, attivo = true, style, children }: { fattore: number; deriva?: { x?: number; y?: number }; durata?: number; attivo?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const scorrimento = useContext(Scorre);
  const sp = scorrimento ? sporgenzaPiano(fattore, scorrimento.altezza) : 0;
  const riduci = useRiduciMovimento();
  const vivo = useAmbient(attivo) && !!deriva;
  const t = useSharedValue(0);
  const dx = Math.min(BUDGET.respiroSpostamento, Math.abs(deriva?.x ?? 0)) * Math.sign(deriva?.x ?? 0);
  const dy = Math.min(BUDGET.respiroSpostamento, Math.abs(deriva?.y ?? 0)) * Math.sign(deriva?.y ?? 0);
  const d = Math.min(mov.respiro.max, Math.max(mov.respiro.min, durata));
  useEffect(() => {
    if (!vivo) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withRepeat(withTiming(1, { duration: d, easing: ease.move, reduceMotion: ReduceMotion.System }), -1, true);
    return () => cancelAnimation(t);
  }, [vivo, d, t]);
  const st = useAnimatedStyle(() => {
    // Con lo scorrimento verso il basso (y > 0) il contenuto sale di y; il piano sale solo di fattore × y.
    let y = 0;
    if (scorrimento && !riduci && sp > 0) y = Math.min(sp, Math.max(-sp, (scorrimento.s.value - scorrimento.origine) * (1 - fattore)));
    return { transform: [{ translateX: dx * t.value }, { translateY: y + dy * t.value }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: -sp, bottom: -sp }, style, st]}>{children}</Animated.View>;
}
