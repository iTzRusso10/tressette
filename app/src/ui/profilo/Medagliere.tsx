// Il medagliere e i cassetti della collezione (docs/direzione-artistica.md §5.15).
//
// Export:
// - `Medagliere`  { totale, segreti, segretiTutti, perLivello?, larghezza, onApri? } un pannello di velluto con
//                 quattro medaglie vere (bronzo, argento, oro, platino) appese al loro nastro, e sotto ognuna il
//                 conto. Per gli altri giocatori `perLivello` non c'è (non è pubblico): si vede il totale e i
//                 segreti, e le medaglie restano esposte senza numero. Con `onApri` è un pulsante (porta a Trofei).
//                 Statico.
// - `Cassetti`    { righe: { posto, nome, mie, tutte }[], set: { id, colori, fatto }[], larghezza } la collezione
//                 come quattro cassetti di noce con la maniglia d'ottone e il cartellino del conto, poi gli stemmi
//                 dei set come sigilli (quelli che non hai: l'impronta vuota). Solo sul tuo profilo. Statico.
import { StyleSheet, View } from 'react-native';
import type { Tier } from '../meta';
import { Emblem } from '../meta';
import { Squish } from '../kit';
import { Text } from '../Text';
import { accento, conAlfa, fontArte, primitivi, Superficie, testo, tipografia } from '../arte';
import { numero } from './comuni';
import { Medaglia, METALLI_LIVELLO } from './Medaglia';

const LIVELLI: Tier[] = ['bronzo', 'argento', 'oro', 'platino'];
const SIMBOLO = { bronzo: 'star', argento: 'cup', oro: 'crown', platino: 'gem' } as const;

export function Medagliere({
  totale,
  segreti,
  segretiTutti,
  perLivello,
  larghezza,
  onApri,
}: {
  totale: number;
  segreti: number;
  segretiTutti: number;
  perLivello?: Record<Tier, { mie: number; tutte: number }>;
  larghezza: number;
  onApri?: () => void;
}) {
  const cw = Math.floor((larghezza - 24) / 4);
  const d = Math.min(56, Math.floor(cw * 0.62));
  const corpo = (
    <Superficie materiale="velluto" tinta="#5A1E2A" livello={2} raggio={12} style={[styles.pannello, { width: larghezza }]}>
      <View style={styles.medaglie}>
        {LIVELLI.map(t => {
          const c = perLivello?.[t];
          const vuota = !!c && c.mie === 0;
          return (
            <View key={t} style={[styles.posto, { width: cw }]}>
              <Medaglia livello={t} simbolo={SIMBOLO[t]} misura={d} vuota={vuota} />
              {perLivello ? <Text style={[styles.conto, vuota && { color: testo.tenue }]}>{c ? numero(c.mie) : ''}</Text> : null}
              <Text style={styles.livello}>{METALLI_LIVELLO[t].nome}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.piede}>
        <Text style={styles.totale}>
          <Text style={styles.totaleNum}>{numero(totale)}</Text> achievement
        </Text>
        <Text style={styles.segreti}>{`${segreti} su ${segretiTutti} segreti`}</Text>
      </View>
    </Superficie>
  );
  if (!onApri) return corpo;
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${totale} achievement, ${segreti} segreti su ${segretiTutti}. Apri i trofei`} onPress={onApri} scaleTo={0.985}>
      {corpo}
    </Squish>
  );
}

export function Cassetti({ righe, set, larghezza }: { righe: { posto: string; nome: string; mie: number; tutte: number }[]; set: { id: string; nome: string; colori: [string, string]; fatto: boolean }[]; larghezza: number }) {
  const fatti = set.filter(s => s.fatto).length;
  return (
    <View style={{ width: larghezza, gap: 10 }}>
      <Superficie materiale="noce" livello={3} raggio={10} style={styles.mobile}>
        {righe.map(r => (
          <View key={r.posto} style={styles.cassetto} accessible accessibilityLabel={`${r.nome}: ${r.mie} su ${r.tutte}`}>
            <View style={styles.frontale}>
              <Text style={styles.cassettoNome}>{r.nome}</Text>
              {/* la maniglia d'ottone */}
              <View style={styles.maniglia}>
                <View style={styles.manigliaBarra} />
              </View>
              {/* il cartellino nel portaetichette */}
              <Superficie materiale="carta" livello={0} raggio={2} style={styles.cartellino}>
                <Text style={styles.cartellinoNum}>
                  {numero(r.mie)}
                  <Text style={styles.cartellinoDi}>{` / ${r.tutte}`}</Text>
                </Text>
              </Superficie>
            </View>
            <View style={styles.binario}>
              <View style={[styles.riempito, { width: `${r.tutte ? Math.max(r.mie ? 3 : 0, (r.mie / r.tutte) * 100) : 0}%` }]} />
            </View>
          </View>
        ))}
      </Superficie>
      <View style={styles.setTesta}>
        <Text style={tipografia.occhiello}>STEMMI DEI SET</Text>
        <Text style={styles.setConto}>{`${fatti} su ${set.length}`}</Text>
      </View>
      <View style={styles.stemmi} accessible accessibilityLabel={`Stemmi dei set: ${fatti} su ${set.length}`}>
        {set.map(s => (
          <View key={s.id} style={[styles.stemma, !s.fatto && styles.stemmaVuoto]}>
            {s.fatto ? <Emblem glyph="gem" colors={s.colori} size={34} /> : null}
          </View>
        ))}
      </View>
      <Text style={styles.setNota}>
        {fatti ? 'Ogni set è un tavolino, un panno e un dorso dello stesso gruppo.' : 'Completa un set (tavolino, panno e dorso dello stesso gruppo) per il suo stemma.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pannello: { paddingTop: 0, paddingBottom: 12, paddingHorizontal: 12 },
  medaglie: { flexDirection: 'row' },
  posto: { alignItems: 'center' },
  conto: { marginTop: 4, fontFamily: fontArte.soraBold, fontSize: 18, lineHeight: 22, color: testo.forte, fontVariant: ['tabular-nums'] },
  livello: { marginTop: 2, fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 15, color: testo.medio },
  piede: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,200,210,0.25)' },
  totale: { fontFamily: fontArte.soraSemi, fontSize: 14, lineHeight: 18, color: testo.medio },
  totaleNum: { fontFamily: fontArte.soraBold, color: accento.oro, fontVariant: ['tabular-nums'] },
  segreti: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 17, color: testo.medio },
  mobile: { padding: 8, gap: 8 },
  cassetto: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 9,
    backgroundColor: conAlfa(primitivi.noce.ombra, 0.35),
    boxShadow: 'inset 0px 1px 0px rgba(255,220,180,0.12), inset 0px -2px 3px rgba(8,3,4,0.45), 0px 1px 0px rgba(8,3,4,0.6)',
  },
  frontale: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cassettoNome: { flex: 1, fontFamily: fontArte.bodoni, fontSize: 20, lineHeight: 24, color: testo.forte },
  maniglia: { width: 46, height: 12, alignItems: 'center', justifyContent: 'center' },
  manigliaBarra: { width: 40, height: 7, borderRadius: 4, backgroundColor: primitivi.ottone.medio, borderTopWidth: 1.5, borderTopColor: primitivi.ottone.luce, borderBottomWidth: 1, borderBottomColor: primitivi.ottone.ombra, boxShadow: '0px 2px 2px rgba(8,3,4,0.6)' },
  cartellino: { width: 74, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: primitivi.ottone.medio },
  cartellinoNum: { fontFamily: fontArte.soraBold, fontSize: 13, lineHeight: 17, color: testo.inchiostro, fontVariant: ['tabular-nums'] },
  cartellinoDi: { fontFamily: fontArte.sora, color: testo.inchiostroTenue },
  binario: { height: 3, marginTop: 8, borderRadius: 2, backgroundColor: 'rgba(8,3,4,0.45)', overflow: 'hidden' },
  riempito: { height: 3, borderRadius: 2, backgroundColor: accento.oro },
  setTesta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 },
  setConto: { fontFamily: fontArte.soraBold, fontSize: 13, lineHeight: 17, color: testo.medio, fontVariant: ['tabular-nums'] },
  stemmi: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stemma: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  stemmaVuoto: { backgroundColor: 'rgba(8,3,4,0.35)', boxShadow: 'inset 0px 2px 3px rgba(8,3,4,0.7), inset 0px -1px 0px rgba(255,230,190,0.08)' },
  setNota: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 18, color: testo.tenue },
});
