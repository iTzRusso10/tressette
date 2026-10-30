// «Lampara»: la rarità vista (docs/direzione-artistica.md §5.7). I dati stanno in rarita.ts.
//
// Export:
// - `TarghettaRarita`  { rarita: Rarity, misura?: 'piccola' | 'media' (default 'piccola'), style? }
//                      targhetta di metallo con il nome della rarità inciso (testo inchiostro, sempre scritto).
//                      Peltro, rame, argento con punto di smalto blu, argento dorato con ametista, oro con
//                      incisione a filetto, corallo con bordo di madreperla. Statica (anche il riflesso: la
//                      targhetta sta sotto i 48 punti). Budget: 1 View + 2 Svg.
// - `MedagliaRarita`   { rarita, misura? (diametro, default 64), riflesso?: boolean, attivo?: boolean }
//                      il campione di una rarità: un medaglione col bordo del suo metallo, l'ornamento che cresce
//                      con la scala (liscio → zigrinato → smalto → rilievo → gemme → corallo), la gemma al centro.
//                      Dall'epico in su, se `riflesso` e la misura è ≥ 48, la luce passa con <Riflesso>
//                      (fermo con useAmbient e la prop `attivo`). Serve a /dev/arte e come segno di rarità
//                      nelle teche; le cornici vere le fa B3.
import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinear, Path, RadialGradient, Stop } from 'react-native-svg';
import type { Rarity } from '@/meta/rarity';
import { Text } from '../Text';
import { ombra } from './luce';
import { Superficie } from './materiali';
import { puoAnimare, rarita } from './rarita';
import { Riflesso } from './Riflesso';
import { fontArte, testo, tipografia } from './token';

const uid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

export function TarghettaRarita({ rarita: r, misura = 'piccola', style }: { rarita: Rarity; misura?: 'piccola' | 'media'; style?: StyleProp<ViewStyle> }) {
  const st = rarita(r);
  const size = misura === 'media' ? 13 : 11;
  const h = misura === 'media' ? 26 : 22;
  const mitico = st.id === 'mitico';
  const gid = 'tg' + uid(useId());
  return (
    <Superficie
      materiale="ottone"
      metallo={st.metallo}
      livello={2}
      piccolo
      raggio={4}
      accessibilityRole="text"
      accessibilityLabel={`Rarità: ${st.nome}`}
      style={[styles.targhetta, { height: h, paddingHorizontal: misura === 'media' ? 10 : 8 }, mitico && styles.madreperla, style]}
    >
      {st.gemma ? (
        <Svg width={7} height={7} viewBox="0 0 10 10">
          <Defs>
            <RadialGradient id={gid} cx="35%" cy="30%" r="80%">
              <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.9} />
              <Stop offset={0.35} stopColor={st.gemma} />
              <Stop offset={1} stopColor="#080304" stopOpacity={0.9} />
            </RadialGradient>
          </Defs>
          <Circle cx={5} cy={5} r={4.6} fill={`url(#${gid})`} stroke="#080304" strokeOpacity={0.4} strokeWidth={0.8} />
        </Svg>
      ) : null}
      <Text style={[styles.testoTarghetta, { fontSize: size, lineHeight: size * 1.3 }, tipografia.inciso]} numberOfLines={1}>
        {st.nome.toUpperCase()}
      </Text>
    </Superficie>
  );
}

/** Ornamento sul bordo del medaglione, per gradino della scala. */
function Ornamento({ r, c, livello, colore, secondo }: { r: number; c: number; livello: number; colore: string; secondo: string | null }) {
  if (livello === 0) return null;
  if (livello === 1) {
    // Non comune: zigrinatura (perline).
    const n = 36;
    return (
      <G>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2;
          return <Circle key={i} cx={c + Math.cos(a) * r} cy={c + Math.sin(a) * r} r={r * 0.045} fill={colore} opacity={0.75} />;
        })}
      </G>
    );
  }
  if (livello === 2) {
    // Raro: perline + un anello di smalto blu.
    return (
      <G>
        <Circle cx={c} cy={c} r={r * 0.86} fill="none" stroke="#1E4F99" strokeWidth={r * 0.1} />
        <Circle cx={c} cy={c} r={r * 0.86} fill="none" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={r * 0.025} strokeDasharray={`${r * 0.08} ${r * 0.18}`} />
      </G>
    );
  }
  // Epico in su: rilievo su tutto il giro (foglie/onde), due materiali.
  const n = livello >= 4 ? 16 : 12;
  return (
    <G>
      {secondo ? <Circle cx={c} cy={c} r={r * 0.86} fill="none" stroke={secondo} strokeWidth={r * 0.1} opacity={0.9} /> : null}
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 360;
        const s = r * 0.13;
        return (
          <G key={i} transform={`rotate(${a} ${c} ${c})`}>
            <Path d={`M${c} ${c - r - s * 0.2}c${s * 0.9} ${s * 0.6} ${s * 0.9} ${s * 1.6} 0 ${s * 2.2}c${-s * 0.9} ${-s * 0.6} ${-s * 0.9} ${-s * 1.6} 0 ${-s * 2.2}z`} fill={colore} />
            <Path d={`M${c} ${c - r}v${s * 1.6}`} stroke="#000000" strokeOpacity={0.3} strokeWidth={0.6} />
          </G>
        );
      })}
    </G>
  );
}

export function MedagliaRarita({ rarita: r, misura = 64, riflesso = true, attivo = true }: { rarita: Rarity; misura?: number; riflesso?: boolean; attivo?: boolean }) {
  const st = rarita(r);
  const id = 'md' + uid(useId());
  const c = misura / 2;
  const R = c * 0.86;
  const livello = ['comune', 'noncomune', 'raro', 'epico', 'leggendario', 'mitico'].indexOf(st.id);
  const [luce, medio, scuro, rimb] = st.metallo;
  const anima = riflesso && puoAnimare(st.id, misura);
  const n = st.id === 'leggendario' || st.id === 'mitico' ? 6 : 0;
  return (
    <View style={{ width: misura, height: misura, borderRadius: c, boxShadow: misura < 34 ? ombra(3, { piccolo: true }) : ombra(3) }} accessibilityRole="image" accessibilityLabel={`Rarità ${st.nome}, ${st.materiale}`}>
      <Svg width={misura} height={misura}>
        <Defs>
          <SvgLinear id={id + 'm'} x1="0.18" y1="0" x2="0.82" y2="1">
            <Stop offset={0} stopColor={luce} />
            <Stop offset={0.35} stopColor={medio} />
            <Stop offset={0.7} stopColor={scuro} />
            <Stop offset={1} stopColor={rimb} />
          </SvgLinear>
          <SvgLinear id={id + 'i'} x1="0.82" y1="1" x2="0.18" y2="0">
            <Stop offset={0} stopColor={luce} />
            <Stop offset={0.4} stopColor={medio} />
            <Stop offset={1} stopColor={scuro} />
          </SvgLinear>
          <RadialGradient id={id + 'f'} cx="40%" cy="35%" r="70%">
            <Stop offset={0} stopColor={st.secondo && st.id === 'mitico' ? '#F8F4FA' : '#3A2418'} />
            <Stop offset={1} stopColor={st.secondo && st.id === 'mitico' ? '#C9BCD6' : '#1A0E0A'} />
          </RadialGradient>
          <RadialGradient id={id + 'g'} cx="36%" cy="30%" r="75%">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset={0.3} stopColor={st.gemma ?? medio} />
            <Stop offset={1} stopColor="#080304" />
          </RadialGradient>
          <RadialGradient id={id + 'l'} cx="30%" cy="22%" rx="34%" ry="22%">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={st.riflesso.opacita} />
            <Stop offset={st.riflesso.nitidezza * 0.7} stopColor="#FFFFFF" stopOpacity={st.riflesso.opacita * 0.5} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* il bordo: metallo pieno; dentro un incavo (gradiente rovesciato) e il fondo */}
        <Circle cx={c} cy={c} r={R} fill={`url(#${id}m)`} />
        <Circle cx={c} cy={c} r={R * 0.78} fill={`url(#${id}i)`} />
        <Circle cx={c} cy={c} r={R * 0.7} fill={`url(#${id}f)`} />
        <Circle cx={c} cy={c} r={R * 0.7} fill="none" stroke="#080304" strokeOpacity={0.5} strokeWidth={1} />
        <Ornamento r={R * 0.92} c={c} livello={livello} colore={luce} secondo={st.secondo} />
        {/* la gemma (o il punzone del metallo) al centro */}
        {st.gemma ? (
          <G>
            <Circle cx={c} cy={c} r={R * 0.34} fill={`url(#${id}m)`} />
            <Circle cx={c} cy={c} r={R * 0.27} fill={`url(#${id}g)`} />
            <Ellipse cx={c - R * 0.08} cy={c - R * 0.1} rx={R * 0.08} ry={R * 0.05} fill="#FFFFFF" opacity={0.85} />
          </G>
        ) : (
          <Circle cx={c} cy={c} r={R * 0.3} fill={`url(#${id}i)`} stroke={`url(#${id}m)`} strokeWidth={R * 0.06} />
        )}
        {/* gemme di contorno: leggendario e mitico */}
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = c + Math.cos(a) * R * 0.86;
          const y = c + Math.sin(a) * R * 0.86;
          return (
            <G key={i}>
              <Circle cx={x} cy={y} r={R * 0.1} fill={`url(#${id}m)`} />
              <Circle cx={x} cy={y} r={R * 0.07} fill={`url(#${id}g)`} />
            </G>
          );
        })}
        {/* filo chiaro in alto a sinistra e scuro in basso a destra */}
        <Circle cx={c} cy={c} r={R - 0.5} fill="none" stroke={st.filo.chiaro} strokeWidth={1} strokeDasharray={`${Math.PI * R * 0.9} ${Math.PI * R * 1.1}`} transform={`rotate(160 ${c} ${c})`} />
        <Circle cx={c} cy={c} r={R - 0.5} fill="none" stroke={st.filo.scuro} strokeOpacity={0.8} strokeWidth={1} strokeDasharray={`${Math.PI * R * 0.9} ${Math.PI * R * 1.1}`} transform={`rotate(-20 ${c} ${c})`} />
        <Circle cx={c} cy={c} r={R} fill={`url(#${id}l)`} />
      </Svg>
      {anima ? <Riflesso forma="cerchio" larghezza={misura} altezza={misura} pausa={st.pausaRiflesso ?? 8000} attivo={attivo} intensita={st.riflesso.opacita + 0.2} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  targhetta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, alignSelf: 'flex-start' },
  madreperla: { borderWidth: 1, borderColor: '#F3ECF7' },
  testoTarghetta: { fontFamily: fontArte.soraExtra, letterSpacing: 1.1, color: testo.inchiostro },
});
