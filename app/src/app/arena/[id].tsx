// «Esplora l'arena»: l'arena a tutto schermo (docs/direzione-artistica.md §5.12 passo 5, §5.14, §7 B1).
// Ci si arriva dallo svelamento («Esplora l'arena») e dalla strada delle arene (una scheda raggiunta).
//
// La scena a piani con la vita ambientale e il TUO tavolino (tavolino, panno, dorso equipaggiati) dentro la sala,
// in prospettiva. Trascinando in orizzontale si guarda intorno: i piani scorrono a velocità diverse (parallasse);
// lasciato, lo sguardo torna piano al centro. Sotto, la targa: «Arena 13 · Capitolo III», il nome in Bodoni, la
// frase, i cinque sigilli dei capitoli (pieni quelli raggiunti). Con riduci movimento: niente vita, niente
// parallasse, la scena ferma. Un'arena non ancora raggiunta si vede con le «luci spente».
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ARENAS } from '@/meta/arenas';
import { roman } from '@/meta/levels';
import { useProfile } from '@/meta/profile';
import { Filetto, useRiduciMovimento } from '@/ui/arte';
import { misuraNome, SigilliCapitoli } from '@/ui/arene/club/Sigilli';
import { ease } from '@/ui/arte/movimento';
import { fontArte, testo, tipografia } from '@/ui/arte/token';
import { ArenaScene } from '@/ui/ArenaScene';
import { sfx } from '@/ui/feedback';
import { Squish } from '@/ui/kit';
import { Text } from '@/ui/Text';

export default function Esplora() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const arena = ARENAS.find(a => a.id === id) ?? ARENAS[0];
  const mia = useProfile(s => s.meta.arena);
  const eq = useProfile(s => s.equipped);
  const raggiunta = mia >= arena.index;
  const capRaggiunto = ARENAS[Math.max(0, mia)]?.chapter.n ?? 1;
  const riduci = useRiduciMovimento();
  const sguardo = useSharedValue(0);
  // Lo sguardo arriva al massimo dove il cielo (fattore 0,2) ha ancora margine disegnato.
  const limite = Math.max(24, width * 0.07) / 0.8 - 2;
  const trascina = Gesture.Pan()
    .enabled(!riduci)
    .activeOffsetX([-8, 8])
    .onUpdate(e => {
      sguardo.value = Math.max(-limite, Math.min(limite, e.translationX * 0.35));
    })
    .onEnd(() => {
      sguardo.value = withTiming(0, { duration: 900, easing: ease.move });
    });
  const colonna = Math.min(width - 32, 520);
  return (
    <View style={styles.pagina}>
      <Stack.Screen options={{ animation: 'fade' }} />
      <GestureDetector gesture={trascina}>
        <View style={StyleSheet.absoluteFill} testID="fisso-scena" accessibilityRole="image" accessibilityLabel={`${arena.name}: ${arena.desc}`}>
          <ArenaScene
            id={arena.id}
            width={width}
            height={height}
            dim={!raggiunta}
            vivo={!riduci}
            modo="esplora"
            sguardo={sguardo}
            tavolo={raggiunta ? { table: eq.table, felt: eq.felt, back: eq.back } : undefined}
          />
        </View>
      </GestureDetector>
      <View style={[styles.su, { top: ins.top + 12 }]}>
        <Squish
          accessibilityRole="button"
          accessibilityLabel="Indietro"
          hitSlop={10}
          scaleTo={0.9}
          onPress={() => {
            sfx('tick');
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          style={styles.indietro}
        >
          <Svg width={18} height={18} viewBox="0 0 18 18">
            <Path d="M11.5 3.5L6 9l5.5 5.5" stroke={testo.forte} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Squish>
      </View>
      <View pointerEvents="none" style={[styles.giu, { paddingBottom: ins.bottom + 22 }]}>
        <LinearGradient colors={['rgba(8,3,4,0)', 'rgba(8,3,4,0.78)', 'rgba(8,3,4,0.92)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <Animated.View entering={FadeIn.duration(riduci ? 180 : 420)} style={{ width: colonna, alignItems: 'center', gap: 8 }} testID="fisso-nome">
          <Text style={[tipografia.occhiello, styles.centro]}>{`ARENA ${arena.n} · CAPITOLO ${roman(arena.chapter.n)} · ${arena.chapter.name.toUpperCase()}`}</Text>
          <Text style={[tipografia.nomeSvelamento, styles.centro, styles.ombraTesto, misuraNome(arena.name, colonna)]} numberOfLines={1}>
            {arena.name}
          </Text>
          <Filetto ornamento larghezza={Math.min(220, colonna * 0.6)} />
          <Text style={[styles.frase, styles.centro]}>{raggiunta ? arena.desc : `Si apre a ${arena.threshold.toLocaleString('it-IT')} trofei. Per ora, luci spente.`}</Text>
          <SigilliCapitoli capitolo={arena.chapter.n} raggiunto={capRaggiunto} />
          {riduci ? null : <Text style={styles.nota}>Trascina per guardarti intorno</Text>}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: '#080304' },
  su: { position: 'absolute', left: 16 },
  indietro: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,12,14,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(230,195,106,0.45)',
    boxShadow: '0px 2px 3px rgba(8,3,4,0.5), 5px 14px 22px rgba(8,3,4,0.45)',
  },
  giu: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 80 },
  centro: { textAlign: 'center' },
  ombraTesto: { textShadowColor: 'rgba(8,3,4,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  frase: { fontFamily: fontArte.sora, fontSize: 15, lineHeight: 21, color: testo.medio },
  nota: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, color: testo.tenue, marginTop: 2 },
});
