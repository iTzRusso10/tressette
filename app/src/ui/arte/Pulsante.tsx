// «Lampara»: pulsanti di materiale (docs/direzione-artistica.md §5.1 «azione», §5.10).
//
// Export:
// - `Pulsante` { etichetta, onPress, tipo?: 'principale' | 'secondario' | 'terziario' | 'pericolo'
//                (default 'principale'), sotto? (seconda riga), icona? (ReactNode a sinistra), disabilitato?,
//                suono?: Sfx | null (default 'tick'), style?, testID? }
//   - principale: placca d'ottone, testo inchiostro inciso. Uno solo per schermata. Mai alone.
//   - secondario: noce lucidato con filetto d'ottone, testo avorio.
//   - terziario: solo testo in foglia d'oro, sottolineato da un filetto; nessuna superficie.
//   - pericolo: ceralacca (smalto rosso), testo avorio.
//   Al tocco: Squish (scala 0,96, dur.press in entrata, dur.quick al ritorno, ease.in, nessuna molla) e il
//   rilievo si inverte (il filo chiaro passa in basso, quello scuro in alto): sembra premuto. Il layout non
//   cambia. Stessi accessibilityRole ('button'), accessibilityLabel («etichetta, sotto») e accessibilityState
//   ({ disabled }) di kit.Button. Altezza minima 52 punti (area di tocco ≥ 44).
//   Budget: nessuna animazione ambientale; due valori animati solo durante il tocco.
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { sfx, type Sfx } from '../feedback';
import { Squish } from '../kit';
import { Text } from '../Text';
import { Filetto, Superficie } from './materiali';
import { dur, ease } from './movimento';
import { accento, fontArte, primitivi, raggi, testo, tipografia } from './token';

export type TipoPulsante = 'principale' | 'secondario' | 'terziario' | 'pericolo';

export interface PulsanteProps {
  etichetta: string;
  onPress: () => void;
  tipo?: TipoPulsante;
  sotto?: string;
  icona?: ReactNode;
  disabilitato?: boolean;
  suono?: Sfx | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Pulsante({ etichetta, onPress, tipo = 'principale', sotto, icona, disabilitato, suono = 'tick', style, testID }: PulsanteProps) {
  const premuto = useSharedValue(0);
  const flat = StyleSheet.flatten(style) ?? {};
  const terz = tipo === 'terziario';
  const colTesto = tipo === 'principale' ? testo.inchiostro : terz ? accento.oro : testo.forte;
  const inciso = tipo === 'principale' ? tipografia.inciso : tipo === 'terziario' ? null : styles.rilievoScuro;
  const contenuto = (
    <View style={styles.riga}>
      {icona}
      <View style={styles.testi}>
        <Text style={[styles.etichetta, { color: colTesto }, inciso]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {etichetta}
        </Text>
        {sotto ? (
          <Text style={[styles.sotto, { color: colTesto, opacity: tipo === 'principale' ? 0.78 : 0.85 }]} numberOfLines={1}>
            {sotto}
          </Text>
        ) : null}
      </View>
    </View>
  );
  return (
    <Squish
      testID={testID}
      outerStyle={flat.flex ? { flex: flat.flex } : flat.alignSelf ? { alignSelf: flat.alignSelf } : undefined}
      accessibilityRole="button"
      accessibilityLabel={sotto ? `${etichetta}, ${sotto}` : etichetta}
      accessibilityState={{ disabled: !!disabilitato }}
      disabled={disabilitato}
      onPressIn={() => {
        premuto.value = withTiming(1, { duration: dur.press, easing: ease.in });
      }}
      onPressOut={() => {
        premuto.value = withTiming(0, { duration: dur.quick, easing: ease.in });
      }}
      onPress={() => {
        if (suono) sfx(suono);
        onPress();
      }}
      style={[disabilitato && styles.spento, style]}
    >
      {terz ? (
        <View style={styles.terziario}>
          {contenuto}
          <Filetto tipo="oro" style={{ marginTop: 3 }} />
        </View>
      ) : (
        <Superficie
          materiale={tipo === 'principale' ? 'ottone' : tipo === 'secondario' ? 'noce' : 'smalto'}
          tinta={tipo === 'pericolo' ? primitivi.ceralacca.luce : undefined}
          filetto={tipo === 'secondario'}
          livello={3}
          raggio={tipo === 'principale' ? raggi.targa : raggi.superficie - 2}
          premuto={premuto}
          style={styles.corpo}
        >
          {contenuto}
        </Superficie>
      )}
    </Squish>
  );
}

const styles = StyleSheet.create({
  corpo: { minHeight: 52, paddingHorizontal: 22, paddingVertical: 9, justifyContent: 'center', alignItems: 'center' },
  terziario: { minHeight: 44, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  riga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  testi: { alignItems: 'center', flexShrink: 1 },
  etichetta: { fontFamily: fontArte.soraBold, fontSize: 16.5, lineHeight: 21, textAlign: 'center' },
  sotto: { fontFamily: fontArte.sora, fontSize: 12.5, lineHeight: 16, marginTop: 1, textAlign: 'center' },
  rilievoScuro: { textShadowColor: 'rgba(8,3,4,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 },
  spento: { opacity: 0.45 },
});
