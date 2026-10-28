// Pagina di sviluppo: le 30 scene delle arene in griglia, ognuna a 3:1, a 1:1 e spenta (`dim`).
// Si apre da /dev/arene (sul sito /tressette/dev/arene). Con ?capitolo=3 mostra un capitolo solo.

import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ARENAS } from '@/meta/arenas';
import { ArenaScene, ARENA_SKY } from '@/ui/ArenaScene';
import { Text } from '@/ui/Text';
import { colors, fonts } from '@/ui/theme';

const GAP = 12;

export default function DevArene() {
  const { width } = useWindowDimensions();
  const { capitolo } = useLocalSearchParams<{ capitolo?: string }>();
  const pad = 16;
  const inner = Math.max(240, Math.min(width, 1400) - pad * 2);
  // Una arena per riga sul telefono, due affiancate sul desktop.
  const perRow = inner > 900 ? 2 : 1;
  const cell = (inner - GAP * (perRow - 1)) / perRow;
  // In ogni cella: 3:1 sopra, sotto 1:1 e la versione spenta 1:1 affiancate.
  // Ogni cornice ha un bordo da 1 px per lato: si toglie dalla misura della scena.
  const wide = cell - 2;
  const sq = (cell - GAP) / 2 - 2;
  const list = capitolo ? ARENAS.filter(a => a.chapter.n === Number(capitolo)) : ARENAS;
  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: pad, alignItems: 'center' }}>
      <Text v="h1" style={{ marginBottom: 16 }}>
        Arene
      </Text>
      <View style={[styles.grid, { width: inner }]}>
        {list.map(a => {
          const [sky, accent] = ARENA_SKY[a.id] ?? ['#000000', '#FFFFFF'];
          return (
            <View key={a.id} style={[styles.cell, { width: cell }]}>
              {a.index % 6 === 0 ? <Text style={styles.chapter}>{`Capitolo ${a.chapter.n} · ${a.chapter.name} · ${a.chapter.world}`}</Text> : null}
              <View style={[styles.frame, { borderColor: accent }]}>
                <ArenaScene id={a.id} width={wide} height={wide / 3} />
              </View>
              <View style={styles.row}>
                <View style={[styles.frame, { borderColor: accent }]}>
                  <ArenaScene id={a.id} width={sq} height={sq} />
                </View>
                <View style={[styles.frame, { borderColor: accent }]}>
                  <ArenaScene id={a.id} width={sq} height={sq} dim />
                </View>
              </View>
              <View style={styles.caption}>
                <View style={[styles.swatch, { backgroundColor: sky }]} />
                <View style={[styles.swatch, { backgroundColor: accent }]} />
                <Text style={styles.name} numberOfLines={1}>{`${a.n}. ${a.name}`}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.night },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { marginBottom: 20, gap: GAP / 2 },
  chapter: { fontFamily: fonts.bold, color: colors.sun, fontSize: 15, marginBottom: 4 },
  row: { flexDirection: 'row', gap: GAP },
  frame: { borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  name: { fontFamily: fonts.semi, color: colors.text, fontSize: 14, flexShrink: 1 },
});
