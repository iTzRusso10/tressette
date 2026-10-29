// Pagina di sviluppo: tutti i tavolini pronti (con un panno neutro) e tutte le grafiche pronte (su una
// sponda neutra), in griglia con il nome, per controllarli a colpo d'occhio. Si apre da /dev/panni.
// Le anteprime sono quelle del negozio e del palco (cosmetics.tsx): carte in un angolo, trama cotta, sponda col
// suo materiale; in fondo i dorsi con lo spessore e la vernice. Sulla Sala di Lampara, come in vetrina.
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BACKS, FELTS, NAPOLI_BACKS, NAPOLI_FELTS, STARTER_BACK, STARTER_TABLE, TABLES, type Item } from '@/meta/catalog';
import { Sala, testo, tipografia } from '@/ui/arte';
import { BackPreview, ComingPreview, TablePreview } from '@/ui/cosmetics';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { vetrinaTavolino } from '@/ui/arte/oggetti';

const NEUTRAL_FELT = 'verde-tradizionale';
const NEUTRAL_TABLE = 'noce-italiano';

export default function Panni() {
  const { width } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const [coming] = useState(() => [...TABLES, ...FELTS].filter(i => i.status === 'coming'));
  const pad = space.l;
  const colW = Math.min(width, 1280) - pad * 2;
  const cols = colW >= 700 ? 3 : 2;
  const gap = space.m;
  const cw = Math.floor((colW - gap * (cols - 1)) / cols);
  const ch = Math.round(cw * 0.62);

  const grid = (items: Item[], render: (i: Item) => React.ReactNode) => (
    <View style={[styles.grid, { gap }]}>
      {items.map(i => (
        <View key={`${i.slot}:${i.id}`} style={{ width: cw }}>
          {render(i)}
          <Text v="small" numberOfLines={1} style={styles.name}>
            {i.name}
          </Text>
          <Text v="small" numberOfLines={1} style={styles.id}>
            {i.slot === 'table' ? `${vetrinaTavolino(i.id).materiale} · ` : ''}
            {i.id}
            {i.slot === 'felt' && 'look' in i && 'design' in i.look && i.look.design ? ` · ${i.look.design}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );

  const tables = [STARTER_TABLE, ...TABLES].filter(i => i.status === 'ready');
  const felts = [...FELTS, ...NAPOLI_FELTS].filter(i => i.status === 'ready');
  const backs = [STARTER_BACK, ...BACKS, ...NAPOLI_BACKS].filter(i => i.status === 'ready');
  const bw = Math.floor((colW - gap * 5) / 6);

  return (
    <View style={styles.root}>
      <Sala />
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + pad, paddingBottom: ins.bottom + pad * 2, paddingHorizontal: pad, alignItems: 'center' }}>
        <View style={{ width: colW }}>
          <Text style={tipografia.occhiello}>B3 · LE ANTEPRIME</Text>
          <Text v="h1" style={styles.titolo}>Tavolini</Text>
          <Text v="body" style={styles.sub}>
            {tables.length} pronti, con il panno {NEUTRAL_FELT}
          </Text>
          {grid(tables, i => (
            <TablePreview table={i.id} felt={NEUTRAL_FELT} width={cw} height={ch} cards />
          ))}
          <Text v="h1" style={[styles.h, styles.titolo]}>
            Panni
          </Text>
          <Text v="body" style={styles.sub}>
            {felts.length} pronti, sulla sponda {NEUTRAL_TABLE}
          </Text>
          {grid(felts, i => (
            <TablePreview table={NEUTRAL_TABLE} felt={i.id} width={cw} height={ch} cards />
          ))}
          <Text v="h1" style={[styles.h, styles.titolo]}>
            Dorsi
          </Text>
          <Text v="body" style={styles.sub}>
            {backs.length} pronti, con lo spessore della carta e la vernice
          </Text>
          <View style={[styles.grid, { gap }]}>
            {backs.map(b => (
              <View key={b.id} style={{ width: bw, alignItems: 'center' }}>
                <BackPreview id={b.id} width={Math.min(96, bw - 8)} />
                <Text v="small" numberOfLines={1} style={styles.name}>
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
          <Text v="h1" style={[styles.h, styles.titolo]}>
            In arrivo
          </Text>
          <Text v="body" style={styles.sub}>
            {coming.length} aspettano l’illustrazione
          </Text>
          {grid(coming, i => (
            <ComingPreview item={i} width={cw} height={ch} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#140C0E' },
  titolo: { fontFamily: 'BodoniModa_700Bold', letterSpacing: 0, color: testo.forte },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.l },
  name: { color: testo.forte, marginTop: space.s },
  id: { color: testo.tenue, marginBottom: space.s },
  sub: { marginTop: space.xs, color: testo.medio },
  h: { marginTop: space.xxl },
});
