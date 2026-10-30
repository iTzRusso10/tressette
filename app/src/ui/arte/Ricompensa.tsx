// «Lampara»: i gusci delle ricompense (docs/direzione-artistica.md §5.10, 5.11).
//
// Export:
// - `MoneteInVolo` { da: {x, y}, a: {x, y} (coordinate nel contenitore, che deve essere a tutto schermo o
//                    comunque contenere i due punti), quante? (5–8, default 6), seme?, misura? (diametro moneta,
//                    default 22), onArrivo?: () => void (quando arriva la prima moneta: è il momento di far
//                    contare il contatore, es. CountUp di ui/meta.tsx), onFine?: () => void, suono?: boolean
//                    (default true: 'coin' all'arrivo) }
//   Monete d'ottone che partono insieme e arrivano scaglionate (mov.volo = 520 ms, ease.move, scaglione 40 ms)
//   su un arco leggero (mai oltre il punto d'arrivo). Non blocca i tocchi (pointerEvents none): se ne possono
//   lanciare più insieme. Con riduci movimento non vola niente: onArrivo e onFine partono subito (il contatore
//   si aggiorna con la sua dissolvenza). Montarla con una `key` nuova a ogni riscossione.
//   Budget: ≤ 8 viste animate per 520 + 7×40 ms, poi si smonta da sola (onFine).
// - `Moneta`        { misura? } la moneta d'ottone statica (la stessa che vola), per contatori e buste.
// - `Teca`          { visibile, onChiudi, occhiello? (es. «Leggendario»), titolo (Bodoni), rarita?: Rarity,
//                    children (l'oggetto, ≤ 180 punti di lato), sotto?: ReactNode (righe «e 3 achievement»),
//                    azioni?: ReactNode (i Pulsante), particelle?: boolean (default: dalla rarità), seme?,
//                    forma?: 'cerchio' | 'rettangolo' (la sagoma dell'oggetto, per il riflesso; default 'rettangolo'
//                    con raggio 12) }
//   Il guscio della presentazione grande: velo all'84%, l'oggetto su un cuscino di velluto sotto la lampada
//   (la luce si accende), nome in Bodoni, TarghettaRarita, un riflesso che passa una volta (epico in su),
//   scintille o granelli solo da leggendario. Sequenza (§5.9): velo 0 → luce 0–420 → cuscino 80 → oggetto 160
//   (rivela) → nome 240 → targhetta e azioni a seguire; pulsanti visibili entro 2,0 s. Un tocco sul velo porta
//   tutto allo stato finale; un secondo tocco chiama onChiudi. Con riduci movimento: una dissolvenza da 280 ms.
//   Il contenuto non si sposta mai dopo l'entrata. Budget: luce + oggetto + riflesso + particelle ≤ 4 animati.
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeOut, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import type { Rarity } from '@/meta/rarity';
import { sfx } from '../feedback';
import { Text } from '../Text';
import { ombra } from './luce';
import { Lampada, Superficie } from './materiali';
import { ACCENSIONE, dur, ease, mov } from './movimento';
import { rarita } from './rarita';
import { TarghettaRarita } from './TarghettaRarita';
import { Riflesso } from './Riflesso';
import { Scintille } from './Scintille';
import { LIVELLI, primitivi, tipografia } from './token';

/* ------------------------------------------------------------------ Moneta e monete in volo */

export function Moneta({ misura = 22 }: { misura?: number }) {
  const id = 'mn' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={misura} height={misura} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient id={id} cx="36%" cy="30%" r="80%">
          <Stop offset={0} stopColor={primitivi.ottone.filo} />
          <Stop offset={0.45} stopColor={primitivi.ottone.medio} />
          <Stop offset={1} stopColor={primitivi.ottone.scuro} />
        </RadialGradient>
      </Defs>
      <Circle cx={12} cy={12.6} r={11} fill="#080304" opacity={0.4} />
      <Circle cx={12} cy={12} r={11} fill={`url(#${id})`} />
      <Circle cx={12} cy={12} r={8.2} fill="none" stroke={primitivi.ottone.ombra} strokeOpacity={0.55} strokeWidth={1} />
      <Circle cx={12} cy={12} r={10.4} fill="none" stroke={primitivi.ottone.filo} strokeOpacity={0.6} strokeWidth={0.6} strokeDasharray="1 1.4" />
      {/* il settebello di denari, stilizzato: un fiore a quattro petali inciso */}
      <Path d="M12 7.2c1.3 1.6 1.3 3.2 0 4.8-1.3-1.6-1.3-3.2 0-4.8zM12 16.8c-1.3-1.6-1.3-3.2 0-4.8 1.3 1.6 1.3 3.2 0 4.8zM7.2 12c1.6-1.3 3.2-1.3 4.8 0-1.6 1.3-3.2 1.3-4.8 0zM16.8 12c-1.6 1.3-3.2 1.3-4.8 0 1.6-1.3 3.2-1.3 4.8 0z" fill={primitivi.ottone.ombra} opacity={0.75} />
      <Path d="M12 7.6c1 1.3 1 2.6 0 3.9" stroke={primitivi.ottone.filo} strokeOpacity={0.6} strokeWidth={0.5} fill="none" />
    </Svg>
  );
}

interface Volo {
  dx: number;
  dy: number;
  arco: number;
  ritardo: number;
}

function MonetaInVolo({ v, da, a, misura, t }: { v: Volo; da: { x: number; y: number }; a: { x: number; y: number }; misura: number; t: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const totale = mov.volo + mov.scaglione * 7;
    const ms = t.value * totale - v.ritardo;
    const k = Math.min(1, Math.max(0, ms / mov.volo));
    // ease.move sul percorso; l'arco è una parabola che si annulla all'arrivo (niente oltre-e-ritorno).
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const x = da.x + v.dx * (1 - e) + (a.x - da.x) * e;
    const y = da.y + v.dy * (1 - e) + (a.y - da.y) * e - v.arco * 4 * e * (1 - e);
    return {
      opacity: k <= 0 ? 0 : k > 0.92 ? (1 - k) / 0.08 : 1,
      transform: [{ translateX: x - misura / 2 }, { translateY: y - misura / 2 }, { scale: 1 - 0.3 * e }],
    };
  });
  return (
    <Animated.View style={[styles.moneta, st]}>
      <Moneta misura={misura} />
    </Animated.View>
  );
}

export function MoneteInVolo({
  da,
  a,
  quante = 6,
  seme = 1,
  misura = 22,
  onArrivo,
  onFine,
  suono = true,
}: {
  da: { x: number; y: number };
  a: { x: number; y: number };
  quante?: number;
  seme?: number;
  misura?: number;
  onArrivo?: () => void;
  onFine?: () => void;
  suono?: boolean;
}) {
  const riduci = useReducedMotion();
  const n = Math.min(8, Math.max(5, quante));
  const voli = useMemo<Volo[]>(() => {
    const rnd = seeded(seme);
    return Array.from({ length: n }, (_, i) => ({ dx: (rnd() - 0.5) * 26, dy: (rnd() - 0.5) * 18, arco: 30 + rnd() * 40, ritardo: i * mov.scaglione }));
  }, [n, seme]);
  const t = useSharedValue(0);
  useEffect(() => {
    if (riduci) {
      onArrivo?.();
      onFine?.();
      return;
    }
    const totale = mov.volo + mov.scaglione * 7;
    const arrivo = () => {
      if (suono) sfx('coin');
      onArrivo?.();
    };
    t.value = withTiming(1, { duration: totale, easing: Easing.linear }, fatto => {
      if (fatto && onFine) runOnJS(onFine)();
    });
    const id = setTimeout(arrivo, mov.volo);
    return () => clearTimeout(id);
    // Un volo per montaggio: chi lancia una nuova riscossione monta un MoneteInVolo con una key nuova.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (riduci) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {voli.map((v, i) => (
        <MonetaInVolo key={i} v={v} da={da} a={a} misura={misura} t={t} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ Teca */

/** Alone del materiale (leggendario, mitico): un radiale tondo dietro l'oggetto, opacità ≤ 0,25. */
function Alone({ lato, colore, opacita }: { lato: number; colore: string; opacita: number }) {
  const id = 'al' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = lato * 1.8;
  return (
    <Svg pointerEvents="none" width={L} height={L} style={{ position: 'absolute', left: (lato - L) / 2, top: (lato - L) / 2 }}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset={0.3} stopColor={colore} stopOpacity={Math.min(0.25, opacita)} />
          <Stop offset={1} stopColor={colore} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={L / 2} cy={L / 2} r={L / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Un valore che va da 0 a 1 dopo `a` ms in `durata` ms; `fine` lo porta subito a 1. */
function useEntrata(a: number, durata: number, fine: boolean, riduci: boolean) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (fine) v.value = withTiming(1, { duration: dur.quick, easing: ease.in });
    else if (riduci) v.value = withTiming(1, { duration: dur.enter, easing: ease.in });
    else v.value = withDelay(a, withTiming(1, { duration: durata, easing: ease.in }));
  }, [a, durata, fine, riduci, v]);
  return v;
}

function Cuscino({ w }: { w: number }) {
  // Il cuscino di velluto: un ovale schiacciato con i bordi più chiari (luce radente sul pelo) e una nappa.
  const h = w * 0.3;
  return (
    <View style={{ width: w, height: h, borderRadius: h / 2, boxShadow: ombra(3) }}>
      <Superficie materiale="velluto" raggio={h / 2} livello={0} style={{ width: w, height: h }} />
    </View>
  );
}

export function Teca({
  visibile,
  onChiudi,
  occhiello,
  titolo,
  rarita: r,
  children,
  sotto,
  azioni,
  particelle,
  seme = 3,
  forma = 'rettangolo',
}: {
  visibile: boolean;
  onChiudi: () => void;
  occhiello?: string;
  titolo: string;
  rarita?: Rarity;
  children: ReactNode;
  sotto?: ReactNode;
  azioni?: ReactNode;
  particelle?: boolean;
  seme?: number;
  forma?: 'cerchio' | 'rettangolo';
}) {
  const { width } = useWindowDimensions();
  const riduci = useReducedMotion();
  const [fine, setFine] = useState(false);
  const st = rarita(r);
  const lato = Math.min(180, width * 0.44);
  const conParticelle = (particelle ?? st.particelle > 0) && st.particelle > 0;
  const velo = useEntrata(0, dur.enter, fine, riduci);
  const cuscino = useEntrata(ACCENSIONE.superfici.a, ACCENSIONE.superfici.durata, fine, riduci);
  const oggetto = useEntrata(ACCENSIONE.eroe.a, ACCENSIONE.eroe.durata, fine, riduci);
  const nome = useEntrata(ACCENSIONE.resto.a, dur.enter, fine, riduci);
  const resto = useEntrata(ACCENSIONE.resto.a + 420, dur.enter, fine, riduci);
  const sVelo = useAnimatedStyle(() => ({ opacity: velo.value }));
  const sCus = useAnimatedStyle(() => ({ opacity: cuscino.value, transform: [{ translateY: (1 - cuscino.value) * ACCENSIONE.superfici.da }] }));
  const sOgg = useAnimatedStyle(() => ({ opacity: oggetto.value, transform: [{ translateY: (1 - oggetto.value) * 8 }] }));
  const sNome = useAnimatedStyle(() => ({ opacity: nome.value }));
  const sResto = useAnimatedStyle(() => ({ opacity: resto.value }));
  useEffect(() => {
    if (!visibile) setFine(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [visibile]);
  if (!visibile) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onChiudi} statusBarTranslucent>
      <Animated.View exiting={FadeOut.duration(dur.exit)} style={StyleSheet.absoluteFill}>
        <Pressable accessibilityRole="button" accessibilityLabel={fine ? 'Chiudi' : 'Salta'} onPress={() => (fine ? onChiudi() : setFine(true))} style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: LIVELLI.sovrapposto.velo }, sVelo]} />
          <Lampada cy={0.36} r={0.62} opacita={0.3} accendi />
        </Pressable>
        <View pointerEvents="box-none" style={styles.teca}>
          {occhiello ? (
            <Animated.View style={sNome}>
              <Text style={[tipografia.occhiello, { textAlign: 'center' }]}>{occhiello.toUpperCase()}</Text>
            </Animated.View>
          ) : null}
          <View style={{ width: lato * 1.5, height: lato + lato * 0.3 * 0.6, alignItems: 'center', justifyContent: 'flex-end' }} pointerEvents="none">
            <Animated.View style={[styles.assoluto, { bottom: 0 }, sCus]}>
              <Cuscino w={lato * 1.5} />
            </Animated.View>
            <Animated.View style={[{ width: lato, height: lato, marginBottom: lato * 0.3 * 0.42 }, sOgg]}>
              {st.alone ? <Alone lato={lato} colore={st.colore} opacita={st.alone} /> : null}
              {children}
              {st.movimenti > 0 ? <Riflesso forma={forma} larghezza={lato} altezza={lato} raggio={12} volte={1} ritardo={ACCENSIONE.eroe.a + mov.rivela} intensita={st.riflesso.opacita} /> : null}
              {conParticelle ? <Scintille larghezza={lato} altezza={lato} quante={st.particelle} tipo={st.id === 'mitico' ? 'granello' : 'scintilla'} seme={seme} /> : null}
            </Animated.View>
          </View>
          <Animated.View style={[styles.centro, sNome]}>
            <Text style={[tipografia.nomeOggetto, { textAlign: 'center' }]}>{titolo}</Text>
          </Animated.View>
          <Animated.View style={[styles.centro, { gap: 12 }, sResto]}>
            {r ? <TarghettaRarita rarita={r} misura="media" style={{ alignSelf: 'center' }} /> : null}
            {sotto}
            {azioni ? <View style={styles.azioni}>{azioni}</View> : null}
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  moneta: { position: 'absolute', left: 0, top: 0 },
  teca: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  assoluto: { position: 'absolute' },
  centro: { alignItems: 'center', width: '100%', maxWidth: 420, alignSelf: 'center' },
  azioni: { flexDirection: 'row', gap: 12, marginTop: 8, alignSelf: 'stretch', justifyContent: 'center' },
});
