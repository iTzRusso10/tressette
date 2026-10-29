// Il profilo di un altro giocatore: la stessa VetrinaProfilo del tuo, con solo quello che sta in PublicProfile
// (avatar, cornice, titolo, vetrina, arena, statistiche, achievement, leghe) più la riga pubblica (nome, foto,
// trofei, ultima volta visto) e le vostre sfide. Niente tavolino, panno o dorso in uso: non sono pubblici.
//
// Export:
// - `ProfiloAltro` { view: PublicView, duelli: Duello[], onAggiungi, onTogli, onSfida(game), messaggio? }
//   Sotto la vetrina: «Aggiungi agli amici» (se non siete amici) oppure la scelta del gioco e «Sfida a …»; poi
//   le vostre sfide; in fondo «Togli dagli amici» con la conferma. Usato da giocatore/[id] e da /dev/sociale.
// - `Duello`       { game, won, lost, at }
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { GameId } from '@/engine';
import { isOnline, seenText, type PublicView } from '@/meta/social';
import { GAME_LABEL, GAMES } from '../competition';
import { dur } from '../motion';
import { Text } from '../Text';
import { accento, fontArte, primitivi, Pulsante, stato, Superficie, testo, tipografia } from '../arte';
import { completa, Schede, TitoloSezione } from './comuni';
import { StatoGiocatore, VetrinaProfilo } from './VetrinaProfilo';

export type Duello = { game: GameId; won: boolean; lost: boolean; at: string };

export function ProfiloAltro({
  view,
  duelli,
  onAggiungi,
  onTogli,
  onSfida,
  messaggio,
}: {
  view: PublicView;
  duelli: Duello[];
  onAggiungi: () => void;
  onTogli: () => void;
  onSfida: (g: GameId) => void;
  messaggio?: string | null;
}) {
  const [gioco, setGioco] = useState<GameId>('tressette');
  const [conferma, setConferma] = useState(false);
  const pub = completa(view.pub);

  const azioni = (
    <View>
      {view.friend ? (
        <View style={{ gap: 10 }}>
          <Schede<GameId> etichetta="Gioco della sfida" valori={GAMES.map(g => ({ valore: g, etichetta: GAME_LABEL[g] }))} valore={gioco} onCambia={setGioco} />
          <Pulsante etichetta={`Sfida a ${GAME_LABEL[gioco]}`} sotto="Crei la stanza e gli arriva l’invito" onPress={() => onSfida(gioco)} />
        </View>
      ) : (
        <Pulsante etichetta="Aggiungi agli amici" onPress={onAggiungi} />
      )}
      {messaggio ? (
        <Animated.View entering={FadeIn.duration(dur.quick)}>
          <Text style={styles.messaggio}>{messaggio}</Text>
        </Animated.View>
      ) : null}
    </View>
  );

  const sfide = (
    <>
      <TitoloSezione occhiello="Testa a testa" titolo="Le vostre sfide" />
      <Superficie materiale="cuoio" livello={2} raggio={12} style={styles.sfide}>
        <View style={styles.conto} accessible accessibilityLabel={`${view.myWins} vinte da te, ${view.theirWins} vinte da ${view.name}`}>
          <View style={styles.lato}>
            <Text style={styles.contoNum}>{view.myWins}</Text>
            <Text style={styles.contoChi}>vinte da te</Text>
          </View>
          <Text style={styles.trattino}>–</Text>
          <View style={styles.lato}>
            <Text style={styles.contoNum}>{view.theirWins}</Text>
            <Text style={styles.contoChi} numberOfLines={1}>
              {`vinte da ${view.name}`}
            </Text>
          </View>
        </View>
        {duelli.length ? (
          <View style={styles.duelli}>
            {duelli.slice(0, 8).map((d, i) => (
              <View key={`${d.at}${i}`} style={[styles.duello, i > 0 && styles.divisore]}>
                <View style={[styles.esito, { backgroundColor: d.won ? stato.successo : d.lost ? primitivi.ceralacca.luce : primitivi.notte.luce }]}>
                  <Text style={[styles.esitoTesto, { color: d.won ? testo.inchiostro : testo.forte }]}>{d.won ? 'V' : d.lost ? 'P' : '='}</Text>
                </View>
                <Text style={styles.duelloGioco}>{GAME_LABEL[d.game]}</Text>
                <Text style={styles.duelloData}>{new Date(d.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.nessuna}>Ancora nessuna sfida online tra voi. Contano le partite in stanza con l’account, confermate da entrambi.</Text>
        )}
      </Superficie>
    </>
  );

  const coda = view.friend ? (
    <View style={{ marginTop: 36 }}>
      {conferma ? (
        <Superficie materiale="cuoio" livello={2} raggio={12} style={styles.conferma}>
          <Text style={[tipografia.titoloSezione, { textAlign: 'center' }]}>{`Togli ${view.name} dagli amici?`}</Text>
          <View style={styles.confermaPulsanti}>
            <Pulsante etichetta="No" tipo="secondario" onPress={() => setConferma(false)} style={{ flex: 1 }} />
            <Pulsante etichetta="Sì, togli" tipo="pericolo" onPress={onTogli} style={{ flex: 1 }} />
          </View>
        </Superficie>
      ) : (
        <Pulsante etichetta="Togli dagli amici" tipo="terziario" onPress={() => setConferma(true)} />
      )}
    </View>
  ) : null;

  return (
    <VetrinaProfilo
      pub={pub}
      nome={view.name}
      foto={view.photo}
      trofei={view.cups}
      stato={<StatoGiocatore online={isOnline(view.lastSeen)} testo={seenText(view.lastSeen)} />}
      azioni={azioni}
      sfide={sfide}
      coda={coda}
    />
  );
}

const styles = StyleSheet.create({
  messaggio: { marginTop: 10, textAlign: 'center', fontFamily: fontArte.soraSemi, fontSize: 14, lineHeight: 19, color: stato.successo },
  sfide: { padding: 16 },
  conto: { flexDirection: 'row', alignItems: 'center' },
  lato: { flex: 1, alignItems: 'center' },
  contoNum: { fontFamily: fontArte.bodoni, fontSize: 40, lineHeight: 46, color: accento.oro, fontVariant: ['tabular-nums'] },
  contoChi: { fontFamily: fontArte.soraSemi, fontSize: 13, lineHeight: 17, color: testo.medio },
  trattino: { fontFamily: fontArte.bodoni, fontSize: 28, lineHeight: 34, color: testo.tenue },
  duelli: { marginTop: 12, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,230,190,0.25)' },
  duello: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  divisore: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,230,190,0.15)' },
  esito: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 1px 2px rgba(8,3,4,0.6)' },
  esitoTesto: { fontFamily: fontArte.soraExtra, fontSize: 13, lineHeight: 16 },
  duelloGioco: { flex: 1, fontFamily: fontArte.soraSemi, fontSize: 15, lineHeight: 19, color: testo.forte },
  duelloData: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 17, color: testo.medio, fontVariant: ['tabular-nums'] },
  nessuna: { marginTop: 12, fontFamily: fontArte.sora, fontSize: 14, lineHeight: 20, color: testo.medio },
  conferma: { padding: 16, gap: 14 },
  confermaPulsanti: { flexDirection: 'row', gap: 10 },
});


