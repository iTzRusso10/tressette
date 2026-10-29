// Pagina di sviluppo di «Lampara» (pacchetto B0): tutti i materiali, le sei rarità su un campione, le ombre
// per livello, la tipografia, i pulsanti, cartiglio, sigillo, targhe e i componenti di vita.
// Si apre da /dev/arte (sul sito /tressette/dev/arte). Con ?movimento=0 tutto resta fermo (per le foto).
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { RARITIES } from '@/meta/rarity';
import {
  Cartiglio,
  Filetto,
  fontArte,
  LIVELLI,
  MedagliaRarita,
  Moneta,
  MoneteInVolo,
  ombra,
  Parallasse,
  Piano,
  primitivi,
  Pulsante,
  rarita,
  Respiro,
  Riflesso,
  Sala,
  Scintille,
  Sigillo,
  Superficie,
  Targa,
  TarghettaRarita,
  Teca,
  testo,
  testoSu,
  tipografia,
  Trama,
  TRAME,
  useScorrimento,
  accento,
  type Materiale,
} from '@/ui/arte';
import { Text } from '@/ui/Text';

const MATERIALI: { m: Materiale; nome: string; tinta?: string; crepe?: boolean }[] = [
  { m: 'noce', nome: 'Noce lucidato' },
  { m: 'ottone', nome: 'Ottone spazzolato' },
  { m: 'carta', nome: 'Carta avorio' },
  { m: 'velluto', nome: 'Velluto bordeaux' },
  { m: 'cuoio', nome: 'Cuoio' },
  { m: 'marmo', nome: 'Marmo' },
  { m: 'sughero', nome: 'Sughero' },
  { m: 'smalto', nome: 'Smalto blu', crepe: true },
];

function Titolo({ occhiello, children }: { occhiello: string; children: string }) {
  return (
    <View style={styles.titolo}>
      <Text style={tipografia.occhiello}>{occhiello.toUpperCase()}</Text>
      <Text style={tipografia.titoloSezione}>{children}</Text>
      <Filetto tipo="oro" style={{ marginTop: 6 }} />
    </View>
  );
}

function Campione({ m, nome, tinta, crepe, w }: { m: Materiale; nome: string; tinta?: string; crepe?: boolean; w: number }) {
  return (
    <View style={{ width: w, gap: 6 }} testID={`fisso-materiale-${m}`}>
      <Superficie materiale={m} tinta={tinta} crepe={crepe} livello={3} cornice={m === 'sughero' ? 9 : undefined} style={{ height: w * 0.62 }} />
      <Text style={styles.etichetta}>{nome}</Text>
    </View>
  );
}

function Ombra({ livello, nome, w }: { livello: 2 | 3 | 4; nome: string; w: number }) {
  return (
    <View style={{ width: w, alignItems: 'center', gap: 10 }}>
      <View style={[styles.ombraTessera, { width: w * 0.62, height: w * 0.62, boxShadow: ombra(livello) }]}>
        <Superficie materiale="carta" livello={0} style={StyleSheet.absoluteFill} />
      </View>
      <Text style={styles.etichetta}>{nome}</Text>
    </View>
  );
}

function Riga({ children, gap = 14 }: { children: ReactNode; gap?: number }) {
  return <View style={[styles.riga, { gap }]}>{children}</View>;
}

export default function DevArte() {
  const { width } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const { movimento } = useLocalSearchParams<{ movimento?: string }>();
  const vivo = movimento !== '0';
  const col = Math.min(width, 720) - 32;
  const per = col > 600 ? 4 : 2;
  const cella = (col - 14 * (per - 1)) / per;
  const [teca, setTeca] = useState(false);
  const [volo, setVolo] = useState(0);
  const [monete, setMonete] = useState(5400);
  const { scorrimento, onScroll } = useScorrimento();
  const scenaH = 150;
  // La scena è in fondo alla pagina: i piani sono al loro posto quando la scena è al centro dello schermo.
  const [origine, setOrigine] = useState(0);
  const altezzaSchermo = useWindowDimensions().height;
  return (
    <View style={styles.pagina}>
      <Stack.Screen options={{ animation: 'fade' }} />
      <Sala accendi />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: ins.top + 24, paddingBottom: ins.bottom + 48, alignItems: 'center' }}>
        <View style={{ width: col, gap: 28 }}>
          <View style={{ gap: 6 }}>
            <Text style={tipografia.occhiello}>{'DIREZIONE ARTISTICA · B0'}</Text>
            <Text style={tipografia.nomeProfilo}>Lampara</Text>
            <Text style={[styles.nota, { color: testo.medio }]}>Una sala da gioco del Sud, di sera, sotto una lampada. Una sola luce, dall&apos;alto a sinistra.</Text>
          </View>

          {/* --------------------------------------------------------- materiali */}
          <View>
            <Titolo occhiello="Strati: base, grana, luce, rilievo, ombre">Materiali</Titolo>
            <View style={[styles.griglia, { gap: 14 }]}>
              {MATERIALI.map(x => (
                <Campione key={x.m} {...x} w={cella} />
              ))}
            </View>
          </View>

          {/* --------------------------------------------------------- rarità */}
          <View>
            <Titolo occhiello="Scala di materiali, non di colori">Le sei rarità</Titolo>
            <View style={[styles.rarita, { rowGap: 18 }]}>
              {RARITIES.map(r => {
                // Sei in fila sul desktop, tre per riga sul telefono (i nomi restano interi).
                const n = col > 520 ? 6 : 3;
                const w = (col - (n - 1) * 8) / n;
                const m = Math.min(84, w - 8);
                return (
                  <View key={r} style={{ width: w, alignItems: 'center', gap: 8 }} testID={`fisso-rarita-${r}`}>
                    <MedagliaRarita rarita={r} misura={m} attivo={vivo} />
                    <Text style={[styles.etichettaPiccola, { color: rarita(r).colore }]} numberOfLines={1}>
                      {rarita(r).nome}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={[styles.griglia, { gap: 8, marginTop: 14, justifyContent: 'center' }]}>
              {RARITIES.map(r => (
                <TarghettaRarita key={r} rarita={r} />
              ))}
            </View>
            <Text style={[styles.nota, { marginTop: 10 }]}>Sotto i 48 punti niente movimento. Dall&apos;epico in su passa un riflesso; dal leggendario scintille.</Text>
          </View>

          {/* --------------------------------------------------------- ombre */}
          <View>
            <Titolo occhiello="Contatto + portata, luce da ore 11">Ombre per livello</Titolo>
            <Riga>
              <Ombra livello={2} nome="2 · superficie" w={(col - 28) / 3} />
              <Ombra livello={3} nome="3 · oggetto" w={(col - 28) / 3} />
              <Ombra livello={4} nome="4 · primo piano" w={(col - 28) / 3} />
            </Riga>
          </View>

          {/* --------------------------------------------------------- tipografia */}
          <Superficie materiale="noce" livello={2} filetto style={{ padding: 20, gap: 10 }}>
            <Text style={tipografia.occhiello}>{'ARENA 13 · CAPITOLO III'}</Text>
            <Text style={[tipografia.nomeSvelamento, { fontSize: Math.min(40, col / 9) }]}>Il Club dei Signori</Text>
            <Text style={tipografia.titoloSezione}>La bacheca del circolo</Text>
            <Text style={[styles.nota, { color: testo.medio }]}>Sora per l&apos;interfaccia, Bodoni Moda per i nomi delle cose che hanno valore.</Text>
            <Riga gap={18}>
              <Text style={[tipografia.numero, { fontSize: 22, color: accento.oro }]}>1.260</Text>
              <Text style={[tipografia.numero, { fontSize: 22 }]}>5.400</Text>
            </Riga>
          </Superficie>

          <Superficie materiale="carta" livello={3} style={{ padding: 20, gap: 8 }}>
            <Text style={tipografia.occhielloCarta}>{'LOCANDINA DELLA SETTIMANA'}</Text>
            <Text style={[tipografia.titoloSezione, { color: testo.inchiostro }]}>Vinci 5 partite a Scopa</Text>
            <Filetto tipo="rosso" ornamento />
            <Text style={[styles.nota, { color: testo.inchiostroTenue }]}>Inchiostro su carta avorio, filetti tipografici rossi.</Text>
          </Superficie>

          {/* --------------------------------------------------------- targhe, cartiglio, sigilli */}
          <View>
            <Titolo occhiello="Ottone inciso, carta, ceralacca">Targhe e sigilli</Titolo>
            <View style={{ gap: 18, alignItems: 'center' }}>
              <Targa tipo="nome" testo="Giuseppe" misura={28} testID="fisso-targa" />
              <Cartiglio testo="Re del Circolo" />
              <Riga gap={18}>
                <Targa testo="Arena 13" />
                <Targa testo="Leggendario" metallo={rarita('leggendario').metallo} />
              </Riga>
              <Riga gap={16}>
                <Sigillo testo="Fatta" seme={3} />
                <Sigillo testo="In uso" seme={8} tinta={primitivi.ceralacca.medio} />
                <Sigillo testo="In prova" seme={12} misura={62} />
                <Sigillo
                  seme={21}
                  misura={48}
                  simbolo={
                    <Svg width={18} height={18} viewBox="0 0 20 20">
                      <Path d="M4 10.5l4 4 8-9" stroke={testo.forte} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  }
                />
              </Riga>
            </View>
          </View>

          {/* --------------------------------------------------------- pulsanti */}
          <View>
            <Titolo occhiello="Il rilievo si inverte al tocco">Pulsanti di materiale</Titolo>
            <View style={{ gap: 12 }}>
              <Pulsante etichetta="Apri la teca" sotto="Presentazione grande" onPress={() => setTeca(true)} testID="fisso-pulsante" />
              <Riga gap={12}>
                <Pulsante tipo="secondario" etichetta="Riscuoti 60" style={{ flex: 1 }} onPress={() => setVolo(v => v + 1)} />
                <Pulsante tipo="pericolo" etichetta="Esci" style={{ flex: 1 }} onPress={() => {}} />
              </Riga>
              <Pulsante tipo="terziario" etichetta="Torna al tuo tavolo" onPress={() => {}} />
              <Pulsante etichetta="Compra" sotto="Monete insufficienti" disabilitato onPress={() => {}} />
            </View>
          </View>

          {/* --------------------------------------------------------- vita */}
          <View onLayout={e => setOrigine(ins.top + 24 + e.nativeEvent.layout.y + 60 - (altezzaSchermo - scenaH) / 2)}>
            <Titolo occhiello="Ferma con riduci movimento">Vita in vetrina</Titolo>
            <Parallasse scorrimento={scorrimento} origine={origine} larghezza={col} altezza={scenaH} style={styles.scena}>
              <Piano fattore={LIVELLI.sfondo.parallasse}>
                <View style={{ flex: 1, backgroundColor: '#0E1626' }}>
                  <Svg width="100%" height="100%" viewBox={`0 0 ${col} ${scenaH * 1.6}`} preserveAspectRatio="xMidYMid slice">
                    <Circle cx={col * 0.78} cy={scenaH * 0.62} r={16} fill={primitivi.notteFredda.luna} opacity={0.9} />
                    <Path d={`M0 ${scenaH} L${col * 0.3} ${scenaH * 0.72} L${col * 0.42} ${scenaH * 0.8} L${col * 0.6} ${scenaH * 0.66} L${col} ${scenaH * 0.96} V${scenaH * 1.6} H0Z`} fill="#1B2232" />
                  </Svg>
                </View>
              </Piano>
              <Piano fattore={LIVELLI.ambiente.parallasse} deriva={{ x: 4 }} attivo={vivo}>
                <View style={{ position: 'absolute', left: col * 0.18, top: scenaH * 0.6 }}>
                  <Respiro tipo="opacita" attivo={vivo}>
                    <View style={styles.lampara} />
                  </Respiro>
                </View>
              </Piano>
              <Piano fattore={1}>
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: scenaH * 0.3 }}>
                  <Superficie materiale="noce" livello={0} raggio={0} style={{ flex: 1 }} />
                </View>
              </Piano>
              <Scintille larghezza={col} altezza={scenaH} quante={10} tipo="granello" misura={4} attivo={vivo} />
            </Parallasse>
            <Riga gap={16}>
              <View style={{ marginTop: 16 }}>
                <Targa tipo="nome" testo="Riflesso" misura={22} metallo={rarita('leggendario').metallo} />
                <Riflesso larghezza={170} altezza={46} raggio={10} pausa={4000} ritardo={400} attivo={vivo} />
              </View>
              <View style={[styles.contatore, { marginTop: 16 }]} testID="fisso-contatore">
                <Moneta misura={22} />
                <Text style={[tipografia.numero, { fontSize: 17 }]}>{monete.toLocaleString('it-IT')}</Text>
              </View>
            </Riga>
            <Text style={[styles.nota, { marginTop: 10 }]}>
              Trame: {Object.values(TRAME).reduce((s, t) => s + t.kb, 0).toFixed(0)} KB in tutto. Testo su smalto blu: {testoSu('smalto') === testo.forte ? 'avorio' : 'inchiostro'}.
            </Text>
          </View>

          <View>
            <Titolo occhiello="Trama cotta su un colore qualsiasi">Panno in vetrina</Titolo>
            <View style={[styles.panno, { boxShadow: ombra(3) }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: primitivi.panno.medio }]} />
              <Trama nome="panno" />
            </View>
          </View>
          <Text style={[styles.nota, { fontFamily: fontArte.sora }]}>Fine della pagina.</Text>
        </View>
      </Animated.ScrollView>
      {volo > 0 ? (
        <MoneteInVolo
          key={volo}
          seme={volo}
          da={{ x: width / 2 - 60, y: 520 }}
          a={{ x: width / 2 + 40, y: ins.top + 40 }}
          onArrivo={() => setMonete(m => m + 60)}
        />
      ) : null}
      <Teca
        visibile={teca}
        onChiudi={() => setTeca(false)}
        occhiello="Nuovo oggetto"
        titolo="Medaglia del Circolo"
        rarita="leggendario"
        forma="cerchio"
        azioni={
          <>
            <Pulsante tipo="secondario" etichetta="Avanti" onPress={() => setTeca(false)} style={{ flex: 1 }} />
            <Pulsante etichetta="Usalo" onPress={() => setTeca(false)} style={{ flex: 1 }} />
          </>
        }
      >
        <MedagliaRarita rarita="leggendario" misura={Math.min(180, width * 0.44)} riflesso={false} />
      </Teca>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: primitivi.notte.ombra },
  titolo: { gap: 2, marginBottom: 14 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  riga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  rarita: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  etichetta: { fontFamily: fontArte.soraSemi, fontSize: 13, lineHeight: 17, color: testo.medio },
  etichettaPiccola: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16 },
  nota: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 19, color: testo.tenue },
  ombraTessera: { borderRadius: 4 },
  scena: { borderRadius: 14, boxShadow: ombra(3) },
  lampara: { width: 10, height: 10, borderRadius: 5, backgroundColor: primitivi.lampada, boxShadow: `0px 0px 18px ${primitivi.lampada}` },
  contatore: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 40, borderRadius: 20, backgroundColor: primitivi.notte.medio, borderWidth: 1, borderColor: 'rgba(230,195,106,0.35)' },
  panno: { height: 120, borderRadius: 14, overflow: 'hidden' },
});
