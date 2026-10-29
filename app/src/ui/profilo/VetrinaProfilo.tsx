// Il profilo come vetrina (docs/direzione-artistica.md §5.15): la stessa composizione per il tuo profilo e per
// quello degli altri, costruita da un PublicProfile più gli extra che vedi solo tu.
//
// Livelli, dal fondo:
//   0  la Sala (bruno-notte) e la scena dell'arena più alta raggiunta (pub.arena), con un velo al 40% e la pozza
//      della lampada sull'avatar; la scena scorre in parallasse (fattore 0,5) e galleggia piano (deriva).
//   2  targa d'ottone con trofei e arena, teca della vetrina, libro mastro, medagliere, cassetti.
//   3  l'avatar con la cornice in primo piano (≥ 128 pt), la medaglia d'ottone del livello sul bordo.
// Gerarchia: chi sei (avatar, nome in Bodoni, titolo sul cartiglio), poi fin dove sei arrivato (trofei e arena),
// poi cosa possiedi di più bello (la vetrina), poi i numeri.
//
// Export:
// - `VetrinaProfilo` {
//     pub: PublicProfile          quello che vedono tutti (avatar, cornice, titolo, vetrina, arena, statistiche…)
//     nome, foto?, trofei          trofei: dal profilo (tuo) o dalla riga pubblica (cups) degli altri
//     tuo?: { monete, livello: { have, need, frazione }, onAvatar, onVetrina, onTitolo, onPersonalizza, inUso?,
//             medaglie: Record<Tier, {mie, tutte}>, collezione: Cassetti props, coda: ReactNode (account) }
//     stato?: ReactNode            sotto il titolo, per gli altri (online, visto ieri…)
//     azioni?: ReactNode           subito dopo la vetrina, per gli altri (amici, sfida)
//     sfide?: ReactNode            le vostre sfide, prima del libro mastro
//     coda?: ReactNode             in fondo (togli dagli amici)
//   }
//   testID fissi: fisso-avatar, fisso-nome, fisso-vetrina (per controllare che niente si sposti).
// Budget di movimento (≤ 4, tutti fermi con useAmbient): deriva della scena, respiro della lampada sull'avatar,
// riflesso della cornice (da epica in su), riflesso del primo oggetto in vetrina (da epico in su).
// L'entrata (§5.9) è una sola volta: luce, superfici da +12 pt, avatar che si rivela; con riduci movimento
// diventa una dissolvenza breve.
import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ARENAS } from '@/meta/arenas';
import { itemByKey, itemOf } from '@/meta/catalog';
import type { PublicProfile } from '@/meta/ledger';
import { DEFAULT_TITLE, titleById } from '@/meta/titles';
import { ACHIEVEMENTS } from '@/meta/achievements';
import { ArenaScene } from '../ArenaScene';
import { PlayerAvatar } from '../avatar';
import { TrophyIcon } from '../icons';
import { Squish } from '../kit';
import type { Tier } from '../meta';
import { Text } from '../Text';
import {
  ACCENSIONE,
  accento,
  Cartiglio,
  conAlfa,
  fondo,
  fontArte,
  Lampada,
  mov,
  Parallasse,
  Piano,
  primitivi,
  Pulsante,
  puoAnimare,
  Respiro,
  Riflesso,
  Sala,
  sporgenzaPiano,
  Superficie,
  testo,
  tipografia,
  useAmbient,
  useScorrimento,
  dur,
  rarita,
} from '../arte';
import { Borsellino, Indietro, numero, TitoloSezione, useEntrata } from './comuni';
import { LibroMastro, MonetieraLeghe } from './LibroMastro';
import { Cassetti, Medagliere } from './Medagliere';
import { misureTeca, Teca, type Chi } from './Vetrina';

export interface ExtraTuo {
  monete: number;
  livello: { have: number; need: number; frazione: number };
  onAvatar: () => void;
  onVetrina: () => void;
  onTitolo: () => void;
  onPersonalizza: () => void;
  onTrofei: () => void;
  inUso?: string;
  medaglie: Record<Tier, { mie: number; tutte: number }>;
  collezione: Parameters<typeof Cassetti>[0]['righe'];
  set: Parameters<typeof Cassetti>[0]['set'];
  coda: ReactNode;
}

// Sul web i livelli grandi che si muovono (la scena, la pozza di luce) vanno su un livello di composizione proprio:
// così spostarli o sfumarli non ridisegna l'SVG a ogni fotogramma. Sul telefono Reanimated lo fa già.
const STRATO = Platform.OS === 'web' ? ({ willChange: 'transform' } as object) : undefined;
const STRATO_LUCE = Platform.OS === 'web' ? ({ willChange: 'opacity' } as object) : undefined;

/** Le misure della composizione: dipendono solo dallo schermo, mai dai dati (niente salti). */
export function misureProfilo(larghezza: number, altezza: number) {
  const desktop = larghezza >= 720;
  const piccolo = altezza < 760;
  const colonna = Math.min(larghezza, 560) - 40;
  const avatar = desktop ? 168 : piccolo ? 136 : 152;
  // Sul telefono alto la scena si apre di più sopra l'avatar; sul piccolo resta l'essenziale.
  const aria = desktop ? 56 : piccolo ? 0 : Math.round(Math.min(48, (altezza - 667) * 0.26));
  const barra = 56;
  // La scena: 3:1 su desktop (tutta la tela), sul telefono arriva fin sotto la targa.
  const scena = desktop ? Math.round(larghezza / 3) : barra + aria + avatar + 150;
  return { desktop, piccolo, colonna, avatar, aria, barra, scena };
}

/** L'anello della cornice (corona circolare) dove passa il riflesso: stessa geometria di PlayerAvatar. */
function anello(frame: string, S: number): string {
  const st = itemOf('frame', frame);
  const stile = st && st.slot === 'frame' ? st.look.style : 'ring';
  const largo = ['rays', 'flame', 'laurel', 'crown', 'stars', 'tiles'].includes(stile);
  const medio = ['double', 'gems'].includes(stile);
  const r = S * (largo ? 0.35 : medio ? 0.39 : 0.42);
  const w = Math.max(2, S * 0.07);
  const R = Math.min(S / 2, r + w * (largo ? 2.4 : 1.4));
  const ri = r - 1;
  const c = S / 2;
  // esterno in senso orario, interno al contrario: il buco resta fuori dal ritaglio
  return `M${c - R} ${c}A${R} ${R} 0 1 0 ${c + R} ${c}A${R} ${R} 0 1 0 ${c - R} ${c}Z M${c - ri} ${c}A${ri} ${ri} 0 1 1 ${c + ri} ${c}A${ri} ${ri} 0 1 1 ${c - ri} ${c}Z`;
}

/** Il livello come medaglia d'ottone sul bordo dell'avatar. */
function MedagliaLivello({ testo: t, misura }: { testo: string; misura: number }) {
  return (
    <Superficie materiale="ottone" raggio={misura / 2} livello={3} style={[styles.medagliaLivello, { width: misura, height: misura }]}>
      <View style={[styles.medagliaDentro, { width: misura - 8, height: misura - 8, borderRadius: (misura - 8) / 2 }]}>
        <Text style={[styles.medagliaTesto, { fontSize: t.length > 2 ? 13 : 16 }, tipografia.inciso]}>{t}</Text>
      </View>
    </Superficie>
  );
}

export function VetrinaProfilo({
  pub,
  nome,
  foto,
  trofei,
  tuo,
  stato,
  azioni,
  sfide,
  coda,
}: {
  pub: PublicProfile;
  nome: string;
  foto?: string | null;
  trofei: number;
  tuo?: ExtraTuo;
  stato?: ReactNode;
  azioni?: ReactNode;
  sfide?: ReactNode;
  coda?: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const m = misureProfilo(width, height);
  const { scorrimento, onScroll } = useScorrimento();
  const vivo = useAmbient();
  const arena = ARENAS[Math.min(ARENAS.length - 1, Math.max(0, pub.arena))];
  const titolo = titleById(pub.title || DEFAULT_TITLE) ?? titleById(DEFAULT_TITLE)!;
  const livello = pub.prestige > 0 ? `P${pub.prestige}` : String(pub.level || 1);
  const chi: Chi = { avatar: pub.avatar, photo: foto, name: nome };
  const cornice = itemOf('frame', pub.frame);
  const corniceViva = !!cornice && puoAnimare(cornice.rarity, m.avatar) && rarita(cornice.rarity).movimenti > 0;
  const segretiTutti = ACHIEVEMENTS.filter(a => a.hint).length;
  const tecaH = misureTeca(m.colonna).altezza;
  // I due riflessi (cornice e primo oggetto in vetrina) hanno la stessa pausa e sono sfasati di mezzo periodo:
  // non passano mai insieme (uno alla volta è più bello, e sul web due riflessi insieme costano troppo).
  const primo = pub.showcase[0]?.startsWith('item:') ? itemByKey(pub.showcase[0].slice(5)) : undefined;
  const pausaComune = Math.max(cornice ? (rarita(cornice.rarity).pausaRiflesso ?? 0) : 0, primo ? (rarita(primo.rarity).pausaRiflesso ?? 0) : 0) || mov.pausaRiflesso.epico;
  const ritardoCornice = ACCENSIONE.eroe.a + mov.rivela + 400;
  const tempiVetrina = { pausa: pausaComune, ritardo: ritardoCornice + Math.round((mov.riflesso + pausaComune) / 2) };

  // Accensione (§5.9): superfici a 80 ms, l'avatar a 160 ms (rivela), il resto a 240.
  const superfici = useEntrata(ACCENSIONE.superfici.a, ACCENSIONE.superfici.durata);
  const eroe = useEntrata(ACCENSIONE.eroe.a, ACCENSIONE.eroe.durata);
  const resto = useEntrata(ACCENSIONE.resto.a, dur.enter);
  const sEroe = useAnimatedStyle(() => ({ opacity: eroe.value, transform: [{ translateY: (1 - eroe.value) * 8 }] }));
  const sSup = useAnimatedStyle(() => ({ opacity: superfici.value, transform: [{ translateY: (1 - superfici.value) * ACCENSIONE.superfici.da }] }));
  const sResto = useAnimatedStyle(() => ({ opacity: resto.value, transform: [{ translateY: (1 - resto.value) * ACCENSIONE.superfici.da }] }));

  const barraW = Math.min(width, m.desktop ? 600 : width);
  const sVelo = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (scorrimento.value - m.scena * 0.55) / 80)) }));
  const sp = sporgenzaPiano(0.5, m.scena);
  const scenaW = width;
  const avatarTop = ins.top + m.barra + m.aria;
  // Il centro della pozza di luce, in frazioni della scena: sull'avatar.
  const luceCy = (avatarTop + m.avatar * 0.45) / (m.scena + ins.top);
  const medaglia = Math.round(m.avatar * 0.27);

  const avatarCorpo = (
    <View style={{ width: m.avatar, height: m.avatar }}>
      <PlayerAvatar avatar={pub.avatar} photo={foto} name={nome} frame={pub.frame} size={m.avatar} />
      {corniceViva ? <Riflesso forma="path" d={anello(pub.frame, m.avatar)} larghezza={m.avatar} altezza={m.avatar} pausa={pausaComune} ritardo={ritardoCornice} intensita={0.6} attivo={vivo} /> : null}
      <View style={[styles.medagliaPosto, { right: m.avatar * 0.02, bottom: m.avatar * 0.02 }]} pointerEvents="none">
        <MedagliaLivello testo={livello} misura={medaglia} />
      </View>
    </View>
  );

  return (
    <View style={styles.schermo}>
      <Sala accendi luce={{ cx: 0.5, cy: 0.16, r: 0.85, opacita: 0.16 }} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: ins.bottom + 56 }}>
        {/* livello 0–1: la sala dell'arena raggiunta */}
        <View style={{ height: m.scena + ins.top }} accessible accessibilityLabel={`Arena ${arena.n}: ${arena.name}`}>
          <Parallasse scorrimento={scorrimento} larghezza={scenaW} altezza={m.scena + ins.top} style={StyleSheet.absoluteFill}>
            <Piano fattore={0.5} deriva={{ x: 5 }} durata={6000} attivo={vivo} style={STRATO}>
              <View style={{ position: 'absolute', left: -6, right: -6, top: 0, bottom: 0 }}>
                <ArenaScene id={arena.id} width={scenaW + 12} height={m.scena + ins.top + sp * 2} />
              </View>
            </Piano>
          </Parallasse>
          {/* la Sala sopra la scena: velo al 40% e la scena che si perde nel bruno in basso e ai lati */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: conAlfa(fondo.base, 0.4) }]} />
          <LinearGradient pointerEvents="none" colors={[conAlfa(fondo.base, 0.55), conAlfa(fondo.base, 0), conAlfa(fondo.base, 0.15), fondo.base]} locations={[0, 0.22, 0.6, 1]} style={StyleSheet.absoluteFill} />
          {m.desktop ? (
            <LinearGradient pointerEvents="none" colors={[fondo.base, conAlfa(fondo.base, 0), conAlfa(fondo.base, 0), fondo.base]} locations={[0, 0.2, 0.8, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          ) : null}
          {/* la lampada sull'avatar: respira piano (vita) */}
          <Respiro durata={5000} ampiezza={0.2} attivo={vivo} style={[StyleSheet.absoluteFill, STRATO_LUCE]}>
            <Lampada cx={0.5} cy={luceCy} r={m.desktop ? 0.22 : 0.62} opacita={0.34} accendi />
          </Respiro>
        </View>

        {/* livello 3: l'avatar in primo piano, a cavallo della scena */}
        <View style={[styles.colonna, { width: m.colonna, marginTop: -(m.scena + ins.top) + avatarTop }]}>
          <View testID="fisso-avatar" style={[styles.avatarPosto, { width: m.avatar, height: m.avatar }]}>
            <Animated.View style={sEroe}>
              {tuo ? (
                <Squish accessibilityRole="button" accessibilityLabel="Cambia avatar e cornice" onPress={tuo.onAvatar} scaleTo={0.96}>
                  {avatarCorpo}
                </Squish>
              ) : (
                <View accessible accessibilityLabel={`${nome}, livello ${livello}`}>
                  {avatarCorpo}
                </View>
              )}
            </Animated.View>
          </View>

          <View testID="fisso-nome" style={styles.nomePosto}>
            <Text style={[tipografia.nomeProfilo, styles.nome]} numberOfLines={1} accessibilityRole="header" adjustsFontSizeToFit minimumFontScale={0.7}>
              {nome}
            </Text>
          </View>
          <Animated.View style={[styles.centro, sSup]}>
            {tuo ? (
              <Squish accessibilityRole="button" accessibilityLabel={`Titolo: ${titolo.name}. Cambialo nella sezione Trofei`} onPress={tuo.onTitolo} scaleTo={0.97} style={styles.toccoTitolo}>
                <Cartiglio testo={titolo.name} />
              </Squish>
            ) : (
              <View style={styles.toccoTitolo}>
                <Cartiglio testo={titolo.name} />
              </View>
            )}
            {stato ? <View style={{ marginTop: 6 }}>{stato}</View> : null}
            {/* trofei e arena: una targa d'ottone */}
            <Superficie materiale="ottone" raggio={8} livello={2} style={styles.targa} accessible accessibilityLabel={`${numero(trofei)} trofei, arena ${arena.n}, ${arena.name}`}>
              <View style={styles.targaCella}>
                <TrophyIcon size={18} />
                <Text style={[styles.targaNum, tipografia.inciso]}>{numero(trofei)}</Text>
              </View>
              <View style={styles.targaSep} />
              <View style={styles.targaArenaCol}>
                <Text style={[styles.targaArena, tipografia.inciso]} numberOfLines={1}>{`ARENA ${arena.n} · CAPITOLO ${['I', 'II', 'III', 'IV', 'V'][arena.chapter.n - 1]}`}</Text>
                <Text style={[styles.targaNome, tipografia.inciso]} numberOfLines={1}>
                  {arena.name}
                </Text>
              </View>
            </Superficie>
            {tuo ? (
              <View style={styles.xp} accessible accessibilityLabel={`Livello ${livello}: ${tuo.livello.have} su ${tuo.livello.need} punti`}>
                <Text style={styles.xpTesto}>
                  {pub.prestige > 0 ? `Prestigio ${pub.prestige}` : `Livello ${pub.level}`}
                  <Text style={{ color: testo.tenue }}>{`  ${numero(tuo.livello.have)} / ${numero(tuo.livello.need)}`}</Text>
                </Text>
                <View style={styles.xpBinario}>
                  <View style={[styles.xpRiempito, { width: `${Math.max(3, tuo.livello.frazione * 100)}%` }]} />
                </View>
              </View>
            ) : null}
          </Animated.View>

          {/* la vetrina: la teca con le tre cose esposte */}
          <View testID="fisso-vetrina" style={{ marginTop: 26, height: tecaH }}>
            <Animated.View style={sSup}>
              <Teca chiavi={pub.showcase} larghezza={m.colonna} proprio={!!tuo} chi={chi} onCambia={tuo?.onVetrina} attivo={vivo} inUso={tuo?.inUso} tempi={tempiVetrina} />
            </Animated.View>
          </View>

          <Animated.View style={sResto}>
            {tuo ? (
              <View style={styles.pulsanti}>
                <Pulsante etichetta="Personalizza" sotto="Prova prima di scegliere" onPress={tuo.onPersonalizza} style={{ flex: 1.2 }} />
                <Pulsante etichetta="Cambia vetrina" tipo="secondario" onPress={tuo.onVetrina} style={{ flex: 1 }} />
              </View>
            ) : null}
            {azioni ? <View style={{ marginTop: 18 }}>{azioni}</View> : null}

            {sfide}

            <TitoloSezione occhiello="Quanto ha giocato" titolo="Le partite" />
            <LibroMastro pub={pub} larghezza={m.colonna} />

            <TitoloSezione occhiello="Achievement" titolo="Il medagliere" azione={tuo ? { etichetta: 'Tutti', onPress: tuo.onTrofei } : undefined} />
            <Medagliere totale={pub.achievements} segreti={pub.secrets} segretiTutti={segretiTutti} perLivello={tuo?.medaglie} larghezza={m.colonna} onApri={tuo?.onTrofei} />

            {pub.leagues.length ? (
              <>
                <TitoloSezione occhiello="Stagioni passate" titolo="Le leghe" />
                <MonetieraLeghe leghe={pub.leagues} larghezza={m.colonna} />
              </>
            ) : null}

            {tuo ? (
              <>
                <TitoloSezione occhiello="Quello che possiedi" titolo="La collezione" />
                <Cassetti righe={tuo.collezione} set={tuo.set} larghezza={m.colonna} />
                {tuo.coda}
              </>
            ) : null}
            {coda}
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* la barra in alto resta ferma; quando il contenuto le scorre sotto, un velo bruno la stacca */}
      <Animated.View pointerEvents="none" style={[styles.velo, { height: ins.top + m.barra + 18 }, sVelo]}>
        <LinearGradient colors={[fondo.base, conAlfa(fondo.base, 0.92), conAlfa(fondo.base, 0)]} locations={[0, 0.7, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={[styles.barra, { top: ins.top, height: m.barra, left: (width - barraW) / 2, width: barraW }]} pointerEvents="box-none">
        <Indietro />
        <View style={{ flex: 1 }} />
        {tuo ? <Borsellino monete={tuo.monete} /> : null}
      </View>
    </View>
  );
}

/** Una riga di stato sotto il titolo (gli altri): un punto e il testo. */
export function StatoGiocatore({ online, testo: t }: { online: boolean; testo: string }) {
  return (
    <View style={styles.stato}>
      <View style={[styles.punto, { backgroundColor: online ? '#5FB37E' : testo.tenue }]} />
      <Text style={styles.statoTesto}>{t}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: fondo.base, overflow: 'hidden' },
  colonna: { alignSelf: 'center' },
  centro: { alignItems: 'center' },
  avatarPosto: { alignSelf: 'center' },
  medagliaPosto: { position: 'absolute' },
  medagliaLivello: { alignItems: 'center', justifyContent: 'center' },
  medagliaDentro: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: conAlfa(primitivi.ottone.ombra, 0.55) },
  medagliaTesto: { fontFamily: fontArte.soraExtra, lineHeight: 20, fontVariant: ['tabular-nums'] },
  nomePosto: { marginTop: 6, height: 40, alignItems: 'center', justifyContent: 'center' },
  nome: { textAlign: 'center', textShadowColor: 'rgba(8,3,4,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  toccoTitolo: { minHeight: 44, justifyContent: 'center', marginTop: 2 },
  targa: { marginTop: 10, flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 16, gap: 12, maxWidth: '100%' },
  targaArenaCol: { flexShrink: 1, gap: 1 },
  targaCella: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  targaNum: { fontFamily: fontArte.soraExtra, fontSize: 19, lineHeight: 23, fontVariant: ['tabular-nums'] },
  targaSep: { width: 1, height: 30, backgroundColor: conAlfa(primitivi.ottone.ombra, 0.6), borderRightWidth: 1, borderRightColor: 'rgba(255,243,200,0.6)' },
  targaArena: { fontFamily: fontArte.soraBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, opacity: 0.85 },
  targaNome: { fontFamily: fontArte.bodoni, fontSize: 17, lineHeight: 21 },
  xp: { marginTop: 10, alignItems: 'center', gap: 5 },
  xpTesto: { fontFamily: fontArte.soraSemi, fontSize: 13, lineHeight: 17, color: testo.medio, fontVariant: ['tabular-nums'] },
  xpBinario: { width: 180, height: 4, borderRadius: 2, backgroundColor: 'rgba(8,3,4,0.7)', boxShadow: 'inset 0px 1px 1px rgba(8,3,4,0.8)', overflow: 'hidden' },
  xpRiempito: { height: 4, borderRadius: 2, backgroundColor: accento.oro },
  pulsanti: { flexDirection: 'row', gap: 10, marginTop: 18 },
  velo: { position: 'absolute', left: 0, right: 0, top: 0 },
  barra: { position: 'absolute', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  stato: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 20 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  statoTesto: { fontFamily: fontArte.soraSemi, fontSize: 13, lineHeight: 17, color: testo.medio },
});

