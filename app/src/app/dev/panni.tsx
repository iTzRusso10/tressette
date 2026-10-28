// Pagina di sviluppo: tutti i tavolini pronti (con un panno neutro) e tutte le grafiche pronte (su una
// sponda neutra), in griglia con il nome, per controllarli a colpo d'occhio. Si apre da /dev/panni.
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FELTS, NAPOLI_FELTS, STARTER_TABLE, TABLES, type Item } from '@/meta/catalog';
import { ComingPreview, TablePreview } from '@/ui/cosmetics';
import { Backdrop } from '@/ui/kit';
import { Text } from '@/ui/Text';
import { colors, space } from '@/ui/theme';

const NEUTRAL_FELT = 'verde-smeraldo';
const NEUTRAL_TABLE = 'vetro';

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
            {i.id}
            {i.slot === 'felt' && 'look' in i && 'design' in i.look && i.look.design ? ` · ${i.look.design}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );

  const tables = [STARTER_TABLE, ...TABLES].filter(i => i.status === 'ready');
  const felts = [...FELTS, ...NAPOLI_FELTS].filter(i => i.status === 'ready');

  return (
    <View style={styles.root}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + pad, paddingBottom: ins.bottom + pad * 2, paddingHorizontal: pad, alignItems: 'center' }}>
        <View style={{ width: colW }}>
          <Text v="h1">Tavolini</Text>
          <Text v="body" style={styles.sub}>
            {tables.length} pronti, con il panno {NEUTRAL_FELT}
          </Text>
          {grid(tables, i => (
            <TablePreview table={i.id} felt={NEUTRAL_FELT} width={cw} height={ch} cards />
          ))}
          <Text v="h1" style={styles.h}>
            Panni
          </Text>
          <Text v="body" style={styles.sub}>
            {felts.length} pronti, sulla sponda {NEUTRAL_TABLE}
          </Text>
          {grid(felts, i => (
            <TablePreview table={NEUTRAL_TABLE} felt={i.id} width={cw} height={ch} cards />
          ))}
          <Text v="h1" style={styles.h}>
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
  root: { flex: 1, backgroundColor: colors.night },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.l },
  name: { color: colors.text, marginTop: space.s },
  id: { color: colors.textFaint, marginBottom: space.s },
  sub: { marginTop: space.xs },
  h: { marginTop: space.xxl },
});
