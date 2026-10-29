// I cinque capitoli come sigilli di ceralacca (docs/direzione-artistica.md §5.12 passo 4): pieni quelli raggiunti,
// il capitolo dell'arena un poco più grande. Statici. Si usano nello svelamento e in «Esplora».
import { StyleSheet, View } from 'react-native';
import { CHAPTERS } from '@/meta/arenas';
import { roman } from '@/meta/levels';
import { Sigillo } from '@/ui/arte/materiali';

/** I cinque capitoli come sigilli di ceralacca: pieni quelli raggiunti, il corrente segnato. */
export function SigilliCapitoli({ capitolo, raggiunto, misura = 34 }: { capitolo: number; raggiunto: number; misura?: number }) {
  return (
    <View style={styles.sigilli} accessibilityRole="text" accessibilityLabel={`Capitolo ${roman(capitolo)} di ${CHAPTERS.length}`}>
      {CHAPTERS.map(c => {
        const pieno = c.n <= raggiunto;
        return (
          <View key={c.n} style={{ opacity: pieno ? 1 : 0.38, transform: [{ scale: c.n === capitolo ? 1.18 : 1 }] }}>
            <Sigillo testo={roman(c.n)} misura={misura} seme={c.n * 7} tinta={pieno ? undefined : '#4A3A3A'} />
          </View>
        );
      })}
    </View>
  );
}


/** Il nome in Bodoni su una riga: 40 pt se ci sta, altrimenti più piccolo (adjustsFontSizeToFit non c'è sul web). */
export function misuraNome(nome: string, larghezza: number) {
  const size = Math.max(26, Math.min(40, Math.floor(larghezza / (nome.length * 0.5))));
  return { fontSize: size, lineHeight: Math.round(size * 1.15) };
}


const styles = StyleSheet.create({
  sigilli: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' },
});
