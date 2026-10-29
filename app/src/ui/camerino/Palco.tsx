// Il palco della personalizzazione («Il tuo tavolo», docs/direzione-artistica.md §5.16): sotto la lampada, il
// tavolino con il panno, il mazzetto con il dorso appoggiato sull'angolo, l'avatar con la cornice al suo posto
// (dove siede chi gioca con te) e il sigillo di ceralacca «In prova» / «In uso». Sotto, il cartellino con il nome
// del pezzo, la sua rarità e il materiale.
//
// Export:
// - `Palco` { prova, nome, eroe, larghezza, altezza, posa, sigillo, piccolo, compatto? }
//     prova     la combinazione da mostrare (un id per posto)
//     eroe      il posto toccato per ultimo: solo lui si anima secondo la rarità (§5.16 «solo sul pezzo appena
//               provato»); gli altri restano fermi
//     posa      { posto, n }: a ogni n nuovo quel pezzo si «posa» (sale di 8 punti e scende, l'ombra passa da primo
//               piano a oggetto, mov.posa 280 ms, ease.in): è il feedback di «Usa» e «Compra»
//     sigillo   { testo, n }: il sigillo rientra con il timbro a ogni n nuovo
//     piccolo   mostra anche la cornice a 32 punti, come in classifica (schede Cornice e Avatar)
//     nome      il nome del giocatore (iniziale e riga di classifica)
//   Cambiare un pezzo lo scambia con una dissolvenza incrociata (280 ms): niente si sposta.
//   Budget (§5.8): al massimo le animazioni del pezzo eroe. Cornice mitica: riflesso + iridescenza + granelli = 3
//   (leggendaria: riflesso + bagliore + scintille = 3); tavolino: 2 bande di riflesso (una luce sola); dorso: 1.
//   Sempre ≤ 6, ferme con useAmbient.
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { CARD_RATIO } from '@/ui/theme';
import { itemOf, type Slot } from '@/meta/catalog';
import { avatarById } from '@/meta/avatars';
import type { Rarity } from '@/meta/rarity';
import { AvatarCornice } from '@/ui/avatar';
import { DorsoVetrina, TavoloVetrina } from '@/ui/cosmetics';
import { Lampada, Sigillo } from '@/ui/arte/materiali';
import { TarghettaRarita } from '@/ui/arte/Rarita';
import { stileCornice } from '@/ui/arte/cornici';
import { vetrinaTavolino } from '@/ui/arte/oggetti';
import { dur, ease, mov } from '@/ui/arte/movimento';
import { fontArte, testo, tipografia } from '@/ui/arte/token';
import { Text } from '@/ui/Text';
import type { Posto, Prova } from './logica';

const SCAMBIO = mov.posa;

/** Un pezzo del palco: scambiato con una dissolvenza incrociata, e «posato» quando lo si usa. */
function Pezzo({ chiave, posa, style, children }: { chiave: string; posa: number; style?: object; children: ReactNode }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (!posa) return;
    // sale di 8 punti e torna giù: una sola volta, senza oltrepassare il posto (ease.in all'arrivo)
    y.value = withSequence(withTiming(-8, { duration: mov.posa * 0.45, easing: ease.out }), withTiming(0, { duration: mov.posa * 0.55, easing: ease.in }));
  }, [posa, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[style, st]} pointerEvents="none">
      <Animated.View key={chiave} entering={FadeIn.duration(SCAMBIO).easing(ease.in)} exiting={FadeOut.duration(SCAMBIO).easing(ease.out)} style={StyleSheet.absoluteFill}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export interface PalcoProps {
  prova: Prova;
  nome: string;
  eroe: Posto | null;
  /** Il posto della scheda aperta: il suo pezzo dà il nome al cartellino. */
  posto: Posto;
  larghezza: number;
  altezza: number;
  posa: { posto: Posto | null; n: number };
  sigillo: { testo: string; n: number };
  piccolo: boolean;
  foto?: string | null;
}

/** Le misure del palco: tutto si calcola dalla misura, niente dipende da cosa si prova (niente si sposta). */
export function misurePalco(larghezza: number, altezza: number) {
  const cartellino = 62;
  const A = Math.round(Math.max(64, Math.min(112, altezza * 0.26)));
  // Il mazzetto è largo il 30% dell'altezza del tavolo e sporge sotto la sponda per il 55% della sua altezza:
  // quello spazio si riserva sotto il tavolo (0,3 × 1,6 × 0,55 ≈ 0,27 × TH), così il cartellino non si tocca mai.
  const sotto = 0.27;
  const disponibile = altezza - cartellino - 10 - A * 0.62;
  let TW = Math.min(larghezza - 56, disponibile / (0.6 * (1 + sotto)), 620);
  TW = Math.max(200, Math.floor(TW));
  const TH = Math.round(TW * 0.6);
  const top = 6 + A * 0.62;
  const dw = Math.round(Math.max(46, Math.min(110, TH * 0.3)));
  return { cartellino, A, TW, TH, top, x: Math.round((larghezza - TW) / 2), dw, dh: Math.round(dw * CARD_RATIO) };
}

/** Il cartellino del pezzo: nome in Bodoni, targhetta della rarità, materiale. Altezza fissa. */
function Cartellino({ prova, posto, h }: { prova: Prova; posto: Posto; h: number }) {
  let nome = '';
  let sotto = '';
  let rar: Rarity = 'comune';
  if (posto === 'avatar') {
    const a = avatarById(prova.avatar);
    nome = a.name;
    sotto = 'Avatar · gratuito';
  } else {
    const it = itemOf(posto as Slot, prova[posto]);
    nome = it?.name ?? '';
    rar = it?.rarity ?? 'comune';
    sotto = posto === 'frame' ? stileCornice(prova.frame).materiale : posto === 'table' ? `Tavolino in ${vetrinaTavolino(prova.table).materiale}` : posto === 'felt' ? 'Grafica del panno' : 'Dorso delle carte';
  }
  return (
    <View style={[styles.cartellino, { height: h }]} testID="fisso-cartellino">
      <Text style={styles.nomePezzo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {nome}
      </Text>
      <View style={styles.cartellinoRiga}>
        {posto !== 'avatar' ? <TarghettaRarita rarita={rar} /> : null}
        <Text style={styles.sottoPezzo} numberOfLines={1}>
          {sotto}
        </Text>
      </View>
    </View>
  );
}

export function Palco({ prova, nome, eroe, posto, larghezza, altezza, posa, sigillo, piccolo, foto }: PalcoProps) {
  const m = misurePalco(larghezza, altezza);
  const { dw, dh } = m;
  const n = (p: Posto) => (posa.posto === p ? posa.n : 0);
  return (
    <View style={{ width: larghezza, height: altezza }} accessibilityRole="image" accessibilityLabel={`Il tuo tavolo in prova: ${itemOf('table', prova.table)?.name ?? ''}, ${itemOf('felt', prova.felt)?.name ?? ''}, ${itemOf('back', prova.back)?.name ?? ''}, cornice ${itemOf('frame', prova.frame)?.name ?? ''}`}>
      {/* la lampada sopra il tavolo: una pozza tonda che sta tutta dentro il palco (niente bordi tagliati) */}
      <View pointerEvents="none" style={{ position: 'absolute', left: (larghezza - m.TW * 1.3) / 2, top: m.top + m.TH / 2 - m.TW * 0.65, width: m.TW * 1.3, height: m.TW * 1.3 }}>
        <Lampada cx={0.5} cy={0.5} r={0.5} opacita={0.2} accendi />
      </View>
      {/* l'ombra del tavolo sul pavimento, più larga del tavolo, spostata a destra (luce da ore 11) */}
      <View pointerEvents="none" style={[styles.ombraTerra, { left: m.x + 10, top: m.top + 18, width: m.TW, height: m.TH, borderRadius: m.TH * 0.2 }]} />

      <Pezzo chiave={`${prova.table}|${prova.felt}|${prova.back}`} posa={n('table') + n('felt')} style={{ position: 'absolute', left: m.x, top: m.top, width: m.TW, height: m.TH }}>
        <View testID="fisso-tavolo">
          <TavoloVetrina table={prova.table} felt={prova.felt} back={prova.back} width={m.TW} height={m.TH} cards={false} vivo={eroe === 'table'} />
        </View>
      </Pezzo>

      {/* il mazzetto con il dorso, appoggiato sulla sponda in basso a destra, quasi tutto fuori dal panno */}
      <Pezzo chiave={prova.back} posa={n('back')} style={{ position: 'absolute', left: m.x + m.TW - dw * 0.92, top: m.top + m.TH - dh * 0.45, width: dw, height: dh, transform: [{ rotate: '9deg' }] }}>
        <DorsoVetrina id={prova.back} width={dw} vivo={eroe === 'back'} />
      </Pezzo>

      {/* chi siede di fronte: l'avatar con la cornice, a cavallo della sponda alta */}
      <Pezzo chiave={`${prova.avatar}|${prova.frame}`} posa={n('frame') + n('avatar')} style={{ position: 'absolute', left: (larghezza - m.A) / 2, top: 6, width: m.A, height: m.A }}>
        <View testID="fisso-avatar">
          <AvatarCornice avatar={prova.avatar} photo={foto} name={nome} frame={prova.frame} size={m.A} vivo={eroe === 'frame' || eroe === 'avatar'} seme={7} />
        </View>
      </Pezzo>

      {/* la cornice in piccolo, come in classifica: per vedere che resta pulita. Nell'angolo in alto a sinistra,
          accanto all'avatar: lì c'è spazio su tutti gli schermi e non copre né il tavolo né la cornice grande. */}
      {piccolo ? (
        <Animated.View entering={FadeIn.duration(dur.quick)} exiting={FadeOut.duration(dur.exit)} style={[styles.classifica, { left: 0, top: 2, maxWidth: (larghezza - m.A) / 2 - 10 }]}>
          <AvatarCornice avatar={prova.avatar} photo={foto} name={nome} frame={prova.frame} size={32} vivo={false} />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.classificaNome} numberOfLines={1}>
              {nome}
            </Text>
            <Text style={styles.classificaSotto} numberOfLines={1}>
              a 32 punti
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/* il sigillo: «In prova» se il pezzo non è il tuo, «In uso» se lo è; rientra col timbro a ogni scambio */}
      <View style={[styles.sigillo, { left: Math.max(4, m.x - 16), top: m.top + m.TH - 24 }]} pointerEvents="none">
        <Sigillo key={sigillo.n} testo={sigillo.testo} misura={54} seme={sigillo.testo.length + 3} timbro={sigillo.n > 0} tinta={sigillo.testo === 'In uso' ? undefined : '#8E1A26'} />
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, top: altezza - m.cartellino }}>
        <Cartellino prova={prova} posto={posto} h={m.cartellino} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ombraTerra: { position: 'absolute', backgroundColor: 'rgba(8,3,4,0.38)', boxShadow: '0px 0px 26px 10px rgba(8,3,4,0.38)' },
  sigillo: { position: 'absolute' },
  classifica: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 10,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(30,19,22,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(230,195,106,0.28)',
    boxShadow: '0px 1px 2px rgba(8,3,4,0.5), 3px 8px 16px rgba(8,3,4,0.4)',
  },
  classificaNome: { fontFamily: fontArte.soraSemi, fontSize: 13, lineHeight: 16, color: testo.forte, maxWidth: 110 },
  classificaSotto: { fontFamily: fontArte.sora, fontSize: 12, lineHeight: 15, color: testo.tenue },
  cartellino: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  cartellinoRiga: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '94%' },
  nomePezzo: { ...tipografia.nomeOggetto, fontSize: 24, lineHeight: 29, maxWidth: '94%', textAlign: 'center' },
  sottoPezzo: { fontFamily: fontArte.sora, fontSize: 13, lineHeight: 17, color: testo.medio, flexShrink: 1 },
});
