// «Il Club dei Signori» (arena 13, Capitolo III): l'arena del prototipo di «Lampara» (docs/direzione-artistica.md
// §5.14). Una sala vera in prospettiva (camera.ts) con una luce calcolata (luce.ts): la lampada verde calda sopra
// il tavolo contro la luna fredda dalla finestra sul golfo.
//
// Export:
// - `ClubFermo`  { larghezza, altezza, spenta? } la scena in un solo Svg, ferma. È quella che ArenaScene mostra
//                nella home, nella strada delle arene e in classifica (con `spenta` le «luci spente»: l'arena non
//                ancora raggiunta). Misurata sulla vista: una stanza sola, inquadrata per ogni proporzione.
// - `ClubVivo`   { larghezza, altezza, modo?: 'scena' | 'esplora', spenta?, vivo?, polvere?, tavolo?, scorrimento?,
//                  sguardo?, entrata? } la scena a piani: P0 cielo, P1 sala, P2 arredi, P3 tavolo e lampada, P4 primo
//                piano, ognuno in un Svg suo, che si spostano a velocità diverse (parallasse) quando si muove lo
//                sguardo (`sguardo`: SharedValue in punti, per esempio da un trascinamento in «Esplora»; `scorrimento`:
//                lo scrollY di una lista, come la Parallasse di B0). La camera non si muove da sola (costo, vedi sotto).
//                - `tavolo` { table, felt, back }: il tavolino equipaggiato (FeltArt così com'è) posato sul piano del
//                  tavolo con una trasformazione proiettiva (prospettiva.ts), con le gambe e l'ombra di contatto;
//                  sopra solo un mazzetto coperto col tuo dorso. Le scansioni delle carte non entrano mai qui.
//                - vita (`vivo`, ≤ 3): la lampara sul golfo, la tenda di destra, il fumo del sigaro; più la
//                  polvere nel cono della lampada con `polvere` (solo «Esplora»: 4). Tutto si ferma con
//                  useAmbient (riduci movimento, schermata non a fuoco, app in background).
//                - `entrata`: SharedValue 0…1 per lo svelamento: i piani si posano uno alla volta, ognuno da un po'
//                  più lontano (la camera che arriva), e la lampada si accende per ultima.
// Budget: vita (≤ 3) + polvere (1, 10 granelli) ≤ 4 animati. I piani si muovono solo come View e solo col dito.
import { Image } from 'expo-image';
import { memo, useEffect, useId, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type TransformsStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { G } from 'react-native-svg';
import { backImage } from '@/game/cardImages';
import { FeltArt, tableLook } from '@/game/Felt';
import { Respiro } from '@/ui/arte/Respiro';
import { Scintille } from '@/ui/arte/Scintille';
import { useAmbient } from '@/ui/arte/useAmbient';
import { ease } from '@/ui/arte/movimento';
import { CARD_RATIO, cardRadius } from '@/ui/theme';
import { inquadra, pr, STANZA, type Camera, type Modo, type Pt } from './camera';
import { mescola } from './luce';
import { matricePosa } from './prospettiva';
import {
  ancore,
  Cielo,
  type Ctx,
  Fumo,
  fumoScala,
  Lampada,
  Lampara,
  LuceSulPiano,
  type LegnoTavolo,
  Mezzo,
  PianoVettoriale,
  Pavimento,
  PrimoPiano,
  Sala,
  TavoloBordo,
  TavoloSotto,
  Tenda,
  Vignetta,
} from './scena';

const NOCE_CLUB: LegnoTavolo = { luce: '#7A4E30', medio: '#5A3A26', scuro: '#2A160C' };

function useCtx(cam: Camera, spenta: boolean): Ctx {
  const uid = 'cl' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return useMemo(() => ({ cam, luci: { spenta }, u: (n: string) => `${uid}-${n}` }), [cam, spenta, uid]);
}

/** Il legno del tavolo: quello della sponda equipaggiata (i suoi tre toni), o il noce del club. */
function legnoDi(table?: string): LegnoTavolo {
  if (!table) return NOCE_CLUB;
  const r = tableLook(table).rim;
  return { luce: r[0], medio: r[1], scuro: mescola(r[2], '#000000', 0.2) };
}

/* ------------------------------------------------------------------ ferma */

export const ClubFermo = memo(function ClubFermo({ larghezza, altezza, spenta = false }: { larghezza: number; altezza: number; spenta?: boolean }) {
  const cam = useMemo(() => inquadra(larghezza, altezza, 'scena'), [larghezza, altezza]);
  const k = useCtx(cam, spenta);
  const a = useMemo(() => ancore(cam), [cam]);
  const ls = Math.max(1.4, a.sTavolo * 0.05);
  // Tutto in un Svg: ferma, si disegna una volta sola. useMemo: la scena è pura (misure e luci).
  const corpo = useMemo(
    () => (
      <>
        <Cielo k={k} />
        <G transform={`translate(${a.lampara[0]} ${a.lampara[1]})`}>
          <Lampara k={k} s={ls} />
        </G>
        <Pavimento k={k} />
        <Sala k={k} />
        <Mezzo k={k} />
        <TavoloSotto k={k} legno={NOCE_CLUB} />
        <TavoloBordo k={k} legno={NOCE_CLUB} />
        <PianoVettoriale k={k} legno={NOCE_CLUB} />
        <LuceSulPiano k={k} />
        <Lampada k={k} />
        <PrimoPiano k={k} />
        <Vignetta k={k} w={larghezza} h={altezza} />
      </>
    ),
    [k, a, ls, larghezza, altezza],
  );
  return (
    <Svg width={larghezza} height={altezza}>
      {corpo}
    </Svg>
  );
});

/* ------------------------------------------------------------------ a piani */

export interface TavoloEquipaggiato {
  table: string;
  felt: string;
  back?: string;
}

/** Il fattore di parallasse di ogni piano (token LIVELLI): lo spostamento è (1 − fattore) × sguardo. */
const FATTORI = { cielo: 0.2, sala: 0.5, mezzo: 0.8, tavolo: 1, primo: 1.15 } as const;

/** Un piano: un Svg a tutta tela (con il margine), spostato dallo sguardo e posato dall'entrata. */
function Piano({
  cam,
  fattore,
  sguardo,
  scorrimento,
  respiro,
  entrata,
  passo,
  children,
}: {
  cam: Camera;
  fattore: number;
  sguardo?: SharedValue<number>;
  scorrimento?: SharedValue<number>;
  respiro: SharedValue<number>;
  entrata?: SharedValue<number>;
  passo: number;
  children: ReactNode;
}) {
  const p = 1 - fattore;
  const st = useAnimatedStyle(() => {
    const gx = (sguardo ? sguardo.value : 0) + respiro.value;
    const gy = scorrimento ? Math.max(-cam.m, Math.min(cam.m, scorrimento.value * 0.3)) : 0;
    // Entrata: ogni piano parte un passo dopo il precedente e arriva da più lontano (più piccolo, più in basso).
    let o = 1;
    let sc = 1;
    let dy = 0;
    if (entrata) {
      const t = Math.max(0, Math.min(1, (entrata.value - passo * 0.12) / 0.55));
      const e = 1 - Math.pow(1 - t, 3);
      o = e;
      sc = 1 + (1 - e) * (0.05 + passo * 0.025);
      dy = (1 - e) * (6 + passo * 6);
    }
    return { opacity: o, transform: [{ translateX: p * gx }, { translateY: p * gy + dy }, { scale: sc }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -cam.m, top: -cam.m, width: cam.w, height: cam.h }, st]}>
      {children}
    </Animated.View>
  );
}

/** La tenda di destra che si muove appena: ruota di poco intorno al bastone (vita 1). */
function TendaViva({ cam, k, vivo }: { cam: Camera; k: Ctx; vivo: boolean }) {
  const on = useAmbient(vivo);
  const t = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withDelay(900, withRepeat(withTiming(1, { duration: 5200, easing: ease.move, reduceMotion: ReduceMotion.System }), -1, true));
    return () => cancelAnimation(t);
  }, [on, t]);
  const [ax, ay] = pr(cam, 1.1, 3.68, STANZA.fondo - 0.3);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: ax }, { translateY: ay }, { rotate: `${-0.9 * t.value}deg` }, { translateX: -ax }, { translateY: -ay }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st]}>
      <Svg width={cam.w} height={cam.h}>
        <Tenda k={k} verso={1} />
      </Svg>
    </Animated.View>
  );
}

/** Il fumo del sigaro: sale un poco e svanisce, piano (vita 2). */
function FumoVivo({ at, s, vivo }: { at: Pt; s: number; vivo: boolean }) {
  const on = useAmbient(vivo);
  const t = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withRepeat(withTiming(1, { duration: 5600, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, false);
    return () => cancelAnimation(t);
  }, [on, t]);
  const box = Math.ceil(s * 0.6);
  const st = useAnimatedStyle(() => {
    const k = t.value;
    // Fermo (k = 0) è il fumo disegnato; vivo sale di poco, si allarga e torna trasparente a fine ciclo.
    const o = k < 0.15 ? 1 - k * 2 : k > 0.85 ? 0.7 + (k - 0.85) * 2 : 0.7;
    return { opacity: o, transform: [{ translateY: -k * s * 0.08 }, { scaleX: 1 + k * 0.25 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: at[0] - box / 2, top: at[1] - box, width: box, height: box }, st]}>
      <Svg width={box} height={box}>
        <G transform={`translate(${box / 2} ${box})`}>
          <Fumo s={s} />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Il tavolino equipaggiato posato sul piano del tavolo: FeltArt dentro una vista con la matrice proiettiva. */
function TavoloPosato({ cam, tavolo }: { cam: Camera; tavolo: TavoloEquipaggiato }) {
  const a = ancore(cam);
  const { fs, fd, vd, vs } = a.tavolo;
  // Si disegna almeno grande quanto il bordo vicino (mai ingrandito dopo), nelle proporzioni del piano vero.
  const w0 = Math.ceil(Math.max(360, vd[0] - vs[0]));
  const h0 = Math.round((w0 * STANZA.tavolo.d) / STANZA.tavolo.w);
  // Su web react-native-web scrive la chiave così com'è: per 16 valori serve matrix3d. Sul nativo è `matrix`.
  const m = useMemo(() => {
    const v = matricePosa(w0, h0, [fs, fd, vd, vs]);
    return (Platform.OS === 'web' ? [{ matrix3d: v }] : [{ matrix: v }]) as unknown as TransformsStyle['transform'];
  }, [w0, h0, fs, fd, vd, vs]);
  const cw = w0 * 0.07;
  const ch = cw * CARD_RATIO;
  const back = backImage(tavolo.back);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w0, height: h0, transform: m, transformOrigin: 'center' }}>
      <FeltArt table={tavolo.table} felt={tavolo.felt} width={w0} height={h0} scale={w0 / 360} />
      {/* il mazzetto coperto: tre dorsi appena sfalsati, dritti sul panno */}
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: w0 * 0.5 - cw / 2 + i * cw * 0.03,
            top: h0 * 0.5 - ch / 2 - i * cw * 0.03,
            width: cw,
            height: ch,
            borderRadius: cardRadius(cw),
            overflow: 'hidden',
            boxShadow: `${(cw * 0.04).toFixed(1)}px ${(cw * 0.06).toFixed(1)}px ${(cw * 0.08).toFixed(1)}px rgba(8,3,4,0.45)`,
          }}
        >
          <Image source={back} style={StyleSheet.absoluteFill} contentFit="fill" transition={null} cachePolicy="memory" />
        </View>
      ))}
    </View>
  );
}

export const ClubVivo = memo(function ClubVivo({
  larghezza,
  altezza,
  modo = 'scena',
  spenta = false,
  vivo = false,
  polvere = false,
  tavolo,
  sguardo,
  scorrimento,
  entrata,
}: {
  larghezza: number;
  altezza: number;
  modo?: Modo;
  spenta?: boolean;
  vivo?: boolean;
  polvere?: boolean;
  tavolo?: TavoloEquipaggiato;
  sguardo?: SharedValue<number>;
  scorrimento?: SharedValue<number>;
  entrata?: SharedValue<number>;
}) {
  // Il margine copre lo spostamento massimo del cielo (0,8 × sguardo massimo) e lo scorrimento.
  const margine = Math.ceil(Math.max(24, larghezza * 0.07));
  const cam = useMemo(() => inquadra(larghezza, altezza, modo, margine), [larghezza, altezza, modo, margine]);
  const k = useCtx(cam, spenta);
  const a = useMemo(() => ancore(cam), [cam]);
  const legno = legnoDi(tavolo?.table);
  // La camera non respira da sola: spostare cinque piani a tutto schermo a ogni fotogramma costa troppo sui telefoni
  // medi (misurato: p95 33 ms a CPU 4× contro 16,8 senza). La parallasse la guida il dito o lo scorrimento.
  const respiro = useSharedValue(0);
  const accensione = useAnimatedStyle(() => {
    if (!entrata) return { opacity: 0 };
    // La sala resta in penombra finché la lampada non si accende (ultimo passo dell'entrata).
    const t = Math.max(0, Math.min(1, (entrata.value - 0.62) / 0.3));
    return { opacity: 0.55 * (1 - t) };
  });
  const lampadaAccesa = useAnimatedStyle(() => {
    if (!entrata) return { opacity: 1 };
    return { opacity: Math.max(0, Math.min(1, (entrata.value - 0.62) / 0.3)) };
  });
  const ls = Math.max(1.4, a.sTavolo * 0.05);
  const fs = fumoScala(cam);
  const P = (fattore: number, passo: number, children: ReactNode) => (
    <Piano cam={cam} fattore={fattore} sguardo={sguardo} scorrimento={scorrimento} respiro={respiro} entrata={entrata} passo={passo}>
      {children}
    </Piano>
  );
  const piani = useMemo(
    () => ({
      cielo: (
        <Svg width={cam.w} height={cam.h}>
          <Cielo k={k} />
        </Svg>
      ),
      sala: (
        <Svg width={cam.w} height={cam.h}>
          <Pavimento k={k} />
          <Sala k={k} tendaDestra={!vivo} />
        </Svg>
      ),
      mezzo: (
        <Svg width={cam.w} height={cam.h}>
          <Mezzo k={k} />
        </Svg>
      ),
      sotto: (
        <Svg width={cam.w} height={cam.h}>
          <TavoloSotto k={k} legno={legno} />
          <TavoloBordo k={k} legno={legno} />
          {tavolo ? null : <PianoVettoriale k={k} legno={legno} />}
        </Svg>
      ),
      luce: (
        <Svg width={cam.w} height={cam.h}>
          <LuceSulPiano k={k} />
          <Lampada k={k} />
        </Svg>
      ),
      primo: (
        <Svg width={cam.w} height={cam.h}>
          <PrimoPiano k={k} />
        </Svg>
      ),
    }),
    [cam, k, legno, tavolo, vivo],
  );
  return (
    <View style={{ width: larghezza, height: altezza, overflow: 'hidden', backgroundColor: '#080304' }} pointerEvents="none">
      {P(
        FATTORI.cielo,
        0,
        <>
          {piani.cielo}
          <Respiro tipo="x" ampiezza={5} durata={6000} attivo={vivo} style={{ position: 'absolute', left: a.lampara[0] - ls * 3, top: a.lampara[1] - ls * 3, width: ls * 6, height: ls * 6 }}>
            <Svg width={ls * 6} height={ls * 6}>
              <G transform={`translate(${ls * 3} ${ls * 3})`}>
                <Lampara k={k} s={ls} />
              </G>
            </Svg>
          </Respiro>
        </>,
      )}
      {P(
        FATTORI.sala,
        1,
        <>
          {piani.sala}
          {vivo ? <TendaViva cam={cam} k={k} vivo={vivo} /> : null}
        </>,
      )}
      {P(
        FATTORI.mezzo,
        2,
        <>
          {piani.mezzo}
          {vivo ? <FumoVivo at={a.fumo} s={fs} vivo={vivo} /> : null}
        </>,
      )}
      {P(
        FATTORI.tavolo,
        3,
        <>
          {piani.sotto}
          {tavolo ? <TavoloPosato cam={cam} tavolo={tavolo} /> : null}
          <Animated.View style={[StyleSheet.absoluteFill, lampadaAccesa]}>{piani.luce}</Animated.View>
          {polvere && !spenta ? (
            <Scintille
              larghezza={a.cono.x1 - a.cono.x0}
              altezza={Math.max(20, a.cono.y1 - a.cono.y0)}
              quante={10}
              seme={13}
              tipo="granello"
              colore="#FFE6B8"
              misura={Math.max(1.6, a.sTavolo * 0.006)}
              salita={Math.max(8, (a.cono.y1 - a.cono.y0) * 0.25)}
              attivo={vivo}
              style={{ position: 'absolute', left: a.cono.x0, top: a.cono.y0 }}
            />
          ) : null}
        </>,
      )}
      {P(FATTORI.primo, 4, piani.primo)}
      {/* La penombra prima che la lampada si accenda (solo nello svelamento) e la vignetta, ferma sullo schermo. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#080304' }, accensione]} />
      <Svg width={larghezza} height={altezza} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Vignetta k={k} w={larghezza} h={altezza} />
      </Svg>
    </View>
  );
});
