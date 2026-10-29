// La vetrina del profilo (docs/direzione-artistica.md §5.15): una teca di noce con tre nicchie di velluto, ognuna
// con il suo faretto in alto e un piedistallo di marmo. Gli oggetti stanno in piedi sul piedistallo, illuminati;
// sotto ogni nicchia una targhetta del metallo della sua rarità con il nome inciso, e la rarità scritta.
//
// Export:
// - `Esposto`        { k (chiave della vetrina: «item:slot:id» o «ach:id»), larghezza, altezza, proprio?, chi? }
//                    l'oggetto da solo, alla misura della nicchia: dorso in piedi, cornice intorno all'avatar di chi
//                    lo espone (`chi`), tavolino, panno, medaglia dell'achievement. Sul tuo profilo (`proprio`) i
//                    tavolini e i panni si vedono con le tue cose in uso (ItemPreview); sugli altri con il panno e
//                    il tavolino di partenza, perché le loro cose in uso non sono pubbliche. Statico.
// - `infoEsposto(k)` { nome, sotto, colore, rarita?, forma } quello che serve per targhetta e riflesso
// - `Nicchia`        { larghezza, altezza, k?, proprio?, chi?, eroe?, attivo?, vuota?: 'aggiungi' | 'libera' }
//                    una nicchia con il suo oggetto (o vuota). L'eroe (la prima) ha l'ombra del primo piano e, se
//                    l'oggetto è epico o più raro, il riflesso che passa (1 elemento animato, fermo con useAmbient).
// - `Teca`           { chiavi, larghezza, proprio?, chi?, onCambia?, attivo?, inUso? } la teca con le tre nicchie e la
//                    targa «Vetrina». Con `onCambia` tutta la teca è un pulsante («Cambia la vetrina») e i posti vuoti
//                    invitano a scegliere; senza, i posti vuoti restano velluto libero. `inUso`: il tavolo in uso da
//                    mettere nel primo posto libero (solo sul tuo profilo). `tempi`: pausa e ritardo del riflesso dell'eroe
//                    (il profilo lo sfasa da quello della cornice, così i due non passano mai insieme).
// - `misureTeca(larghezza)`  { nicchia: {w, h}, altezza } misure fisse (dipendono solo dalla larghezza)
// Budget: al massimo 1 elemento animato (il riflesso dell'eroe).
import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinear, RadialGradient, Rect, Stop } from 'react-native-svg';
import { achievementById } from '@/meta/achievements';
import { DEFAULT_EQUIPPED, itemByKey, SLOT_NAME } from '@/meta/catalog';
import type { Rarity } from '@/meta/rarity';
import { PlayerAvatar } from '../avatar';
import { BackPreview, ClothPreview, ComingPreview, FramePreview, ItemPreview, TablePreview } from '../cosmetics';
import { Icon } from '../icons';
import { Squish } from '../kit';
import { CATEGORY_GLYPH } from '../progression';
import { Text } from '../Text';
import { CARD_RATIO, cardRadius } from '../theme';
import { accento, conAlfa, fontArte, LUCE, primitivi, rarita, Riflesso, Superficie, Targa, testo, tipografia } from '../arte';
import { Medaglia, METALLI_LIVELLO } from './Medaglia';

export interface Chi {
  avatar: string;
  photo?: string | null;
  name: string;
}

/* ------------------------------------------------------------------ dati */

export function infoEsposto(k: string): { nome: string; sotto: string; colore: string; rarita?: Rarity; metallo: readonly [string, string, string, string] } | null {
  if (k.startsWith('item:')) {
    const it = itemByKey(k.slice(5));
    if (!it) return null;
    const st = rarita(it.rarity);
    return { nome: it.name, sotto: `${st.nome} · ${SLOT_NAME[it.slot]}`, colore: st.colore, rarita: it.rarity, metallo: st.metallo };
  }
  const a = achievementById(k.slice(4));
  if (!a) return null;
  const m = METALLI_LIVELLO[a.tier];
  return { nome: a.name, sotto: a.hint ? 'Achievement segreto' : `Achievement · ${m.nome}`, colore: accento.oro, metallo: m.metallo };
}

/* ------------------------------------------------------------------ l'oggetto */

export const Esposto = memo(function Esposto({ k, larghezza: w, altezza: h, proprio, chi }: { k: string; larghezza: number; altezza: number; proprio?: boolean; chi?: Chi }) {
  if (k.startsWith('ach:')) {
    const a = achievementById(k.slice(4));
    if (!a) return null;
    const d = Math.floor(Math.min(w * 0.72, h / 1.5));
    return (
      <View style={[styles.centroBasso, { width: w, height: h }]}>
        <Medaglia livello={a.tier} simbolo={CATEGORY_GLYPH[a.category]} misura={d} />
      </View>
    );
  }
  const it = itemByKey(k.slice(5));
  if (!it) return null;
  if (it.status === 'coming') return <ComingPreview item={it} width={w} height={h} />;
  if (it.slot === 'back') {
    const cw = Math.floor(Math.min(w * 0.62, h / CARD_RATIO));
    return (
      <View style={[styles.centroBasso, { width: w, height: h }]}>
        <BackPreview id={it.id} width={cw} />
      </View>
    );
  }
  if (it.slot === 'frame') {
    const s = Math.floor(Math.min(w, h) * 0.96);
    // Senza `chi` è il tuo profilo: la cornice intorno al tuo avatar (FramePreview lo legge dal profilo).
    if (!chi) return <View style={[styles.centroBasso, { width: w, height: h }]}><FramePreview frame={it.id} width={s} height={s} /></View>;
    return (
      <View style={[styles.centroBasso, { width: w, height: h }]}>
        <PlayerAvatar avatar={chi?.avatar} photo={chi?.photo} name={chi?.name ?? 'Tu'} frame={it.id} size={s} />
      </View>
    );
  }
  // Tavolini e panni: un tavolo visto dall'alto, appoggiato sul piedistallo.
  const tw = Math.floor(w * 0.94);
  const th = Math.floor(Math.min(h * 0.72, tw * 0.74));
  return (
    <View style={[styles.centroBasso, { width: w, height: h }]}>
      {proprio ? (
        <ItemPreview item={it} width={tw} height={th} />
      ) : it.slot === 'table' ? (
        <TablePreview table={it.id} felt={DEFAULT_EQUIPPED.felt} back={DEFAULT_EQUIPPED.back} width={tw} height={th} />
      ) : (
        <ClothPreview felt={it.id} width={tw} height={th} />
      )}
    </View>
  );
});

/** La sagoma dell'oggetto per il riflesso: dove sta e com'è fatta. */
function sagoma(k: string, w: number, h: number): { x: number; y: number; w: number; h: number; forma: 'rettangolo' | 'cerchio'; raggio: number } | null {
  const it = k.startsWith('item:') ? itemByKey(k.slice(5)) : null;
  if (!it || it.status === 'coming') return null;
  if (it.slot === 'back') {
    const cw = Math.floor(Math.min(w * 0.62, h / CARD_RATIO));
    const ch = Math.round(cw * CARD_RATIO);
    return { x: (w - cw) / 2, y: h - ch, w: cw, h: ch, forma: 'rettangolo', raggio: cardRadius(cw) };
  }
  if (it.slot === 'frame') {
    const s = Math.floor(Math.min(w, h) * 0.96);
    return { x: (w - s) / 2, y: h - s, w: s, h: s, forma: 'cerchio', raggio: s / 2 };
  }
  const tw = Math.floor(w * 0.94);
  const th = Math.floor(Math.min(h * 0.72, tw * 0.74));
  return { x: (w - tw) / 2, y: h - th, w: tw, h: th, forma: 'rettangolo', raggio: Math.min(12, tw * 0.09) };
}

/* ------------------------------------------------------------------ nicchia */

/** Il faretto e la sua luce: un cono caldo dall'alto, più il vetro della teca (due riflessi fermi). */
const LuceNicchia = memo(function LuceNicchia({ w, h }: { w: number; h: number }) {
  const id = 'ln' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id + 'c'} cx={w / 2} cy={-h * 0.08} r={h * 1.05} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={LUCE.colore} stopOpacity={0.5} />
          <Stop offset={0.45} stopColor={LUCE.colore} stopOpacity={0.16} />
          <Stop offset={1} stopColor={LUCE.colore} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={id + 'p'} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset={0} stopColor={LUCE.colore} stopOpacity={0.32} />
          <Stop offset={1} stopColor={LUCE.colore} stopOpacity={0} />
        </RadialGradient>
        <SvgLinear id={id + 'v'} x1="0" y1="0" x2="1" y2="1">
          <Stop offset={0.18} stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset={0.24} stopColor="#FFFFFF" stopOpacity={0.07} />
          <Stop offset={0.3} stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset={0.36} stopColor="#FFFFFF" stopOpacity={0.035} />
          <Stop offset={0.4} stopColor="#FFFFFF" stopOpacity={0} />
        </SvgLinear>
      </Defs>
      <Rect width={w} height={h} fill={`url(#${id}c)`} />
      {/* la luce che cade sul piano della nicchia, davanti al piedistallo */}
      <Ellipse cx={w / 2} cy={h - 10} rx={w * 0.46} ry={9} fill={`url(#${id}p)`} />
      {/* il vetro: due riflessi obliqui, fermi */}
      <Rect width={w} height={h} fill={`url(#${id}v)`} />
    </Svg>
  );
});

/** Il faretto d'ottone in alto al centro della nicchia. */
function Faretto() {
  return (
    <View style={styles.faretto} pointerEvents="none">
      <View style={styles.farettoBraccio} />
      <View style={styles.farettoCoppa} />
    </View>
  );
}

const PIEDISTALLO = 9;

export function Nicchia({
  larghezza: w,
  altezza: h,
  k,
  proprio,
  chi,
  eroe,
  attivo = true,
  vuota,
  tempi,
}: {
  larghezza: number;
  altezza: number;
  k?: string;
  proprio?: boolean;
  chi?: Chi;
  eroe?: boolean;
  attivo?: boolean;
  vuota?: 'aggiungi' | 'libera';
  tempi?: { pausa: number; ritardo: number };
}) {
  const info = k ? infoEsposto(k) : null;
  const ow = w - 12;
  const oh = h - 16 - PIEDISTALLO;
  const st = info?.rarita ? rarita(info.rarita) : null;
  const sg = k && eroe && st && st.movimenti > 0 ? sagoma(k, ow, oh) : null;
  return (
    <View style={{ width: w }}>
      <View style={[styles.incavo, { width: w, height: h }]}>
        <Superficie materiale="velluto" livello={0} raggio={8} style={StyleSheet.absoluteFill} />
        <LuceNicchia w={w} h={h} />
        <Faretto />
        {/* il piedistallo di marmo, con la sua ombra di contatto sul velluto */}
        <View style={[styles.piedistallo, { width: w * 0.7 }]}>
          {/* il piano in luce e la fascia frontale in ombra: un blocchetto, non una striscia */}
          <View style={styles.piedistalloPiano} />
          <Superficie materiale="marmo" raggio={1} livello={2} piccolo trama={false} style={{ flex: 1 }} />
          <View style={styles.piedistalloOmbra} />
        </View>
        {k && info ? (
          <View style={[styles.oggetto, { width: ow, height: oh, bottom: PIEDISTALLO + 2 }]}>
            <Esposto k={k} larghezza={ow} altezza={oh} proprio={proprio} chi={chi} />
            {sg && st ? (
              <Riflesso
                forma={sg.forma}
                larghezza={sg.w}
                altezza={sg.h}
                raggio={sg.raggio}
                pausa={tempi?.pausa ?? st.pausaRiflesso ?? undefined}
                ritardo={tempi?.ritardo}
                intensita={Math.max(0.45, st.riflesso.opacita)}
                attivo={attivo}
                style={{ left: sg.x, top: sg.y }}
              />
            ) : null}
          </View>
        ) : vuota === 'aggiungi' ? (
          <View style={[styles.vuota, { bottom: PIEDISTALLO + 10 }]}>
            <View style={styles.vuotaCerchio}>
              <Icon name="plus" size={20} color={accento.oro} />
            </View>
            <Text style={styles.vuotaTesto}>Esponi</Text>
          </View>
        ) : null}
        {/* l'ombra interna della nicchia: il velluto è incassato nel legno */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.incasso]} />
      </View>
      {info ? (
        <View style={styles.didascalia}>
          <Superficie materiale="ottone" metallo={info.metallo} raggio={3} livello={2} piccolo style={styles.targhetta}>
            <Text style={[styles.targhettaTesto, tipografia.inciso]} numberOfLines={1}>
              {info.nome}
            </Text>
          </Superficie>
          <Text style={[styles.sotto, { color: info.colore }]} numberOfLines={1}>
            {info.rarita ? rarita(info.rarita).nome : info.sotto.split(' · ')[0]}
          </Text>
        </View>
      ) : (
        <View style={styles.didascalia}>
          <View style={[styles.targhetta, styles.targhettaVuota]} />
          <Text style={[styles.sotto, { color: testo.tenue }]} numberOfLines={1}>
            {vuota === 'aggiungi' ? 'Posto libero' : ' '}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ teca */

const BORDO = 12;
const SPAZIO = 8;

export function misureTeca(larghezza: number) {
  const w = Math.floor((larghezza - BORDO * 2 - SPAZIO * 2) / 3);
  const h = Math.round(Math.min(150, w * 1.24));
  // nicchia + didascalia (targhetta 24 + 4 + rarità 16) + bordi + targa in alto
  return { nicchia: { w, h }, altezza: BORDO * 2 + 14 + h + 50 };
}

export function Teca({
  chiavi,
  larghezza,
  proprio,
  chi,
  onCambia,
  attivo = true,
  inUso,
  tempi,
}: {
  chiavi: string[];
  larghezza: number;
  proprio?: boolean;
  chi?: Chi;
  onCambia?: () => void;
  attivo?: boolean;
  inUso?: string;
  tempi?: { pausa: number; ritardo: number };
}) {
  const { nicchia } = misureTeca(larghezza);
  // Sul tuo profilo il primo posto libero mostra il tavolo che usi (§5.15).
  const posti: (string | undefined)[] = [0, 1, 2].map(i => chiavi[i]);
  if (proprio && inUso && posti.includes(undefined) && !posti.includes(inUso)) posti[posti.indexOf(undefined)] = inUso;
  const descr = posti
    .map(k => (k ? infoEsposto(k) : null))
    .filter(Boolean)
    .map(i => `${i!.nome}, ${i!.sotto}`)
    .join('; ');
  const corpo = (
    <Superficie materiale="noce" filetto raggio={14} livello={3} style={[styles.teca, { width: larghezza }]}>
      <View style={styles.cimasa} pointerEvents="none" />
      <View style={styles.fila}>
        {posti.map((k, i) => (
          <Nicchia
            key={k ?? `vuota${i}`}
            larghezza={nicchia.w}
            altezza={nicchia.h}
            k={k}
            proprio={proprio}
            chi={chi}
            eroe={i === 0}
            attivo={attivo}
            vuota={k ? undefined : onCambia ? 'aggiungi' : 'libera'}
            tempi={tempi}
          />
        ))}
      </View>
    </Superficie>
  );
  return (
    <View style={{ width: larghezza, alignSelf: 'center' }}>
      {onCambia ? (
        <Squish accessibilityRole="button" accessibilityLabel={`Cambia la vetrina. ${descr || 'Vuota'}`} onPress={onCambia} scaleTo={0.985}>
          {corpo}
        </Squish>
      ) : (
        <View accessible accessibilityLabel={`Vetrina: ${descr || 'vuota'}`}>
          {corpo}
        </View>
      )}
      {/* la targa del mobile, avvitata a cavallo del bordo in alto */}
      <View pointerEvents="none" style={styles.targaTeca}>
        <Targa testo="Vetrina" misura={11} viti />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centroBasso: { alignItems: 'center', justifyContent: 'flex-end' },
  teca: { padding: BORDO, paddingTop: BORDO + 14 },
  cimasa: { position: 'absolute', left: BORDO, right: BORDO, top: 8, height: 2, borderRadius: 1, backgroundColor: conAlfa(primitivi.ottone.medio, 0.7) },
  fila: { flexDirection: 'row', gap: SPAZIO },
  incavo: { borderRadius: 8, overflow: 'hidden', backgroundColor: primitivi.velluto.ombra },
  incasso: { borderRadius: 8, boxShadow: 'inset 0px 4px 8px rgba(8,3,4,0.75), inset 0px -1px 0px rgba(255,200,170,0.10)' },
  faretto: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  farettoBraccio: { width: 2, height: 4, backgroundColor: primitivi.ottone.scuro },
  farettoCoppa: { width: 18, height: 5, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: primitivi.ottone.medio, borderTopWidth: 1, borderTopColor: primitivi.ottone.luce, boxShadow: `0px 2px 6px ${conAlfa(LUCE.colore, 0.5)}` },
  piedistallo: { position: 'absolute', bottom: 2, height: PIEDISTALLO, alignSelf: 'center' },
  piedistalloPiano: { height: 3, marginHorizontal: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: '#FFFDF8' },
  piedistalloOmbra: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(110,100,88,0.55)' },
  oggetto: { position: 'absolute', left: 6 },
  vuota: { position: 'absolute', left: 0, right: 0, top: 18, alignItems: 'center', justifyContent: 'center', gap: 6 },
  vuotaCerchio: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: conAlfa(primitivi.fogliaOro, 0.7), alignItems: 'center', justifyContent: 'center' },
  vuotaTesto: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, color: accento.oro },
  didascalia: { marginTop: 7, alignItems: 'center', gap: 3 },
  targhetta: { alignSelf: 'stretch', height: 24, justifyContent: 'center', paddingHorizontal: 5 },
  targhettaVuota: { borderRadius: 3, backgroundColor: 'rgba(8,3,4,0.35)', boxShadow: 'inset 0px 1px 2px rgba(8,3,4,0.6)' },
  targhettaTesto: { fontFamily: fontArte.soraBold, fontSize: 11.5, lineHeight: 15, textAlign: 'center' },
  sotto: { fontFamily: fontArte.soraSemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  targaTeca: { position: 'absolute', top: -11, left: 0, right: 0, alignItems: 'center' },
});
