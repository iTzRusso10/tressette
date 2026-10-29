// «La bacheca del circolo» (docs/direzione-artistica.md §5.17): le missioni come biglietti appuntati su una
// bacheca di sughero con la cornice di noce, sotto la lampada del circolo.
//
// - In alto, il manifesto dell'obiettivo speciale (l'evento in corso, o il prossimo) con sigillo e nastro.
// - Poi i tre biglietti del giorno (piccoli, una puntina, storti), con il cambio di una missione al giorno sulla
//   puntina; poi le quattro locandine della settimana (grandi, due puntine, cornice tipografica); in fondo il
//   manifesto della stagione, se c'è.
// - Si riscuote toccando la busta d'oro: le monete volano al contatore in alto a destra e si può toccare subito la
//   busta dopo. «Riscuoti tutto» sta in basso, fisso, e appare solo quando c'è qualcosa sulla bacheca.
// - Al cambio del giorno (mezzanotte) la bacheca si rinnova da sola: missioni nuove, scadenze aggiornate.
// Si apre con una dissolvenza dal bruno e la luce che si accende (§5.9). Nessuna animazione ambientale.
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { dayOf } from '@/meta/economy';
import { progressOf, refreshDay, swapDailyMission, useProfile } from '@/meta/profile';
import { sfx } from '@/ui/feedback';
import { Text } from '@/ui/Text';
import { dur, fontArte, primitivi, Pulsante, Sala, Superficie, Targa, testo, useRiduciMovimento } from '@/ui/arte';
import { altezzaBiglietto, altezzaLocandina, Biglietto, Cartellino, Locandina, Manifesto } from '@/ui/missioni/Biglietti';
import { bachecaDi, msAMezzanotte, oreAMezzanotte, specialiDi } from '@/ui/missioni/dati';
import { Entra } from '@/ui/missioni/pezzi';
import { ContatoreMonete, riscuoti, riscuotiTutto, StratoVoli, type Vista } from '@/ui/missioni/voli';

/** Rinnova la bacheca a mezzanotte (e quando si torna sulla schermata): missioni nuove, scadenze giuste. */
function useGiorno() {
  const [giorno, setGiorno] = useState(() => dayOf(new Date()));
  useFocusEffect(
    useCallback(() => {
      refreshDay();
      setGiorno(dayOf(new Date()));
      let id: ReturnType<typeof setTimeout>;
      const arma = () => {
        id = setTimeout(() => {
          refreshDay();
          setGiorno(dayOf(new Date()));
          arma();
        }, msAMezzanotte(new Date()));
      };
      arma();
      return () => clearTimeout(id);
    }, []),
  );
  return giorno;
}

function Indietro() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Indietro"
      hitSlop={6}
      onPress={() => {
        sfx('tick');
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Superficie materiale="noce" raggio={22} livello={2} style={styles.indietro}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M15 5.5L8.5 12l6.5 6.5" stroke={testo.forte} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Superficie>
    </Pressable>
  );
}

export default function Bacheca() {
  const { width } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const riduci = useRiduciMovimento();
  const giorno = useGiorno();
  const p = useProfile();
  const view = progressOf(p);
  const b = bachecaDi(view, giorno);
  const speciali = specialiDi(view, giorno);
  const evento = speciali.find(s => s.tipo !== 'stagione');
  const stagione = speciali.find(s => s.tipo === 'stagione');

  // Le misure: una colonna di 640 al massimo; dentro la cornice di noce (10) e il sughero (12 di margine).
  const W = Math.min(width, 640) - 32;
  const dentro = W - 2 * 10 - 2 * 12;
  const bw = Math.floor((dentro - 2 * 10) / 3);
  const perRiga = dentro >= 520 ? 4 : 2;
  const lw = Math.floor((dentro - (perRiga - 1) * 12) / perRiga);
  const hB = altezzaBiglietto(bw);
  const hL = altezzaLocandina(lw);

  // Le ricompense che stanno sulla bacheca (missioni, traguardi dell'evento e della stagione).
  const sullaBacheca = useMemo(() => {
    const ids = new Set([...b.giorno, ...b.settimana].map(x => x.claimId));
    for (const s of speciali) for (const r of s.righe) if (r.claimId) ids.add(r.claimId);
    return p.meta.claims.filter(c => ids.has(c.id));
  }, [b.giorno, b.settimana, speciali, p.meta.claims]);
  const daRiscuotere = sullaBacheca.reduce((t, c) => t + (c.coins ?? 0), 0);

  const onRiscuoti = (claimId: string, vista: Vista | null) => {
    if (!claimId) return;
    riscuoti({ claimId, sorgente: vista, strato: 'bacheca', riduci });
  };
  const onCambia = (key: string) => {
    if (swapDailyMission(key)) sfx('tick');
  };
  const giornoNota = `nuove tra ${oreAMezzanotte(new Date())}${b.cambioLibero ? ' · puoi cambiarne una' : ''}`;
  const fatteGiorno = b.giorno.filter(x => x.stato === 'riscuotere' || x.stato === 'riscossa').length;
  const fatteSett = b.settimana.filter(x => x.stato === 'riscuotere' || x.stato === 'riscossa').length;
  const barra = sullaBacheca.length > 0;

  return (
    <View style={styles.schermo}>
      <Stack.Screen options={{ animation: 'fade', title: 'La bacheca del circolo' }} />
      <Sala accendi luce={{ cx: 0.5, cy: 0.16, r: 0.85, opacita: 0.24 }} />
      <ScrollView contentContainerStyle={[styles.scorre, { paddingTop: ins.top + 64, paddingBottom: ins.bottom + 112 }]} showsVerticalScrollIndicator={false}>
        <Entra ritardo={80} style={{ width: W, alignSelf: 'center' }}>
          <Superficie materiale="sughero" cornice={10} livello={3} style={[styles.sughero, { paddingTop: 40 }]} testID="fisso-bacheca">
            {evento ? <Manifesto dati={evento} larghezza={dentro} onRiscuoti={onRiscuoti} entra indice={0} /> : null}

            <View style={styles.fila}>
              <Cartellino titolo={`Del giorno · ${fatteGiorno}/${b.giorno.length}`} nota={giornoNota} seme={3} testID="fisso-cartellino-giorno" />
            </View>
            <View style={[styles.riga, { gap: 10, height: hB }]}>
              {b.giorno.map((d, i) => (
                <Biglietto key={d.key} dati={d} larghezza={bw} onRiscuoti={onRiscuoti} onCambia={onCambia} indice={i + 1} entra />
              ))}
            </View>

            <View style={styles.fila}>
              <Cartellino
                titolo={`Della settimana · ${fatteSett}/${b.settimana.length}`}
                nota={`scadono tra ${b.giorniSettimana} ${b.giorniSettimana === 1 ? 'giorno' : 'giorni'}`}
                seme={5}
                testID="fisso-cartellino-settimana"
              />
            </View>
            <View style={[styles.griglia, { gap: 12 }]}>
              {b.settimana.map((d, i) => (
                <View key={d.key} style={{ width: lw, height: hL }}>
                  <Locandina dati={d} larghezza={lw} onRiscuoti={onRiscuoti} indice={i + 4} entra />
                </View>
              ))}
            </View>

            {stagione ? (
              <View style={{ marginTop: 22 }}>
                <Manifesto dati={stagione} larghezza={dentro} onRiscuoti={onRiscuoti} entra indice={6} />
              </View>
            ) : null}
          </Superficie>
          {/* la targa d'ottone avvitata sulla cornice: il nome del posto */}
          <View pointerEvents="none" style={styles.targa}>
            <Targa tipo="nome" testo="La bacheca del circolo" misura={W < 360 ? 20 : 22} />
          </View>
        </Entra>
        <Text style={styles.piede}>Le missioni del giorno si rinnovano a mezzanotte, quelle della settimana il lunedì. Le ricompense restano qui finché non le riscuoti.</Text>
      </ScrollView>

      <LinearGradient pointerEvents="none" colors={['rgba(20,12,14,0.94)', 'rgba(20,12,14,0.7)', 'rgba(20,12,14,0)']} locations={[0, 0.55, 1]} style={[styles.velo, { height: ins.top + 76 }]} />
      <View style={[styles.testata, { paddingTop: ins.top + 10, width: Math.min(width, 640) }]} pointerEvents="box-none">
        <Indietro />
        <ContatoreMonete strato="bacheca" testID="fisso-contatore" />
      </View>

      {barra ? (
        <Animated.View entering={FadeIn.duration(dur.enter)} exiting={FadeOut.duration(dur.exit)} style={[styles.barra, { paddingBottom: ins.bottom + 14 }]} pointerEvents="box-none">
          <LinearGradient pointerEvents="none" colors={['rgba(20,12,14,0)', 'rgba(20,12,14,0.92)', 'rgba(20,12,14,0.96)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          <View style={{ width: Math.min(width - 32, 420) }}>
            <Pulsante
              testID="riscuoti-tutto"
              etichetta="Riscuoti tutto"
              sotto={`${sullaBacheca.length === 1 ? 'una busta' : `${sullaBacheca.length} buste`} · ${daRiscuotere.toLocaleString('it-IT')} monete`}
              suono={null}
              onPress={() => riscuotiTutto(sullaBacheca.map(c => c.id), 'bacheca', { riduci })}
            />
          </View>
        </Animated.View>
      ) : null}
      <StratoVoli strato="bacheca" />
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: primitivi.notte.ombra },
  scorre: { alignItems: 'center', paddingHorizontal: 16 },
  sughero: { paddingHorizontal: 12, paddingBottom: 18 },
  fila: { marginTop: 20, marginBottom: 12 },
  riga: { flexDirection: 'row' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  targa: { position: 'absolute', top: -14, left: 0, right: 0, alignItems: 'center' },
  piede: { fontFamily: fontArte.sora, fontSize: 12.5, lineHeight: 18, color: testo.tenue, textAlign: 'center', marginTop: 18, maxWidth: 420 },
  velo: { position: 'absolute', left: 0, right: 0, top: 0 },
  testata: { position: 'absolute', top: 0, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  indietro: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 28 },
});

