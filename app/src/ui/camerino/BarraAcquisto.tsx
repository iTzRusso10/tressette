// La barra fissa in basso del camerino: cosa si può fare con il pezzo in prova del posto aperto.
//
// Export:
// - `BarraAcquisto` { stato, prezzo, monete, fonte, differisce, riepilogo, messaggio, onUsa, onCompra, onTorna }
//     stato 'inUso'  → «In uso sul tuo tavolo» (o «sul tuo profilo»), fermo
//     stato 'tuo'    → «Usa» (ottone): equipaggia
//     stato 'compra' → «Compra · 1.200» (ottone), con «Ne hai 900» sotto se non bastano. Non è disabilitato: il
//                      tocco passa da buyItem, che risponde con i rifiuti di sempre (monete, non in vendita)
//     stato 'vinci'  → targa «Si ottiene: Arena 14»: non si compra né si usa, ma si è potuto provare
//   A sinistra «Torna al tuo» (terziario) quando la prova è diversa da quello che usi. Sopra, una riga ad altezza
//   fissa: il riepilogo della prova («2 pezzi da comprare · 3.200») o l'esito dell'ultimo tocco. Niente si sposta:
//   tutte le misure sono fisse. Nessuna animazione propria (il pulsante si schiaccia al tocco).
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Pulsante } from '@/ui/arte/Pulsante';
import { Moneta } from '@/ui/arte/Ricompensa';
import { Superficie } from '@/ui/arte/materiali';
import { dur } from '@/ui/arte/movimento';
import { fontArte, stato as statoCol, testo } from '@/ui/arte/token';
import { Icon } from '@/ui/icons';
import { Text } from '@/ui/Text';
import type { StatoOggetto } from './logica';

const n = (x: number) => x.toLocaleString('it-IT');

export const ALTEZZA_BARRA = 88;

export interface BarraProps {
  stato: Exclude<StatoOggetto, 'arrivo'>;
  /** Profilo (cornice, avatar) o tavolo. */
  profilo: boolean;
  prezzo: number;
  monete: number;
  fonte: string;
  differisce: boolean;
  riepilogo: string;
  messaggio: { testo: string; ok: boolean; n: number } | null;
  onUsa: () => void;
  onCompra: () => void;
  onTorna: () => void;
}

export function BarraAcquisto({ stato, profilo, prezzo, monete, fonte, differisce, riepilogo, messaggio, onUsa, onCompra, onTorna }: BarraProps) {
  return (
    <View style={styles.barra} testID="fisso-barra">
      <View style={styles.rigaTesto}>
        {messaggio ? (
          <Animated.Text key={messaggio.n} entering={FadeIn.duration(dur.quick)} exiting={FadeOut.duration(dur.exit)} style={[styles.esito, { color: messaggio.ok ? statoCol.successo : statoCol.errore }]} numberOfLines={1}>
            {messaggio.testo}
          </Animated.Text>
        ) : (
          <Text style={styles.riepilogo} numberOfLines={1}>
            {riepilogo}
          </Text>
        )}
      </View>
      <View style={styles.riga}>
        <View style={styles.sinistra}>{differisce ? <Pulsante tipo="terziario" etichetta="Torna al tuo" onPress={onTorna} testID="torna" /> : null}</View>
        <View style={styles.destra}>
          {stato === 'inUso' ? (
            <Superficie materiale="noce" livello={2} style={styles.inUso}>
              <View style={styles.inUsoRiga}>
                <Icon name="check" size={16} color="#E6C36A" stroke={2.6} />
                <Text style={styles.inUsoTesto}>{profilo ? 'In uso sul tuo profilo' : 'In uso sul tuo tavolo'}</Text>
              </View>
            </Superficie>
          ) : stato === 'tuo' ? (
            <Pulsante etichetta="Usa" sotto={profilo ? 'sul tuo profilo' : 'sul tuo tavolo'} onPress={onUsa} suono={null} testID="usa" />
          ) : stato === 'compra' ? (
            <Pulsante
              etichetta={`Compra · ${n(prezzo)}`}
              sotto={monete < prezzo ? `Ne hai ${n(monete)}` : 'e mettilo in uso'}
              icona={<Moneta misura={20} />}
              onPress={onCompra}
              suono={null}
              testID="compra"
            />
          ) : (
            <Superficie materiale="noce" livello={2} style={styles.inUso}>
              <View style={styles.inUsoRiga}>
                <Icon name="lock" size={15} color={testo.medio} />
                <Text style={[styles.inUsoTesto, { color: testo.medio }]} numberOfLines={1}>
                  Si ottiene: {fonte}
                </Text>
              </View>
            </Superficie>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { height: ALTEZZA_BARRA, justifyContent: 'flex-end', gap: 4 },
  rigaTesto: { height: 18, justifyContent: 'center', alignItems: 'center' },
  riepilogo: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 17, color: testo.medio, textAlign: 'center' },
  esito: { fontFamily: fontArte.soraSemi, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56 },
  sinistra: { width: 118, alignItems: 'flex-start' },
  destra: { flex: 1 },
  inUso: { minHeight: 52, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  inUsoRiga: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inUsoTesto: { fontFamily: fontArte.soraSemi, fontSize: 15, lineHeight: 20, color: testo.forte },
});
