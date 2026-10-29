// «Lampara»: particelle lente e seminate (docs/direzione-artistica.md §5.7, 5.8).
//
// Export:
// - `Scintille` { larghezza, altezza, quante? (default 8; massimo 24 per oggetto), seme? (default 1),
//                 tipo?: 'scintilla' | 'granello' (default 'scintilla': stelline a quattro punte d'oro, leggendario;
//                 'granello': granelli tondi di madreperla, mitico; anche polvere nel raggio di luce), colore?,
//                 misura? (lato massimo di una particella in punti, default 6), salita? (punti percorsi in un
//                 ciclo, default 14), attivo? (default true), style? }
//   Ogni particella è una piccola View: compare piano, sale di poco e svanisce, ognuna col suo tempo (4–7 s) e
//   la sua pausa, tutto da seeded(seme) (niente Math.random). Solo opacità e transform (thread grafico).
//   Ferme (useAmbient false) spariscono: il riposo è l'oggetto senza particelle.
//   Budget: conta come 1 elemento animato «di contorno», ma ≤ 24 particelle per oggetto e ≤ 40 per schermata
//   (BUDGET): chi ne monta più di un gruppo deve tenere il conto.
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import { BUDGET } from './movimento';
import { primitivi } from './token';
import { useAmbient } from './useAmbient';

interface Particella {
  x: number;
  y: number;
  s: number;
  durata: number;
  ritardo: number;
  deriva: number;
  luce: number;
}

function Pezzo({ p, salita, tipo, colore, vivo }: { p: Particella; salita: number; tipo: 'scintilla' | 'granello'; colore: string; vivo: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!vivo) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withDelay(p.ritardo, withRepeat(withTiming(1, { duration: p.durata, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, false));
    return () => cancelAnimation(t);
  }, [vivo, p, t]);
  const st = useAnimatedStyle(() => {
    const k = t.value;
    // Entra nel primo terzo, resta, esce nell'ultimo terzo: una campana morbida, mai uno scatto.
    const o = k <= 0 ? 0 : k < 0.33 ? k / 0.33 : k > 0.67 ? (1 - k) / 0.33 : 1;
    return {
      opacity: o * p.luce,
      transform: [{ translateX: p.x + p.deriva * k }, { translateY: p.y - salita * k }, { scale: 0.7 + 0.3 * o }],
    };
  });
  return (
    <Animated.View style={[styles.pezzo, { width: p.s, height: p.s }, st]}>
      {tipo === 'scintilla' ? (
        <Svg width={p.s} height={p.s} viewBox="0 0 10 10">
          <Path d="M5 0C5.4 3.6 6.4 4.6 10 5 6.4 5.4 5.4 6.4 5 10 4.6 6.4 3.6 5.4 0 5 3.6 4.6 4.6 3.6 5 0Z" fill={colore} />
        </Svg>
      ) : (
        <View style={{ width: p.s, height: p.s, borderRadius: p.s / 2, backgroundColor: colore, boxShadow: `0px 0px ${p.s}px ${colore}` }} />
      )}
    </Animated.View>
  );
}

export interface ScintilleProps {
  larghezza: number;
  altezza: number;
  quante?: number;
  seme?: number;
  tipo?: 'scintilla' | 'granello';
  colore?: string;
  misura?: number;
  salita?: number;
  attivo?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Scintille({ larghezza: w, altezza: h, quante = 8, seme = 1, tipo = 'scintilla', colore, misura = 6, salita = 14, attivo = true, style }: ScintilleProps) {
  const vivo = useAmbient(attivo);
  const n = Math.min(BUDGET.particelleOggetto, Math.max(0, quante));
  const lista = useMemo<Particella[]>(() => {
    const rnd = seeded(seme);
    return Array.from({ length: n }, () => {
      const s = misura * (0.45 + rnd() * 0.55);
      return {
        x: rnd() * (w - s),
        y: salita + rnd() * Math.max(0, h - s - salita),
        s,
        durata: 4000 + Math.round(rnd() * 3000),
        ritardo: Math.round(rnd() * 4000),
        deriva: (rnd() - 0.5) * 8,
        luce: 0.55 + rnd() * 0.45,
      };
    });
  }, [n, seme, w, h, misura, salita]);
  const c = colore ?? (tipo === 'scintilla' ? primitivi.ottone.filo : '#F6F0FA');
  if (!vivo) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: w, height: h }, style]}>
      {lista.map((p, i) => (
        <Pezzo key={i} p={p} salita={salita} tipo={tipo} colore={c} vivo={vivo} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pezzo: { position: 'absolute', left: 0, top: 0 },
});
