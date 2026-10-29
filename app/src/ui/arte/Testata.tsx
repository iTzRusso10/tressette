// «Lampara»: la testata comune delle schermate di vetrina (arena, profilo, personalizza, bacheca). Un solo
// pulsante «indietro» e un solo contatore di monete, nella stessa posizione e misura ovunque: passando da una
// schermata all'altra niente si sposta (docs/verifica-fase-c.md I-5).
//
// Export:
// - `TESTATA`          { altezza: 56, margine: 16 }  la fascia in alto, sotto l'area sicura, a tutta larghezza
// - `Testata`          { assoluta?, destra?, children?, style? } la fascia: «indietro» a sinistra (sempre), in mezzo
//                      `children` (per esempio il titolo di personalizza), a destra `destra` (il contatore). Con
//                      `assoluta` sta sopra il contenuto (posizione assoluta da ins.top), altrimenti nel flusso
//                      (chi la usa nel flusso mette l'area sicura sopra). Il pulsante sta a (16, top + 6), il
//                      contatore a 16 dal bordo destro, centrato sulla fascia: identici nelle quattro rotte.
// - `Indietro`         { onPress? } tondo di noce da 44 pt con la freccia avorio; senza onPress torna indietro (o
//                      all'hub se non c'è dove tornare). Suono 'tick'.
// - `ContatoreMonete`  { monete, etichetta?, testID?, vistaRef?, style? } la moneta d'ottone e la cifra (tabellare)
//                      su una pillola di noce alta 40. Quando `monete` cambia conta in 160 ms (5 passi); con
//                      riduci movimento il numero nuovo arriva con una dissolvenza breve. `etichetta`: il numero da
//                      leggere ad alta voce, se diverso da quello mostrato (la bacheca mostra le monete meno quelle
//                      ancora in volo). `vistaRef`: la vista, per chi deve sapere dove sta (i voli delle monete).
// Budget: nessuna animazione ambientale; il conteggio è una risposta a un cambiamento.
import { router } from 'expo-router';
import { useEffect, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { sfx } from '../feedback';
import { Squish } from '../kit';
import { Text } from '../Text';
import { Superficie } from './materiali';
import { Moneta } from './Ricompensa';
import { fontArte, testo } from './token';
import { useRiduciMovimento } from './useAmbient';

export const TESTATA = { altezza: 56, margine: 16 } as const;

export function Indietro({ onPress }: { onPress?: () => void }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel="Indietro"
      hitSlop={6}
      scaleTo={0.92}
      onPress={() => {
        sfx('tick');
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    >
      <Superficie materiale="noce" raggio={22} livello={3} style={styles.tondo}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M11.5 3.5L6 9l5.5 5.5" stroke={testo.forte} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Superficie>
    </Squish>
  );
}

const CONTA = 160;

export function ContatoreMonete({
  monete,
  etichetta,
  testID,
  vistaRef,
  style,
}: {
  monete: number;
  etichetta?: number;
  testID?: string;
  vistaRef?: (v: ComponentRef<typeof View> | null) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const riduci = useRiduciMovimento();
  const [mostrate, setMostrate] = useState(monete);
  const [da, setDa] = useState(monete);
  const velo = useSharedValue(1);
  // Il valore da raggiungere è cambiato: si parte da quello mostrato adesso.
  if (monete !== da) setDa(monete);
  useEffect(() => {
    const inizio = mostrate;
    if (da === inizio) return;
    if (riduci) {
      // Niente conteggio: il numero nuovo arriva con una dissolvenza (non è movimento).
      velo.value = withSequence(withTiming(0.2, { duration: 0, reduceMotion: ReduceMotion.Never }), withTiming(1, { duration: 280, reduceMotion: ReduceMotion.Never }));
      const id = setTimeout(() => setMostrate(da), 0);
      return () => clearTimeout(id);
    }
    const passi = 5;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setMostrate(Math.round(inizio + ((da - inizio) * i) / passi));
      if (i >= passi) clearInterval(id);
    }, CONTA / passi);
    return () => clearInterval(id);
    // Si riparte solo quando cambia il traguardo (mostrate cambia a ogni passo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [da, riduci, velo]);
  const st = useAnimatedStyle(() => ({ opacity: velo.value }));
  return (
    <View ref={vistaRef} collapsable={false} testID={testID} style={style} accessibilityRole="text" accessibilityLabel={`${(etichetta ?? monete).toLocaleString('it-IT')} monete`} accessibilityLiveRegion="polite">
      <Superficie materiale="noce" raggio={20} livello={3} style={styles.pillola}>
        <Moneta misura={24} />
        <Animated.View style={st}>
          <Text style={styles.numero} testID="contatore-monete">
            {mostrate.toLocaleString('it-IT')}
          </Text>
        </Animated.View>
      </Superficie>
    </View>
  );
}

export function Testata({ assoluta, destra, children, style }: { assoluta?: boolean; destra?: ReactNode; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ins = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.fascia, assoluta ? [styles.assoluta, { top: ins.top }] : null, style]}>
      <Indietro />
      <View style={styles.mezzo} pointerEvents="box-none">
        {children}
      </View>
      {destra}
    </View>
  );
}

const styles = StyleSheet.create({
  fascia: { height: TESTATA.altezza, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: TESTATA.margine, alignSelf: 'stretch' },
  assoluta: { position: 'absolute', left: 0, right: 0 },
  mezzo: { flex: 1 },
  tondo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pillola: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 8, paddingRight: 14 },
  numero: { fontFamily: fontArte.soraBold, fontSize: 16, lineHeight: 20, color: testo.forte, fontVariant: ['tabular-nums'], minWidth: 48 },
});
