// Pagina di sviluppo del pacchetto B3: tutte le cornici, dalla comune alla mitica, a 140, 64 e 32 punti, con il
// materiale e il cerchio dell'avatar in percentuale della misura. Si apre da /dev/cornici. Con ?movimento=0
// tutto resta fermo (per le foto); con ?avatar=<id> cambia il simbolo.
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, useWindowDimensions, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FRAMES } from '@/meta/catalog';
import { rarityRank } from '@/meta/rarity';
import { AvatarCornice } from '@/ui/avatar';
import { Filetto, rarita, Sala, TarghettaRarita, testo, tipografia } from '@/ui/arte';
import { stileCornice, stileCornice as stile } from '@/ui/arte/cornici';
import { Text } from '@/ui/Text';

const ORDINATE = [...FRAMES].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.price - b.price);

export default function Cornici() {
  const { width } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const { movimento, avatar } = useLocalSearchParams<{ movimento?: string; avatar?: string }>();
  const vivo = movimento !== '0';
  const pad = 16;
  const colW = Math.min(width, 1200) - pad * 2;
  const cols = colW >= 1000 ? 3 : colW >= 640 ? 2 : 1;
  const gap = 16;
  const cw = Math.floor((colW - gap * (cols - 1)) / cols);
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ animation: 'fade' }} />
      <Sala />
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 24, paddingBottom: ins.bottom + 48, alignItems: 'center' }}>
        <View style={{ width: colW }}>
          <Text style={tipografia.occhiello}>B3 · LE CORNICI</Text>
          <Text style={[tipografia.nomeOggetto, { marginTop: 2 }]}>Dalla comune alla mitica</Text>
          <Text style={styles.nota}>
            {ORDINATE.length} cornici a 140, 64 e 32 punti. Il riflesso passa dall&apos;epico, le gemme brillano dal leggendario, la madreperla gira nel mitico: solo da 64 punti in su
            e solo qui, una alla volta nelle liste.
          </Text>
          <Filetto tipo="oro" ornamento style={{ marginVertical: 18 }} />
          <View style={[styles.griglia, { gap }]}>
            {ORDINATE.map((f, i) => {
              const st = stile(f.id);
              const foro = Math.round(st.foro * 200);
              return (
                <View key={f.id} style={[styles.scheda, { width: cw }]} testID={i === 0 ? 'fisso-prima-cornice' : undefined}>
                  <View style={styles.riga}>
                    <AvatarCornice avatar={avatar ?? 'sole'} name="Giuseppe" frame={f.id} size={140} vivo={vivo} seme={i + 1} />
                    <View style={styles.piccole}>
                      <AvatarCornice avatar={avatar ?? 'sole'} name="Giuseppe" frame={f.id} size={64} vivo={vivo} seme={i + 11} />
                      <AvatarCornice avatar={avatar ?? 'sole'} name="Giuseppe" frame={f.id} size={32} />
                    </View>
                  </View>
                  <View style={styles.testi}>
                    <View style={styles.nomeRiga}>
                      <Text style={styles.nome} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <TarghettaRarita rarita={f.rarity} />
                    </View>
                    <Text style={styles.materiale} numberOfLines={2}>
                      {stileCornice(f.id).materiale}
                    </Text>
                    <Text style={[styles.misura, { color: rarita(f.rarity).colore }]}>avatar {foro}% · {f.id}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#140C0E' },
  nota: { fontFamily: 'Sora_500Medium', fontSize: 14, lineHeight: 20, color: testo.medio, marginTop: 6 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  scheda: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(230,195,106,0.25)' },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  piccole: { alignItems: 'center', gap: 14 },
  testi: { marginTop: 6, gap: 3 },
  nomeRiga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nome: { fontFamily: 'BodoniModa_700Bold', fontSize: 20, lineHeight: 25, color: testo.forte, flexShrink: 1 },
  materiale: { fontFamily: 'Sora_500Medium', fontSize: 12.5, lineHeight: 17, color: testo.medio },
  misura: { fontFamily: 'Sora_600SemiBold', fontSize: 12, lineHeight: 16 },
});
