// «La bacheca del circolo»: i fogli appesi (docs/direzione-artistica.md §5.17).
//
// Tre formati, riconoscibili anche in scala di grigi per forma e misura (non per colore):
// - `Biglietto`  (del giorno)        piccolo, una puntina in alto, storto di ±1,5° (fisso, seeded), carta avorio.
// - `Locandina`  (della settimana)   più grande e dritta, due puntine agli angoli, carta più spessa e scura,
//                                    cornice tipografica doppia e intestazione con filetto rosso.
// - `Manifesto`  (speciali: evento e stagione)  largo quanto la bacheca, titolo in Bodoni, sigillo di ceralacca
//                                    con il nastro, i traguardi in fila con le loro buste.
//
// Props comuni: { dati, larghezza, onRiscuoti(claimId, vista), indice? (per lo scaglione d'entrata), entra? }
// Biglietto in più: { onCambia?(key) } (il pulsante d'ottone con le frecce prende il posto della puntina).
// `altezzaBiglietto(larghezza)`, `altezzaLocandina(larghezza)`: le altezze fisse (completare o riscuotere non
// sposta niente). Il `testID` «fisso-biglietto-<id>» sta sulla vista esterna, che non si muove mai: l'entrata,
// la stortura e la piega stanno dentro.
//
// Stati: da fare (biglietto pulito, busta chiusa), in corso (tacche a matita), da riscuotere (timbro «Fatta» di
// ceralacca la prima volta che si vede, busta d'oro con un riflesso), riscossa (orecchia, carta sbiadita, spunta
// a matita, busta aperta). Budget: per foglio al più il timbro (180 ms), la piega (280 ms) e il riflesso della
// busta (una volta). Nessuna animazione ambientale.
import { memo, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { seeded } from '@/engine/rng';
import { itemByKey } from '@/meta/catalog';
import { Text } from '../Text';
import { Filetto, Sigillo, Superficie } from '../arte/materiali';
import { dur, ease, mov } from '../arte/movimento';
import { fontArte, primitivi, testo, tipografia } from '../arte/token';
import type { BigliettoDati, RigaSpeciale, SpecialeDati, StatoMissione } from './dati';
import { registraBusta, type Strato, type Vista } from './voli';
import { Busta, Entra, GRAFITE, IconaSmalto, Orecchia, Puntina, ritardoEntrata, Tacche } from './pezzi';

type Riscuoti = (claimId: string, vista: Vista | null) => void;

/** Riscuotibili già visti in questa sessione: il timbro «Fatta» si batte una volta sola. */
const timbrati = new Set<string>();

function useTimbro(claimId: string, pronto: boolean) {
  const nuovo = pronto && !timbrati.has(claimId);
  useEffect(() => {
    if (pronto) timbrati.add(claimId);
  }, [claimId, pronto]);
  return nuovo;
}

/** Riscossa: la carta sbiadisce in 280 ms (non è movimento, resta anche con riduci movimento). */
function useSbiadito(riscossa: boolean) {
  const v = useSharedValue(riscossa ? 0.6 : 1);
  useEffect(() => {
    v.value = withTiming(riscossa ? 0.6 : 1, { duration: mov.posa, easing: ease.in });
  }, [riscossa, v]);
  return useAnimatedStyle(() => ({ opacity: v.value }));
}


function Spunta({ misura = 16 }: { misura?: number }) {
  return (
    <Svg width={misura} height={misura} viewBox="0 0 16 16" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M2.6 8.6c1.2.9 2.2 2 3.1 3.4C7.6 7.8 10.2 4.8 13.6 2.6" stroke={GRAFITE} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const STATO_TESTO: Record<StatoMissione, string> = {
  dafare: 'Da fare',
  incorso: 'In corso',
  riscuotere: 'Fatta, da riscuotere',
  riscossa: 'Fatta e riscossa',
};

const etichettaBusta = (coins: number, xp: number, stato: StatoMissione, extra = '') =>
  stato === 'riscuotere'
    ? `Riscuoti ${coins.toLocaleString('it-IT')} monete${xp ? ` e ${xp} punti esperienza` : ''}${extra}`
    : `Premio: ${coins.toLocaleString('it-IT')} monete${xp ? ` e ${xp} punti esperienza` : ''}${extra}${stato === 'riscossa' ? ', già riscosso' : ''}`;

/* ------------------------------------------------------------------ pulsante «cambia» sulla puntina */

function PuntinaCambia({ onPress, testo: t }: { onPress: () => void; testo: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Cambia la missione «${t}» (una volta al giorno)`} onPress={onPress} hitSlop={11} style={({ pressed }) => [styles.cambia, pressed && { transform: [{ scale: 0.92 }] }]}>
      <Superficie materiale="ottone" raggio={12} livello={2} piccolo style={styles.cambiaDisco}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="M5 9h13l-3.5-3.5M19 15H6l3.5 3.5" stroke={primitivi.ottone.ombra} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Superficie>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Biglietto (del giorno) */

const B = { padTop: 13, padX: 8, icona: 28, gap: 4, riga: 15, tacche: 18, busta: 50, padBot: 8 };

/** Righe della frase: tre sui biglietti stretti (telefono), due su quelli larghi. */
const righeBiglietto = (w: number) => (w >= 128 ? 2 : 3);

export function altezzaBiglietto(w: number) {
  return B.padTop + B.icona + B.gap + B.riga * righeBiglietto(w) + 5 + B.tacche + 6 + B.busta + B.padBot;
}

function BigliettoBase({
  dati: d,
  larghezza: w,
  onRiscuoti,
  onCambia,
  indice = 0,
  entra = false,
  strato = 'bacheca',
}: {
  dati: BigliettoDati;
  larghezza: number;
  onRiscuoti: Riscuoti;
  onCambia?: (key: string) => void;
  indice?: number;
  entra?: boolean;
  strato?: Strato;
}) {
  const h = altezzaBiglietto(w);
  const busta = useRef<Vista | null>(null);
  const pronto = d.stato === 'riscuotere';
  const riscossa = d.stato === 'riscossa';
  const timbro = useTimbro(d.claimId, pronto);
  const sbiadito = useSbiadito(riscossa);
  const storto = (seeded(d.seme)() - 0.5) * 3; // ±1,5°, fisso per missione
  const righe = righeBiglietto(w);
  return (
    <View testID={`fisso-biglietto-${d.id}`} style={{ width: w, height: h }}>
      <Entra ritardo={entra ? ritardoEntrata(indice) : -1} style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${storto.toFixed(2)}deg` }] }]}>
        <Animated.View style={[StyleSheet.absoluteFill, sbiadito]}>
          <Superficie materiale="carta" raggio={3} livello={3} style={[StyleSheet.absoluteFill, styles.foglioDentro, { paddingTop: B.padTop, paddingHorizontal: B.padX, paddingBottom: B.padBot }]}>
            <View style={styles.testa}>
              <IconaSmalto tipo={d.icona} misura={B.icona} />
              <Text style={styles.numeroBodoni} numberOfLines={1}>
                {d.goal.toLocaleString('it-IT')}
              </Text>
              {riscossa ? <Spunta /> : null}
            </View>
            <Text
              style={[styles.breve, { height: B.riga * righe, marginTop: B.gap }]}
              numberOfLines={righe}
              accessibilityLabel={`${d.testo} ${d.have} su ${d.goal}. ${STATO_TESTO[d.stato]}.`}
            >
              {d.breve}
            </Text>
            <View style={{ marginTop: 5 }}>
              <Tacche have={d.have} goal={d.goal} larghezza={w - B.padX * 2} seme={d.seme} piccolo />
            </View>
            <View style={{ marginTop: 6 }}>
              <Busta
                coins={d.ricompensa.coins}
                xp={d.ricompensa.xp}
                stato={d.stato}
                larghezza={w - B.padX * 2}
                altezza={B.busta}
                testID={`busta-${d.id}`}
                accessibilityLabel={etichettaBusta(d.ricompensa.coins, d.ricompensa.xp, d.stato)}
                registra={v => {
                  busta.current = v;
                  registraBusta(strato, d.claimId, v);
                }}
                onPress={() => onRiscuoti(d.claimId, busta.current)}
              />
            </View>
          </Superficie>
        </Animated.View>
        <Orecchia visibile={riscossa} misura={17} />
        {pronto ? (
          <Animated.View exiting={FadeOut.duration(dur.exit)} pointerEvents="none" style={[styles.timbro, { top: -8, right: -10 }]}>
            <Sigillo testo="Fatta" misura={48} seme={d.seme % 97} timbro={timbro} />
          </Animated.View>
        ) : null}
        <View style={styles.puntinaSopra} pointerEvents="box-none">
          {d.cambiabile && onCambia ? <PuntinaCambia testo={d.testo} onPress={() => onCambia(d.key)} /> : <Puntina misura={13} />}
        </View>
      </View>
      </Entra>
    </View>
  );
}

/* ------------------------------------------------------------------ Locandina (della settimana) */

const L = { padTop: 14, padX: 12, occhiello: 16, filetto: 12, icona: 38, gap: 6, riga: 17, righe: 2, tacche: 20, busta: 56, padBot: 12 };

export function altezzaLocandina(_w: number) {
  return L.padTop + L.occhiello + L.filetto + L.icona + L.gap + L.riga * L.righe + 8 + L.tacche + 10 + L.busta + L.padBot;
}

function LocandinaBase({ dati: d, larghezza: w, onRiscuoti, indice = 0, entra = false, strato = 'bacheca' }: { dati: BigliettoDati; larghezza: number; onRiscuoti: Riscuoti; indice?: number; entra?: boolean; strato?: Strato }) {
  const h = altezzaLocandina(w);
  const busta = useRef<Vista | null>(null);
  const pronto = d.stato === 'riscuotere';
  const riscossa = d.stato === 'riscossa';
  const timbro = useTimbro(d.claimId, pronto);
  const sbiadito = useSbiadito(riscossa);
  const storto = (seeded(d.seme)() - 0.5) * 1.2; // quasi dritta: due puntine
  return (
    <View testID={`fisso-biglietto-${d.id}`} style={{ width: w, height: h }}>
      <Entra ritardo={entra ? ritardoEntrata(indice) : -1} style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${storto.toFixed(2)}deg` }] }]}>
        <Animated.View style={[StyleSheet.absoluteFill, sbiadito]}>
          <View style={[StyleSheet.absoluteFill, styles.locandinaOmbra]}>
            <Superficie materiale="carta" raggio={2} livello={3} style={[StyleSheet.absoluteFill, { backgroundColor: primitivi.carta.scuro }]}>
              {/* carta più spessa e più scura della carta dei biglietti */}
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(196,170,120,0.28)' }]} />
              {/* cornice tipografica: filo grosso e filo sottile, in rosso */}
              <View pointerEvents="none" style={styles.cornice1} />
              <View pointerEvents="none" style={styles.cornice2} />
              <View style={[styles.locandinaDentro, { paddingTop: L.padTop, paddingHorizontal: L.padX, paddingBottom: L.padBot }]}>
                <Text style={[tipografia.occhielloCarta, styles.occhielloLoc]} numberOfLines={1}>
                  SETTIMANA
                </Text>
                <Filetto tipo="rosso" ornamento style={{ height: L.filetto, marginHorizontal: 4 }} />
                <View style={[styles.testa, { justifyContent: 'center', height: L.icona }]}>
                  <IconaSmalto tipo={d.icona} misura={L.icona} />
                  <Text style={[styles.numeroBodoni, { fontSize: 30, lineHeight: 36 }]} numberOfLines={1}>
                    {d.goal.toLocaleString('it-IT')}
                  </Text>
                  {riscossa ? <Spunta misura={18} /> : null}
                </View>
                <Text
                  style={[styles.breve, styles.breveLoc, { height: L.riga * L.righe, marginTop: L.gap }]}
                  numberOfLines={L.righe}
                  accessibilityLabel={`${d.testo} ${d.have} su ${d.goal}. ${STATO_TESTO[d.stato]}.`}
                >
                  {d.breve}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <Tacche have={d.have} goal={d.goal} larghezza={w - L.padX * 2} seme={d.seme} />
                </View>
                <View style={{ marginTop: 10 }}>
                  <Busta
                    coins={d.ricompensa.coins}
                    xp={d.ricompensa.xp}
                    stato={d.stato}
                    larghezza={w - L.padX * 2}
                    altezza={L.busta}
                    testID={`busta-${d.id}`}
                    accessibilityLabel={etichettaBusta(d.ricompensa.coins, d.ricompensa.xp, d.stato)}
                    registra={v => {
                      busta.current = v;
                      registraBusta(strato, d.claimId, v);
                    }}
                    onPress={() => onRiscuoti(d.claimId, busta.current)}
                  />
                </View>
              </View>
            </Superficie>
          </View>
        </Animated.View>
        <Orecchia visibile={riscossa} misura={22} colore={primitivi.carta.scuro} />
        <View pointerEvents="none" style={[styles.puntinaAngolo, { left: 4 }]}>
          <Puntina misura={13} />
        </View>
        <View pointerEvents="none" style={[styles.puntinaAngolo, { right: 0 }]}>
          <Puntina misura={13} />
        </View>
        {pronto ? (
          <Animated.View exiting={FadeOut.duration(dur.exit)} pointerEvents="none" style={[styles.timbro, { top: -28, right: -8 }]}>
            <Sigillo testo="Fatta" misura={44} seme={d.seme % 89} timbro={timbro} />
          </Animated.View>
        ) : null}
      </View>
      </Entra>
    </View>
  );
}

/* ------------------------------------------------------------------ Manifesto (speciali) */

function Nastro() {
  // Le due code di un nastro rosso sotto il sigillo: carta, ceralacca, nastro.
  return (
    <Svg width={46} height={40} viewBox="0 0 46 40" style={styles.nastro} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M17 2L9 36l6-4 4 6 6-34z" fill={primitivi.ceralacca.medio} />
      <Path d="M29 2l8 34-6-4-4 6-6-34z" fill={primitivi.ceralacca.scuro} />
      <Path d="M17 2L9 36" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={0.8} />
    </Svg>
  );
}

function RigaTraguardo({ r, larghezza, onRiscuoti, idx, strato }: { r: RigaSpeciale; larghezza: number; onRiscuoti: Riscuoti; idx: number; strato: Strato }) {
  const busta = useRef<Vista | null>(null);
  const item = r.ricompensa.item ? itemByKey(r.ricompensa.item) : undefined;
  const extra = item ? (item.slot === 'frame' ? ' e una cornice' : ` e «${item.name}»`) : '';
  return (
    <View style={{ width: larghezza, alignItems: 'center', gap: 4 }} testID={`fisso-traguardo-${idx}`}>
      <Text style={styles.traguardo} numberOfLines={1}>
        {r.testo}
      </Text>
      <Busta
        coins={r.ricompensa.coins}
        xp={r.ricompensa.xp}
        stato={r.stato}
        larghezza={larghezza}
        altezza={52}
        etichetta={item ? (item.slot === 'frame' ? '+ cornice' : '+ oggetto') : r.stato === 'dafare' || r.stato === 'incorso' ? `${r.have}/${r.goal}` : undefined}
        testID={`busta-speciale-${idx}`}
        accessibilityLabel={`${r.testo}: ${etichettaBusta(r.ricompensa.coins, r.ricompensa.xp, r.stato, extra)}`}
        registra={v => {
          busta.current = v;
          if (r.claimId) registraBusta(strato, r.claimId, v);
        }}
        onPress={() => onRiscuoti(r.claimId, busta.current)}
      />
    </View>
  );
}

function RigaStagione({ r, larghezza, onRiscuoti, idx, strato }: { r: RigaSpeciale; larghezza: number; onRiscuoti: Riscuoti; idx: number; strato: Strato }) {
  const busta = useRef<Vista | null>(null);
  const bw = 92;
  return (
    <View style={styles.rigaStagione} testID={`fisso-stagione-${idx}`}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.breve, { textAlign: 'left' }]} numberOfLines={2}>
          {r.testo}
        </Text>
        <Tacche have={r.have} goal={r.goal} larghezza={larghezza - bw - 12} seme={idx + 11} piccolo />
      </View>
      <Busta
        coins={r.ricompensa.coins}
        xp={r.ricompensa.xp}
        stato={r.stato}
        larghezza={bw}
        altezza={52}
        testID={`busta-stagione-${idx}`}
        accessibilityLabel={`${r.testo}: ${etichettaBusta(r.ricompensa.coins, r.ricompensa.xp, r.stato)}`}
        registra={v => {
          busta.current = v;
          if (r.claimId) registraBusta(strato, r.claimId, v);
        }}
        onPress={() => onRiscuoti(r.claimId, busta.current)}
      />
    </View>
  );
}

function ManifestoBase({ dati: d, larghezza: w, onRiscuoti, entra = false, indice = 0, sotto, strato = 'bacheca' }: { dati: SpecialeDati; larghezza: number; onRiscuoti: Riscuoti; entra?: boolean; indice?: number; sotto?: ReactNode; strato?: Strato }) {
  const pad = 16;
  const dentro = w - pad * 2;
  const tre = d.tipo === 'evento' ? d.righe.length : 0;
  const tw = tre ? (dentro - (tre - 1) * 10) / tre : 0;
  return (
    <View testID={`fisso-manifesto-${d.tipo}`} style={{ width: w }}>
      <Entra ritardo={entra ? ritardoEntrata(indice) : -1}>
        <Superficie materiale="carta" raggio={2} livello={3} style={{ paddingHorizontal: pad, paddingTop: 16, paddingBottom: 16 }}>
          <View pointerEvents="none" style={styles.manifestoFilo} />
          <View style={{ paddingRight: 64 }}>
            <Text style={tipografia.occhielloCarta} numberOfLines={1}>
              {d.occhiello.toUpperCase()}
            </Text>
            <Text style={styles.titoloManifesto} numberOfLines={2} accessibilityRole="header">
              {d.titolo}
            </Text>
          </View>
          <Filetto tipo="rosso" ornamento style={{ marginTop: 6, marginBottom: 8 }} />
          <Text style={styles.descManifesto} numberOfLines={3}>
            {d.testo}
          </Text>
          <Text style={styles.scadenza} numberOfLines={1}>
            {d.scadenza}
          </Text>
          {d.tipo === 'evento' && d.top ? (
            <View style={{ marginTop: 10, gap: 4 }}>
              <Tacche have={d.have ?? 0} goal={d.top} larghezza={dentro} seme={7} />
              <Text style={styles.unita}>{d.unita} da quando è cominciato</Text>
            </View>
          ) : null}
          {tre ? (
            <View style={styles.traguardi}>
              {d.righe.map((r, i) => (
                <RigaTraguardo key={r.claimId} r={r} larghezza={tw} onRiscuoti={onRiscuoti} idx={i} strato={strato} />
              ))}
            </View>
          ) : null}
          {d.tipo === 'stagione' ? (
            <View style={{ marginTop: 10, gap: 12 }}>
              {d.righe.map((r, i) => (
                <RigaStagione key={r.claimId} r={r} larghezza={dentro} onRiscuoti={onRiscuoti} idx={i} strato={strato} />
              ))}
            </View>
          ) : null}
          {sotto}
        </Superficie>
        {/* il sigillo che tiene il nastro, in alto a destra; l'icona del tipo d'obiettivo è impressa nella cera */}
        <View pointerEvents="none" style={styles.sigilloManifesto}>
          <Nastro />
          <Sigillo misura={58} seme={d.titolo.length + 3} simbolo={<IconaSmalto tipo={d.icona} misura={26} />} />
        </View>
        <View pointerEvents="none" style={[styles.puntinaAngolo, { left: 6, top: -4 }]}>
          <Puntina misura={13} />
        </View>
      </Entra>
    </View>
  );
}

/* ------------------------------------------------------------------ ridisegno solo di ciò che cambia */

// Riscuotere cambia il profilo intero: senza questi confronti si ridisegnerebbe ogni foglio della bacheca (decine
// di Svg e trame) e sul web il volo delle monete perderebbe fotogrammi. Un foglio si ridisegna solo se cambia
// quello che mostra. Le funzioni (onRiscuoti, onCambia) non contano: chiamano sempre la stessa regola.
const firmaB = (d: BigliettoDati) => `${d.key}|${d.stato}|${d.have}|${d.goal}|${d.cambiabile}|${d.ricompensa.coins}|${d.ricompensa.xp}`;
const firmaS = (d: SpecialeDati) => `${d.id}|${d.scadenza}|${d.have}|${d.righe.map(r => `${r.stato}:${r.have}:${r.goal}`).join(',')}`;
type PB = Parameters<typeof BigliettoBase>[0];
type PL = Parameters<typeof LocandinaBase>[0];
type PM = Parameters<typeof ManifestoBase>[0];
export const Biglietto = memo(BigliettoBase, (a: PB, b: PB) => firmaB(a.dati) === firmaB(b.dati) && a.larghezza === b.larghezza && a.strato === b.strato && !!a.onCambia === !!b.onCambia);
export const Locandina = memo(LocandinaBase, (a: PL, b: PL) => firmaB(a.dati) === firmaB(b.dati) && a.larghezza === b.larghezza && a.strato === b.strato);
export const Manifesto = memo(ManifestoBase, (a: PM, b: PM) => firmaS(a.dati) === firmaS(b.dati) && a.larghezza === b.larghezza && a.strato === b.strato && a.sotto === b.sotto);

/** Un cartellino di carta con il nome della fila («Del giorno · nuove tra 5 ore»), appuntato storto. */
export function Cartellino({ titolo, nota, seme = 1, testID }: { titolo: string; nota?: string; seme?: number; testID?: string }) {
  const storto = (seeded(seme)() - 0.5) * 2;
  return (
    <View testID={testID} style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
      <View style={{ transform: [{ rotate: `${storto.toFixed(2)}deg` }] }}>
        <Superficie materiale="carta" raggio={2} livello={2} style={styles.cartellino}>
          <Text style={[tipografia.occhielloCarta, { fontSize: 12 }]} accessibilityRole="header" numberOfLines={1}>
            {titolo.toUpperCase()}
          </Text>
          {nota ? (
            <Text style={styles.cartellinoNota} numberOfLines={1}>
              {nota}
            </Text>
          ) : null}
        </Superficie>
        <View pointerEvents="none" style={[styles.puntinaAngolo, { left: -6, top: -6 }]}>
          <Puntina misura={11} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  foglioDentro: { justifyContent: 'flex-start' },
  testa: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28 },
  numeroBodoni: { fontFamily: fontArte.bodoni, fontSize: 25, lineHeight: 30, color: testo.inchiostro, fontVariant: ['lining-nums'] },
  breve: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 15, color: testo.inchiostro },
  breveLoc: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
  timbro: { position: 'absolute' },
  puntinaSopra: { position: 'absolute', top: -7, left: 0, right: 0, alignItems: 'center' },
  puntinaAngolo: { position: 'absolute', top: -6 },
  cambia: { width: 24, height: 24, marginTop: -3 },
  cambiaDisco: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  locandinaOmbra: { borderRadius: 2 },
  cornice1: { position: 'absolute', left: 5, right: 5, top: 5, bottom: 5, borderWidth: 1.5, borderColor: primitivi.inchiostro.rosso, opacity: 0.75 },
  cornice2: { position: 'absolute', left: 8.5, right: 8.5, top: 8.5, bottom: 8.5, borderWidth: 0.6, borderColor: primitivi.inchiostro.rosso, opacity: 0.6 },
  locandinaDentro: { flex: 1, alignItems: 'stretch' },
  occhielloLoc: { textAlign: 'center', height: 16 },
  titoloManifesto: { fontFamily: fontArte.bodoni, fontSize: 24, lineHeight: 29, color: testo.inchiostro, marginTop: 2 },
  descManifesto: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 18, color: testo.inchiostroTenue },
  scadenza: { fontFamily: fontArte.soraBold, fontSize: 12.5, lineHeight: 17, color: testo.rosso, marginTop: 4 },
  unita: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 15, color: testo.inchiostroTenue },
  traguardi: { flexDirection: 'row', gap: 10, marginTop: 12 },
  traguardo: { fontFamily: fontArte.soraBold, fontSize: 12, lineHeight: 15, color: testo.inchiostro, fontVariant: ['tabular-nums'] },
  rigaStagione: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  sigilloManifesto: { position: 'absolute', right: 10, top: 10, width: 58, alignItems: 'center' },
  nastro: { position: 'absolute', top: 34 },
  manifestoFilo: { position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, borderWidth: 0.8, borderColor: primitivi.inchiostro.rosso, opacity: 0.45 },
  cartellino: { paddingHorizontal: 12, paddingVertical: 5 },
  cartellinoNota: { fontFamily: fontArte.sora, fontSize: 12, lineHeight: 16, color: testo.inchiostroTenue },
});
