// Lo svelamento di una nuova arena (docs/direzione-artistica.md §5.12): breve, si salta, mai coriandoli davanti.
//
//   passo 2   il segnale     0–500 ms   la sala si spegne nel bruno (velo), suono «arena»; un filetto d'ottone si
//                                       apre in orizzontale al centro; occhiello «Nuova arena»
//   passo 3   la transizione 500–1700   due teli di velluto si aprono ai lati (sipario); dietro, i piani dell'arena
//                                       si posano uno alla volta (la camera che arriva) e la lampada si accende per
//                                       ultima (per il Club: ArenaScene `entrata`; per le altre una dissolvenza con
//                                       la scena che si avvicina appena)
//   passo 4   nome e prestigio 1700–2300 «Arena 14 · Capitolo III», il nome in Bodoni con un riflesso che passa una
//                                       volta sola, i cinque sigilli dei capitoli (pieni quelli raggiunti), «14 di 30»
//   passo 5   esplora o continua da 2300 le ricompense; «Esplora l'arena» (apre /arena/[id], solo per le arene a
//             piani: siEsplora) e «Continua»
//
// Tempi effettivi (T qui sotto): pulsanti pieni a 2,0 s, con margine per i telefoni lenti.
// Un tocco in qualsiasi momento porta tutto allo stato finale. Con riduci movimento lo stato finale arriva con una
// dissolvenza da 280 ms (niente sipario, niente piani, niente riflesso). Props invariate: { arena, onClose }.
// Il contenuto non si sposta mai: ogni pezzo ha il suo posto fin dall'inizio e cambia solo opacità e trasformazioni.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ARENAS, type Arena } from '@/meta/arenas';
import { BALANCE } from '@/meta/balance';
import { roman } from '@/meta/levels';
import { useProfile } from '@/meta/profile';
import { Filetto, Pulsante, Riflesso, Sala, Superficie } from './arte';
import { siEsplora } from './arte/arene';
import { ease, mov } from './arte/movimento';
import { fontArte, testo, tipografia } from './arte/token';
import { misuraNome, SigilliCapitoli } from './arene/club/Sigilli';
import { ArenaScene } from './ArenaScene';
import { sfx } from './feedback';
import { RewardRow } from './progression';
import { Text } from './Text';

/** I tempi della sequenza (ms dall'apertura). Pulsanti pronti entro 2,5 s. */
const T = {
  filetto: { a: 120, d: 380 },
  sipario: { a: 500, d: mov.sipario },
  scena: { a: 450, d: 1150 },
  nome: { a: 1450, d: 380 },
  riflesso: 1700,
  sigilli: { a: 1620, d: 280 },
  azioni: { a: 1780, d: 240 },
} as const;
const FINE = T.azioni.a + T.azioni.d;
const RIDOTTO = 280;

/** Un valore da 0 a 1 che parte a `a` e dura `d`; salta a 1 con `fine`; con riduci movimento: dissolvenza unica. */
function useFase(a: number, d: number, fine: boolean, riduci: boolean, curva = ease.in): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (riduci) {
      v.value = withTiming(1, { duration: RIDOTTO, easing: ease.in });
      return;
    }
    if (fine) {
      cancelAnimation(v);
      v.value = withTiming(1, { duration: 160, easing: ease.in });
      return;
    }
    v.value = withDelay(a, withTiming(1, { duration: d, easing: curva }));
  }, [a, d, fine, riduci, v, curva]);
  return v;
}

/** Un telo di velluto del sipario (lato -1 sinistra, 1 destra): si apre scorrendo fuori dallo schermo. */
function Telo({ lato, p, w, h }: { lato: -1 | 1; p: SharedValue<number>; w: number; h: number }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: lato * p.value * (w / 2 + 24) }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, height: h, width: w / 2 + 2, [lato < 0 ? 'left' : 'right']: 0 }, st]}>
      <Superficie materiale="velluto" raggio={0} livello={0} style={StyleSheet.absoluteFill} />
      {/* le pieghe: strisce di luce e ombra verticali */}
      <View style={[StyleSheet.absoluteFill, styles.pieghe]}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? 'rgba(8,3,4,0.42)' : 'rgba(8,3,4,0.12)' }} />
        ))}
      </View>
      {/* l'orlo verso il centro: una frangia d'oro */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, width: 3, [lato < 0 ? 'right' : 'left']: 0, backgroundColor: '#C9A15A', opacity: 0.8 }} />
    </Animated.View>
  );
}

export function ArenaReveal({ arena, onClose }: { arena: Arena; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const riduci = useReducedMotion();
  const [fine, setFine] = useState(false);
  const eq = useProfile(s => s.equipped);
  const desktop = width >= 900;
  const colonna = Math.min(width - 32, 520);
  // La scena: a tutta larghezza (fino a 760), alta quanto lascia libero il resto, mai meno di 3:2 sul telefono.
  const sceneW = Math.min(width, desktop ? 760 : width);
  const sceneH = Math.round(Math.min(height * (desktop ? 0.48 : 0.42), sceneW * (desktop ? 0.56 : 0.9)));
  // La scena a piani (oggi solo il Club): il tavolino dentro la sala, l'entrata dei piani e «Esplora l'arena».
  const club = siEsplora(arena.id);

  useEffect(() => {
    sfx('arena', { haptic: true });
  }, []);
  // Dopo la sequenza il tocco non serve più a saltare.
  useEffect(() => {
    if (riduci || fine) return;
    const t = setTimeout(() => setFine(true), FINE + 50);
    return () => clearTimeout(t);
  }, [riduci, fine]);

  const velo = useFase(0, 300, fine, riduci);
  const filetto = useFase(T.filetto.a, T.filetto.d, fine, riduci);
  const sipario = useFase(T.sipario.a, T.sipario.d, fine, riduci, ease.move);
  const scena = useFase(T.scena.a, T.scena.d, fine, riduci, Easing.linear);
  const nome = useFase(T.nome.a, T.nome.d, fine, riduci);
  const sigilli = useFase(T.sigilli.a, T.sigilli.d, fine, riduci);
  const azioni = useFase(T.azioni.a, T.azioni.d, fine, riduci);

  const sVelo = useAnimatedStyle(() => ({ opacity: velo.value }));
  const sFiletto = useAnimatedStyle(() => ({ opacity: filetto.value, transform: [{ scaleX: 0.15 + 0.85 * filetto.value }] }));
  const sOcchiello = useAnimatedStyle(() => ({ opacity: filetto.value }));
  // Le altre arene (non a piani): la scena si avvicina appena mentre compare.
  const sScena = useAnimatedStyle(() => (club ? { opacity: 1 } : { opacity: scena.value, transform: [{ scale: 1.06 - 0.06 * scena.value }] }));
  const sNome = useAnimatedStyle(() => ({ opacity: nome.value, transform: [{ translateY: (1 - nome.value) * 8 }] }));
  const sSigilli = useAnimatedStyle(() => ({ opacity: sigilli.value }));
  const sAzioni = useAnimatedStyle(() => ({ opacity: azioni.value }));
  const sipW = sceneW;

  const esplora = () => {
    onClose();
    router.push({ pathname: '/arena/[id]', params: { id: arena.id } });
  };
  const n = ARENAS.length;
  const font = misuraNome(arena.name, colonna);
  return (
    <Animated.View exiting={FadeOut.duration(180)} accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.root]} testID="svelamento">
      <Pressable accessibilityRole="button" accessibilityLabel={fine ? 'Svelamento completo' : 'Salta'} onPress={() => setFine(true)} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, sVelo]}>
          <Sala luce={{ cy: 0.4, r: 0.75, opacita: 0.18 }} />
        </Animated.View>
      </Pressable>
      <View pointerEvents="box-none" style={[styles.colonna, { paddingTop: ins.top + 16, paddingBottom: ins.bottom + 16 }]}>
        {/* passo 2: il filetto che si apre e l'occhiello */}
        <Animated.View pointerEvents="none" style={[styles.centro, sOcchiello]}>
          <Text style={[tipografia.occhiello, styles.testoCentro]}>NUOVA ARENA</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ marginTop: 8, marginBottom: 14 }, sFiletto]}>
          <Filetto ornamento larghezza={Math.min(260, colonna * 0.7)} />
        </Animated.View>
        {/* passo 3: la scena dietro il sipario */}
        <View pointerEvents="none" style={[styles.scena, { width: sceneW, height: sceneH, borderRadius: desktop ? 14 : 0 }]}>
          <Animated.View style={[StyleSheet.absoluteFill, sScena]}>
            {club ? (
              <ArenaScene id={arena.id} width={sceneW} height={sceneH} vivo={fine && !riduci} entrata={riduci ? undefined : scena} tavolo={{ table: eq.table, felt: eq.felt, back: eq.back }} />
            ) : (
              <ArenaScene id={arena.id} width={sceneW} height={sceneH} />
            )}
          </Animated.View>
          {riduci ? null : (
            <>
              <Telo lato={-1} p={sipario} w={sipW} h={sceneH} />
              <Telo lato={1} p={sipario} w={sipW} h={sceneH} />
            </>
          )}
          {/* la cornice d'ottone sopra e sotto la scena: un boccascena */}
          <View style={[styles.boccascena, { top: 0 }]} />
          <View style={[styles.boccascena, { bottom: 0 }]} />
        </View>
        {/* passo 4: nome e prestigio */}
        <Animated.View pointerEvents="none" style={[styles.centro, { width: colonna, marginTop: 18 }, sNome]}>
          <Text style={[tipografia.occhiello, styles.testoCentro]}>{`ARENA ${arena.n} · CAPITOLO ${roman(arena.chapter.n)} · ${arena.chapter.name.toUpperCase()}`}</Text>
          <View style={{ alignSelf: 'stretch', alignItems: 'center', marginTop: 4 }}>
            <Text style={[tipografia.nomeSvelamento, styles.testoCentro, font]} numberOfLines={1}>
              {arena.name}
            </Text>
            {riduci ? null : <Riflesso larghezza={colonna} altezza={font.lineHeight} volte={1} ritardo={T.riflesso} intensita={0.35} style={StyleSheet.absoluteFill} />}
          </View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.centro, { width: colonna, gap: 6 }, sSigilli]}>
          <SigilliCapitoli capitolo={arena.chapter.n} raggiunto={arena.chapter.n} misura={30} />
          <Text style={styles.contatore}>{`${arena.n} di ${n}`}</Text>
        </Animated.View>
        {/* passo 5: ricompense e scelta */}
        <Animated.View pointerEvents={fine || riduci ? 'box-none' : 'none'} style={[styles.centro, { width: colonna, gap: 12, marginTop: 10 }, sAzioni]} testID="svelamento-azioni">
          <RewardRow reward={arena.reward} extraCoins={arena.chapterEnd ? BALANCE.coins.chapter : 0} size={52} />
          {arena.chapterEnd ? <Text style={[styles.capitolo, styles.testoCentro]}>{`Capitolo ${roman(arena.chapter.n)} completato · +${BALANCE.coins.chapter}`}</Text> : null}
          <View style={styles.azioni}>
            {club ? (
              <>
                <Pulsante tipo="secondario" etichetta="Continua" onPress={onClose} style={{ flex: 1 }} />
                <Pulsante tipo="principale" etichetta="Esplora l’arena" onPress={esplora} style={{ flex: 1.3 }} />
              </>
            ) : (
              // Senza scena a piani non c'è niente da esplorare: «Continua» diventa l'azione principale.
              <Pulsante tipo="principale" etichetta="Continua" onPress={onClose} style={{ flex: 1 }} />
            )}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 6000 },
  colonna: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centro: { alignItems: 'center' },
  testoCentro: { textAlign: 'center' },
  scena: { overflow: 'hidden', backgroundColor: '#080304', boxShadow: '0px 3px 4px rgba(8,3,4,0.5), 8px 24px 36px rgba(8,3,4,0.5)' },
  boccascena: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#C9A15A', opacity: 0.85 },
  pieghe: { flexDirection: 'row' },
  contatore: { fontFamily: fontArte.soraSemi, fontSize: 12.5, lineHeight: 16, color: testo.tenue, letterSpacing: 0.6 },
  capitolo: { fontFamily: fontArte.soraBold, fontSize: 13, lineHeight: 18, color: '#E6C36A' },
  azioni: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', marginTop: 4 },
});
