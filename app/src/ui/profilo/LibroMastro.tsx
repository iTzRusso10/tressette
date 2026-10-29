// Il libro mastro del profilo (docs/direzione-artistica.md §5.15): le statistiche per gioco scritte come le
// colonne di un registro su carta avorio. Intestazione stampata in rosso tipografico, righe rigate, il nome del
// gioco in Bodoni, i numeri in Sora a cifre tabellari, la moneta della lega a destra; sotto ogni riga una linea a
// matita su un binario stampato dice quanto manca alla lega successiva. In fondo la riga dei totali, sotto un
// doppio filetto come nei registri.
//
// Export:
// - `LibroMastro`  { pub: PublicProfile, larghezza } statico, altezza fissa (non dipende dai numeri).
// - `MonetieraLeghe`  { leghe: PublicProfile['leagues'], larghezza } le leghe delle stagioni passate come monete in
//                  fila su un vassoio di velluto, la più recente a sinistra, con stagione e gioco sotto. Statico.
import { StyleSheet, View } from 'react-native';
import type { PublicProfile } from '@/meta/ledger';
import { LEAGUES, leagueOf, leagueProgress, RATING } from '@/meta/rating';
import { seasonById } from '@/meta/seasons';
import { GAME_LABEL, GAMES, LeagueCoin } from '../competition';
import { Text } from '../Text';
import { conAlfa, fontArte, primitivi, Superficie, testo, tipografia } from '../arte';
import { numero } from './comuni';

const C = { nome: 0.31, partite: 0.2, vinte: 0.15, lega: 0.34 } as const;

export function LibroMastro({ pub, larghezza }: { pub: PublicProfile; larghezza: number }) {
  const w = larghezza - 32;
  const pct = pub.played ? Math.round((pub.won / pub.played) * 100) : 0;
  return (
    <Superficie materiale="carta" livello={3} raggio={4} style={[styles.foglio, { width: larghezza }]}>
      {/* il margine rosso a sinistra, come nei registri */}
      <View pointerEvents="none" style={styles.margine} />
      <View style={styles.testa}>
        <Text style={tipografia.occhielloCarta}>LIBRO MASTRO</Text>
        <Text style={styles.foglioN}>{`Partite ${numero(pub.played)}`}</Text>
      </View>
      <View style={[styles.riga, styles.intestazione]}>
        <Text style={[styles.col, { width: w * C.nome, textAlign: 'left' }]}>GIOCO</Text>
        <Text style={[styles.col, { width: w * C.partite }]}>PARTITE</Text>
        <Text style={[styles.col, { width: w * C.vinte }]}>VINTE</Text>
        <Text style={[styles.col, { width: w * C.lega, textAlign: 'right' }]}>LEGA</Text>
      </View>
      <View style={styles.doppio}>
        <View style={styles.filoRosso} />
        <View style={[styles.filoRosso, { marginTop: 2, opacity: 0.6 }]} />
      </View>
      {GAMES.map(g => {
        const s = pub.games[g];
        const piazzato = s.n >= RATING.placement;
        const lega = leagueOf(s.r);
        const prog = leagueProgress(s.r);
        const prossima = LEAGUES[LEAGUES.indexOf(lega) + 1];
        const p = s.played ? Math.round((s.won / s.played) * 100) : 0;
        const avanti = piazzato && prog && prossima ? prog[0] / Math.max(1, prog[1]) : piazzato ? 1 : s.n / RATING.placement;
        return (
          <View
            key={g}
            style={styles.voce}
            accessible
            accessibilityLabel={`${GAME_LABEL[g]}: ${s.played} partite, ${s.won} vinte, ${p} per cento. Serie migliore ${s.best}. ${
              piazzato ? `${lega.name}, punteggio ${s.r}` : `In calibrazione, ${s.n} partite su ${RATING.placement}`
            }`}
          >
            <View style={styles.riga}>
              <View style={{ width: w * C.nome }}>
                <Text style={styles.gioco} numberOfLines={1}>
                  {GAME_LABEL[g]}
                </Text>
                <Text style={styles.nota} numberOfLines={1}>
                  {`serie migliore ${s.best}`}
                </Text>
              </View>
              <Text style={[styles.num, { width: w * C.partite }]}>{numero(s.played)}</Text>
              <Text style={[styles.num, { width: w * C.vinte }]}>{s.played ? `${p}%` : '—'}</Text>
              <View style={[styles.lega, { width: w * C.lega }]}>
                <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                  <Text style={styles.punteggio} numberOfLines={1}>
                    {piazzato ? numero(s.r) : `${s.n}/${RATING.placement}`}
                  </Text>
                  <Text style={styles.nota} numberOfLines={1}>
                    {piazzato ? lega.coin : 'in prova'}
                  </Text>
                </View>
                <LeagueCoin league={lega} size={32} dim={!piazzato} />
              </View>
            </View>
            {/* il binario stampato e la linea a matita */}
            <View style={styles.binario}>
              <View style={[styles.matita, { width: `${Math.max(2, Math.min(1, avanti) * 100)}%` }]} />
            </View>
          </View>
        );
      })}
      <View style={[styles.doppio, { marginTop: 4 }]}>
        <View style={styles.filoNero} />
        <View style={[styles.filoNero, { marginTop: 2 }]} />
      </View>
      <View style={[styles.riga, styles.totale]}>
        <Text style={[styles.totaleNome, { width: w * C.nome }]}>Totale</Text>
        <Text style={[styles.num, { width: w * C.partite }]}>{numero(pub.played)}</Text>
        <Text style={[styles.num, { width: w * C.vinte }]}>{pub.played ? `${pct}%` : '—'}</Text>
        <Text style={[styles.nota, { width: w * C.lega, textAlign: 'right' }]} numberOfLines={1}>
          {`serie migliore ${pub.bestStreak}`}
        </Text>
      </View>
    </Superficie>
  );
}

const etichettaStagione = (id: string) => seasonById(id)?.name ?? (id === 'preseason' ? 'Prestagione' : id);

export function MonetieraLeghe({ leghe, larghezza }: { leghe: PublicProfile['leagues']; larghezza: number }) {
  const lista = [...leghe].reverse();
  const interno = larghezza - 28 - 4;
  const cols = Math.max(3, Math.min(5, Math.floor(interno / 92)));
  const cw = Math.floor((interno - (cols - 1) * 8) / cols);
  return (
    <Superficie materiale="noce" filetto livello={3} raggio={12} style={[styles.vassoio, { width: larghezza }]}>
      {lista.map((l, i) => {
        const lega = LEAGUES.find(x => x.id === l.league) ?? LEAGUES[0];
        return (
          <View key={`${l.season}${l.game}${i}`} style={[styles.moneta, { width: cw }]} accessible accessibilityLabel={`${lega.name}, ${GAME_LABEL[l.game]}, ${etichettaStagione(l.season)}`}>
            {/* l'incavo nel velluto dove la moneta è adagiata */}
            <View style={styles.incavoMoneta}>
              <LeagueCoin league={lega} size={48} />
            </View>
            <Text style={styles.monetaNome} numberOfLines={1}>
              {lega.coin}
            </Text>
            <Text style={styles.monetaSotto} numberOfLines={1}>
              {GAME_LABEL[l.game]}
            </Text>
            <Text style={[styles.monetaSotto, styles.stagione]} numberOfLines={2}>
              {etichettaStagione(l.season)}
            </Text>
          </View>
        );
      })}
    </Superficie>
  );
}

const styles = StyleSheet.create({
  foglio: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  margine: { position: 'absolute', left: 9, top: 0, bottom: 0, width: 1, backgroundColor: conAlfa(primitivi.inchiostro.rosso, 0.35) },
  testa: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  foglioN: { fontFamily: fontArte.sora, fontSize: 12, lineHeight: 16, color: testo.inchiostroTenue, fontVariant: ['tabular-nums'] },
  riga: { flexDirection: 'row', alignItems: 'center' },
  intestazione: { paddingBottom: 5 },
  col: { fontFamily: fontArte.soraSemi, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, color: testo.inchiostroTenue, textAlign: 'center' },
  doppio: { marginBottom: 2 },
  filoRosso: { height: 1, backgroundColor: primitivi.inchiostro.rosso, opacity: 0.85 },
  filoNero: { height: 1, backgroundColor: testo.inchiostro, opacity: 0.55 },
  voce: { paddingTop: 9, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: conAlfa(primitivi.inchiostro.rosso, 0.4) },
  gioco: { fontFamily: fontArte.bodoni, fontSize: 20, lineHeight: 24, color: testo.inchiostro },
  nota: { fontFamily: fontArte.sora, fontSize: 12, lineHeight: 15, color: testo.inchiostroTenue, fontVariant: ['tabular-nums'] },
  num: { fontFamily: fontArte.soraBold, fontSize: 15, lineHeight: 19, color: testo.inchiostro, textAlign: 'center', fontVariant: ['tabular-nums'] },
  lega: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  punteggio: { fontFamily: fontArte.soraBold, fontSize: 15, lineHeight: 19, color: testo.inchiostro, fontVariant: ['tabular-nums'] },
  binario: { height: 3, marginTop: 7, borderRadius: 1.5, backgroundColor: conAlfa(primitivi.inchiostro.tenue, 0.14), overflow: 'hidden' },
  matita: { height: 3, borderRadius: 1.5, backgroundColor: conAlfa(primitivi.inchiostro.forte, 0.55) },
  totale: { paddingTop: 6 },
  totaleNome: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, letterSpacing: 1, color: testo.rosso, textTransform: 'uppercase' },
  vassoio: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingTop: 16 },
  moneta: { alignItems: 'center' },
  incavoMoneta: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: primitivi.velluto.medio, boxShadow: 'inset 0px 3px 6px rgba(8,3,4,0.8), inset 0px -1px 0px rgba(255,200,210,0.16), 0px 1px 0px rgba(255,220,180,0.18)' },
  monetaNome: { marginTop: 6, fontFamily: fontArte.soraBold, fontSize: 13, lineHeight: 17, color: testo.forte },
  monetaSotto: { fontFamily: fontArte.sora, fontSize: 12, lineHeight: 15, color: testo.medio, textAlign: 'center' },
  stagione: { height: 30, color: testo.tenue },
});
