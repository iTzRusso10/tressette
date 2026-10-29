// La medaglia di un achievement come oggetto vero (docs/direzione-artistica.md §5.6, 5.15 «medagliere»): un
// disco di metallo coniato con il bordo rialzato, il simbolo della categoria inciso (ombra in alto a sinistra,
// filo di luce in basso a destra: è scavato) e il nastro di velluto da cui pende.
//
// Export:
// - `METALLI_LIVELLO`  per bronzo, argento, oro e platino: quattro stop del metallo, il colore del nastro, il nome
// - `Medaglia`         { livello: Tier, simbolo: Glyph, misura? (diametro del disco, default 56), nastro? (default
//                      true), vuota? (l'impronta nel velluto di una medaglia che non hai: niente metallo) }
//                      Statica. Alta misura × 1,5 con il nastro. Budget: 1 Svg.
import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { GLYPHS, type Glyph, type Tier } from '../meta';

export const METALLI_LIVELLO: Record<Tier, { metallo: [string, string, string, string]; nastro: [string, string]; nome: string; inchiostro: string }> = {
  bronzo: { metallo: ['#F6C9A0', '#C27A4A', '#7A4022', '#B06A3E'], nastro: ['#8E1A26', '#5A0E18'], nome: 'Bronzo', inchiostro: '#3A1A0A' },
  argento: { metallo: ['#FFFFFF', '#C9D0D8', '#7D8792', '#AEB7C2'], nastro: ['#1E4F99', '#0F2E5E'], nome: 'Argento', inchiostro: '#2A3240' },
  oro: { metallo: ['#FFF0BC', '#E2B24A', '#8E6214', '#D19C36'], nastro: ['#1F6A49', '#0E3E2A'], nome: 'Oro', inchiostro: '#3A2604' },
  platino: { metallo: ['#FFFFFF', '#E4E8EE', '#8E99A8', '#C8D0DA'], nastro: ['#4A1420', '#24080E'], nome: 'Platino', inchiostro: '#1E2430' },
};

export function Medaglia({ livello, simbolo, misura = 56, nastro = true, vuota = false }: { livello: Tier; simbolo: Glyph; misura?: number; nastro?: boolean; vuota?: boolean }) {
  const id = 'md' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const m = METALLI_LIVELLO[livello];
  const S = misura;
  const altN = nastro ? S * 0.5 : 0;
  const H = S + altN;
  const c = S / 2;
  const cy = altN + c;
  const r = c - 1;
  const k = (S * 0.5) / 24; // il simbolo è in una tela 24×24
  const nw = S * 0.44;
  return (
    <Svg width={S} height={H} viewBox={`0 0 ${S} ${H}`}>
      <Defs>
        <LinearGradient id={id + 'm'} x1="0.18" y1="0" x2="0.82" y2="1">
          <Stop offset={0} stopColor={m.metallo[0]} />
          <Stop offset={0.35} stopColor={m.metallo[1]} />
          <Stop offset={0.75} stopColor={m.metallo[2]} />
          <Stop offset={1} stopColor={m.metallo[3]} />
        </LinearGradient>
        <LinearGradient id={id + 'c'} x1="0.82" y1="1" x2="0.18" y2="0">
          <Stop offset={0} stopColor={m.metallo[0]} />
          <Stop offset={0.4} stopColor={m.metallo[1]} />
          <Stop offset={1} stopColor={m.metallo[2]} />
        </LinearGradient>
        <RadialGradient id={id + 'l'} cx="32%" cy="28%" rx="30%" ry="22%">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={id + 'n'} x1="0" y1="0" x2="1" y2="0">
          <Stop offset={0} stopColor={m.nastro[1]} />
          <Stop offset={0.5} stopColor={m.nastro[0]} />
          <Stop offset={1} stopColor={m.nastro[1]} />
        </LinearGradient>
      </Defs>
      {vuota ? (
        // L'impronta nel velluto: un incavo con il filo di luce in basso a destra.
        <G>
          <Circle cx={c} cy={cy} r={r * 0.92} fill="#080304" opacity={0.35} />
          <Circle cx={c - 0.6} cy={cy - 0.6} r={r * 0.92} fill="none" stroke="#000000" strokeOpacity={0.55} strokeWidth={1.4} />
          <Circle cx={c + 0.6} cy={cy + 0.6} r={r * 0.92} fill="none" stroke="#FFC8D2" strokeOpacity={0.14} strokeWidth={1} />
        </G>
      ) : (
        <G>
          {nastro ? (
            <G>
              {/* il nastro a V: due lembi di velluto, il sinistro in luce, il destro in ombra */}
              <Path d={`M${c - nw / 2} 0H${c}L${c} ${altN + S * 0.12}L${c - nw * 0.18} ${altN + S * 0.02}Z`} fill={`url(#${id}n)`} />
              <Path d={`M${c} 0H${c + nw / 2}L${c + nw * 0.18} ${altN + S * 0.02}L${c} ${altN + S * 0.12}Z`} fill={m.nastro[1]} />
              <Path d={`M${c - nw * 0.1} 0V${altN}M${c + nw * 0.1} 0V${altN}`} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1} />
              <Path d={`M${c - nw / 2} 0H${c + nw / 2}`} stroke="#000000" strokeOpacity={0.4} strokeWidth={1.5} />
            </G>
          ) : null}
          {/* ombra portata sul fondo, verso il basso a destra */}
          <Circle cx={c + S * 0.03} cy={cy + S * 0.05} r={r} fill="#080304" opacity={0.45} />
          {/* bordo rialzato, poi il campo (il gradiente è girato: il campo è più basso del bordo) */}
          <Circle cx={c} cy={cy} r={r} fill={`url(#${id}m)`} />
          <Circle cx={c} cy={cy} r={r * 0.8} fill={`url(#${id}c)`} />
          <Circle cx={c} cy={cy} r={r * 0.8} fill="none" stroke="#000000" strokeOpacity={0.28} strokeWidth={1} />
          <Circle cx={c} cy={cy} r={r * 0.92} fill="none" stroke={m.metallo[0]} strokeOpacity={0.6} strokeWidth={0.8} strokeDasharray={`${S * 0.02} ${S * 0.03}`} />
          {/* il simbolo inciso: prima l'ombra (alto-sinistra), poi il filo di luce spostato in basso a destra */}
          <G transform={`translate(${c - 12 * k + 0.7} ${cy - 12 * k + 0.7}) scale(${k})`}>
            <Path d={GLYPHS[simbolo]} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </G>
          <G transform={`translate(${c - 12 * k} ${cy - 12 * k}) scale(${k})`}>
            <Path d={GLYPHS[simbolo]} fill="none" stroke={m.inchiostro} strokeOpacity={0.85} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </G>
          <Circle cx={c} cy={cy} r={r} fill={`url(#${id}l)`} />
          <Circle cx={c} cy={cy} r={r - 0.5} fill="none" stroke="#000000" strokeOpacity={0.35} strokeWidth={1} />
        </G>
      )}
    </Svg>
  );
}
