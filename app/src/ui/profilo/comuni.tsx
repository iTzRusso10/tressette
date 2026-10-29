// Pezzi comuni del profilo «Lampara» (docs/direzione-artistica.md §5.15).
//
// Export:
// - `TitoloSezione`  { occhiello, titolo, azione?: { etichetta, onPress } } occhiello in foglia d'oro, titolo in
//                    Bodoni 22, filetto sotto; a destra un'azione terziaria opzionale. Statico.
// - `Indietro`       { onPress? } pulsante tondo di noce con la freccia avorio (44 pt), come BackButton.
// - `Borsellino`     { monete } le tue monete: moneta d'ottone e cifra su una pillola di noce. Statico.
// - `Schede`         { valori, valore, onCambia, etichetta } schede a placca: la scelta è ottone, le altre noce.
//                    Ruolo radiogroup/radio come kit.Choice (le foto di check:hub le cercano per nome).
// - `completa(pub)`  un PublicProfile intero a partire da uno parziale (quello che arriva dal server per gli altri)
// - `useEntrata(ritardo, durata)`  valore 0 → 1 una volta all'apertura (ease.in); con riduci movimento dissolvenza
//                    breve (dur.quick) senza ritardo. Non è ambientale: arriva a 1 e si ferma.
// - `numero(n)`      cifre all'italiana (1.260)
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { PublicProfile } from '@/meta/ledger';
import { GAME_IDS } from '@/meta/progress';
import { RATING } from '@/meta/rating';
import { DEFAULT_TITLE } from '@/meta/titles';
import { sfx } from '../feedback';
import { Squish } from '../kit';
import { Text } from '../Text';
import { accento, dur, ease, Filetto, fontArte, Moneta, primitivi, Superficie, testo, tipografia } from '../arte';

export const numero = (n: number) => n.toLocaleString('it-IT');

export function completa(p: Partial<PublicProfile>): PublicProfile {
  const vuoto = { played: 0, won: 0, best: 0, r: RATING.start, n: 0 };
  return {
    v: 1,
    avatar: p.avatar ?? 'iniziale',
    frame: p.frame ?? 'semplice',
    title: p.title ?? DEFAULT_TITLE,
    showcase: p.showcase ?? [],
    arena: Math.max(0, p.arena ?? 0),
    level: p.level ?? 1,
    prestige: p.prestige ?? 0,
    played: p.played ?? 0,
    won: p.won ?? 0,
    bestStreak: p.bestStreak ?? 0,
    games: Object.fromEntries(GAME_IDS.map(g => [g, { ...vuoto, ...(p.games?.[g] ?? {}) }])) as PublicProfile['games'],
    achievements: p.achievements ?? 0,
    secrets: p.secrets ?? 0,
    sets: p.sets ?? 0,
    leagues: p.leagues ?? [],
  };
}

export function useEntrata(ritardo: number, durata: number) {
  const riduci = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = riduci ? withTiming(1, { duration: dur.quick, easing: ease.in }) : withDelay(ritardo, withTiming(1, { duration: durata, easing: ease.in }));
  }, [riduci, ritardo, durata, v]);
  return v;
}

export function TitoloSezione({ occhiello, titolo, azione }: { occhiello: string; titolo: string; azione?: { etichetta: string; onPress: () => void } }) {
  return (
    <View style={styles.testa}>
      <View style={styles.riga}>
        <View style={{ flex: 1 }}>
          <Text style={tipografia.occhiello}>{occhiello.toUpperCase()}</Text>
          <Text style={tipografia.titoloSezione} accessibilityRole="header">
            {titolo}
          </Text>
        </View>
        {azione ? (
          <Squish accessibilityRole="button" accessibilityLabel={azione.etichetta} onPress={azione.onPress} scaleTo={0.95} style={styles.azione}>
            <Text style={styles.azioneTesto}>{azione.etichetta}</Text>
          </Squish>
        ) : null}
      </View>
      <Filetto tipo="oro" style={{ marginTop: 8 }} />
    </View>
  );
}

export function Indietro({ onPress }: { onPress?: () => void }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel="Indietro"
      hitSlop={6}
      scaleTo={0.92}
      onPress={() => {
        sfx('tick');
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    >
      <Superficie materiale="noce" raggio={22} livello={3} style={styles.tondo}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M11.5 3.5L6 9l5.5 5.5" stroke={testo.forte} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Superficie>
    </Squish>
  );
}

export function Borsellino({ monete }: { monete: number }) {
  return (
    <Superficie materiale="noce" raggio={20} livello={3} style={styles.borsellino} accessibilityLabel={`${numero(monete)} monete`}>
      <Moneta misura={24} />
      <Text style={styles.monete}>{numero(monete)}</Text>
    </Superficie>
  );
}

export function Schede<T extends string>({ valori, valore, onCambia, etichetta }: { valori: { valore: T; etichetta: string }[]; valore: T; onCambia: (v: T) => void; etichetta: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={etichetta} style={styles.schede}>
      {valori.map(o => {
        const on = o.valore === valore;
        return (
          <Squish
            key={o.valore}
            accessibilityRole="radio"
            accessibilityLabel={o.etichetta}
            accessibilityState={{ selected: on }}
            outerStyle={{ flex: 1 }}
            scaleTo={0.96}
            onPress={() => {
              if (!on) sfx('tick');
              onCambia(o.valore);
            }}
          >
            {on ? (
              <Superficie materiale="ottone" raggio={8} livello={2} piccolo style={styles.scheda}>
                <Text style={[styles.schedaTesto, tipografia.inciso]} numberOfLines={1}>
                  {o.etichetta}
                </Text>
              </Superficie>
            ) : (
              <View style={styles.scheda}>
                <Text style={[styles.schedaTesto, { color: testo.medio }]} numberOfLines={1}>
                  {o.etichetta}
                </Text>
              </View>
            )}
          </Squish>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  testa: { marginTop: 36, marginBottom: 14 },
  riga: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  azione: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  azioneTesto: { fontFamily: fontArte.soraSemi, fontSize: 14, lineHeight: 18, color: accento.oro, textDecorationLine: 'underline' },
  tondo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  borsellino: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 8, paddingRight: 14 },
  monete: { fontFamily: fontArte.soraBold, fontSize: 16, lineHeight: 20, color: testo.forte, fontVariant: ['tabular-nums'] },
  schede: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: primitivi.notte.ombra,
    boxShadow: 'inset 0px 2px 4px rgba(8,3,4,0.7), inset 0px -1px 0px rgba(255,230,190,0.08)',
  },
  scheda: { height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 8 },
  schedaTesto: { fontFamily: fontArte.soraBold, fontSize: 14, lineHeight: 18, color: testo.inchiostro },
});
