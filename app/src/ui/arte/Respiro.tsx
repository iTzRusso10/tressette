// «Lampara»: un ciclo lento e morbido, avanti e indietro (docs/direzione-artistica.md §5.8 «respiro»).
//
// Export:
// - `Respiro` { children, tipo?: 'opacita' | 'x' | 'y' | 'scala' (default 'opacita'), ampiezza? (opacità: default
//               0,2, massimo 0,2; spostamento: default 4 punti, massimo 6; scala: default 0,02, massimo 0,03),
//               durata? (ms di un mezzo ciclo, tra 4000 e 6000, default 5000), sfasamento? (0…1: dove parte il
//               ciclo, per non far respirare tutto insieme), attivo? (default true), style? }
//   Fiammelle, tende, nuvole, gemme, la lampara sull'acqua. Anima solo opacity o transform di una View (thread
//   grafico, nessun layout che cambia). Curva ease.move (Easing.inOut cubic): niente scatti ai capi.
//   Fermo (useAmbient false) torna al fotogramma di riposo: opacità piena, nessuno spostamento.
//   Budget: 1 elemento animato. Non per testi, pulsanti, barre, icone, carte o oggetti < 48 punti.
import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { BUDGET, ease, mov } from './movimento';
import { useAmbient } from './useAmbient';

export interface RespiroProps {
  children: ReactNode;
  tipo?: 'opacita' | 'x' | 'y' | 'scala';
  ampiezza?: number;
  durata?: number;
  sfasamento?: number;
  attivo?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Respiro({ children, tipo = 'opacita', ampiezza, durata = 5000, sfasamento = 0, attivo = true, style }: RespiroProps) {
  const vivo = useAmbient(attivo);
  const t = useSharedValue(0);
  const d = Math.min(mov.respiro.max, Math.max(mov.respiro.min, durata));
  const amp =
    tipo === 'opacita'
      ? Math.min(BUDGET.respiroOpacita, ampiezza ?? 0.2)
      : tipo === 'scala'
        ? Math.min(0.03, ampiezza ?? 0.02)
        : Math.min(BUDGET.respiroSpostamento, ampiezza ?? 4);
  useEffect(() => {
    if (!vivo) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    // Lo sfasamento è un ritardo all'avvio: elementi diversi non respirano all'unisono.
    t.value = withDelay(
      Math.round(sfasamento * d),
      withRepeat(withTiming(1, { duration: d, easing: ease.move, reduceMotion: ReduceMotion.System }), -1, true),
    );
    return () => cancelAnimation(t);
  }, [vivo, d, sfasamento, t]);
  const st = useAnimatedStyle(() => {
    const k = t.value;
    if (tipo === 'opacita') return { opacity: 1 - amp * k };
    // Il riposo (k = 0) è il posto disegnato: il respiro va solo da una parte e torna.
    if (tipo === 'x') return { transform: [{ translateX: amp * k }] };
    if (tipo === 'y') return { transform: [{ translateY: amp * k }] };
    return { transform: [{ scale: 1 + amp * k }] };
  });
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}
