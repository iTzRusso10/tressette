// La bacheca del circolo in miniatura, nella home (docs/direzione-artistica.md §5.17): la cornice di noce, il
// sughero, i tre biglietti del giorno con le loro buste, e «Bacheca» che apre la schermata intera (/missioni).
// Si riscuote anche da qui: le monete volano alla pillola delle monete in alto. Il cambio di una missione al
// giorno sta sulla puntina, come nella bacheca.
//
// Props invariate ({ width }). L'altezza è fissa e uguale a quella della lista di prima (±8 punti: 275 sul
// telefono, 261 sul desktop), così l'impaginazione di Gioca.tsx non cambia.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { dayOf } from '@/meta/economy';
import { progressOf, swapDailyMission, useProfile } from '@/meta/profile';
import { Superficie, testo, fontArte, useRiduciMovimento } from '@/ui/arte';
import { sfx } from '@/ui/feedback';
import { altezzaBiglietto, Biglietto, Cartellino } from '@/ui/missioni/Biglietti';
import { bachecaDi, msAMezzanotte, oreAMezzanotte } from '@/ui/missioni/dati';
import { assicuraStratoHub, riscuoti } from '@/ui/missioni/voli';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { useTabs } from './Hub';

const CORNICE = 8;
const PAD = 10;
const GAP = 8;
const TESTA = 34;
const PIEDE = 20;

/** L'altezza della miniatura per una larghezza: quella della lista di prima (vedi in testa). */
export function altezzaMiniatura(width: number) {
  const bw = Math.floor((width - 2 * CORNICE - 2 * PAD - 2 * GAP) / 3);
  return 2 * CORNICE + PAD + TESTA + 10 + altezzaBiglietto(bw) + 8 + PIEDE + PAD - 8;
}

function ApriBacheca() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Apri la bacheca delle missioni"
      hitSlop={8}
      onPress={() => {
        sfx('tick');
        router.push('/missioni');
      }}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <Superficie materiale="noce" raggio={10} livello={2} piccolo filetto={false} style={styles.apri}>
        <Text style={styles.apriTesto}>Bacheca</Text>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d="M9 5.5l6.5 6.5L9 18.5" stroke={testo.forte} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Superficie>
    </Pressable>
  );
}

export function Missions({ width }: { width: number }) {
  const p = useProfile();
  const ins = useSafeAreaInsets();
  const riduci = useRiduciMovimento();
  const { sheet } = useTabs();
  // A mezzanotte la miniatura si rinnova da sola (missioni nuove, scadenze giuste).
  const [giorno, setGiorno] = useState(() => dayOf(new Date()));
  useEffect(() => {
    const id = setTimeout(() => setGiorno(dayOf(new Date())), msAMezzanotte(new Date()));
    return () => clearTimeout(id);
  }, [giorno]);
  const b = bachecaDi(progressOf(p), giorno);
  const dentro = width - 2 * CORNICE - 2 * PAD;
  const bw = Math.floor((dentro - 2 * GAP) / 3);
  const fatte = b.giorno.filter(x => x.stato === 'riscuotere' || x.stato === 'riscossa').length;
  const sett = b.settimana.filter(x => x.stato === 'riscuotere' || x.stato === 'riscossa').length;
  const settPronte = b.settimana.filter(x => x.stato === 'riscuotere').length;
  return (
    <View style={[styles.box, { width, height: altezzaMiniatura(width) }]} testID="fisso-bacheca-mini">
      <Superficie materiale="sughero" cornice={CORNICE} livello={3} style={[StyleSheet.absoluteFill, { paddingHorizontal: PAD, paddingTop: PAD }]}>
        <View style={styles.testa}>
          <Cartellino titolo={`Missioni · oggi ${fatte}/${b.giorno.length}`} seme={9} />
          <ApriBacheca />
        </View>
        <View style={[styles.riga, { height: altezzaBiglietto(bw) }]}>
          {b.giorno.map(d => (
            <Biglietto
              key={d.key}
              dati={d}
              larghezza={bw}
              strato="hub"
              onRiscuoti={(claimId, vista) => {
                if (!riduci) assicuraStratoHub(sheet);
                riscuoti({ claimId, sorgente: vista, strato: 'hub', insets: ins, riduci });
              }}
              onCambia={key => {
                if (swapDailyMission(key)) sfx('tick');
              }}
            />
          ))}
        </View>
        <Text style={styles.piede} numberOfLines={1}>
          Settimana {sett}/{b.settimana.length}
          {settPronte ? ` · ${settPronte} da riscuotere` : ''} · nuove tra {oreAMezzanotte(new Date())}
        </Text>
      </Superficie>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center', marginTop: space.l },
  testa: { height: TESTA, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  riga: { flexDirection: 'row', gap: GAP },
  apri: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 8 },
  apriTesto: { fontFamily: fontArte.soraBold, fontSize: 13, lineHeight: 16, color: testo.forte },
  piede: { height: PIEDE, marginTop: 8, fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 18, color: testo.inchiostro, textAlign: 'center' },
});
