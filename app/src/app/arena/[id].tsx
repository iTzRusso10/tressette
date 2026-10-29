// «Esplora l'arena»: l'arena a tutto schermo (docs/direzione-artistica.md §5.12 passo 5, §5.14, §7 B1).
// Ci si arriva dallo svelamento («Esplora l'arena») e dalla strada delle arene (una scheda raggiunta).
//
// La scena a piani con la vita ambientale e il TUO tavolino (tavolino, panno, dorso equipaggiati) dentro la sala,
// in prospettiva. Solo per le arene a piani (siEsplora in arte/arene.ts): le altre tornano alla strada delle arene. Trascinando in orizzontale si guarda intorno: i piani scorrono a velocità diverse (parallasse);
// lasciato, lo sguardo torna piano al centro. Sotto, la targa: «Arena 13 · Capitolo III», il nome in Bodoni, la
// frase, i cinque sigilli dei capitoli (pieni quelli raggiunti). Con riduci movimento: niente vita, niente
// parallasse, la scena ferma. Un'arena non ancora raggiunta si vede con le «luci spente».
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ARENAS } from '@/meta/arenas';
import { roman } from '@/meta/levels';
import { useProfile } from '@/meta/profile';
import { ContatoreMonete, Filetto, Testata, useRiduciMovimento } from '@/ui/arte';
import { siEsplora } from '@/ui/arte/arene';
import { misuraNome, SigilliCapitoli } from '@/ui/arene/club/Sigilli';
import { ease } from '@/ui/arte/movimento';
import { fontArte, testo, tipografia } from '@/ui/arte/token';
import { ArenaScene } from '@/ui/ArenaScene';
import { Text } from '@/ui/Text';

/** Scrive lo sguardo fuori dal render (il compilatore di React non vuole scritture nei valori dei hook). */
function imposta(sv: SharedValue<number>, v: number) {
  sv.value = v;
}

export default function Esplora() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Si esplorano solo le arene con la scena a piani (siEsplora): le illustrazioni piatte di prima, ingrandite a tutto
  // schermo, si troncano e si sgranano. Un indirizzo vecchio o scritto a mano torna alla strada delle arene.
  if (!siEsplora(id ?? '')) return <Redirect href={{ pathname: '/', params: { tab: 'trofei' } }} />;
  return <EsploraArena id={id!} />;
}

function EsploraArena({ id }: { id: string }) {
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const arena = ARENAS.find(a => a.id === id) ?? ARENAS[0];
  const mia = useProfile(s => s.meta.arena);
  const eq = useProfile(s => s.equipped);
  const monete = useProfile(s => s.coins);
  const raggiunta = mia >= arena.index;
  const capRaggiunto = ARENAS[Math.max(0, mia)]?.chapter.n ?? 1;
  const riduci = useRiduciMovimento();
  const sguardo = useSharedValue(0);
  // Lo sguardo arriva al massimo dove il cielo (fattore 0,2) ha ancora margine disegnato.
  const limite = Math.max(24, width * 0.07) / 0.8 - 2;
  // Il trascinamento con il PanResponder di React Native (c'è già nel bundle): react-native-gesture-handler intero
  // per un solo gesto orizzontale pesava ≈ 57 KB gzip sul sito. Si prende solo un trascinamento più orizzontale che
  // verticale, oltre 8 punti; lasciato, lo sguardo torna al centro.
  const trascina = useMemo(() => {
    const torna = () => imposta(sguardo, withTiming(0, { duration: 900, easing: ease.move }));
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !riduci && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => imposta(sguardo, Math.max(-limite, Math.min(limite, g.dx * 0.35))),
      onPanResponderRelease: torna,
      onPanResponderTerminate: torna,
    });
  }, [riduci, limite, sguardo]);
  const colonna = Math.min(width - 32, 520);
  return (
    <View style={styles.pagina}>
      <Stack.Screen options={{ animation: 'fade' }} />
      <View {...trascina.panHandlers} style={StyleSheet.absoluteFill}>
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
      </View>
      {/* la testata comune (arte/Testata): «indietro» e monete nello stesso posto in tutte le schermate di vetrina */}
      <Testata assoluta destra={<ContatoreMonete monete={monete} testID="fisso-monete" />} />
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
  giu: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 80 },
  centro: { textAlign: 'center' },
  ombraTesto: { textShadowColor: 'rgba(8,3,4,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  frase: { fontFamily: fontArte.sora, fontSize: 15, lineHeight: 21, color: testo.medio },
  nota: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, color: testo.tenue, marginTop: 2 },
});
