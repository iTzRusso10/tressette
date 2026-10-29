// «Lampara»: i materiali (docs/direzione-artistica.md §5.3, 5.6).
//
// Ogni superficie è fatta a strati, sempre nello stesso ordine:
//   0 ombre        contatto + portata (boxShadow della vista esterna, luce.ts `ombra`)
//   1 base         gradiente del materiale a 160° (alto-sinistra → basso-destra), o radiale per il velluto
//   2 grana        trama cotta neutra (assets/arte/trame, trame.ts) ripetuta in una Pattern SVG
//   3 luce         come la lampada cade su quel materiale (vernice, filo di luce, lucido, macchia dello smalto…)
//   4 rilievo      filo chiaro in alto-sinistra, filo scuro in basso-destra, e il bordo del materiale
// Si usano solo API presenti su iOS, Android e web: View, boxShadow, react-native-svg senza filtri,
// expo-linear-gradient. Niente blend mode: luce e ombra sono bianco e nero con alfa.
//
// Export (props principali; tutti accettano `style` e i props di accessibilità/testID di una View):
// - `Superficie`  { materiale: Materiale, children?, raggio?, livello?: 0|2|3|4 (ombra, default 2), piccolo?
//                   (solo ombra di contatto, per oggetti < 34 pt), tinta? (velluto, cuoio, smalto), metallo?
//                   (4 stop per l'ottone: peltro, rame, argento, oro… da rarita.ts), trama? (default true),
//                   crepe? (smalto: craquelure della maiolica), cornice? (sughero: spessore della cornice di noce,
//                   default 10; 0 senza), impuntura? (cuoio, default true), filetto? (noce: filetto d'ottone interno),
//                   premuto?: SharedValue<number> (0…1: il rilievo si inverte, per i pulsanti) }.
//                   I props di impaginazione dei figli (padding, gap, align…) passati in `style` valgono dentro.
//                   Budget: 2 View + 2 Svg statici. Nessuna animazione propria.
// - `Materiale`    'noce' | 'ottone' | 'carta' | 'velluto' | 'cuoio' | 'marmo' | 'sughero' | 'smalto'
// - `testoSu(m)`   il colore di testo giusto su quel materiale (forte su scuro, inchiostro su chiaro)
// - `Trama`        { nome: NomeTrama, opacita?, densita? } strato di grana a tutta misura, da mettere sopra
//                  qualsiasi colore (es. il panno in vetrina). Statico.
// - `Filetto`      { tipo?: 'oro' | 'rosso' | 'ottone', ornamento?: boolean, larghezza? } filetto tipografico
//                  (sfumato ai capi, o doppio con losanga al centro). Statico.
// - `Targa`        { testo?, children?, tipo?: 'etichetta' | 'nome', misura? (pt del testo), metallo?, viti? }
//                  placca d'ottone con testo inciso. 'nome' usa Bodoni (mai sotto 20 pt). Statica.
// - `Cartiglio`    { testo, misura?: 'piccolo' | 'medio' } nastro di carta con le code ripiegate (il titolo).
// - `Sigillo`      { testo?, simbolo?: ReactNode, misura? (diametro, 56), seme?, tinta?, timbro?: boolean }
//                  ceralacca a forma irregolare (seeded); con `timbro` entra con mov.timbro (scala 1,12 → 1).
// - `Lampada`      { cx?, cy?, r?, opacita?, colore?, accendi?: boolean, rimbalzo?: boolean } pozza di luce
//                  (frazioni del contenitore). Con `accendi` sale da 0 in mov.rivela (una volta, non ambientale).
// - `Sala`         { tinta?, luce?: {cx, cy, r, opacita}, accendi? } il fondo completo di una schermata di
//                  vetrina: bruno-notte, pozza della lampada, rimbalzo freddo, vignetta, grana contro le bande.
//                  Si mette come primo figlio (assoluto, pointerEvents none), come Backdrop di kit.tsx.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Image as SvgImage, LinearGradient as SvgLinear, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import { Text } from '../Text';
import { bordoLuce, LUCE, ombra, type LivelloOmbra } from './luce';
import { dur, ease, mov } from './movimento';
import { conAlfa, fondo, fontArte, mescola, primitivi, raggi, stopSmalto, testo, tipografia } from './token';
import { DENSITA_TRAME, TRAME, type NomeTrama } from './trame';

export type Materiale = 'noce' | 'ottone' | 'carta' | 'velluto' | 'cuoio' | 'marmo' | 'sughero' | 'smalto';

const uid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

/* ------------------------------------------------------------------ ricette */

interface Ricetta {
  /** Stop della base a 160°, oppure radiale (velluto). */
  base: readonly string[];
  radiale?: boolean;
  trama: NomeTrama | null;
  opacitaTrama: number;
  raggio: number;
  bordo: { chiaro: string; scuro: string };
  testo: string;
}

function ricetta(m: Materiale, tinta?: string, metallo?: readonly string[]): Ricetta {
  switch (m) {
    case 'noce':
      return { base: [primitivi.noce.luce, primitivi.noce.medio, primitivi.noce.scuro], trama: 'legno', opacitaTrama: TRAME.legno.opacita, raggio: raggi.superficie, bordo: bordoLuce.noce, testo: testo.forte };
    case 'ottone':
      return {
        base: metallo ?? [primitivi.ottone.luce, primitivi.ottone.medio, primitivi.ottone.scuro, primitivi.ottone.medio],
        trama: 'spazzolato',
        opacitaTrama: TRAME.spazzolato.opacita,
        raggio: raggi.targa,
        bordo: { chiaro: metallo ? 'rgba(255,255,255,0.7)' : bordoLuce.ottone.chiaro, scuro: metallo ? mescola(metallo[2], '#000000', 0.45) : bordoLuce.ottone.scuro },
        testo: testo.inchiostro,
      };
    case 'carta':
      return { base: [primitivi.carta.luce, primitivi.carta.medio, primitivi.carta.scuro], trama: 'carta', opacitaTrama: TRAME.carta.opacita, raggio: raggi.carta, bordo: bordoLuce.carta, testo: testo.inchiostro };
    case 'velluto': {
      const t = tinta ?? primitivi.velluto.luce;
      return { base: [mescola(t, '#000000', 0.48), mescola(t, '#000000', 0.3), mescola(t, '#FFFFFF', 0.03)], radiale: true, trama: 'velluto', opacitaTrama: TRAME.velluto.opacita, raggio: raggi.superficie, bordo: bordoLuce.velluto, testo: testo.forte };
    }
    case 'cuoio': {
      const t = tinta ?? primitivi.cuoio.luce;
      return { base: [t, mescola(t, primitivi.cuoio.scuro, 0.5), primitivi.cuoio.scuro], trama: 'cuoio', opacitaTrama: TRAME.cuoio.opacita, raggio: raggi.superficie, bordo: bordoLuce.cuoio, testo: testo.forte };
    }
    case 'marmo':
      return { base: [primitivi.marmo.luce, mescola(primitivi.marmo.luce, primitivi.marmo.medio, 0.5), primitivi.marmo.medio], trama: 'marmo', opacitaTrama: TRAME.marmo.opacita, raggio: 6, bordo: bordoLuce.marmo, testo: testo.inchiostro };
    case 'sughero':
      return { base: [mescola(primitivi.sughero.medio, '#FFFFFF', 0.06), primitivi.sughero.medio, primitivi.sughero.scuro], trama: 'sughero', opacitaTrama: TRAME.sughero.opacita, raggio: 4, bordo: bordoLuce.sughero, testo: testo.inchiostro };
    case 'smalto': {
      const t = tinta ?? primitivi.maiolica.blu;
      const chiaro = t.toUpperCase() === primitivi.maiolica.bianco || t.toUpperCase() === primitivi.maiolica.giallo;
      return { base: stopSmalto(t), trama: 'crepe', opacitaTrama: TRAME.crepe.opacita, raggio: raggi.targa, bordo: bordoLuce.smalto, testo: chiaro ? testo.inchiostro : testo.forte };
    }
  }
}

/** Il colore di testo giusto sopra un materiale (contrasti in token.ts COPPIE_CONTRASTO). */
export function testoSu(m: Materiale, tinta?: string): string {
  return ricetta(m, tinta).testo;
}

/* ------------------------------------------------------------------ strati */

/** Strato 2: la grana cotta, ripetuta a DENSITA_TRAME pixel per punto. */
export function Trama({ nome, opacita, densita = DENSITA_TRAME }: { nome: NomeTrama; opacita?: number; densita?: number }) {
  const id = 'tr' + uid(useId());
  const t = TRAME[nome];
  const lato = t.px / densita;
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id={id} x={0} y={0} width={lato} height={lato} patternUnits="userSpaceOnUse">
          <SvgImage href={t.src} x={0} y={0} width={lato} height={lato} preserveAspectRatio="none" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacita ?? t.opacita} />
    </Svg>
  );
}

/** Strati 1 e 3 (base e luce): tutto in percentuale, si disegna subito senza misurare. */
function BaseELuce({ m, r }: { m: Materiale; r: Ricetta }) {
  const id = 'sb' + uid(useId());
  const b = r.base;
  const stops = b.map((c, i) => <Stop key={i} offset={b.length === 1 ? 0 : i / (b.length - 1)} stopColor={c} />);
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        {r.radiale ? (
          // Velluto: il pelo al centro assorbe la luce, ai bordi la prende di striscio (§5.3).
          <RadialGradient id={id + 'b'} cx="50%" cy="46%" rx="62%" ry="66%" fx="48%" fy="42%">
            <Stop offset={0} stopColor={b[0]} />
            <Stop offset={0.62} stopColor={b[1]} />
            <Stop offset={0.9} stopColor={b[2]} />
            <Stop offset={1} stopColor={b[2]} />
          </RadialGradient>
        ) : (
          <SvgLinear id={id + 'b'} x1="0.18" y1="0" x2="0.82" y2="1">
            {stops}
          </SvgLinear>
        )}
        {m === 'ottone' ? (
          // Riflesso dell'ambiente su un metallo spazzolato in orizzontale: un filo di luce netto in alto
          // (la lampada), una banda scura sotto la metà (la stanza), il rimbalzo che risale in basso.
          <SvgLinear id={id + 'l'} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.05} />
            <Stop offset={0.1} stopColor="#FFF6DC" stopOpacity={0.62} />
            <Stop offset={0.2} stopColor="#FFF6DC" stopOpacity={0.08} />
            <Stop offset={0.58} stopColor="#000000" stopOpacity={0} />
            <Stop offset={0.74} stopColor="#000000" stopOpacity={0.16} />
            <Stop offset={0.92} stopColor="#FFF0D0" stopOpacity={0.12} />
            <Stop offset={1} stopColor="#000000" stopOpacity={0.1} />
          </SvgLinear>
        ) : m === 'noce' ? (
          // Vernice: bianco al 14% che svanisce a metà altezza.
          <SvgLinear id={id + 'l'} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.16} />
            <Stop offset={0.08} stopColor="#FFFFFF" stopOpacity={0.11} />
            <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={0.85} stopColor={LUCE.rimbalzo.colore} stopOpacity={0} />
            <Stop offset={1} stopColor={LUCE.rimbalzo.colore} stopOpacity={LUCE.rimbalzo.opacita + 0.04} />
          </SvgLinear>
        ) : m === 'marmo' ? (
          // Lucido largo in diagonale.
          <SvgLinear id={id + 'l'} x1="0" y1="0" x2="1" y2="1">
            <Stop offset={0.12} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={0.34} stopColor="#FFFFFF" stopOpacity={0.2} />
            <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0} />
          </SvgLinear>
        ) : m === 'carta' ? (
          // L'angolo in basso a destra appena sollevato: ombra del 10% nell'angolo.
          <SvgLinear id={id + 'l'} x1="0.55" y1="0.55" x2="1" y2="1">
            <Stop offset={0} stopColor="#000000" stopOpacity={0} />
            <Stop offset={0.86} stopColor="#3A2410" stopOpacity={0.06} />
            <Stop offset={1} stopColor="#3A2410" stopOpacity={0.12} />
          </SvgLinear>
        ) : m === 'velluto' ? (
          <SvgLinear id={id + 'l'} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#FFC8D2" stopOpacity={0.14} />
            <Stop offset={0.12} stopColor="#FFC8D2" stopOpacity={0} />
          </SvgLinear>
        ) : m === 'sughero' ? (
          <SvgLinear id={id + 'l'} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#FFF0D8" stopOpacity={0.1} />
            <Stop offset={0.5} stopColor="#FFF0D8" stopOpacity={0} />
          </SvgLinear>
        ) : (
          // Cuoio (riflesso morbido 10%) e smalto (macchia piccola e netta in alto a sinistra).
          <RadialGradient id={id + 'l'} cx={m === 'smalto' ? '24%' : '30%'} cy={m === 'smalto' ? '22%' : '18%'} rx={m === 'smalto' ? '22%' : '60%'} ry={m === 'smalto' ? '14%' : '45%'}>
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={m === 'smalto' ? 0.42 : 0.12} />
            <Stop offset={m === 'smalto' ? 0.55 : 0.4} stopColor="#FFFFFF" stopOpacity={m === 'smalto' ? 0.18 : 0.05} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        )}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id}b)`} />
      {r.trama ? <TramaRect nome={r.trama} opacita={r.opacitaTrama} id={id + 't'} /> : null}
      <Rect width="100%" height="100%" fill={`url(#${id}l)`} />
      {m === 'smalto' ? (
        // Smalto: in più un velo lucido che svanisce verso il basso (lo smalto è vetro).
        <>
          <Defs>
            <SvgLinear id={id + 'v'} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.12} />
              <Stop offset={0.55} stopColor="#FFFFFF" stopOpacity={0} />
            </SvgLinear>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}v)`} />
        </>
      ) : null}
    </Svg>
  );
}

/** La trama dentro un Svg già aperto (stesso disegno di <Trama>, senza un secondo Svg). */
function TramaRect({ nome, opacita, id }: { nome: NomeTrama; opacita: number; id: string }) {
  const t = TRAME[nome];
  const lato = t.px / DENSITA_TRAME;
  return (
    <>
      <Defs>
        <Pattern id={id} x={0} y={0} width={lato} height={lato} patternUnits="userSpaceOnUse">
          <SvgImage href={t.src} x={0} y={0} width={lato} height={lato} preserveAspectRatio="none" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacita} />
    </>
  );
}

/**
 * Strato 4: bordo e rilievo. Serve la misura (tratti netti al mezzo pixel), quindi si disegna dopo il primo
 * layout: è solo decorazione, il contenuto non si sposta.
 */
function Bordi({ w, h, r, chiaro, scuro, inverti, impuntura, filetto }: { w: number; h: number; r: number; chiaro: string; scuro: string; inverti?: boolean; impuntura?: boolean; filetto?: boolean }) {
  const id = 'bd' + uid(useId());
  const a = inverti ? scuro : chiaro;
  const b = inverti ? chiaro : scuro;
  return (
    <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinear id={id + 'e'} x1="0.32" y1="0" x2="0.68" y2="1">
          <Stop offset={0} stopColor={a} />
          <Stop offset={0.42} stopColor={a} stopOpacity={0.12} />
          <Stop offset={0.58} stopColor={b} stopOpacity={0.12} />
          <Stop offset={1} stopColor={b} />
        </SvgLinear>
        <SvgLinear id={id + 'f'} x1="0.32" y1="0" x2="0.68" y2="1">
          <Stop offset={0} stopColor="#F5DFA0" />
          <Stop offset={0.5} stopColor="#8A6526" />
          <Stop offset={1} stopColor="#C9A15A" />
        </SvgLinear>
      </Defs>
      {/* il bordo del materiale */}
      <Rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={Math.max(0, r - 0.5)} fill="none" stroke={`url(#${id}e)`} strokeWidth={1} />
      {/* il rilievo: un filo più morbido appena dentro */}
      <Rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={Math.max(0, r - 1.5)} fill="none" stroke={`url(#${id}e)`} strokeWidth={1} opacity={0.45} />
      {impuntura ? (
        <>
          {/* impuntura a due toni: il filo avorio e la sua ombra spostata di mezzo punto */}
          <Rect x={5} y={5.6} width={w - 10} height={h - 10} rx={Math.max(0, r - 4)} fill="none" stroke="#000000" strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="4 3" />
          <Rect x={5} y={5} width={w - 10} height={h - 10} rx={Math.max(0, r - 4)} fill="none" stroke={testo.forte} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 3" />
        </>
      ) : null}
      {filetto ? <Rect x={5.25} y={5.25} width={w - 10.5} height={h - 10.5} rx={Math.max(0, r - 5)} fill="none" stroke={`url(#${id}f)`} strokeWidth={1.5} /> : null}
    </Svg>
  );
}

/* ------------------------------------------------------------------ Superficie */

// Le chiavi di stile che riguardano i figli: vanno sulla vista interna.
const CHIAVI_DENTRO = new Set([
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingHorizontal', 'paddingVertical', 'paddingStart', 'paddingEnd',
  'alignItems', 'justifyContent', 'flexDirection', 'flexWrap', 'gap', 'rowGap', 'columnGap', 'alignContent',
]);

function dividi(style: StyleProp<ViewStyle>): [ViewStyle, ViewStyle] {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const fuori: Record<string, unknown> = {};
  const dentro: Record<string, unknown> = {};
  for (const k of Object.keys(flat)) (CHIAVI_DENTRO.has(k) ? dentro : fuori)[k] = flat[k];
  return [fuori as ViewStyle, dentro as ViewStyle];
}

export interface SuperficieProps extends Omit<ViewProps, 'style' | 'children'> {
  materiale: Materiale;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  raggio?: number;
  livello?: 0 | LivelloOmbra;
  piccolo?: boolean;
  tinta?: string;
  metallo?: readonly [string, string, string, string];
  trama?: boolean;
  crepe?: boolean;
  cornice?: number;
  impuntura?: boolean;
  filetto?: boolean;
  premuto?: SharedValue<number>;
}

export function Superficie({ materiale, children, style, raggio, livello = 2, piccolo, tinta, metallo, trama = true, crepe = false, cornice, impuntura, filetto, premuto, ...rest }: SuperficieProps) {
  const r = useMemo(() => {
    const x = ricetta(materiale, tinta, metallo);
    if (!trama || (materiale === 'smalto' && !crepe)) x.trama = null;
    return x;
  }, [materiale, tinta, metallo, trama, crepe]);
  const rad = raggio ?? r.raggio;
  const [fuori, dentro] = dividi(style);
  const [mis, setMis] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!mis || Math.abs(mis.w - width) > 0.5 || Math.abs(mis.h - height) > 0.5) setMis({ w: width, h: height });
    rest.onLayout?.(e);
  };
  const giu = useAnimatedStyle(() => ({ opacity: premuto ? premuto.value : 0 }));
  const su = useAnimatedStyle(() => ({ opacity: premuto ? 1 - premuto.value : 1 }));

  // Il sughero sta dentro una cornice di noce: la cornice è la superficie, il sughero è incassato.
  const spessore = materiale === 'sughero' ? (cornice ?? 10) : 0;
  if (spessore > 0) {
    return (
      <Superficie materiale="noce" raggio={rad + spessore / 2} livello={livello} piccolo={piccolo} style={[fuori, { padding: spessore }]} {...rest}>
        <Superficie materiale="sughero" raggio={rad} livello={0} cornice={0} style={[{ flexGrow: 1, boxShadow: 'inset 0px 2px 5px rgba(8,3,4,0.55), inset 0px -1px 0px rgba(255,230,190,0.18)' }, dentro]}>
          {children}
        </Superficie>
      </Superficie>
    );
  }

  const bordiProps = { r: rad, chiaro: r.bordo.chiaro, scuro: r.bordo.scuro, impuntura: materiale === 'cuoio' && impuntura !== false, filetto: materiale === 'noce' && !!filetto };
  return (
    <View {...rest} onLayout={onLayout} style={[{ borderRadius: rad }, livello ? { boxShadow: ombra(livello, { piccolo }) } : null, fuori]}>
      <View style={[styles.dentro, { borderRadius: rad }]}>
        <BaseELuce m={materiale} r={r} />
        {mis ? (
          premuto ? (
            <>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, su]}>
                <Bordi w={mis.w} h={mis.h} {...bordiProps} />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, giu]}>
                <Bordi w={mis.w} h={mis.h} {...bordiProps} inverti />
              </Animated.View>
            </>
          ) : (
            <Bordi w={mis.w} h={mis.h} {...bordiProps} />
          )
        ) : null}
        <View style={[styles.contenuto, dentro]}>{children}</View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Filetto */

export function Filetto({ tipo = 'oro', ornamento = false, larghezza, style }: { tipo?: 'oro' | 'rosso' | 'ottone'; ornamento?: boolean; larghezza?: number; style?: StyleProp<ViewStyle> }) {
  const c = tipo === 'rosso' ? testo.rosso : tipo === 'ottone' ? primitivi.ottone.medio : primitivi.fogliaOro;
  const ombraFilo = tipo === 'rosso' ? 'transparent' : 'rgba(8,3,4,0.55)';
  const sizing: ViewStyle = larghezza ? { width: larghezza } : { alignSelf: 'stretch' };
  if (!ornamento) {
    // Un filo che svanisce ai capi, con l'ombra sotto: inciso nella superficie.
    return (
      <View pointerEvents="none" style={[sizing, { height: 2 }, style]}>
        <LinearGradient colors={[conAlfa(c, 0), c, conAlfa(c, 0)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 1 }} />
        <LinearGradient colors={['transparent', ombraFilo, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 1 }} />
      </View>
    );
  }
  // Filetto inglese: doppio (grosso e sottile) con una losanga e due punti al centro.
  return (
    <View pointerEvents="none" style={[sizing, styles.filettoRiga, style]}>
      <View style={styles.filettoLato}>
        <LinearGradient colors={[conAlfa(c, 0), c]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 1.5 }} />
        <LinearGradient colors={[conAlfa(c, 0), conAlfa(c, 0.7)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 0.75, marginTop: 2 }} />
      </View>
      <Svg width={34} height={12} viewBox="0 0 34 12">
        <Circle cx={4} cy={6} r={1.3} fill={c} />
        <Path d="M17 1.2L22.5 6 17 10.8 11.5 6z" fill={c} />
        <Path d="M17 3.4L19.9 6 17 8.6 14.1 6z" fill={tipo === 'rosso' ? primitivi.carta.medio : fondo.base} opacity={0.85} />
        <Circle cx={30} cy={6} r={1.3} fill={c} />
      </Svg>
      <View style={styles.filettoLato}>
        <LinearGradient colors={[c, conAlfa(c, 0)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 1.5 }} />
        <LinearGradient colors={[conAlfa(c, 0.7), conAlfa(c, 0)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 0.75, marginTop: 2 }} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Targa */

function Vite({ s = 7 }: { s?: number }) {
  // Vite a testa piatta, incassata: luce in alto a sinistra, taglio scuro con il filo chiaro sotto.
  const id = 'vt' + uid(useId());
  return (
    <Svg width={s} height={s} viewBox="0 0 10 10">
      <Defs>
        <RadialGradient id={id} cx="35%" cy="30%" r="75%">
          <Stop offset={0} stopColor="#FFF3C8" />
          <Stop offset={0.6} stopColor="#B08A44" />
          <Stop offset={1} stopColor="#5A4016" />
        </RadialGradient>
      </Defs>
      <Circle cx={5} cy={5.4} r={4.4} fill="#000000" opacity={0.35} />
      <Circle cx={5} cy={5} r={4.2} fill={`url(#${id})`} />
      <Path d="M2.3 6.3L7.7 3.7" stroke="#3A2808" strokeWidth={1.1} strokeLinecap="round" />
      <Path d="M2.5 6.9L7.9 4.3" stroke="#FFF3C8" strokeOpacity={0.5} strokeWidth={0.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Targa({
  testo: t,
  children,
  tipo = 'etichetta',
  misura,
  metallo,
  viti,
  style,
  ...rest
}: { testo?: string; children?: ReactNode; tipo?: 'etichetta' | 'nome'; misura?: number; metallo?: readonly [string, string, string, string]; viti?: boolean; style?: StyleProp<ViewStyle> } & Omit<ViewProps, 'style' | 'children'>) {
  const nome = tipo === 'nome';
  const size = nome ? Math.max(20, misura ?? 26) : (misura ?? 12.5);
  const conViti = viti ?? nome;
  const font = nome
    ? { fontFamily: fontArte.bodoni, fontSize: size, lineHeight: Math.round(size * 1.2) }
    : { fontFamily: fontArte.soraBold, fontSize: size, lineHeight: Math.round(size * 1.35), letterSpacing: 1.3 };
  return (
    <Superficie
      materiale="ottone"
      metallo={metallo}
      livello={nome ? 3 : 2}
      raggio={nome ? raggi.targa : 6}
      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: nome ? 22 : 12, paddingVertical: nome ? 8 : 4, gap: 10 }, style]}
      {...rest}
    >
      {conViti ? <Vite /> : null}
      {t !== undefined ? (
        <Text style={[font, tipografia.inciso, styles.testoTarga]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {nome ? t : t.toUpperCase()}
        </Text>
      ) : null}
      {children}
      {conViti ? <Vite /> : null}
    </Superficie>
  );
}

/* ------------------------------------------------------------------ Cartiglio */

function Coda({ h, verso }: { h: number; verso: 1 | -1 }) {
  const w = Math.round(h * 0.78);
  const g = Math.round(h * 0.24);
  const id = 'cd' + uid(useId());
  // La coda del nastro: più scura (è sul retro), con la tacca a V; la piega è un triangolo in ombra.
  const d = verso === 1 ? `M0 ${g}H${w}V${h + g}H0L${w * 0.36} ${(h + 2 * g) / 2}Z` : `M${w} ${g}H0V${h + g}H${w}L${w * 0.64} ${(h + 2 * g) / 2}Z`;
  const piega = verso === 1 ? `M${w} ${h}L${w} ${h + g}L${w - g * 1.1} ${h}Z` : `M0 ${h}L0 ${h + g}L${g * 1.1} ${h}Z`;
  return (
    <Svg width={w} height={h + g} style={verso === 1 ? { marginRight: -g * 1.1 } : { marginLeft: -g * 1.1 }}>
      <Defs>
        <SvgLinear id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={primitivi.carta.scuro} />
          <Stop offset={1} stopColor={primitivi.carta.bordo} />
        </SvgLinear>
      </Defs>
      <Path d={d} fill={`url(#${id})`} />
      <Path d={d} fill="none" stroke="#000000" strokeOpacity={0.18} />
      <Path d={piega} fill="#7A6444" />
    </Svg>
  );
}

export function Cartiglio({ testo: t, misura = 'medio', style }: { testo: string; misura?: 'piccolo' | 'medio'; style?: StyleProp<ViewStyle> }) {
  const h = misura === 'piccolo' ? 26 : 32;
  const size = misura === 'piccolo' ? 12.5 : 14;
  return (
    <View style={[styles.cartiglio, style]} accessibilityRole="text" accessibilityLabel={t}>
      <Coda h={h} verso={1} />
      <View style={[styles.cartiglioNastro, { height: h, boxShadow: ombra(2, { piccolo: true }) }]}>
        <LinearGradient colors={[primitivi.carta.luce, primitivi.carta.medio, primitivi.carta.scuro]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <Trama nome="carta" opacita={0.45} />
        {/* il nastro è curvo: luce sul bordo alto, ombra sul basso */}
        <View style={[styles.cartiglioOrlo, { top: 0, backgroundColor: 'rgba(255,255,255,0.55)' }]} />
        <View style={[styles.cartiglioOrlo, { bottom: 0, backgroundColor: 'rgba(90,60,30,0.35)' }]} />
        <View style={[styles.cartiglioFilo, { top: 3 }]} />
        <View style={[styles.cartiglioFilo, { bottom: 3 }]} />
        <Text style={[styles.cartiglioTesto, { fontSize: size, lineHeight: size * 1.3 }]} numberOfLines={1}>
          {t}
        </Text>
      </View>
      <Coda h={h} verso={-1} />
    </View>
  );
}

/* ------------------------------------------------------------------ Sigillo */

function sagomaSigillo(seme: number, r: number, c: number) {
  const rnd = seeded(seme);
  const n = 16;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    // Bordo della ceralacca: tondo, con qualche colata più larga.
    const k = 0.9 + rnd() * 0.1 + (rnd() < 0.18 ? 0.07 : 0);
    return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k];
  });
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    d += i === 0 ? `M${m[0].toFixed(2)} ${m[1].toFixed(2)}` : '';
    const nx = pts[(i + 1) % n];
    const mm = [(nx[0] + pts[(i + 2) % n][0]) / 2, (nx[1] + pts[(i + 2) % n][1]) / 2];
    d += `Q${nx[0].toFixed(2)} ${nx[1].toFixed(2)} ${mm[0].toFixed(2)} ${mm[1].toFixed(2)}`;
  }
  return { d: d + 'Z', rot: (rnd() - 0.5) * 16 };
}

export function Sigillo({
  testo: t,
  simbolo,
  misura = 56,
  seme = 7,
  tinta,
  timbro = false,
  style,
}: {
  testo?: string;
  simbolo?: ReactNode;
  misura?: number;
  seme?: number;
  tinta?: string;
  timbro?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const id = 'sg' + uid(useId());
  const c = misura / 2;
  const { d, rot } = useMemo(() => sagomaSigillo(seme, c * 0.96, c), [seme, c]);
  const base = tinta ?? primitivi.ceralacca.luce;
  const scuro = mescola(base, '#000000', 0.38);
  const riduci = useReducedMotion();
  const p = useSharedValue(timbro ? 0 : 1);
  useEffect(() => {
    if (!timbro) return;
    p.value = withTiming(1, { duration: riduci ? dur.quick : mov.timbro, easing: ease.in });
  }, [timbro, riduci, p]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ rotate: `${rot}deg` }, { scale: riduci ? 1 : 1.12 - 0.12 * p.value }],
  }));
  // Il testo deve stare nel disco (adjustsFontSizeToFit non c'è sul web): misura dalla parola più lunga.
  const parola = Math.max(1, ...(t ?? '').split(/\s+/).map(x => x.length));
  const size = Math.max(8, Math.min(misura * 0.17, (misura * 0.56) / (parola * 0.86)));
  return (
    <Animated.View style={[{ width: misura, height: misura }, st, style]} accessibilityRole="image" accessibilityLabel={t}>
      <Svg width={misura} height={misura}>
        <Defs>
          <RadialGradient id={id + 'c'} cx="40%" cy="36%" r="70%">
            <Stop offset={0} stopColor={mescola(base, '#FFFFFF', 0.08)} />
            <Stop offset={0.65} stopColor={base} />
            <Stop offset={1} stopColor={scuro} />
          </RadialGradient>
          <RadialGradient id={id + 'l'} cx="32%" cy="26%" rx="22%" ry="14%">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.38} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* ombra di contatto: la ceralacca è spessa */}
        <G transform={`translate(${misura * 0.02} ${misura * 0.04})`}>
          <Path d={d} fill="#080304" opacity={0.45} />
        </G>
        <Path d={d} fill={`url(#${id}c)`} />
        {/* l'impronta: un anello scavato (ombra in alto a sinistra, luce in basso a destra) */}
        <Circle cx={c} cy={c} r={c * 0.7} fill={scuro} opacity={0.35} />
        <Circle cx={c - 0.6} cy={c - 0.6} r={c * 0.7} fill="none" stroke="#000000" strokeOpacity={0.45} strokeWidth={1.4} />
        <Circle cx={c + 0.7} cy={c + 0.7} r={c * 0.7} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1} />
        <Circle cx={c} cy={c} r={c * 0.6} fill="none" stroke="#000000" strokeOpacity={0.25} strokeWidth={0.8} strokeDasharray="1.2 2.2" />
        <Ellipse cx={c} cy={c} rx={c} ry={c} fill={`url(#${id}l)`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centro]}>
        {simbolo}
        {t ? (
          <Text style={[styles.sigilloTesto, { fontSize: size, lineHeight: size * 1.1, maxWidth: misura * 0.7 }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {t.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ Lampada e Sala */

export function Lampada({
  cx = LUCE.pozza.cx,
  cy = LUCE.pozza.cy,
  r = LUCE.pozza.r,
  opacita = LUCE.pozza.opacita,
  colore = LUCE.colore,
  accendi = false,
  rimbalzo = false,
  style,
}: {
  cx?: number;
  cy?: number;
  r?: number;
  opacita?: number;
  colore?: string;
  accendi?: boolean;
  rimbalzo?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const id = 'lp' + uid(useId());
  const [mis, setMis] = useState<{ w: number; h: number } | null>(null);
  const riduci = useReducedMotion();
  const v = useSharedValue(accendi ? 0 : 1);
  useEffect(() => {
    if (!accendi || !mis) return;
    v.value = withTiming(1, { duration: riduci ? dur.quick : mov.rivela, easing: ease.in });
  }, [accendi, mis, riduci, v]);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        if (!mis || Math.abs(mis.w - width) > 1 || Math.abs(mis.h - height) > 1) setMis({ w: width, h: height });
      }}
    >
      {mis ? (
        <Animated.View style={[StyleSheet.absoluteFill, st]}>
          <Svg width={mis.w} height={mis.h}>
            <Defs>
              {/* la pozza è tonda (il raggio è una frazione della larghezza): userSpaceOnUse */}
              <RadialGradient id={id} cx={mis.w * cx} cy={mis.h * cy} r={mis.w * r} fx={mis.w * cx} fy={mis.h * cy} gradientUnits="userSpaceOnUse">
                <Stop offset={0} stopColor={colore} stopOpacity={opacita} />
                <Stop offset={0.35} stopColor={colore} stopOpacity={opacita * 0.55} />
                <Stop offset={0.7} stopColor={colore} stopOpacity={opacita * 0.14} />
                <Stop offset={1} stopColor={colore} stopOpacity={0} />
              </RadialGradient>
              {rimbalzo ? (
                <RadialGradient id={id + 'r'} cx={mis.w} cy={mis.h} r={Math.max(mis.w, mis.h) * 0.7} gradientUnits="userSpaceOnUse">
                  <Stop offset={0} stopColor={LUCE.rimbalzo.colore} stopOpacity={LUCE.rimbalzo.opacita * 1.6} />
                  <Stop offset={1} stopColor={LUCE.rimbalzo.colore} stopOpacity={0} />
                </RadialGradient>
              ) : null}
            </Defs>
            <Rect width={mis.w} height={mis.h} fill={`url(#${id})`} />
            {rimbalzo ? <Rect width={mis.w} height={mis.h} fill={`url(#${id}r)`} /> : null}
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function Sala({
  tinta,
  luce,
  accendi = false,
  style,
}: {
  tinta?: string;
  luce?: { cx?: number; cy?: number; r?: number; opacita?: number };
  accendi?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const id = 'sl' + uid(useId());
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fondo.base }, style]}>
      {/* la parete: un poco più calda in alto, dove arriva la lampada */}
      <LinearGradient colors={[primitivi.notte.medio, fondo.luce, fondo.base]} locations={[0, 0.35, 0.85]} style={StyleSheet.absoluteFill} />
      {tinta ? <Lampada cx={luce?.cx} cy={luce?.cy} r={(luce?.r ?? LUCE.pozza.r) * 1.15} opacita={0.12} colore={tinta} accendi={accendi} /> : null}
      <Lampada cx={luce?.cx} cy={luce?.cy} r={luce?.r} opacita={luce?.opacita} accendi={accendi} rimbalzo />
      {/* grana finissima: toglie le bande dei gradienti scuri e dà materia alla parete */}
      <Trama nome="velluto" opacita={0.1} />
      {/* vignetta: gli angoli si perdono nell'ombra */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="38%" rx="85%" ry="80%">
            <Stop offset={0.45} stopColor="#080304" stopOpacity={0} />
            <Stop offset={1} stopColor="#080304" stopOpacity={0.6} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  dentro: { flexGrow: 1, overflow: 'hidden' },
  contenuto: { flexGrow: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  filettoRiga: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filettoLato: { flex: 1 },
  testoTarga: { textAlign: 'center', flexShrink: 1 },
  cartiglio: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'center' },
  cartiglioNastro: { justifyContent: 'center', paddingHorizontal: 18, overflow: 'hidden', zIndex: 1, borderRadius: 1 },
  cartiglioOrlo: { position: 'absolute', left: 0, right: 0, height: 1 },
  cartiglioFilo: { position: 'absolute', left: 8, right: 8, height: 0.75, backgroundColor: testo.rosso, opacity: 0.55 },
  cartiglioTesto: { fontFamily: fontArte.soraSemi, color: testo.inchiostro, textAlign: 'center', letterSpacing: 0.3 },
  sigilloTesto: {
    fontFamily: fontArte.soraExtra,
    color: testo.forte,
    textAlign: 'center',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(8,3,4,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
});
